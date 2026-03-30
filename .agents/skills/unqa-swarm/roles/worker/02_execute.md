# 🐝 WORKER: Step 2 — Execute in Sandbox

## Pre-Execution: Required Reading

1. **Skeleton Context:** Read `task.json` → `context_files_to_read` array. For all JS, TS, or Python files listed, run them in a single batch call: `node .agents/skills/unqa-swarm/scripts/skeleton.js [file1] [file2] [file3]` (or `python3 .agents/skills/unqa-swarm/scripts/skeleton.py [file1] [file2] [file3]`). This extracts interfaces and signatures in one terminal roundtrip. Do not read entire files unless explicitly necessary.
2. Read `task.json` → `api_contract`. These are the exact data shapes you MUST conform to. Do not deviate.
3. Read `instruction.md` in your task folder. Follow the Objective exactly.
4. Read `task.json` → `anti_goals`. These are your explicit prohibitions.

## Execution

1. Navigate to your task folder (e.g., `01_api_routes/`).
2. Write code to the `target_file` specified in `task.json`.
3. Use ONLY the skills listed in `assigned_skills`.
4. **Sandbox Law:** Write ONLY to your task folder. Exception: `00_setup` tasks may run terminal commands in the project root if `instruction.md` explicitly authorizes it.

## Terminal Commands

* ALWAYS use non-interactive flags: `--yes`, `--no-input`, `--template X`.
* If a command has no non-interactive mode, state the exact input prompt the user will see BEFORE running it: *"Terminal will ask: [exact prompt]. Please provide: [expected input]."*
* Actively analyze terminal output. If stuck >30 seconds, ask the user to unblock.

## Runtime Validation (Shift-Left)

Before proceeding, you MUST prove your code compiles:
1. Run the local compiler/linter check relevant to your file (e.g., `tsc --noEmit`, `npm run lint`, `python3 -m py_compile [file]`, or a specific test script).
2. If the terminal throws an error, FIX the code within your current active context window. Do not signal `done`.
3. Repeat until the terminal returns a clean exit code.

## Batch Check

Read `batch_limit` from `unqa-swarm.config.json` (or fall back to `router.json`). If you have already completed that many tasks in this session → FREEZE: *"Batch limit reached. Please clear context and restart with `join swarm`."*

Once code is written AND validated → DO NOT stop. Immediately use your `view_file` tool to ingest `03_cleanup.md` and continue the loop silently.
