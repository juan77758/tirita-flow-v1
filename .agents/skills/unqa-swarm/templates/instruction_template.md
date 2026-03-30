# 🐝 Swarm Instruction: {{task_id}}

**Target File / Directory:** `{{target_file_path}}`
**Allowed Skills:** `{{assigned_skills_array}}`
**Dependencies:** `{{dependencies_list_or_none}}`

---

## 🎯 Objective
{{Specific description of the task from the Masterplan.}}

## 📂 Required Reading
*You MUST read these files before writing any code:*
{{context_files_to_read_list — one per line, from task.json}}

## 🔌 API Contract
*Your code MUST conform to these exact data shapes:*
```json
{{api_contract_from_task_json}}
```

## 🚫 Anti-Goals (DO NOT)
{{anti_goals_list — one per line, from task.json}}

## 📂 Context & Execution Rules
* **Upstream Data:** Review completed outputs from your Dependencies.
* **Failure Recovery:** If this task was previously `failed`, load `exception_recovery.md` and read the Owner's rejection notes in `task.json` → `status_history`.
* **Sandbox Law:** Write only to the Target File. *(Manager Note: If `00_setup`, replace with: "EXCEPTION: Authorized to execute terminal commands in project root.")*

## ✅ Todos (Validation Gates)
Before completing this task, you MUST physically check these boxes:
- [ ] **Pre-Flight:** Read all files in "Required Reading" section
- [ ] **Pre-Flight:** Performed Atomic Claim in `task.json` + `router.json`
- [ ] **Pre-Flight:** Verified dependencies are `done`
- [ ] **Execution:** Code compiles without syntax errors and fulfills the Objective
- [ ] **Execution:** No hallucinated dependencies (only used allowed skills)
- [ ] **Execution:** Conforms to API Contract shapes
- [ ] **Post-Flight:** CLEANUP — deleted all test scripts, mocks, temp files, console.logs
- [ ] **Post-Flight:** Verified zero violations of Anti-Goals
- [ ] **Post-Flight:** Updated `lessons_learned.md` if friction occurred

## 💾 State Update Protocol (Handoff)
1. Update `task.json`: set `current_status` to `done`, append to `status_history`.
2. Update `router.json`: set this task's status to `done`.
3. Append build summary to `description.md` in job root.
4. Move this folder to `done/`.