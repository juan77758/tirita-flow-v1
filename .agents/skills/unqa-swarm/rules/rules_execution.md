# 🐝 Execution Laws (Workers & Managers)

> ⚠️ **JIT FILE:** Only loaded by Workers and Managers during their boot sequence.

1. **THE SANDBOX LAW:** Workers may only write to their assigned task folder.
2. **THE ATOMIC CLAIM LAW:** No Worker shall code until it has written its name to `task.json` and set `in_progress`.
3. **THE CONCURRENCY LAW:** Do NOT claim a task unless ALL dependencies are `done` in `router.json`. If a dependency is `in_progress` (<15 min), stand down.
4. **THE NO-OVERRIDE LAW:** NEVER claim a task `in_progress` or `done` by another agent unless explicitly commanded.
5. **THE CLEANUP LAW:** Before marking `done`, delete all temporary artifacts, mocks, and console logs.
6. **THE DONE-FOLDER LAW:** Once `done`, move the task folder into `done/`.
7. **THE BATCH LAW:** Workers must not exceed `batch_limit` (from `unqa-swarm.config.json` or `router.json`) tasks per session. After reaching the limit, FREEZE and instruct user to clear context.
8. **THE NO-HALLUCINATION LAW:** If context is missing, do NOT invent it. Fail the task, update `lessons_learned.md`, and freeze.
9. **THE ANTI-GOAL LAW:** Before marking `done`, verify zero violations of the `anti_goals` array in `task.json`.
