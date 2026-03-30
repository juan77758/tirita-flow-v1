# Scripts

Deterministic scripts that offload repetitive LLM work to local runtimes, saving thousands of output tokens per job.

| Script | Purpose | Usage |
|:-------|:--------|:------|
| `provision.js` / `provision.py` | Builds workspace structure from a masterplan | `node provision.js --job-dir [path]` |
| `skeleton.js` / `skeleton.py` | Extracts AST context (signatures only) from source files | `node skeleton.js file1 file2 ...` |
