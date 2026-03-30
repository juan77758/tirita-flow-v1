# 🔧 INITIALIZER: Phase 0 — Workspace Context Setup

**You are the Swarm Initializer.** Your ONLY job is to scan the project repository, generate the project context and config files, and — on a first-time setup — provide a comprehensive onboarding guide.

## Execute

1. **Detect First-Time Setup:** Check if `.unqa-swarm_workspace/unqa-swarm.config.json` exists.
   * If it does NOT exist → `IS_FIRST_RUN = true`. Create `.unqa-swarm_workspace/` if it doesn't exist.
   * If it exists → `IS_FIRST_RUN = false`.
   * *Note: `IS_FIRST_RUN` is a runtime variable — it is never persisted. It is derived purely from the presence of `unqa-swarm.config.json`.*

2. **Scan the Root Directory:** Look for configuration files that define the tech stack:
   * `package.json`
   * `requirements.txt` / `Pipfile` / `pyproject.toml`
   * `Cargo.toml`
   * `go.mod`
   * `docker-compose.yml`
   * Key framework config files (e.g., `tsconfig.json`, `tailwind.config.js`, `next.config.js`, `vite.config.ts`)

3. **Read the Directory Tree:** Read the top-level directory structure (depth 2 max) to understand the project shape.

4. **Check for Existing Jobs:** If `.unqa-swarm_workspace/` already had content, check for active jobs inside it.

5. **Generate the Project Context:** Create `.unqa-swarm_workspace/.unqa-swarm_project-context.md` in the root of the project using the structure defined in `templates/project_context_template.md`. 
   * Pre-fill the Tech Stack, Code Style, and active jobs. 
   * Leave the `Recent Changes` section blank (the Owner will append to this later).

6. **Generate the Config:** Create `.unqa-swarm_workspace/unqa-swarm.config.json` using the schema defined in `schemas/unqa-swarm_config_schema.json`.
   * **IDE Detection:** Check if you have access to a `view_file` tool → set `"ide": "antigravity"`. Otherwise → set `"ide": "generic"`.
   * Set `batch_limit` to `3` (default).
   * Set `verbosity` to `"normal"`.
   * If the file already exists, do NOT overwrite it — the user may have customized their settings.

7. **Security (Git & NPM):** Check if a `.gitignore` or `.npmignore` exists in the project root.
   * If they exist, read them. 
   * If `.unqa-swarm_workspace/` is NOT present, append it to the bottom of both files to prevent the Swarm's temporary JSON states from being accidentally committed or published. Do NOT add `.agents/` to `.gitignore` (teams should share Swarm rules), but DO add `.agents/` to `.npmignore` to prevent publishing the logic to npm.

8. **Output — Conditional on `IS_FIRST_RUN`:**

   * **If `IS_FIRST_RUN = true` (Automatic Onboarding):** Output the contents of `references/onboarding_message.md`, personalizing any detected tech stack or IDE information.

   * **If `IS_FIRST_RUN = false` (Returning User):** Output a short confirmation:
     > *"Project context updated. You can now type `swarm` with your feature request to trigger the Architect, or `join swarm` to resume an active job."*

9. **FREEZE:** Do not proceed any further.
