# LANES.md — Lane System Data Model & Interaction Rules

---

## Lane types (v1)

| Lane ID | Name | Content type | Generation engine |
|---|---|---|---|
| `video` | Video | VideoBlock (mp4 files) | None (user-provided) |
| `sfx` | SFX | SfxBlock (text prompts → .wav) | Stable Audio |
| `voice` | Voice | VoiceBlock (audio files or TTS prompts → .wav) | PocketTTS |

---

## Block ordering

Each block has an `order: int` field (0-indexed).
The lane renders blocks sorted ascending by `order`.
When a block is dragged to a new position, ALL blocks in that lane
are re-indexed: new `order` values are assigned 0, 1, 2, 3… based
on their new visual position.

**Do NOT use list index as order.** Always read `.order` explicitly.
This prevents bugs when blocks are deleted (gaps in index).

Re-indexing function the agent must implement:
```python
def reindex_lane(blocks: list[SfxBlock | VoiceBlock]) -> None:
    """Reassign .order = 0,1,2,3... by current sorted order. Mutates in place."""
    for i, block in enumerate(sorted(blocks, key=lambda b: b.order)):
        block.order = i
```

---

## Drag and drop rules

- Blocks within the same lane can be dragged to any position.
- Cross-lane drag is NOT supported in v1.
- After a drag, call `reindex_lane()` on the affected lane,
  then save manifest, then refresh the lane UI.
- Video lane drag does NOT affect SFX or Voice lane order.

---

## Split rules

A block can be split at any character position in its text.
Split produces two new blocks; the original is removed.

```python
def split_block(block: SfxBlock, char_pos: int, manifest: Manifest) -> tuple[SfxBlock, SfxBlock]:
    """
    Split block at char_pos. Returns two new blocks.
    Left block inherits block.order.
    Right block gets order = block.order + 0.5 (then reindex_lane is called).
    Both new blocks have status = IDLE (even if original was DONE).
    Both new blocks have file_path = None (generated asset is no longer valid).
    """
```

After split:
1. Remove original block from lane list
2. Insert two new blocks
3. Call `reindex_lane()`
4. Save manifest
5. Refresh lane UI

---

## Merge rules

Two adjacent blocks (by order) can be merged into one.
Merge joins their text with a space.

```python
def merge_blocks(block_a: SfxBlock, block_b: SfxBlock, manifest: Manifest) -> SfxBlock:
    """
    Merge block_a (lower order) and block_b (higher order).
    Returns new block with:
      prompt = block_a.prompt + " " + block_b.prompt
      order = block_a.order
      status = IDLE
      file_path = None
    """
```

After merge:
1. Remove both original blocks
2. Insert merged block at block_a.order
3. Call `reindex_lane()`
4. Save manifest
5. Refresh lane UI

---

## Edit rules

- Double-click a block to enter edit mode.
- Edit mode: text becomes an `ui.input` element, pre-filled with current prompt.
- On Enter or focus-loss: save new text to `block.prompt`, set `block.status = IDLE`,
  clear `block.file_path` (edit invalidates previously generated asset).
- On Escape: discard edit, restore original text.

---

## Delete rules

- Select a block (single click to highlight).
- Press Delete key or use right-click → Delete.
- If block.status == DONE and block.file_path exists: do NOT delete the file.
  The generated asset stays in the sfx/ or voice/ folder.
  Only remove the block from the manifest.
- Call `reindex_lane()` after delete.

---

## Alignment between lanes

Blocks are paired by `order` index at render time:
- video_blocks[order=0] + sfx_blocks[order=0] + voice_blocks[order=0] → clip_00_final.mp4
- video_blocks[order=1] + sfx_blocks[order=1] + voice_blocks[order=1] → clip_01_final.mp4

If a lane has fewer blocks than the video lane:
- Missing SFX → clip rendered with no SFX
- Missing Voice → clip rendered with no voice audio

If a lane has MORE blocks than the video lane:
- Extra blocks are ignored in render (shown with a warning toast)

The UI should show a visual indicator when lane lengths don't match:
- Lane label shows a yellow ⚠ if block count != video lane block count
