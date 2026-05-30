# CONTEXT.md — AutoStitch v1 MVP
## Living Project Context — Read This When Picking Up Mid-Work

Last updated: [AGENT MUST UPDATE THIS TIMESTAMP ON EVERY SESSION]

---

## What this project is (one paragraph)

AutoStitch is a locally-run Windows desktop video composition tool with a
multi-lane timeline UI. The user loads pre-rendered 5-second `.mp4` clips into
Lane 1 (video), adds sound effect prompts into Lane 2 (SFX, generated locally
via Stable Audio), and adds voiceover audio or TTS scripts into Lane 3 (Voice,
generated locally via PocketTTS). All lanes are drag/drop, editable, splittable,
and mergeable. A Render button stitches everything via FFmpeg into final `.mp4`
files. The entire stack runs offline on Windows with two `.bat` files for setup.

---

## Current phase

```
[ ] Phase 0 — Docs + scaffolding         ← YOU ARE HERE on first session
[ ] Phase 1 — Core manifest + data model
[ ] Phase 2 — NiceGUI UI shell + left panel
[ ] Phase 3 — Lane 1 (video tiles)
[ ] Phase 4 — Lane 2 (SFX blocks + Stable Audio integration)
[ ] Phase 5 — Lane 3 (Voice blocks + PocketTTS integration)
[ ] Phase 6 — FFmpeg stitcher
[ ] Phase 7 — installer.bat + warmup.bat
[ ] Phase 8 — Project save/load
[ ] Phase 9 — QA pass + Windows testing
```

Update the checkbox above (change `[ ]` to `[x]`) as each phase completes.

---

## What the previous agent did (update this every session)

```
Session 1: [date] — Created all doc files. Scaffolded repo layout. No code yet.
Session 2: [date] — [agent fills in]
Session 3: [date] — [agent fills in]
```

---

## Active decisions made so far

| Decision | Made in session | Rationale |
|---|---|---|
| NiceGUI 1.4.x for UI | Session 1 | Async-native, Python-only, no C++ build needed |
| Python 3.11 pinned | Session 1 | Torch compat with engine repos |
| Manifest as single source of truth | Session 1 | Prevents UI/state drift |
| FFmpeg bundled in /bin | Session 1 | No system-level dependency on user machine |
| Lanes stored as ordered lists in manifest | Session 1 | Enables drag-reorder without re-indexing |

---

## Where the important things live

| Thing | File/location |
|---|---|
| Master instructions | `AGENT.md` |
| Full architecture | `ARCHITECTURE.md` |
| UI layout spec | `UI_SPEC.md` |
| Lane data model | `LANES.md` |
| Engine integration | `ENGINES.md` |
| FFmpeg stitching | `STITCHER.md` |
| Windows install | `INSTALLER.md` |
| Manifest schema | `MANIFEST.md` |
| Hard constraints | `CONSTRAINTS.md` |
| Progress tracking | `MEMORY.md` |
| Session diffs | `DIFF_MEMORY.md` |
| Unresolved issues | `REVIEW.md` |
| Tech stack detail | `STACK.md` |
| App entry point | `main.py` |
| UI components | `app/ui/` |
| Engine wrappers | `app/core/engine_sfx.py`, `app/core/engine_tts.py` |
| Manifest logic | `app/core/manifest.py` |
| FFmpeg stitcher | `app/core/stitcher.py` |

---

## Engine repos (provided by project owner)

- **Stable Audio** repo: TBD — owner will share. Read its README before touching `engine_sfx.py`.
- **PocketTTS** repo: TBD — owner will share. Read its README before touching `engine_tts.py`.

When repos are provided, add their inference entry points here:
- Stable Audio infer function: `[agent fills in after reading repo]`
- PocketTTS infer function: `[agent fills in after reading repo]`

---

## Known unknowns (things to resolve when repos arrive)

1. Stable Audio: does inference run synchronously or does it return a future?
2. Stable Audio: what audio format/samplerate does it output? (need to know for FFmpeg)
3. PocketTTS: does it support streaming output or batch only?
4. PocketTTS: which voice IDs are available / how is voice selected?
5. Both engines: GPU required or can they run on CPU (affects warmup.bat CUDA logic)?

---

## Things the next agent must NOT redo or second-guess

- Do not change the folder structure from what is in AGENT.md.
- Do not switch UI frameworks. NiceGUI is decided.
- Do not introduce conda, poetry, or any package manager other than pip+venv.
- Do not modify the engine repos. Wrappers only.
- Do not implement v2 features (cloud APIs, Veo, ElevenLabs, OTIO export).
