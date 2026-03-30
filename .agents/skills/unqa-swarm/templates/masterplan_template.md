# 🗺️ Masterplan: {{Project_Name}}

**Job ID:** `job_{{timestamp}}_{{short_desc}}`
**Architect:** {{Your_Agent_Name}}
**Status:** Approved & Ready for Swarm Manager
**Overview:** {{2-3 sentence summary of the final approved architecture.}}

---

## 📖 Reference Files Read

*The Architect read these files before designing this plan:*
| File | Key Observations |
|:-----|:-----------------|
| `{{file_path}}` | {{What was learned from this file}} |

---

## 🏗️ Execution DAG (Directed Acyclic Graph)

*Note to Manager: Parse this table to generate `router.json` and provision task folders with `task.json`.*

| Task ID | Target File / Dir | Dependencies | Required Skills | Context Files to Read | Anti-Goals (DO NOT) | Task Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `00_setup` | `/` (Root) | None | `['skill-finder']` | `['package.json']` | `['Do NOT modify existing config']` | *(Optional)* Install dependencies. |
| `01_...` | `path/to/file.ext` | `00_setup` | `['specific-skill']` | `['path/to/schema.ts', 'path/to/types.d.ts']` | `['Do NOT install new packages', 'Do NOT edit CSS']` | {{Detailed task description}} |
| `02_...` | `path/to/file.ext` | `01_...` | `['specific-skill']` | `['path/to/related_file']` | `['Do NOT modify database schema']` | {{Next sequential task}} |

---

## 🔌 API Contracts

*Exact data shapes for all inter-task data flow. Workers MUST conform to these.*

### {{Task ID}} → {{Task ID}} Interface

```json
{
  "{{METHOD}} {{/endpoint/path}}": {
    "request": {
      "{{field}}": "{{type}}"
    },
    "response": {
      "{{field}}": "{{type}}"
    }
  }
}
```

### Shared Types

```typescript
// {{TypeName}} — used by tasks {{list}}
interface {{TypeName}} {
  {{field}}: {{type}};
}
```

---

## ⚠️ Risk Analysis (Pre-Mortem)

*How this plan might fail:*

| Risk | Probability | Impact | Mitigation |
|:-----|:-----------|:-------|:-----------|
| {{Description of failure mode}} | {{High/Med/Low}} | {{What breaks}} | {{How to prevent or recover}} |

---

## 🛑 Architect Handoff
*I have finalized this Masterplan based on user approval. I am now FREEZING to protect my context window.*

**User Action Required:** Open a new chat window and type `join swarm` or `manage` to spawn the **Manager**. The Manager will read this Masterplan, build the workspace, and dispatch Workers. Return to me for review.