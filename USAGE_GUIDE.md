# 🎬 AutoStitch v1 — Step-by-Step User Guide (For Creative Producers)

Welcome to **AutoStitch Studio**! This guide is designed for **non-coders, creators, and editors** who want to use AI to supercharge their video production workflow. 

AutoStitch allows you to arrange video clips, write script lines for AI voiceovers, prompt AI sound effects, and stitch them all into a final synchronized video file automatically—**all in one single desktop interface**.

---

## 🚀 Part 1: Quick-Start (Getting Up and Running)

You do **not** need to write or understand a single line of code to use AutoStitch. We have automated the entire process with simple double-click files.

### Step 1: One-Time First Setup
Before you run the software for the first time, you need to install its core engines and helpers.
1. Open the project folder (`D:\Osama_mvp`).
2. Find the file named **`setup.bat`** (the icon looks like gears).
3. **Double-click `setup.bat`** to run it.
4. A black terminal window will appear and perform the following automatically:
   * **Checks Python**: Verifies Python is installed on your computer.
   * **Creates a Virtual Environment**: Sets up a safe isolated space to run the software.
   * **Installs Packages**: Installs the backend software engines automatically.
   * **Downloads FFmpeg**: Installs the video rendering tool (one-time ~80MB download).
   * **Pre-caches offline libraries**: Caches frontend utilities for instant speeds.
5. Once it displays `AutoStitch Setup Finished successfully!`, press any key to close the window.

