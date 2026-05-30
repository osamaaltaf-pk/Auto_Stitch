# DIFF_MEMORY.md — AutoStitch v1 Session Diffs
## One entry per session. Append only. Never delete.
## Format: date, agent ID (if known), files changed, what was done, what broke, what is next.

---

## Session 001
**Date:** [project start]
**Agent:** Claude (initial design session)
**Status:** Docs created, no code written yet

### Files created this session
- AGENT.md
- ARCHITECTURE.md
- CONTEXT.md
- MEMORY.md
- DIFF_MEMORY.md
- REVIEW.md
- STACK.md
- MANIFEST.md
- UI_SPEC.md
- LANES.md
- ENGINES.md
- STITCHER.md
- INSTALLER.md
- CONSTRAINTS.md

### What was decided
- Full system architecture defined
- NiceGUI chosen as UI framework
- Python 3.11 pinned
- Manifest-as-single-source-of-truth pattern established
- Three-lane timeline model specified (Video / SFX / Voice)
- Engine wrapper pattern defined (generate + health_check interface)
- Windows-only v1 scope locked

### What was NOT done (next agent picks up here)
- No code written. Phase 0 docs only.
- Repo folder structure not yet scaffolded
- README.md not written
- Engine repos not yet received

### Known issues introduced
- None (no code)

### What the next agent should do first
1. Read ALL docs in order (AGENT.md → CONSTRAINTS.md)
2. Scaffold the folder structure from ARCHITECTURE.md
3. Create empty `__init__.py` files in all packages
4. Write `app/core/manifest.py` (dataclasses + JSON load/save)
5. Update MEMORY.md checkboxes as work completes
6. Add Session 002 entry to this file when done

---

## Session 002
**Date:** [fill in]
**Agent:** [fill in]
**Status:** [fill in]

### Files changed this session
- [fill in]

### What was done
- [fill in]

### What broke / issues found
- [fill in]

### What the next agent should do first
- [fill in]

---

<!-- Continue appending sessions below this line -->
