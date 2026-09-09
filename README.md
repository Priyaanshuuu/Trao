AI Interview Prep Kit

An AI-powered interview preparation platform that turns a job description, company website, and available preparation time into a structured, editable interview preparation kit.

What the application does

A user can:

Register and log in.

Paste a job description.

Enter the company's website URL.

Enter the number of days available before the interview.

Generate a personalised interview preparation kit.

Edit, reorder, add, delete, and regenerate kit content without losing unrelated user edits.

Practise using flashcards and record confidence.

The system researches the company website, attempts to discover hiring information, researches public discussion of the company's interview process, extracts requirements from the job description, generates questions by category, checks requirement coverage, creates flashcards, and allocates preparation material across the requested number of days.

Kit contents

Each kit contains:

Company brief

Role breakdown

Requirements with stable IDs

Categorised interview questions

Flashcards

Day-by-day preparation schedule

Coverage information

The required kit field names and structure are defined by the assessment and must not be changed.

Tech stack

Frontend: Next.js + Tailwind CSS

Backend: Node.js + Express

Database: MongoDB

Language: TypeScript

Scraping/retrieval: pluggable crawler/fetching layer

LLM: a provider with a genuine free tier

The exact provider/model used by the implementation is documented in TECH_STACK_AND_APPROACH.md.

Local setup

npm install

Create .env from .env.example and provide the required credentials.

Start the application using the project scripts documented by the implementation.

Local services

Start MongoDB locally or use a MongoDB Atlas connection string. Then start the backend and frontend in separate terminals:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

For GitHub OAuth local development, use this callback URL in the GitHub OAuth App:

`http://localhost:3000/api/auth/callback/github`

The same `AUTH_INTERNAL_SECRET` must be present in both frontend and backend environment files. MongoDB URI credentials must percent-encode reserved characters such as `@`, `#`, `%`, `/`, `?`, and `:`. For example, `Priyanshu@2004` becomes `Priyanshu%402004`.

Live assignment deployment

Deploy the frontend to Vercel and the backend as a persistent Node service on Render or Railway. Use MongoDB Atlas for persistence and configure the OpenAI API key on the backend. Set the frontend `BACKEND_URL` to the deployed backend URL and set the backend `FRONTEND_ORIGIN` to the deployed frontend URL.

The live assignment uses the in-process generation coordinator instead of Redis. This is intentionally simpler for a small recruiter audience. A backend restart can interrupt an active generation; BullMQ with Redis or a durable MongoDB worker is the upgrade path if stronger job recovery is required.

Known limitations

- Public interview discussion search is not configured yet; the kit reports that gap honestly.
- In-process generation is not durable across backend restarts.
- The current frontend focuses on kit creation, status, summary, schedule, and flashcard practice; broader section-level editing and regeneration can be added later.
- A persistent backend service is recommended because sleeping services can interrupt long AI generation.

Evaluation command

The repository must expose the exact batch entry point required by the assessment:

npm run evaluate -- --input <cases.json> --output <kits.json>

The evaluator uses the same retrieval, generation, validation, coverage, and scheduling pipeline as the web application.

The shared pipeline runs requirement extraction, company research, question generation, one bounded coverage-repair pass, flashcard generation, deterministic scheduling, and final kit validation in that order.

Kit generation uses a MongoDB-backed status record and an in-process background coordinator. Creating a kit returns immediately with `pending` status; the coordinator changes it to `running`, executes the shared pipeline, and persists `completed` or `failed`. The frontend polls the kit detail page while generation is active. This keeps the deployed assignment simple without requiring Redis.

Important engineering decisions

Research is performed as a sequence of deliberate steps rather than one giant LLM prompt.

Requirement-to-question relationships are explicit through stable IDs.

Coverage checking is deterministic application code.

Schedule allocation is deterministic application code.

External website content is treated as untrusted data, not as instructions.

Partial research failure does not automatically fail a case.

Question coverage repair is bounded to one second-generation pass. Existing questions, including user-edited or pinned items, are preserved during that pass.

User edits must survive regeneration of unrelated or generated sections.

Generated output is validated before persistence.

LLM rate limits and transient failures are retried with backoff.

Testing

The most important automated tests protect:

Schedule allocation

Requirement coverage detection

Generated kit structure validation

Important failure/edge cases

See TESTING_AND_EVALUATION.md for details.

Documentation

TECH_STACK_AND_APPROACH.md — stack choices and implementation approach

ARCHITECTURE.md — system architecture and service boundaries

AI_PIPELINE.md — research and generation sequence

TRADEOFFS.md — key engineering decisions and alternatives

TESTING_AND_EVALUATION.md — tests and mandatory batch evaluation