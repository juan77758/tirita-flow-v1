# 🏗️ ARCHITECT: Exception — Update Existing Plan

> ⚠️ **JIT FILE:** Only load this file when the user explicitly says "update plan" and an active job exists.

## Execute

1. **Ingest Current State:** Read the active job's `masterplan.md` and `description.md` (if workers have already documented progress).
2. **Read Lessons Learned:** Check `lessons_learned.md` for any friction or bugs discovered during execution.
3. **Propose Changes:** Present a diff-style summary of what you would change in the masterplan. Do NOT modify files yet.
4. **User Approval:** Wait for explicit approval before editing `masterplan.md`.
5. **Update Masterplan:** Apply changes. If new tasks were added, note them clearly so the Manager knows to create new folders.
6. **Set Status:** If Workers need to act on the changes, instruct the user to set `global_status` to `manager_update_required` in `router.json`, then spin up a Manager.
