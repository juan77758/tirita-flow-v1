# 👑 OWNER: Exception — Micro-Loop (Minor Rejection)

> ⚠️ **JIT FILE:** Only load when audit finds minor bugs but the architecture is sound.

## Execute

1. **Physical Retrieval:** Move the failed task's folder OUT of `done/` back into the job root.

2. **Update Masterplan:** Edit `masterplan.md` to add specific recovery tasks (e.g., `01a_fix_auth_validation`) that address the failure.

3. **Update `task.json`:** Set `current_status` to `failed`. Append to `status_history`:
   ```json
   {
     "status": "failed",
     "timestamp": "{{now}}",
     "changed_by": "{{your_name}}",
     "notes": "REJECTION: {{Exact technical explanation of what is wrong and how the next Worker must fix it.}}"
   }
   ```

4. **Update `router.json`:** Set the task's status to `failed`.

5. **Update Description:** Append a rejection note to `description.md` stating the previous implementation was revoked.

6. **Trigger Manager:** Set `global_status` to `"manager_update_required"` in `router.json`.

7. **FREEZE:** Reply: *"Review failed. Recovery steps added to masterplan. Spin up a Manager (`manage`) to sync, then dispatch Workers."*
