# 👔 MANAGER: Exception — Sync Updated Plan

> ⚠️ **JIT FILE:** Only load this file when `router.json` has `global_status: "manager_update_required"`.

## Execute

1. **Compare:** Read the updated `masterplan.md` and diff it against the existing `router.json`.
2. **Identify New Tasks:** Find any tasks in the masterplan that are NOT in `router.json`.
3. **Inject:** Add new tasks to `router.json` as `"pending"`.
4. **Provision:** Create new task folders with `task.json` and `instruction.md` for each new task.
5. **Reset:** Change `global_status` back to `"executing"` in `router.json`.
6. **Reply:** *"State updated with new recovery tasks. Ask a Worker to begin."*
