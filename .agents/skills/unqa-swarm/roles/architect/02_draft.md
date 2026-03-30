# 🏗️ ARCHITECT: Phase 1 — Drafting the Implementation Plan

## Execute

1. **Create Artifact:** Generate an `ImplementationPlan.md` artifact for the user.

2. **Mandatory Sections:**
   * **Overview:** 2-3 sentence summary of the architecture.
   * **Reference Files Read:** List every file you read during Discovery (e.g., `package.json`, `schema.prisma`).
   * **Execution DAG Table:** The task breakdown (see `templates/masterplan_template.md` for format). For EACH task, you MUST include:
     * `context_files_to_read` — which existing repo files the Worker must read before coding
     * `anti_goals` — what the Worker is explicitly forbidden from doing
     * **⚡ Task Consolidation Rule (Component-based Chunking):** Maximize task density. Group tightly coupled logic (e.g., an API route and its unit test) into a single task touching 1-3 files. Do not artificially split tasks just to create more steps. Each highly coupled module should appear in one task.
   * **🔌 API Contracts:** Define exact JSON request/response shapes, variable names, function signatures, and shared types for ALL data flowing between tasks. Workers will use these as their data truth.
   * **⚠️ Risk Analysis (Pre-Mortem):** Before freezing, you MUST write a section analyzing:
     * How this architecture might fail
     * Which dependencies are fragile
     * Where tech debt will accumulate
     * What integration points are most likely to break

3. **Pause:** Ask the user to review the artifact and leave inline comments. Wait for explicit approval ("Proceed", "Go", or similar).

4. Once approved → DO NOT output chat. Immediately use your `view_file` tool to ingest `03_freeze.md` into your memory and continue silently.
