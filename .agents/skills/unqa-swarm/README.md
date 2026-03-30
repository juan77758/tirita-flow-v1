# UNQA Swarm 🐝 (Token-Optimized Orchestrator)
Welcome to the Swarm! 🐅🐝

**UNQA Swarm** is a role-playing multi-agent orchestration skill for AI coding assistants. It slashes token costs, eliminates context bloat, and executes complex projects in parallel through strict state management and JIT microfile architecture.

By treating your IDE like a multiplayer environment, UNQA Swarm forces AI agents into strict roles (Architect, Manager, Worker, Owner) that communicate asynchronously via a lightweight `router.json` routing table and per-task `task.json` tickets.

---

## 🧠 The Philosophy: Context Isolation

Monolithic AI agents fail on large projects because they suffer from **Context Bloat** — holding the entire architecture, schema, and UI in one window burns tokens and causes hallucination.

**The UNQA Solution:** Split the AI's brain across multiple windows.
1. The **Architect** plans the project and freezes, preserving the high-level vision.
2. Fresh **Worker** windows execute micro-tasks with empty context.
3. Agents communicate asynchronously via the filesystem (`router.json` + `task.json`).

### Innovations
* **Router + Ticket Architecture:** Workers read only their own `task.json` (~400 tokens)
* **JIT Microfiles:** Each role is a directory of phase-specific files. Agents load ONLY the file for their current phase. Exception/recovery instructions are isolated and never loaded on the happy path.
* **Scripted Provisioning:** Node.js/Python scripts create workspace files instantly, eliminating LLM boilerplate token waste.
* **Silent Worker Protocol:** Workers output only file writes and completion signals — no summaries or chat.
* **Anti-Goals & API Contracts:** Explicit prohibitions and data shapes per task prevent hallucination and scope creep.

---

## 🗺️ The Swarm State Machine

```text
[swarm init] -> 🔧 INITIALIZER (Generates .unqa-swarm_project-context.md)
                      │
[User Prompt] -> 🏗️ ARCHITECT (Plans & Freezes)
                      │
                      ▼
               [masterplan.md]
                      │
[join swarm]  -> 👔 MANAGER (Runs provision scripts or manual setup)
                      │
                      ▼
              [router.json] + [task.json per folder]
                      │
[join worker] -> 🐝 WORKER (Claims, Codes, Cleans — Silent Protocol)
                      │
                      ▼
               [done/ folder] & [description.md]
                      │
[force review]-> 👑 OWNER (Audits)
                 /        \
        (Fail)  /          \  (Pass)
       Micro/Macro Pivot    Merge & Archive
```

---

## 🎭 The Agent Roles

| Role | Trigger | Files Loaded (Happy Path) | JIT Exception Files |
|:-----|:--------|:--------------------------|:-------------------|
| 🏗️ **Architect** | `swarm`, `arch` | `01_discover.md` → `02_draft.md` → `03_freeze.md` | `exception_update.md` |
| 👔 **Manager** | `swarm`, `manage` | `01_provision.md` → `02_handoff.md` | `exception_sync.md` |
| 🐝 **Worker** | `swarm`, `work` | `01_claim.md` → `02_execute.md` → `03_cleanup.md` | `exception_recovery.md` |
| 👑 **Owner** | `review`, `own` | `01_audit.md` → `02_verdict.md` | `exception_micro.md`, `exception_macro.md` |

---

## 🩺 Self-Healing

1. **Micro-Loop (Minor Bugs):** Owner moves task out of `done/`, adds recovery steps, triggers Manager sync.
2. **Macro-Pivot (Architectural Failure):** Owner archives the run and demands a fresh Architect plan.

---

## 🚀 How to Use

> **💡 When to use uSwarm:** uSwarm is explicitly designed for **complex, multi-step tasks** and ongoing project development. For normal one-shot edits (fixing a typo, centering a div, tweaking a color), you can completely skip the Swarm by using trigger words like `fast`, `quick fix`, or `bypass` in your prompt.

### Step 0: Initialize (First Time Only)
```
swarm init
```
Generates `.unqa-swarm_project-context.md` inside `.unqa-swarm_workspace/` — a snapshot of your tech stack that grounds all future plans.

### Step 1: Trigger the Architect
Ask for a complex task, or use: `+ swarm`, `evaluate`, `propose`.
* Review the `ImplementationPlan.md` artifact.
* The Architect generates a Masterplan with **API Contracts**, **Anti-Goals**, and a **Risk Analysis**, then **FREEZES**.

### Step 2: Spawn the Swarm
Open **new chat windows**:
* `join swarm` — Manager preps workspace (using scripts), then pivots to Worker.
* `join as manager` / `manage` — Preps workspace only.
* `join as worker` / `work` — Claims and executes tasks.

### Step 3: Review & Merge
* `join as owner` / `review` / `force review` — Audits code, merges or rejects.

---

## 🧠 Recommended Model Routing

| Role | Recommended Tier | Reasoning |
|:-----|:-----------------|:----------|
| Architect | Heavy (Gemini 2.5 Pro, Claude Opus) | Deep reasoning, long-horizon planning |
| Manager | Mid (Gemini 2.5 Flash (Thinking), Claude Sonnet) | Structured translation, no creativity needed |
| Worker | Light-Mid (Flash (Fast)) | Constrained execution of micro-prompts |
| Owner | Heavy (Gemini 2.5 Pro (Easy), Claude Sonnet) | Code review requires deep analysis |

