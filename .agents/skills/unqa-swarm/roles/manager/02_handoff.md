# 👔 MANAGER: Phase 3 — Handoff & Role Transition

## Evaluate

Check the workspace state and output the correct response:

1. **Multiple Un-prepped Jobs Remain:** If other job folders still need a `router.json`:
   → FREEZE: *"Shaped one project. Move to the next, or switch to work?"*

2. **All Prepped — Manager Only Mode:** If the user explicitly typed `join as manager`:
   → FREEZE: *"All are in shape. Ask a Worker to begin."*

3. **All Prepped — Swarm Mode:** If the user typed `join swarm` (Manager + Worker combo):
   → Reply: *"All are in shape. Switching to work."*
   → **SILENTLY TRANSITION TO WORKER:** Read `roles/worker/01_claim.md` and immediately claim the first pending task.

**One Job at a Time:** You must only process ONE job per response to protect your context window.
