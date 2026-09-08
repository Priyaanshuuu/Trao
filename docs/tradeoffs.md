Trade-offs and Engineering Decisions

1. Multi-step pipeline vs one LLM prompt

Decision

Use a staged pipeline.

Why

A single prompt would hide important system behaviour and would not genuinely respond to discovered company information. The assessment explicitly evaluates sequencing and the coverage loop.

Trade-off

More orchestration code, more LLM calls, and more failure points.

Why it is worth it

The result is explainable, testable, and aligned with the evaluation criteria.

2. Deterministic coverage vs LLM judgement

Decision

Coverage is computed in application code.

Why

The system can reliably compare requirement IDs against question requirement IDs without subjective model judgement.

Trade-off

The application needs stable identifiers and explicit schemas.

3. Deterministic scheduling vs LLM scheduling

Decision

Use code for allocation.

Why

Day count, integer duration, requirement coverage, and ordering rules are arithmetic/constraints.

Trade-off

The scheduler requires deliberate heuristics for priority and difficulty.

4. Crawl and rank links vs fixed paths

Decision

Discover and rank links dynamically.

Why

Hiring information may be buried at unexpected URLs.

Trade-off

Link extraction/ranking is more work and can fetch irrelevant pages.

Mitigation

Bound the crawl, score useful links, and keep source/failure records.

5. Preserve user edits during regeneration

Decision

Track generated/user-authored and optionally pinned state at item/section level.

Why

Regeneration should update generated content without clobbering content the user changed manually.

Trade-off

The data model and merge logic are more complex.

Mitigation

Regeneration operates on explicit replacement candidates instead of replacing the entire array/document blindly.

6. Partial research vs hard failure

Decision

Treat missing research as a partial result whenever a useful kit can still be produced.

Why

The absence of a hiring page or interview discussion is valid information, not necessarily a system failure.

Trade-off

Some kits will contain less company-specific information.

Benefit

The system remains honest and robust.

7. Free-tier LLM with retry/backoff

Decision

Use a free-tier provider and implement rate-limit handling.

Why

The assessment provides no API key and expects free-tier-compatible implementation.

Trade-off

Token-per-minute limits can make generation slower and require fewer/conservative calls.

Mitigation

Use bounded retries with exponential backoff, avoid unnecessary parallel calls, and reuse intermediate results.

8. MongoDB document model

Decision

Persist the kit as a document-oriented object with related practice state.

Why

The required output already has a nested document structure, and reopening a kit should be straightforward.

Trade-off

Some highly granular queries/updates are less natural than with a heavily normalised relational schema.

Mitigation

Use clear service boundaries and targeted updates rather than rewriting the entire document for every edit.

9. One shared evaluator pipeline

Decision

The CLI calls the same domain services used by the web application.

Why

This prevents the evaluator from silently testing a different implementation.

Trade-off

The domain layer must remain decoupled from HTTP request/response objects.

Benefit

The application and batch evaluation stay consistent.

10. Honest thin output vs fabricated completeness

Decision

Prefer an incomplete but truthful kit to invented requirements or company facts.

Why

Inventing information is explicitly worse than reporting that the available source material was thin.

Trade-off

Some test cases will produce visibly smaller kits.

Benefit

Higher factual integrity and better behaviour on adversarial/edge cases.