---

## 📂 Folder Structure

### The Skill Core (`.agents/skills/unqa-swarm/`)

```text
.agents/skills/unqa-swarm/
├── SKILL.md                       # Router
├── RULES.md                       # Constitution (Universal Laws)
├── COMMANDS.md                    # Command routing reference
├── rules/
│   ├── rules_execution.md         # JIT: Workers & Managers
│   └── rules_audit.md             # JIT: Owners
├── ide/
│   ├── antigravity.md             # Default IDE adapter
│   └── generic.md                 # Fallback IDE adapter
├── scripts/
│   ├── provision.js               # Node.js workspace builder
│   ├── provision.py               # Python workspace builder
│   ├── skeleton.js                # JS/TS AST pruning (batch mode)
│   └── skeleton.py                # Python AST pruning (batch mode)
├── roles/
│   ├── architect/                 # Plans & freezes
│   ├── manager/                   # Provisions workspace
│   ├── worker/                    # Executes micro-tasks
│   ├── owner/                     # Audits & merges
│   └── initializer/               # First-time setup
├── templates/                     # Fillable document templates
│   ├── masterplan_template.md
│   ├── instruction_template.md
│   ├── project_context_template.md
│   ├── changelog_template.md
│   └── lessons_learned_template.md
├── schemas/                       # JSON data shape references
│   ├── router_schema.json
│   ├── task_schema.json
│   └── unqa-swarm_config_schema.json
└── references/                    # Static content & opt-in files
    ├── onboarding_message.md
    └── unqa-swarm-rules.md
```

### The Execution Workspace (`.unqa-swarm_workspace/`)

```text
.unqa-swarm_workspace/
├── .unqa-swarm_project-context.md # Generated by "swarm init"
└── job_[timestamp]_[desc]/
    ├── masterplan.md
    ├── router.json                # Lightweight routing table
    ├── lessons_learned.md
    ├── description.md
    ├── 01_task/
    │   ├── task.json              # Per-task ticket (context, anti-goals, API contracts)
    │   ├── instruction.md
    │   ├── audit_log.md           # Overflow for status_history > 3 entries
    │   └── target_file.ext
    ├── done/
    └── archive/
```

---

## ⚡ Power-User Tips

* **Parallel Execution:** Open multiple windows with `work`. The Atomic Claim + 15-min lock prevents overwrites.
* **Manager-Worker Combo:** `join swarm` auto-provisions AND starts coding.
* **Batch Limit:** Workers auto-freeze after `batch_limit` tasks (default: 3) to protect context. Configurable in `unqa-swarm.config.json`.
* **Scripted Provisioning:** The Manager tries `provision.js` → `provision.py` → manual fallback. No token waste.

---

## 🛠️ Customization

* **New global rules:** Edit `RULES.md` (all agents read it).
* **Change role behavior:** Edit the specific microfile in `roles/[role]/`.
* **Update database schema:** Edit `schemas/router_schema.json` + `schemas/task_schema.json` + relevant role microfiles.
* **Project config:** Edit `.unqa-swarm_workspace/unqa-swarm.config.json` to change IDE adapter, batch limit, verbosity, and compression settings.
* **Framework is read-only during execution:** Agents are forbidden from editing anything inside `.agents/skills/unqa-swarm/` (THE IMMUTABILITY LAW).

### Optional: Global Rules Integration

For tighter IDE integration, copy `references/unqa-swarm-rules.md` into your `.agents/rules/` folder. This enables your IDE to automatically detect complex tasks and suggest the Swarm before you even trigger it. This step is **optional** — the Swarm works perfectly without it.

***

## 🔒 Source Control & NPM Security

When pushing your project to GitHub or publishing to npm, ensure you ignore the correct folders:

**Git (`.gitignore`)**
- **DO NOT IGNORE `.agents/`:** You _should_ commit the `.agents/` folder to version control. This ensures every developer on your team shares the exact same Swarm rules, custom bypass matrices, and architectural definitions.
- **IGNORE `.unqa-swarm_workspace/`:** You must add `.unqa-swarm_workspace/` to your `.gitignore`. This folder acts as the Swarm's temporary RAM (storing active JSON tickets and Masterplans). Committing it may cause massive merge conflicts as agents actively overwrite state files.

**NPM (`.npmignore`)**
- If you are building an NPM package, add **both** `.agents/` and `.unqa-swarm_workspace/` to your `.npmignore` to prevent distributing internal AI orchestration logic to end-users via the registry.

*(Note: The `swarm init` command will attempt to automatically append these rules to your root ignore files if they exist!)*

***

## 🔄 How to Update uSwarm in the Future

1. Ensure no active jobs are running in your `.unqa-swarm_workspace` directory.
2. Delete your current `.agents/skills/unqa-swarm/` folder entirely.
3. Extract the new version's folder into `.agents/skills/`.
4. Read the `CHANGELOG.md` for any new commands or breaking changes.

***

Join the UNQA Tribe on Discord! 🌐

We'd love to have you in our community.
Jump into our Discord server for receiving WiP updates, giving your feedback, networking, getting community support, and to share your uSwarm results with other devs: https://discord.gg/QUSUgPBgJd

*(Note: This is our free community/feedback hub, paid membership (Premium/Pro/Max) channels are not included, but our team hangs out here all the time and we'd love to hear your feedback!)*

Thank you so much for your support!

***

Let's build better, together.