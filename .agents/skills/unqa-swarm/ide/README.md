# IDE Adapters

IDE-specific instruction sets. The active adapter is determined by the `"ide"` field in `.unqa-swarm_workspace/unqa-swarm.config.json`.

| File | IDE | Detection |
|:-----|:----|:----------|
| `antigravity.md` | Antigravity (Google) | Default — auto-detected via `view_file` tool availability |
| `generic.md` | Cline, Roo-Code, Cursor, etc. | Fallback when Antigravity is not detected |