> [!TIP]
> **Setup Troubleshooting:**
> If `setup.bat` says Python is not found, download and install **Python 3.11** from [Python's Official Website](https://www.python.org/downloads/). When installing, **make sure to tick the checkbox that says "Add Python to PATH"**!

---

### Step 2: Daily Launch
Whenever you want to run and work with AutoStitch:
1. In the project folder, locate **`run.bat`**.
2. **Double-click `run.bat`**.
3. A terminal window will open, and your web browser will automatically open a new tab loading the AutoStitch Unified Studio interface at:
   👉 **`http://localhost:8080`**
4. Keep the terminal window minimized in the background while editing. When you are done editing, simply close the terminal window to turn off the software.

---

## 🎨 Part 2: The Studio Interface Tour

The AutoStitch interface is split into four clean, high-performance sections:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ AUTOSTITCH STUDIO                                     ● Health  [Render]│
├───────────────────────┬────────────────────────────────────────────────────┤
│                       │  Ruler:  [  0:05  ]  [  0:10  ]  [  0:15  ]        │
│ 📁 LEFT PANEL         ├────────────────────────────────────────────────────┤
│                       │  📹 LANE 1 (VIDEO CLIPS)                           │
│ • Import Folders      ├────────────────────────────────────────────────────┤
│ • Settings & Presets  │  🎵 LANE 2 (AI SOUND EFFECTS)                      │
│ • Voice Settings      ├────────────────────────────────────────────────────┤
│                       │  🎤 LANE 3 (AI VOICEOVERS)                         │
├───────────────────────┴────────────────────────────────────────────────────┤
│  🔊 MIXER & MASTER PREVIEW PLAYER                                           │
└────────────────────────────────────────────────────────────────────────────┘
```

1. **Top Toolbar**: Controls for **Rendering/Stitching**, checking engine **Health Status** (lights green/red), and opening **Settings** (⚙️ gear icon).
2. **Left Panel (Tabs)**: Imports your assets, lists available voices, and manages default configuration.
3. **Middle Timeline Canvas**: A horizontal grid showing 3 parallel tracks:
   * **Lane 1 (Video)**: Draggable pre-rendered video clips.
   * **Lane 2 (SFX)**: Draggable prompt blocks for AI sound effect generation.
   * **Lane 3 (Voice)**: Draggable script blocks for AI speech generation.
4. **Mixer & Master Player (Bottom)**: Adjusts individual volume sliders for video, voiceovers, and sound effects. Contains the final master preview video player.

---

## 🎞️ Part 3: The Step-by-Step Composition Workflow

Here is how to create your first AI-composed video from scratch:

### Step 1: Load Video Clips
1. In the **Left Panel**, select the **Video** tab.
2. In the folder path input, paste the folder path containing your `.mp4` video clips (e.g., `D:\MyVideos`).
3. Click **Open Folder**.
4. Your video clips will instantly appear in **Lane 1 (Video)** in alphabetical order. Each video tile displays its first-frame thumbnail so you can easily identify them!

---

### Step 2: Add AI Sound Effects (SFX)
You can generate high-quality sound effects dynamically to match your video clips!
1. Under a video clip tile, look at **Lane 2 (SFX)**.
2. If you loaded an SFX script text file (each line in a `.txt` file becomes a block) or created new empty blocks, you will see editable cards.
3. Double-click the text box on a block and type what sound effect you want.
   * *Example prompts:* `cinematic sweep, low rumble`, `sci-fi laser beam blast`, `rain splashing on concrete`.
4. Click the yellow **GEN** button on the block.
5. The block status will change to **Generating** (yellow pulsing). In 1–2 minutes, the AI will create the sound and the block border will turn **Green (Done)**!
6. Click the small play icon on the block to preview the generated sound effect.

---

### Step 3: Add AI Voiceovers (TTS)
You can turn scripts into natural, professional speech using AI!
1. Under your video clips, look at **Lane 3 (Voice)**.
2. Double-click the text box on a block and type the voiceover script line you want spoken during that clip.
3. Choose a voice character from the voice dropdown list (e.g., `alba`, `marius`, `cosette`, `jean`).
4. Click the yellow **GEN** button on the voice block.
5. The local text-to-speech engine compiles the text, and the block will turn **Green (Done)** once complete.
6. Click the play icon on the voice block to listen to the generated speech.

---

### Step 4: Fine-Tune and Sync
* **Drag-and-Drop Reordering**: Hover your mouse over the top bar of any slot column. Click and drag left or right to swap its position with other slots. The video, sound effect, and voice blocks will move together, maintaining their horizontal relationship.
* **Adding Slots**: Hover between any two blocks in the timeline. A glowing vertical line and a pink **`+`** icon will appear. Clicking that **`+`** icon inserts a new empty timeline slot to the right of that block.
* **Mixer Adjustments**: Play the composition preview using the spacebar or master player. Slide the **Voice Volume**, **SFX Volume**, or **Video Volume** faders to balance the audio correctly so your voiceover is never drowned out!

---

### Step 5: Render and Export
Once all your blocks are green and sounding great:
1. Click the large **▶ Render** button in the top toolbar.
2. A popup window will prompt you to **Stitch Final Output**.
3. Turn on the **Concatenate Master Output** checkbox if you want all individual clips merged into one continuous video file.
4. Click **Start Stitching**.
5. The server will launch an offline FFmpeg compiler. Watch the progress bar in the top status bar.
6. Once complete, your combined master video is ready to watch!
7. Navigate to the **`output/`** folder inside the `AutoStitch` directory to find your beautifully composed, final audio-mixed video files!

---

## ⚙️ Part 4: Advanced — Configuring the Stable Audio Engine

Depending on your computer's graphics card (GPU), you might want to run the heavy AI generation on a Google Colab notebook in the cloud instead of locally on a slow CPU.

### How to use Google Colab for SFX Generation:
1. Open the settings in the top-right corner (⚙️ gear icon).
2. Copy the active tunnel URL from your running Google Colab notebook (e.g., `https://smooth-badgers-allow.loca.lt`).
3. Paste the URL into the **STABLE AUDIO SERVER URL (LOCAL/COLAB)** input field.
4. Click **Test Connection** to make sure the server is online and reachable.
5. Click **SAVE SETTINGS**.

AutoStitch will now automatically direct all **GEN** sound effect requests to the high-speed Colab cloud server, returning the generated audio to your local desktop in seconds!

---

💡 **Pro-Tip:** If your local machine throws a `paging file is too small` or `out of memory` error when clicking GEN, it means your computer lacks a dedicated graphics card. Switching to the Colab notebook workflow (explained above) will bypass this limitation and give you ultra-fast, professional generations 100% free!
