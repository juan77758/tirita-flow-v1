# UNQA Swarm Commands

All user commands, aliases, and their routing logic.

## ⚡ Bypass (No Swarm)

If task is ≤2 files, UI/CSS-only, single-function, or user says `fast`/`quick fix`/`bypass`/`inline` → execute directly with announcement.

## 🎯 Swarm Commands

| Command | Aliases | Routed Role | First File Loaded | Condition |
|:--------|:--------|:------------|:-------------------|:----------|
| `swarm init` | `init` | Initializer | `roles/initializer/01_init.md` | Always (shows onboarding if no `unqa-swarm.config.json`) |
| `swarm as arch` | `swarm`, `arch`, `engineer`, `evaluate`, `propose`, `improve` | Architect | `roles/architect/01_discover.md` | Always |
| `swarm as manager` | `manage`, `join`, `lfg` | Manager → Worker | `roles/manager/01_provision.md` | Masterplan exists |
| `swarm as worker` | `work`, `join swarm` | Worker | `roles/worker/01_claim.md` | Router exists with pending tasks |
| `swarm as owner` | `own`, `review`, `force review` | Owner | `roles/owner/01_audit.md` | Tasks in `done/` |
| `update plan` | — | Architect | `roles/architect/exception_update.md` | Active job exists |
| `exit swarm` | — | None | — | Deactivates swarm mode |
