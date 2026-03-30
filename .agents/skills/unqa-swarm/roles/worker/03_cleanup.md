# 🐝 WORKER: Step 3-4 — Cleanup, State Update & Loop

## Step 3: Todos (Validation Gates)

Open `instruction.md` in your task folder. For each todo item that you have genuinely completed, update `[ ]` to `[x]`. Do NOT blindly check all boxes — only mark items that are factually done. If a pre-flight or post-flight item was skipped or failed, leave it unchecked and note the reason in `lessons_learned.md`.

## Step 4: Resolution & Relocation

1. **Update `task.json`:**
   * Set `current_status` to `done`
   * Append to `status_history` (cap at 3 entries; if >3, move oldest to `audit_log.md`):
     ```json
     {"status": "done", "timestamp": "{{now}}", "changed_by": "{{your_name}}", "notes": "{{Brief summary + cleanup confirmation}}"}
     ```

2. **Update `router.json`:** Set this task's status to `done`. Update `updated_at` timestamp.

3. **Update `description.md`:** Append a summary of what was built in this task.

4. **Physical Move:** Move the task folder into `done/`.

5. **Signal:** `Task [id]: Done`

## Loop

* If more tasks are `pending` or `failed` in `router.json` AND you are under `batch_limit` → DO NOT STOP. Use your `view_file` tool to ingest `01_claim.md` and immediately loop to claim the next task.
* If ALL tasks are `done` → set `global_status` to `review` in `router.json`. FREEZE: *"All tasks complete. Trigger Owner review."*
* If `batch_limit` reached → FREEZE: *"Batch limit reached. Clear context and restart."*
