Test priorities

The highest-value automated tests cover the deterministic parts of the system and the contracts that external evaluation depends on.

1. Schedule allocation tests

Verify:

requested days = number of generated days

every day has a focus

question IDs point to existing questions

minutes are integers

every must-have requirement appears in the schedule

high-priority/harder material is not systematically pushed to the final day

1-day input works

large day counts such as 60 work

2. Coverage tests

Example:

Requirements: r1, r2, r3
Questions cover: r1, r2
Expected uncovered: r3

Also test:

one question covering multiple requirements

nice-to-have requirement without coverage

must-have requirement with coverage

repeated question references

empty question set

3. Structure validation tests

Validate the Appendix A contract, including:

required top-level sections

required field names

stable IDs

valid requirement kinds

valid priorities

valid question categories

difficulty between 1 and 3

integer minute values

schedule question IDs that exist

coverage fields

Invalid generated JSON should be rejected or repaired before persistence.

4. Research/error tests

Cover:

invalid URL

HTTP 404

timeout

unreachable company

company with no discoverable hiring page

no public interview discussion

relative links from local hosts

unexpected content type

excessive response size

transient failure followed by success

rate limiting with retry/backoff

5. Generation failure tests

Cover:

malformed LLM JSON

missing required fields

incomplete generated kit

transient LLM failure

rate-limit response

duplicate generation attempt

6. Data ownership tests

Verify that:

signed-out users cannot access protected data

one user cannot read another user's kits

one user cannot modify another user's kits

7. Regeneration/state tests

Example:

Generated questions
       |
User edits q3
       |
Regenerate technical category
       |
Expected: q3 edit survives

Also verify that deleting, adding, reordering, or pinning content does not get silently undone by unrelated regeneration.

8. Practice tests

Verify:

flashcards can be stepped through

answers reveal correctly

confidence is stored

progress is stored

low-confidence material can be prioritised next

9. Generation coordination tests

Verify:

pending kit becomes running and then completed

pipeline output is persisted to the owning kit

pipeline failure becomes failed with an error code/message

duplicate requests do not start two active generations

frontend status refresh slows down over time

hidden browser tabs pause status requests

status polling stops after its maximum duration

10. Deployment and configuration tests

Verify:

MongoDB passwords with reserved URI characters are percent-encoded

missing LLM credentials fail clearly

frontend and backend use the same internal auth secret

configured CORS origin is accepted and other origins are not reflected

security headers are present

rate limits return a controlled response

production SSRF checks reject private and IPv4-mapped private destinations

Mandatory batch evaluation

The repository must expose:

npm run evaluate -- --input <cases.json> --output <kits.json>

Input

An array of cases:

[
  {
    "id": "case-01",
    "jd": "Senior Backend Engineer...",
    "company_url": "http://localhost:8099/acme/",
    "days": 5
  }
]

Output

{
  "version": "1.0",
  "generated_at": "2026-09-01T09:12:44Z",
  "kits": [
    {
      "id": "case-01",
      "status": "ok",
      "kit": { "...": "Appendix A structure" },
      "error": null
    }
  ]
}

A completely unsuccessful case is represented as:

{
  "id": "case-04",
  "status": "failed",
  "kit": null,
  "error": {
    "code": "COMPANY_UNREACHABLE",
    "message": "Company site unreachable after 3 retries."
  }
}

Partial research is still ok when a valid kit can be produced; the missing information should be represented honestly inside the kit.

Evaluator constraints to verify locally

Before submission, verify:

command works from a clean clone

environment variables are documented in .env.example

local company URLs work, including relative links

one failing case does not abort the batch

five cases complete within the required time budget under realistic rate limits

the output matches the required structure

Pre-submission checklist

Authentication works

User isolation works

Kit creation works

Company crawling works

Hiring-page discovery is not hard-coded

Public interview research works or fails honestly

Requirement IDs are stable

Questions reference requirement IDs

Coverage check is deterministic

Second pass closes missing must-have coverage

Schedule has exactly requested days

Schedule uses integer minutes

User edits survive regeneration

Flashcard practice stores confidence

Edge cases are handled

npm run evaluate -- --input ... --output ... works

README explains the design

Public frontend and backend are deployed

Generation coordinator is verified on the deployed backend

Recruiter can create a kit and see it progress to completed or failed