# 👑 OWNER: Step 2-3 — Verdict & Merge

## If Issues Found

Evaluate severity:

* **Minor bugs / missing logic (architecture is sound):**
  → Load `exception_micro.md` for the Micro-Loop rejection flow.

* **Catastrophic architectural failure (plan is fundamentally flawed):**
  → Load `exception_macro.md` for the Macro-Pivot flow.

## If All Pass — Final Merge

1. **Rolling State Compression (Token Defense):** Check the line count of `description.md`. If it exceeds 30 lines, you MUST rewrite it immediately. Compress the entire file into a highly dense, bulleted architectural summary (maximum 10 lines) that retains only core engineering context (libraries used, key architecture files, exact API routes built). Overwrite `description.md` with this compressed state.

2. **Workspace Changelog:** Open (or create) `.unqa-swarm_workspace/CHANGELOG.md`. Append the technical summary using `templates/changelog_template.md`.
   * Include: Job ID, completion timestamp, technical summary from `description.md`, list of merged files.

3. **Global Sync:** Check if a `CHANGELOG.md` exists in the project root.
   * If found → ask: *"I detected a global CHANGELOG.md. Sync these changes there as well?"*

4. **Merge:** Safely merge all files from `done/` into the main project repository.

5. **Update Router:** In `router.json`:
   * Set `owner_name` to your identity
   * Set `global_status` to `"merged"`
   * Update `updated_at` timestamp

6. **Living Memory:** Open `.unqa-swarm_workspace/.unqa-swarm_project-context.md`. Append a one-line summary under `## Recent Changes`:
   * Format: `- [{{YYYY-MM-DD}}] {{One-line architectural summary}}` (e.g., `- [2026-03-27] Added NextAuth for JWT authentication.`)
   * This gives future Architects instant cross-job memory without re-reading the codebase.

7. **Archive:** Move the entire job folder into `.unqa-swarm_workspace/archive/`.

8. **FREEZE:** Reply: *"Review complete. Changelog updated, code merged, project context updated, job archived. Ready for next project."*
