# 🖥️ IDE Adapter: Generic

> This is the **fallback** IDE adapter for UNQA Swarm. Loaded when `unqa-swarm.config.json` → `"ide": "generic"`, or when Antigravity is not detected.

## Tool-Chaining

If your IDE does not have a native `view_file` tool, phase transitions require manual intervention:
- When a microfile says "use `view_file` to ingest the next file," instead **ask the user to paste the contents** of that file, or read it using whatever file-reading mechanism your IDE provides.

## Skeleton Context

- Run skeleton scripts via your IDE's terminal or ask the user to execute them manually.
- Copy-paste the terminal output into the chat if the IDE does not auto-inject terminal results.

## Terminal

- If your IDE does not support direct terminal execution, instruct the user to run commands manually and paste the output.
- Always provide exact, copy-pasteable commands.

## File Operations

- Use your IDE's native file editing tools.
- For surgical edits on files >50 lines (The Surgeon Law), output find-and-replace instructions or diff blocks rather than full file rewrites.

## Roo-Code / Cline Compatibility

If using Roo-Code or Cline:
- Skills are loaded from `.roo/skills/` or via the Settings > Skills tab.
- You may symlink or copy the `unqa-swarm/` folder into your IDE's skill directory.
- Mode-specific rules can be placed in `.roo/rules-{mode-slug}/` directories.
