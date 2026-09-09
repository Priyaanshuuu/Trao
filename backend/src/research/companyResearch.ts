import dns from "node:dns/promises";
import net from "node:net";
import * as cheerio from "cheerio";
import { env } from "../config/env.js";

const defaultMaxPages = 6;
const defaultMaxBytes = 1_000_000;
const defaultTimeoutMs = 8_000;
const defaultRetries = 3;

export interface ResearchSource {
  url: string;
  title: string;
  text: string;
  links: string[];
}

export interface ResearchFailure {
  url: string;
  code: string;
  message: string;
  attempts: number;
}

export interface CompanyResearchResult {
  startingUrl: string;
  sources: ResearchSource[];
  failures: ResearchFailure[];
  hiringSources: string[];
  researchGaps: string[];
}

export interface ResearchOptions {
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  maxPages?: number;
  maxBytes?: number;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  allowPrivateHosts?: boolean;
}

function isPrivateIp(address: string): boolean {
  const mappedIpv4 = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isPrivateIp(mappedIpv4);

  if (net.isIPv4(address)) {
    const parts = address.split(".").map(Number);
    const [first, second = -1] = parts;
    return first === 0 || first === 10 || first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168);
  }

  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

export async function validateResearchUrl(value: string, allowPrivateHosts = env.NODE_ENV !== "production"): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL_INVALID");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("URL_PROTOCOL_UNSUPPORTED");
  if (url.username || url.password) throw new Error("URL_CREDENTIALS_UNSUPPORTED");
  if (allowPrivateHosts) return url;

  const addresses = await dns.lookup(url.hostname, { all: true });
  if (addresses.some(({ address }) => isPrivateIp(address))) throw new Error("URL_PRIVATE_DESTINATION");
  return url;
}

async function readBody(response: Response, maxBytes: number): Promise<string> {
  const rawContentType = response.headers.get("content-type");
  const contentType = rawContentType ? rawContentType.split(";", 1)[0]!.trim().toLowerCase() : undefined;
  if (contentType && contentType !== "text/html" && contentType !== "text/plain" && contentType !== "application/xhtml+xml") {
    throw new Error("CONTENT_TYPE_UNSUPPORTED");
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error("RESPONSE_TOO_LARGE");
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("RESPONSE_TOO_LARGE");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function extractPage(url: URL, html: string): ResearchSource {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer").remove();
  const title = $("title").first().text().trim() || url.hostname;
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 50_000);
  const links = $("a[href]").map((_index, element) => $(element).attr("href")).get()
    .map((href) => {
      try {
        const link = new URL(href, url);
        return link.protocol === "http:" || link.protocol === "https:" ? link.href : null;
      } catch {
        return null;
      }
    })
    .filter((href): href is string => href !== null);
  return { url: url.href, title, text, links: [...new Set(links)] };
}

function scoreLink(link: string, startingUrl: URL): number {
  const candidate = new URL(link);
  if (candidate.origin !== startingUrl.origin) return -100;
  const signal = `${candidate.pathname} ${candidate.search}`.toLowerCase();
  return ["about", "company", "product", "engineering", "career", "hiring", "jobs", "handbook", "blog"].reduce(
    (score, term) => score + (signal.includes(term) ? 3 : 0), 0,
  );
}

async function fetchPage(url: URL, options: Required<Pick<ResearchOptions, "fetchImpl" | "maxBytes" | "timeoutMs" | "retries" | "retryDelayMs" | "allowPrivateHosts">>): Promise<ResearchSource> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    try {
      await validateResearchUrl(url.href, options.allowPrivateHosts);
      const response = await options.fetchImpl(url.href, { signal: AbortSignal.timeout(options.timeoutMs) });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      return extractPage(url, await readBody(response, options.maxBytes));
    } catch (error) {
      lastError = error;
      if (attempt < options.retries && options.retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("FETCH_FAILED");
}

function failureCode(error: unknown): string {
  return error instanceof Error ? error.message : "FETCH_FAILED";
}

export async function researchCompany(startingUrl: string, options: ResearchOptions = {}): Promise<CompanyResearchResult> {
  const resolved = {
    fetchImpl: options.fetchImpl ?? fetch,
    maxPages: options.maxPages ?? defaultMaxPages,
    maxBytes: options.maxBytes ?? defaultMaxBytes,
    timeoutMs: options.timeoutMs ?? defaultTimeoutMs,
    retries: options.retries ?? defaultRetries,
    retryDelayMs: options.retryDelayMs ?? 100,
    allowPrivateHosts: options.allowPrivateHosts ?? env.NODE_ENV !== "production",
  };
  const start = await validateResearchUrl(startingUrl, resolved.allowPrivateHosts);
  const sources: ResearchSource[] = [];
  const failures: ResearchFailure[] = [];
  const visited = new Set<string>();
  const queue = [start.href];

  while (queue.length > 0 && sources.length + failures.length < resolved.maxPages) {
    const nextUrl = queue.shift();
    if (!nextUrl || visited.has(nextUrl)) continue;
    visited.add(nextUrl);
    try {
      const source = await fetchPage(new URL(nextUrl), resolved);
      sources.push(source);
      const candidates = source.links
        .filter((link) => !visited.has(link))
        .sort((left, right) => scoreLink(right, start) - scoreLink(left, start));
      queue.push(...candidates);
    } catch (error) {
      failures.push({ url: nextUrl, code: failureCode(error), message: "Source could not be retrieved.", attempts: resolved.retries });
    }
  }

  const hiringSources = sources.filter((source) => /career|hiring|jobs|handbook/i.test(`${source.url} ${source.title} ${source.text}`)).map((source) => source.url);
  const researchGaps = [
    ...(sources.length === 0 ? ["No company pages were retrieved."] : []),
    ...(hiringSources.length === 0 ? ["No hiring information was found on the discovered company pages."] : []),
    ...(failures.length > 0 ? [`${failures.length} company page(s) could not be retrieved.`] : []),
    "Public interview discussion search is not configured.",
  ];

  return { startingUrl: start.href, sources, failures, hiringSources, researchGaps };
}