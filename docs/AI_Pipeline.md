AI Pipeline

Principle

The application must use a genuine sequence of dependent steps. The system should respond to what was actually found during research.

Step 1 — Extract requirements

Input: pasted job description.

Output:

role title

seniority

responsibilities

requirements

stable requirement IDs

requirement kind: technical | behavioural | domain

priority: must | nice

The job description is the source of truth. The model must not invent requirements that are absent from the posting.

Step 2 — Retrieve the company homepage

Input: company URL.

Actions:

validate URL

fetch page

clean HTML into useful text

collect links

capture source metadata

The homepage by itself is not assumed to contain hiring information.

Step 3 — Discover useful company pages

Links are ranked based on signals such as:

path terms

anchor text

page title

relation to the starting domain

Likely useful pages include company/about, product, engineering, careers, hiring, handbook, and engineering-blog content.

A fixed /careers path is not sufficient.

Step 4 — Research hiring/interview process

Once relevant hiring information is found, it influences the question-generation stage.

For example, evidence of a take-home, system-design round, or behavioural round should affect the categories and emphasis of generated questions.

A missing hiring page is not a fatal error.

Step 5 — Public interview discussion research

Search for public discussion or interview experiences concerning the company.

The system records useful sources when found and honestly records that no useful public discussion was found when it does not exist.

Step 6 — Generate questions by requirement/category

Questions are generated from specific requirements and available research.

Categories:

technical

behavioural

system-design

company-fit

Each question contains references to the requirement IDs it covers.

This means the system can later prove whether a requirement is actually covered.

Step 7 — Deterministic coverage check

The application code builds a set of covered requirement IDs from generated questions.

For every must requirement:

requirement id present in question.requirement_ids?
    YES -> covered
    NO  -> uncovered

This decision belongs to code, not the LLM.

Step 8 — Second pass

If any must-have requirements remain uncovered:

Send only the uncovered requirements plus necessary context to question generation.

Generate missing questions.

Merge them without deleting preserved user edits.

Run coverage again.

The pipeline stops after a sensible bounded number of passes, with the chosen limit documented in the README.

The final kit should not ship with uncovered must-have requirements when the system can successfully generate questions for them.

Step 9 — Generate flashcards

Flashcards are derived from the requirements/questions and preserve requirement references where applicable.

Step 10 — Deterministic schedule allocation

Input:

available number of days

requirements/questions

priorities

difficulties

Output:

exactly the requested number of days

daily focus

question IDs

integer minutes

Every must-have requirement must appear somewhere in the schedule.

Harder and higher-priority material should be scheduled earlier rather than left to the last day.

The scheduling algorithm is application code, not a prompt.

Step 11 — Validate

Before persistence, validate:

required sections exist

IDs are stable within the kit

question requirement references are valid

schedule question IDs exist

difficulty is 1–3

minutes are integers

schedule day count matches requested days

coverage structure is valid

Failure philosophy

The pipeline should fail narrowly.

Examples:

company page unavailable -> record missing research, continue with JD

no hiring page -> continue with honest research gaps

no public discussion -> continue with no discussion found

invalid LLM JSON -> repair/retry/validate, then fail only the affected generation if necessary

one batch case fails -> record that case as failed and continue with the remaining cases