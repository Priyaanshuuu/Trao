import assert from "node:assert/strict";
import test from "node:test";
import { createKitRequestSchema } from "./kitRequest.js";

test("accepts a valid kit creation request", () => {
  const result = createKitRequestSchema.safeParse({
    jobDescription: "Senior backend engineer responsible for reliable APIs.",
    companyUrl: "https://example.com/careers",
    days: 5,
  });
  assert.equal(result.success, true);
});

test("rejects unsafe URLs and unsupported day counts", () => {
  const result = createKitRequestSchema.safeParse({
    jobDescription: "Senior backend engineer responsible for reliable APIs.",
    companyUrl: "file:///private.txt",
    days: 61,
  });
  assert.equal(result.success, false);
});

test("coerces form-style day values to integers", () => {
  const result = createKitRequestSchema.safeParse({
    jobDescription: "Senior backend engineer responsible for reliable APIs.",
    companyUrl: "https://example.com",
    days: "7",
  });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.days, 7);
});