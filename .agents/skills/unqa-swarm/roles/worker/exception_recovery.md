# 🐝 WORKER: Exception — Failed Task Recovery

> ⚠️ **JIT FILE:** Only load this file when `task.json` shows `current_status: "failed"`.

## Recovery Protocol

1. **Read Rejection Notes:** Open `task.json` → `status_history`. Read the LAST entry — it will be the Owner's rejection with `status: "failed"` and detailed `notes` explaining exactly what went wrong.

2. **Understand the Fix:** Parse the Owner's notes. The fix must address ONLY the specific issue raised. Do not refactor, improve, or expand scope.

3. **Re-enter Normal Flow:** DO NOT stop. Immediately use your `view_file` tool to ingest `02_execute.md` into your memory and continue executing silently with the fix in mind. The Atomic Claim is already done (your name is in `workers_assigned`). Update `task.json`:
   * Set `current_status` to `in_progress`
   * Append to `status_history`:
     ```json
     {"status": "in_progress", "timestamp": "{{now}}", "changed_by": "{{your_name}}", "notes": "Re-claiming failed task. Fixing: {{brief description of Owner's issue}}"}
     ```

4. Continue with `02_execute.md` → `03_cleanup.md` as normal.
