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

Evaluation command

The repository must expose the exact batch entry point required by the assessment:

npm run evaluate -- --input <cases.json> --output <kits.json>

The evaluator uses the same retrieval, generation, validation, coverage, and scheduling pipeline as the web application.

Important engineering decisions

Research is performed as a sequence of deliberate steps rather than one giant LLM prompt.

Requirement-to-question relationships are explicit through stable IDs.

Coverage checking is deterministic application code.

Schedule allocation is deterministic application code.

External website content is treated as untrusted data, not as instructions.

Partial research failure does not automatically fail a case.

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