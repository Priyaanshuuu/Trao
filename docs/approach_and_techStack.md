Tech Stack and Approach

Goal

Build a reliable interview-preparation pipeline that combines structured job-description analysis with company research and produces an editable preparation kit.

Technology choices

Frontend — Next.js + Tailwind CSS

Next.js provides the application UI and routing, while Tailwind CSS supports fast, consistent responsive styling.

The UI needs clear loading, empty, and failure states because generation can take a significant amount of time. Editing and reordering should feel immediate, so local/client state should handle in-progress edits rather than sending a request for every keystroke.

Backend — Node.js + Express

The backend owns authentication, input validation, retrieval, AI orchestration, deterministic validation, scheduling, persistence, and practice progress.

The implementation should keep retrieval, extraction, generation, scheduling, and persistence as separate concerns.

Database — MongoDB

MongoDB is used to persist users, kits, kit contents, generation metadata, and practice progress. A kit is a nested domain object, so storing a kit and its related state as documents keeps reopening and editing straightforward.

Language — TypeScript

TypeScript is used across the application to make the kit schema, service interfaces, API contracts, and evaluator input/output safer and easier to reason about.

LLM

Use Groq through its OpenAI-compatible chat-completions API. The default model is `openai/gpt-oss-20b`, selected for its availability and structured JSON response support. The implementation keeps the provider behind a `TextGenerator` interface so the model can be replaced without changing the pipeline.

The backend reads `LLM_API_KEY`, `LLM_MODEL`, and `LLM_TIMEOUT_MS` from its environment. Provider calls retry transient HTTP failures with bounded exponential backoff. Generated JSON is parsed and validated against the requested Zod schema before it can reach a domain service.

The LLM is responsible for language-heavy tasks such as:

extracting requirements

summarising company information

identifying useful information in research material

generating category-specific questions

generating answer outlines

generating flashcards

The LLM is not trusted with deterministic decisions such as coverage calculation or schedule arithmetic.

Generation configuration and failure behavior

The backend uses `LLM_API_KEY`, `LLM_MODEL`, and `LLM_TIMEOUT_MS`. The current default is Groq `openai/gpt-oss-20b` through the OpenAI-compatible chat-completions API. Provider responses are retried with bounded backoff for transient failures, while malformed JSON and schema mismatches receive a bounded repair attempt.

The generation request is asynchronous from the user's perspective. MongoDB stores the kit status and result, and an in-process coordinator runs the pipeline after the initial request returns. This avoids Redis for the small assignment deployment. The design can later move the coordinator to a MongoDB worker or BullMQ/Redis without changing the pipeline services.

Retrieval approach

The user directly supplies the job description, so no job-board retrieval is needed for the JD.

For the company URL:

Validate the URL.

Fetch the starting page.

Extract and normalise links.

Follow relative links correctly.

Rank links using useful signals such as URL path and anchor text.

Fetch a bounded number of promising pages.

Prefer company/about/product/engineering/careers/hiring information when discovered.

Separately search for public discussion of the company's interview process.

Record successful and failed sources.

A fixed list of paths is intentionally avoided because hiring information can live at unexpected locations.

Generation approach

The generation pipeline is staged:

Extract requirements from the JD.

Research the company.

Research hiring/interview information.

Generate questions separately for requirements/categories.

Run deterministic coverage checking.

Generate missing questions for uncovered requirements.

Re-check coverage.

Generate flashcards.

Allocate the material into exactly the requested number of days.

Validate the final kit structure.

Persist the kit.

If company research is incomplete, the pipeline records research gaps and continues when the remaining inputs are sufficient. If generation or final validation fails, the kit is saved as `failed` with an error object rather than being presented as complete.

State model

Kit items should distinguish between machine-generated content and user-authored changes. A practical model is to track fields such as:

origin: generated | user

edited: boolean

pinned: boolean

Regeneration operates only on content that is eligible for replacement. User-edited or pinned content is preserved unless the user explicitly chooses otherwise.

Why this approach

The assessment evaluates whether the system responds to discovered information rather than blindly producing a single generic answer. It also requires edits to survive regeneration, and it requires deterministic coverage and scheduling. The architecture therefore makes those responsibilities explicit instead of hiding them inside prompts.