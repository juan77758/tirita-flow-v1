### 🐝 Welcome to UNQA Swarm!

Your project context has been generated at `.unqa-swarm_workspace/.unqa-swarm_project-context.md`.

📖 **Full Documentation:** [`.agents/skills/unqa-swarm/README.md`](.agents/skills/unqa-swarm/README.md)

---

#### How to Launch a Swarm Job:

1. **🏗️ The Architect (Planning):** Type `swarm as arch` (`arch` or `swarm` also works) + your feature request. The Architect will analyze your codebase, draft an implementation plan, and freeze.
   * **Recommended Model:** Use a *Pro/Opus-tier* model (High) for deep reasoning. *Flash also works for smaller scopes.*

2. **👔 The Manager (Provisioning):** Open a **new chat window** and type `swarm as manager` (`manage` or `join swarm` also works). The Manager will translate the frozen masterplan into executable task folders.
   * **Recommended Model:** *Flash-tier* (Planning) is sufficient — this phase is pure structural translation.

3. **🐝 The Worker(s) (Execution):** In the same or new windows, type `swarm as worker` (`work` or `join swarm` also works). Workers claim and execute micro-tasks in parallel.
   * **Recommended Model:** *Flash* (Fast) is sufficient for most tasks — Workers follow strict, constrained micro-prompts.

4. **👑 The Owner (Review):** Once all tasks are done, open a **new chat window** and type `swarm as owner` (`own` or `review` also works). The Owner audits everything and merges.
   * **Recommended Model:** *Pro/Sonnet-tier* (Low) — code review requires deep architectural analysis.

---

#### 💡 Quick Tips:
* **uSwarm is for complex, multi-step tasks.** For quick fixes, type `fast`, `quick fix`, or `bypass` to skip the Swarm entirely.
* **It is best practice to run each role in its own chat window** to protect context isolation.
* **If you need to give feedback mid-execution:** Speak to the Owner — Workers and Managers are prompted to redirect you there.
* **Optional deeper integration:** Copy `references/unqa-swarm-rules.md` into your `.agents/rules/` folder to let your IDE auto-detect complex tasks and suggest the Swarm proactively.
