Architecture

High-level flow

Next.js UI
   |
   v
Express API
   |
   +--> Authentication
   |
   +--> Kit Service --------------------+
   |                                     |
   +--> Research Service                 |
   |       |                             |
   |       +--> Web Crawler              |
   |       +--> Page Ranking             |
   |       +--> Public Interview Search  |
   |                                     |
   +--> Generation Service               |
   |       |                             |
   |       +--> Requirement Extraction   |
   |       +--> Question Generation      |
   |       +--> Flashcard Generation     |
   |                                     |
   +--> Coverage Service                 |
   |       +--> deterministic gap check  |
   |       +--> second-pass generation   |
   |                                     |
   +--> Schedule Service                 |
   |       +--> deterministic allocation |
   |                                     |
   +--> Validation Service               |
   |                                     |
   +--> Practice Service                 |
   |                                     |
   v                                     |
 MongoDB <-------------------------------+

Main components

Authentication

Responsible for registration, login, logout, session handling, and protecting user-owned resources.

A request must be authorised before reading or mutating a kit. A user can only access their own kits.

Kit Service

Owns creation, retrieval, update, deletion, section-level regeneration, and persistence of interview kits.

Research Service

Handles external retrieval:

URL validation

HTTP fetching

redirects and timeouts

content-type and size checks

robots/terms-aware crawling

link extraction and ranking

hiring-page discovery

public interview-process research

retry and backoff

Research results include source URLs and failure metadata.

Generation Service

Runs the LLM workflows. Each generation step receives only the information required for that step instead of one enormous context/prompt.

Coverage Service

Maps generated questions back to requirement IDs and deterministically identifies must-have requirements without question coverage.

Uncovered requirements are sent back to question generation for a second pass.

Schedule Service

Takes requirements/questions and the requested number of days and deterministically allocates material across exactly that many days.

The scheduler ensures every must-have requirement appears somewhere in the schedule and prioritises harder/higher-priority content earlier.

Validation Service

Checks the generated kit against the required structure before saving it. Validation covers required fields, stable IDs, valid references, valid categories, difficulty range, and integer minute values.

Practice Service

Stores flashcard confidence and completion state. The next practice session can prioritise lower-confidence cards.

Frontend sections

A practical UI can be split into:

Authentication

Dashboard / kit list

Create kit

Generation progress

Company

Role

Questions

Flashcards

Schedule

Practice

Long-running generation

Generation is an asynchronous workflow from the user's point of view. The UI should show step-level progress, clear failures, and recovery information.

The backend should protect against duplicate generation requests and persist enough state for a kit to be reopened later.

Generation runtime flow

The current deployment uses a MongoDB-backed status record and an in-process background coordinator:

1. `POST /api/kits` validates the request and creates a `pending` record.
2. The coordinator atomically claims the record and changes it to `running`.
3. The coordinator invokes the shared interview-kit pipeline.
4. A successful result is validated and persisted with `completed` status.
5. A failure is persisted with `failed` status and an error code/message.

The request returns the kit ID immediately. The frontend refreshes the server-rendered detail page with adaptive polling: checks are more frequent during the first 30 seconds, slow down as generation continues, pause when the tab is hidden, and stop after five minutes. This is a server-component refresh, not a full browser reload.

This design is appropriate for the small audience of the hiring assignment. A process restart can interrupt an in-flight generation, so a durable queue remains a future upgrade rather than a current dependency.

Security boundary

External pages and pasted job descriptions are untrusted content.

Important protections include:

validate URLs before fetching

reject private/loopback destinations in production

reject IPv4-mapped private destinations in production

restrict content types and response sizes

set timeouts

restrict API CORS to the configured frontend origin

send security headers and apply API rate limits

rate-limit outbound retrieval

treat scraped text as data, never as tool/model instructions

validate LLM output before persistence

Batch evaluator

The evaluator calls the same domain pipeline used by the web application:

cases.json
   |
   v
evaluate command
   |
   v
same research/generation/coverage/scheduling pipeline
   |
   v
kits.json

There is deliberately no separate batch-only implementation.

Deployment shape

For a small live assignment deployment:

Next.js frontend -> Vercel

Express API and in-process coordinator -> Render, Railway, or another persistent Node service

MongoDB -> MongoDB Atlas

LLM -> OpenAI API

The frontend and backend must share `AUTH_INTERNAL_SECRET`. The backend must configure `FRONTEND_ORIGIN`, `MONGODB_URI`, and `LLM_API_KEY` for OpenAI. A sleeping backend can interrupt generation, so a persistent service is preferred for the demo.