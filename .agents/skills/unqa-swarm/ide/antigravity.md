# 🖥️ IDE Adapter: Antigravity (Google)

> This is the **default** IDE adapter for UNQA Swarm. Loaded when `unqa-swarm.config.json` → `"ide": "antigravity"`.

## Tool-Chaining

Antigravity provides native `view_file` and `run_command` tools. Use these for autonomous phase transitions:
- **Phase transitions:** Use `view_file` to silently ingest the next microfile (e.g., `02_execute.md`) without asking the user.
- **Skeleton context:** Use `run_command` to execute `node scripts/skeleton.js [files]` or `python3 scripts/skeleton.py [files]`. The terminal output is injected directly into your context — no need to read files separately.

## Artifacts

Antigravity supports artifact creation. The Architect should generate `ImplementationPlan.md` as an artifact so the user can review it inline with commenting.

## Terminal

- All terminal commands go through `run_command`.
- Output is automatically captured — no manual copy-paste needed.
- Use `SafeToAutoRun: true` for non-destructive commands (e.g., linting, compiling).

## File Operations

- Use `write_to_file` for creating new files.
- Use `replace_file_content` or `multi_replace_file_content` for surgical edits (required by The Surgeon Law for files >50 lines).
