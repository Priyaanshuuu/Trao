import assert from "node:assert/strict";
import test from "node:test";
import { researchCompany, validateResearchUrl } from "./companyResearch.js";

function response(body: string, status = 200, contentType = "text/html"): Response {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

test("rejects private destinations when production protection is enabled", async () => {
  await assert.rejects(() => validateResearchUrl("http://127.0.0.1:8080", false), /URL_PRIVATE_DESTINATION/);
});

test("extracts text and resolves relative links while ranking useful pages", async () => {
  const pages: Record<string, Response> = {
    "https://acme.test/": response("<html><head><title>Acme</title></head><body><nav>Menu</nav><h1>Acme</h1><a href='/careers'>Careers</a><a href='/random'>Random</a></body></html>"),
    "https://acme.test/careers": response("<html><head><title>Careers</title></head><body><h1>Hiring engineers</h1></body></html>"),
    "https://acme.test/random": response("<body>Other page</body>"),
  };
  const result = await researchCompany("https://acme.test/", { fetchImpl: async (url) => pages[url] ?? response("missing", 404), retries: 1, maxPages: 2, allowPrivateHosts: true });
  assert.equal(result.sources.length, 2);
  assert.match(result.sources[0]?.text ?? "", /Acme/);
  assert.deepEqual(result.hiringSources, ["https://acme.test/", "https://acme.test/careers"]);
});

test("records failed pages and continues with partial research", async () => {
  const result = await researchCompany("https://acme.test/", { fetchImpl: async (url) => url.endsWith("/") ? response("<a href='/careers'>Careers</a>") : response("no", 503), retries: 2, maxPages: 2, allowPrivateHosts: true });
  assert.equal(result.sources.length, 1);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0]?.attempts, 2);
  assert.match(result.researchGaps.join(" "), /could not be retrieved/);
});

test("rejects oversized and unsupported responses", async () => {
  const result = await researchCompany("https://acme.test/", { fetchImpl: async () => response("large", 200, "application/pdf"), retries: 1, allowPrivateHosts: true });
  assert.equal(result.sources.length, 0);
  assert.equal(result.failures[0]?.code, "CONTENT_TYPE_UNSUPPORTED");
});