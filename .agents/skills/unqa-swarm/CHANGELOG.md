# Swarm Architecture Changelog

All notable changes to the UNQA Swarm project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - Initial Release

### Features
- **JIT Microfile Architecture**: Roles structurally distributed across phase-specific microfiles (`01_claim.md`, `02_execute.md`, etc.) to eliminate static token bloat.
- **Distributed State System**: Monolithic ledgers with a lightweight `router.json` DAG table and individual `task.json` execution tickets save huge amounts of tokens for new swarm sessions.
- **Scripted Provisioning**: Built-in `scripts/provision.js` and `scripts/provision.py` scripts handle physical directory builds, saving thousands of LLM Output Tokens per task.
- **Swarm Bypass Protocol**: Explicitly governed rules bypass Swarm orchestration on superficial codebase requests (typos, single UI tweaks, etc.).
- **Skeleton Context (AST Pruning)**: Built-in `scripts/skeleton.js` and `scripts/skeleton.py` scripts rip function signatures, types, and interfaces from TS/JS/Python files for minimal payload ingestion.
- **The Surgeon Protocol**: Explicit prohibition encoded into `RULES.md` avoids rewriting files over 50 lines.
- **Shift-Left Validation**: `02_execute.md` requires JIT terminal sandbox loop execution allowing Workers to dynamically self-heal simple syntax errors.
- **Autonomous Tool-Chaining**: Automated Worker recursion eliminates conversational turn-pausing between Claim, Execute, and Cleanup steps.
- **Rolling State Compression**: Conditional compression limits in `owner/02_verdict.md` strictly limit `description.md` log sizes from bloat.
- **Living Memory Appends**: `01_init.md` logic bounds project state tracking to `.unqa-swarm_workspace/.unqa-swarm_project-context.md`.
- **Git & NPM Security Injection**: Built-in logic inside `01_init.md` actively scans for existing `.gitignore` or `.npmignore` files and aggressively appends `.unqa-swarm_workspace/` to ensure massive temporary RAM states are never committed.
- **Automatic Onboarding**: Conditional first-time detection in `01_init.md` outputs a rich welcome guide with full Swarm workflow instructions, recommended LLM model tiers per role, and bypass tips on initial `swarm init`.
- **Human-in-the-Loop Protocol**: Interruption handling rules injected into all four roles. Workers and Managers prompted to freeze and route feedback to the Owner. The Owner evaluates scope and archives or routes to the Architect. The Architect updates plans and re-freezes for the Manager.
- **Exception Micro files**: `.md` fallbacks for macro architectural pivots and micro syntax recoveries across all 4 specific Swarm roles.
- **Project Config (`unqa-swarm.config.json`)**: VS Code-style settings file auto-generated in `.unqa-swarm_workspace/` during `swarm init`. Controls IDE adapter, batch limit, verbosity, and compression settings.
- **IDE Adapter System**: `ide/antigravity.md` (default) and `ide/generic.md` (fallback) provide IDE-specific tool instructions. Auto-detected during initialization.
- **Rules Restructuring**: `RULES.md` stripped to Universal Laws only. Role-specific rules split into `rules/rules_execution.md` (Workers/Managers) and `rules/rules_audit.md` (Owners) for JIT loading.
- **Folder Restructuring**: `templates/` split into `templates/` (fillable documents), `schemas/` (JSON data shapes), and `references/` (static content and opt-in files).
- **Batch Skeleton Scripts**: `skeleton.js` and `skeleton.py` accept multiple file arguments for single-call batch processing, reducing terminal roundtrips by up to 66%.
- **Lessons Learned Template**: `templates/lessons_learned_template.md` standardizes friction logging across Workers and Owners.
- **Onboarding Template**: Welcome guide in `references/onboarding_message.md` provides user-editable onboarding.
- **Todos Deduplication**: Validation checklist in `instruction_template.md`. `03_cleanup.md` references the instruction list.
- **`swarm as [role]` Commands**: Explicit trigger aliases (`swarm as arch`, `swarm as manager`, `swarm as worker`, `swarm as owner`).
- **Non-Forced Rules Distribution**: Pre-installed `.agents/rules/` files. `references/unqa-swarm-rules.md` are opt-in .agents/rules/ files — users copy it manually for deeper IDE integration.
- **Per-Folder READMEs**: Documentation READMEs in all 12 subdirectories for immediate structural clarity.
