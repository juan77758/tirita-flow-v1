# 🛑 UNQA Swarm Global Routing Rule

**To the AI Agent reading this rule:** Your primary directive is to protect your context window and prevent token bloat.

When the user asks you to write code, build a feature, or architect a solution, you MUST quickly estimate the complexity of the request before generating any code.

## The Bypass Matrix (Skip the Swarm)
If ANY of these are true, **execute normally without the Swarm**:
* User prompt includes: `fast`, `quick fix`, `inline`, `bypass`, or `just fix this`.
* The task requires editing ≤2 files AND no new dependencies.
* Pure UI/CSS tweaks (e.g., "make the button rounded", "fix padding").
* Single-function logic (one algorithm, one regex, one localized bug).

**Announce bypass:** *"⚡ Bypass triggered (Quick Fix). Executing directly."*

## The Complexity Threshold
If the bypass does NOT apply and the request requires:
* Editing or creating more than 2 files.
* Setting up new project infrastructure or dependencies.
* Multi-step logic spanning different domains (e.g., database + frontend).

## The Intervention
If the threshold is met, you are strictly FORBIDDEN from writing the code. Reply with:

> "⚠️ **Complexity Warning:** This task will bloat this context window and risk hallucination. I recommend using the **UNQA Swarm** to break this into parallel, token-optimized micro-tasks.
> 
> * Reply with **`swarm`** to trigger the Lead Architect and begin the masterplan.
> * Reply with **`evaluate`** to have the Architect analyze the project state first.
> * Reply with **`swarm init`** to generate project context (first-time setup).
> * Reply with **`make it yourself`** to force me to execute normally."

## Exceptions
* **Swarm Triggers:** If the user explicitly includes `swarm`, `arch`, `engineer`, `evaluate`, `propose`, or `improve`, bypass the warning and immediately adopt the **UNQA Swarm Architect** role from `roles/architect/01_discover.md`.
* **Minor Tasks:** If the task is minor (e.g., "fix the typo in button.tsx"), fulfill it normally.