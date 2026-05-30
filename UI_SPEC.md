# UI_SPEC.md — AutoStitch v1 UI Layout Specification

Framework: NiceGUI 1.4.x
Theme: Dark
Port: localhost:8080
Browser opens automatically on launch.

---

## Top-level layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOOLBAR (full width, ~48px tall)                                   │
│  [AutoStitch v1]  [Open Project] [Save] [Render ▶] [Settings ⚙]    │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                       │
│  LEFT PANEL  │   TIMELINE CANVAS                                    │
│  ~220px wide │                                                       │
│              │   Lane 1: VIDEO  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│  [Videos]    │   Lane 2: SFX    ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│  [SFX txt]   │   Lane 3: VOICE  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│  [Voice]     │                                                       │
│              │   [+ Add Lane]                                        │
│  ─────────── │                                                       │
│  Status log  │                                                       │
│              │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

---

## Toolbar (app/ui/toolbar.py)

NiceGUI components:
```python
with ui.header():
    ui.label("AutoStitch v1").classes("text-bold text-lg")
    ui.button("Open Project", on_click=open_project_dialog)
    ui.button("Save", on_click=save_project)
    ui.button("▶ Render", on_click=start_render).classes("bg-green-600")
    ui.button("⚙", on_click=open_settings)
    # Right side: engine status indicators
    ui.badge("SFX ✓", color="green")   # or red if health_check fails
    ui.badge("TTS ✓", color="green")
    ui.badge("FFmpeg ✓", color="green")
```

---

## Left Panel (app/ui/left_panel.py)

Three expandable sections:

### Videos section
```
▼ Videos
  [📁 Open Folder]
  clip_01.mp4  ──┐
  clip_02.mp4    │ click to scroll
  clip_03.mp4    │ timeline to that clip
  ...          ──┘
```
- On folder open: scan for .mp4, sort by filename, register in manifest
- Each filename is clickable — scrolls timeline to that slot

### SFX section
```
▼ SFX Prompts
  [📄 Load .txt]
  [✏ Add single prompt]
  ─────────────────────
  sfx_00: thunder crack…
  sfx_01: soft wind…
```
- Load .txt: read file, split by newline, populate SFX lane
- Add single: opens inline text input, adds one block

### Voice section
```
▼ Voice
  [📁 Open Folder]   ← pre-recorded audio
  [📄 Load TTS .txt] ← TTS scripts
  [✏ Add single]
  ─────────────────────
  vo_00: vo_01.mp3 [PROVIDED]
  vo_01: "Welcome to…" [IDLE]
```

### Status log
Small scrollable log at bottom of left panel:
```
12:34:01 SFX sfx_00: generating…
12:34:08 SFX sfx_00: done → sfx/sfx_00.wav
12:34:09 TTS vo_01: generating…
```

---

## Timeline Canvas (app/ui/timeline.py + app/ui/lanes.py)

The timeline is a vertically stacked set of lanes.
Each lane is a horizontal row of tiles, scrollable horizontally.
All lanes share the same horizontal scroll position.

### Lane header
```
┌──────────┬────────────────────────────────────────────────────────┐
│  VIDEO   │  [tile][tile][tile][tile][tile][tile] →                 │
├──────────┼────────────────────────────────────────────────────────┤
│  SFX     │  [block][block][block][block] →                        │
├──────────┼────────────────────────────────────────────────────────┤
│  VOICE   │  [block][block][block][block] →                        │
└──────────┴────────────────────────────────────────────────────────┘
```

Lane label (left): 80px wide, vertically centred text.
Tile area (right): scrollable horizontally via `overflow-x: auto`.

### Video tile (Lane 1)
Width: 120px. Height: 90px.
```
┌────────────────┐
│  [thumbnail]   │  ← ffprobe frame grab, 120x68px
│  clip_01.mp4   │  ← filename, truncated
│  5.0s          │  ← duration
└────────────────┘
```
Border: 2px solid grey (idle), blue (selected).
Drag handle: entire tile is draggable via SortableJS (`ui.sortable`).

### SFX block (Lane 2)
Width: matches video tile width (120px). Height: 90px.
```
┌────────────────┐
│ thunder crack, │  ← prompt text, wrapping
│ deep boom      │
│                │
│ ● idle         │  ← status dot + label
└────────────────┘
```
Status colours:
- idle: grey border, grey dot
- generating: yellow border, yellow pulsing dot (CSS animation)
- done: green border, green dot
- error: red border, red dot + hover shows error_msg tooltip

Interactions:
- **Single click:** select block (highlight border blue)
- **Double click:** enter inline edit mode (text becomes `<input>`)
- **Right click:** context menu → [Generate] [Edit] [Split] [Merge with next] [Delete]
- **Drag:** reorder within lane (SortableJS)
- **Click [Generate] or right-click → Generate:** trigger engine

### Voice block (Lane 3)
Identical to SFX block visually.
If `source_path` is set (user file): shows filename instead of prompt, status = PROVIDED (teal border).
If `prompt` is set: shows TTS script text, same status colours as SFX.

---

## [+ Add Lane] button

Below all lanes. Clicking opens a dialog:
```
Add new lane
Type: [ SFX ▼ ]   (options: SFX, Voice, Music, Custom)
Name: [____________]
[Cancel]  [Add]
```
In v1 MVP: only SFX and Voice are functional. Music and Custom show "coming in v2" toast.
New lane is appended below existing lanes, same tile system.

---

## Render dialog

Clicking ▶ Render opens a modal:
```
┌─────────────────────────────────────┐
│  Render settings                    │
│                                     │
│  Output: output/                    │
│  [ ] Concat all clips into master   │
│  [ ] Overwrite existing files       │
│                                     │
│  Clips to render: 6                 │
│  SFX ready: 5/6  ⚠ 1 not generated │
│  Voice ready: 6/6                   │
│                                     │
│  [Cancel]          [Start Render ▶] │
└─────────────────────────────────────┘
```

During render: modal shows progress bar + per-clip status.
On complete: "Render done → output/master.mp4" with [Open Folder] button.

---

## Settings dialog

```
┌─────────────────────────────────────┐
│  Settings                           │
│                                     │
│  FFmpeg path:  [bin/ffmpeg.exe  ]   │
│  Output dir:   [output/         ]   │
│                                     │
│  SFX Engine:   ● loaded  [Reload]   │
│  TTS Engine:   ● loaded  [Reload]   │
│                                     │
│  Theme: [Dark ▼]                    │
│                                     │
│  [Save]                [Cancel]     │
└─────────────────────────────────────┘
```

---

## NiceGUI implementation notes for the agent

1. Use `@ui.refreshable` on `render_video_lane()`, `render_sfx_lane()`,
   `render_voice_lane()`. Call `.refresh()` on every manifest change.

2. Horizontal scroll sync: wrap all lane tile-areas in a shared `ui.scroll_area`
   or use a CSS grid with `overflow-x: scroll` at the container level.

3. Drag-and-drop: use `ui.sortable` from NiceGUI. On `on_sort` event,
   read new order from event data and update `manifest.sfx_blocks[i].order`.

4. Inline editing: on double-click, replace `ui.label` with `ui.input`,
   auto-focus, on blur/enter save to manifest and refresh.

5. Status dot animation (generating state):
   ```css
   @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
   .status-generating { animation: pulse 1s infinite; }
   ```

6. Context menu: NiceGUI does not have a built-in right-click context menu.
   Use `ui.menu` triggered by a right-click handler set via `element.on('contextmenu', ...)`.
