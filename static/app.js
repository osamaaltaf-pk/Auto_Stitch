const { useState, useEffect, useRef } = React;

// Structure a beautiful helper to format seconds into nice visual timestamps
const formatTime = (secs) => {
  const s = Math.round(secs);
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const Icon = ({ name, className = "w-4 h-4" }) => {
  const icons = {
    settings: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    plus: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    play: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M8 5v14l11-7z" />
      </svg>
    ),
    "folder-search": (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l-2.482-2.482m0 0a3 3 0 114.964-4.964 3 3 0 01-4.964 4.964z" />
      </svg>
    ),
    "file-text": (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    video: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 12h16.5M3.75 18h16.5M9 3.75v16.5M15 3.75v16.5" />
      </svg>
    ),
    music: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 0v10.5m0-10.5L9 12m0 0v6.75m0-6.75l10.5-3m-10.5 9.75a3 3 0 11-6 0 3 3 0 016 0zm10.5-3a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    mic: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 003-3v-6a3 3 0 00-6 0v6a3 3 0 003 3z" />
      </svg>
    ),
    "sliders-horizontal": (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
    "trash-2": (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
    sparkles: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813zM18 10.5l-.5 2.5-.5-2.5-2.5-.5 2.5-.5.5-2.5.5 2.5 2.5.5-2.5.5zM19.5 4.5l-.25 1.25-.25-1.25-1.25-.25 1.25-.25.25-1.25.25 1.25 1.25.25-1.25.25z" />
      </svg>
    )
  };
  return icons[name] || null;
};

const getStatusBadgeClass = (status) => {
  const base = "px-1.5 py-0.5 rounded-full text-[8px] font-bold ";
  if (status === 'done') return base + "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (status === 'provided') return base + "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
  if (status === 'generating') return base + "bg-amber-500/10 text-amber-400 animate-pulse border border-amber-500/20";
  if (status === 'error') return base + "bg-red-500/10 text-red-400 border border-red-500/20";
  return base + "bg-gray-500/10 text-gray-400 border border-gray-500/20";
};

const getVideoCardClass = (v, i, selectedBlock, selectedIndices = [], dragOverIndex = null, draggedIndex = null) => {
  let cls = "h-full relative glass-card p-1 rounded-lg flex flex-col justify-between cursor-pointer border-2 ";
  if (dragOverIndex === i && draggedIndex !== i) {
    cls += "drag-over-column ";
  }
  if (selectedBlock?.lane === 'video' && selectedBlock?.index === i) {
    cls += "glow-active ";
  } else if (selectedIndices.includes(i)) {
    cls += "border-accent-primary bg-accent-primary/5 shadow-[0_0_10px_rgba(124,108,255,0.15)] ";
  } else {
    cls += "border-carbon-border ";
  }
  return cls;
};

const getSfxCardClass = (s, i, selectedBlock, selectedIndices = [], dragOverIndex = null, draggedIndex = null) => {
  let cls = "h-full relative glass-card p-2 rounded-lg flex flex-col justify-between border-2 cursor-pointer ";
  if (dragOverIndex === i && draggedIndex !== i) {
    cls += "drag-over-column ";
  }
  if (selectedBlock?.lane === 'sfx' && selectedBlock?.index === i) {
    cls += "glow-active ";
  } else if (selectedIndices.includes(i)) {
    cls += "border-accent-primary bg-accent-primary/5 shadow-[0_0_10px_rgba(124,108,255,0.15)] ";
  } else {
    cls += "border-carbon-border ";
  }
  if (s.status === 'generating') cls += "status-generating ";
  if (s.status === 'done') cls += "status-done border-emerald-500/40 ";
  if (s.status === 'error') cls += "status-error ";
  return cls;
};

const getVoiceCardClass = (vo, i, selectedBlock, selectedIndices = [], dragOverIndex = null, draggedIndex = null) => {
  let cls = "h-full relative glass-card p-2 rounded-lg flex flex-col justify-between border-2 cursor-pointer ";
  if (dragOverIndex === i && draggedIndex !== i) {
    cls += "drag-over-column ";
  }
  if (selectedBlock?.lane === 'voice' && selectedBlock?.index === i) {
    cls += "glow-active ";
  } else if (selectedIndices.includes(i)) {
    cls += "border-accent-primary bg-accent-primary/5 shadow-[0_0_10px_rgba(124,108,255,0.15)] ";
  } else {
    cls += "border-carbon-border ";
  }
  if (vo.status === 'generating') cls += "status-generating ";
  if (vo.status === 'done') cls += "status-done border-emerald-500/40 ";
  if (vo.status === 'provided') cls += "status-provided border-cyan-500/40 ";
  if (vo.status === 'error') cls += "status-error ";
  return cls;
};

function App() {
  // Application State
  const [project, setProject] = useState({
    project_name: "Short_01",
    project_dir: "",
    video_blocks: [],
    sfx_blocks: [],
    voice_blocks: [],
    render_complete: false
  });
  const [settings, setSettings] = useState({
    tts_server_url: "http://127.0.0.1:8000",
    sfx_server_url: "http://127.0.0.1:5001",
    output_dir: "output",
    projects_dir: "projects"
  });
  const [globalDefaultVoice, setGlobalDefaultVoice] = useState("alba");
  const [health, setHealth] = useState({
    tts_server: { online: false, model_loaded: false, url: "" },
    sfx_server: { online: false, device: "unknown", url: "" },
    ffmpeg: { ok: false, path: "" }
  });
  const [logs, setLogs] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null); // { lane: 'video'|'sfx'|'voice', index: number }
  const [selectedIndices, setSelectedIndices] = useState([]); // Multiple selected timeline slot indices
  const [videoFolderInput, setVideoFolderInput] = useState("D:\\Osama_mvp\\videos");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [renderState, setRenderState] = useState({ status: 'idle', progress: 0.0, error: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("video"); // left panel tabs: 'video', 'sfx', 'voice'

  // Advanced Preview and Mixer States
  const [previewMode, setPreviewMode] = useState("composer"); // "composer" | "master"
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoVolume, setVideoVolume] = useState(0.8);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [sfxVolume, setSfxVolume] = useState(0.6);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Media refs for synced multi-track playback
  const videoRef = useRef(null);
  const voiceAudioRef = useRef(null);
  const sfxAudioRef = useRef(null);

  // Dynamically loaded available voices state & cloning indicators
  const [availableVoices, setAvailableVoices] = useState(["alba", "marius", "fantine", "cosette", "jean", "eponine"]);
  const [isCloning, setIsCloning] = useState(false);

  // Dynamic Timeline Layers State
  const [timelineLayers, setTimelineLayers] = useState([]);

  // Merge dynamic timeline layers into standard lanes for backend serialization
  const getMergedManifest = (layersList = timelineLayers) => {
    if (!project || !project.video_blocks || layersList.length === 0) return project;
    const targetLen = project.video_blocks.length;

    // 1. Merge Video
    const videoLayers = layersList.filter(l => l.type === 'video');
    const mergedVideoBlocks = [];
    for (let i = 0; i < targetLen; i++) {
      let chosenBlock = null;
      for (let j = videoLayers.length - 1; j >= 0; j--) {
        const b = videoLayers[j].blocks[i];
        if (b && b.file_path) {
          chosenBlock = b;
          break;
        }
      }
      if (!chosenBlock) {
        chosenBlock = videoLayers[0]?.blocks[i] || project.video_blocks[i];
      }
      mergedVideoBlocks.push({ ...chosenBlock, order: i });
    }

    // 2. Merge SFX
    const sfxLayers = layersList.filter(l => l.type === 'sfx');
    const mergedSfxBlocks = [];
    for (let i = 0; i < targetLen; i++) {
      const prompts = [];
      let combinedStatus = 'idle';
      let combinedFilePath = null;
      sfxLayers.forEach(l => {
        const b = l.blocks[i];
        if (b && b.prompt && b.prompt.trim()) {
          prompts.push(b.prompt.trim());
          if (b.status === 'generating') combinedStatus = 'generating';
          if (b.file_path) combinedFilePath = b.file_path;
        }
      });
      const primarySfxBlock = sfxLayers[0]?.blocks[i] || project.sfx_blocks[i] || { id: `sfx_${String(i).padStart(2, '0')}`, order: i };
      mergedSfxBlocks.push({
        ...primarySfxBlock,
        prompt: prompts.join(", "),
        status: combinedStatus === 'generating' ? 'generating' : (combinedFilePath ? 'done' : 'idle'),
        file_path: combinedFilePath,
        order: i
      });
    }

    // 3. Merge Voice
    const voiceLayers = layersList.filter(l => l.type === 'voice');
    const mergedVoiceBlocks = [];
    for (let i = 0; i < targetLen; i++) {
      const prompts = [];
      let combinedStatus = 'idle';
      let combinedFilePath = null;
      let chosenVoice = globalDefaultVoice || "alba";
      voiceLayers.forEach(l => {
        const b = l.blocks[i];
        if (b && b.prompt && b.prompt.trim()) {
          prompts.push(b.prompt.trim());
          if (b.status === 'generating') combinedStatus = 'generating';
          if (b.file_path) combinedFilePath = b.file_path;
          if (b.voice) chosenVoice = b.voice;
        }
      });
      const primaryVoiceBlock = voiceLayers[0]?.blocks[i] || project.voice_blocks[i] || { id: `vo_${String(i).padStart(2, '0')}`, order: i };
      mergedVoiceBlocks.push({
        ...primaryVoiceBlock,
        prompt: prompts.join(". "),
        status: combinedStatus === 'generating' ? 'generating' : (combinedFilePath ? 'provided' : 'idle'),
        file_path: combinedFilePath,
        voice: chosenVoice,
        order: i
      });
    }

    return {
      ...project,
      video_blocks: mergedVideoBlocks,
      sfx_blocks: mergedSfxBlocks,
      voice_blocks: mergedVoiceBlocks
    };
  };

  // Sync effect to initialize layers and keep slot counts updated dynamically
  useEffect(() => {
    if (!project || !project.video_blocks) return;
    if (timelineLayers.length === 0) {
      setTimelineLayers([
        { id: 'video-1', type: 'video', name: 'VIDEO 1', blocks: project.video_blocks },
        { id: 'sfx-1', type: 'sfx', name: 'SFX 1', blocks: project.sfx_blocks },
        { id: 'voice-1', type: 'voice', name: 'VOICE 1', blocks: project.voice_blocks }
      ]);
    } else {
      setTimelineLayers(prev => prev.map(layer => {
        if (layer.id === 'video-1') return { ...layer, blocks: project.video_blocks };
        if (layer.id === 'sfx-1') return { ...layer, blocks: project.sfx_blocks };
        if (layer.id === 'voice-1') return { ...layer, blocks: project.voice_blocks };
        
        let blocks = [...layer.blocks];
        const targetLen = project.video_blocks.length;
        while (blocks.length < targetLen) {
          const newIdx = blocks.length;
          if (layer.type === 'sfx') {
            blocks.push({ id: `sfx_${layer.id}_${newIdx}`, prompt: "", order: newIdx, status: "idle", file_path: null });
          } else if (layer.type === 'voice') {
            blocks.push({ id: `vo_${layer.id}_${newIdx}`, order: newIdx, status: "idle", prompt: "", file_path: null, voice: "alba" });
          } else if (layer.type === 'video') {
            blocks.push({ id: `v_${layer.id}_${newIdx}`, file_path: "", filename: "Blank_Clip.mp4", duration_s: 5.0, thumbnail_path: "/static/thumbnails/placeholder.jpg", order: newIdx });
          }
        }
        if (blocks.length > targetLen) {
          blocks = blocks.slice(0, targetLen);
        }
        return { ...layer, blocks };
      }));
    }
  }, [project]);

  // Synchronize volumes
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = videoVolume;
    if (voiceAudioRef.current) voiceAudioRef.current.volume = voiceVolume;
    if (sfxAudioRef.current) sfxAudioRef.current.volume = sfxVolume;
  }, [videoVolume, voiceVolume, sfxVolume]);

  // Seek position synchronization
  const handleVideoSeek = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      if (voiceAudioRef.current) voiceAudioRef.current.currentTime = curr;
      if (sfxAudioRef.current) sfxAudioRef.current.currentTime = curr;
    }
  };

  // Synchronized play all
  const togglePlayAll = () => {
    if (isPlaying) {
      if (videoRef.current) videoRef.current.pause();
      if (voiceAudioRef.current) voiceAudioRef.current.pause();
      if (sfxAudioRef.current) sfxAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      let start = 0;
      if (videoRef.current) {
        start = videoRef.current.currentTime;
      }
      if (voiceAudioRef.current) voiceAudioRef.current.currentTime = start;
      if (sfxAudioRef.current) sfxAudioRef.current.currentTime = start;

      if (videoRef.current) videoRef.current.play().catch(e => {});
      if (voiceAudioRef.current) voiceAudioRef.current.play().catch(e => {});
      if (sfxAudioRef.current) sfxAudioRef.current.play().catch(e => {});
      setIsPlaying(true);
    }
  };

  // Auto pause and reset player on card selection change
  useEffect(() => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
    }
    if (sfxAudioRef.current) {
      sfxAudioRef.current.pause();
      sfxAudioRef.current.currentTime = 0;
    }
  }, [selectedBlock]);

  // Refs for UI
  const consoleBottomRef = useRef(null);
  const timelineHeaderRef = useRef(null);
  const laneVideoRef = useRef(null);
  const laneSfxRef = useRef(null);
  const laneVoiceRef = useRef(null);

  // Add a nice visual console log
  const addLog = (message, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, message, type }]);
  };

  // Scroll console to bottom automatically
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Load project & health on launch
  useEffect(() => {
    addLog("Initializing AutoStitch Studio UI...", "info");
    fetchSettings();
    checkHealth();
    fetchVoices();
    loadProject("Short_01");

    // Establish periodic health checks every 10 seconds
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Poll render progress when rendering
  useEffect(() => {
    let timer;
    if (renderState.status === 'rendering') {
      timer = setInterval(async () => {
        try {
          const resp = await fetch(`/api/render/status/${project.project_name}`);
          const data = await resp.json();
          setRenderState(data);
          if (data.status === 'done') {
            addLog("Render task completed! Combined master video is ready.", "success");
            clearInterval(timer);
            loadProject(project.project_name);
          } else if (data.status === 'error') {
            addLog(`Render failed: ${data.error}`, "error");
            clearInterval(timer);
          }
        } catch (e) {
          console.error(e);
        }
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [renderState.status]);

  // Sync horizontal scrolling across lanes
  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    if (laneVideoRef.current) laneVideoRef.current.scrollLeft = scrollLeft;
    if (laneSfxRef.current) laneSfxRef.current.scrollLeft = scrollLeft;
    if (laneVoiceRef.current) laneVoiceRef.current.scrollLeft = scrollLeft;
    if (timelineHeaderRef.current) timelineHeaderRef.current.scrollLeft = scrollLeft;
  };

  // Get current slot helper
  const getSelectedBlockData = () => {
    if (!selectedBlock) return null;
    const { lane, index } = selectedBlock;
    if (lane === 'video') return project.video_blocks[index];
    if (lane === 'sfx') return project.sfx_blocks[index];
    if (lane === 'voice') return project.voice_blocks[index];
    return null;
  };

  // API Call: Fetch settings
  const fetchSettings = async () => {
    try {
      const resp = await fetch("/api/settings");
      const data = await resp.json();
      setSettings(data);
    } catch (e) {
      addLog("Failed loading application settings.", "error");
    }
  };

  // API Call: Check health
  const checkHealth = async () => {
    try {
      const resp = await fetch("/api/health");
      const data = await resp.json();
      setHealth(data);
    } catch (e) {
      setHealth(prev => ({
        ...prev,
        tts_server: { ...prev.tts_server, online: false },
        sfx_server: { ...prev.sfx_server, online: false }
      }));
    }
  };

  // API Call: Fetch dynamic voices from PocketTTS
  const fetchVoices = async () => {
    try {
      const resp = await fetch("/api/voices");
      if (resp.ok) {
        const data = await resp.json();
        setAvailableVoices(data.voices);
      }
    } catch (e) {
      console.error("Failed loading dynamic voices:", e);
    }
  };

  // API Call: Delete custom cloned voice
  const deleteVoice = async (voiceName) => {
    if (["alba", "marius", "fantine", "cosette", "jean", "eponine"].includes(voiceName)) {
      addLog("Cannot delete standard premade voice.", "error");
      return;
    }
    const confirm = window.confirm(`Are you sure you want to permanently delete the custom cloned voice '${voiceName}'?`);
    if (!confirm) return;

    addLog(`Deleting cloned voice '${voiceName}'...`, "info");
    try {
      const resp = await fetch(`/api/voices/delete/${encodeURIComponent(voiceName)}`, {
        method: "DELETE"
      });
      if (resp.ok) {
        addLog(`Voice '${voiceName}' deleted successfully!`, "success");
        await fetchVoices();
        if (globalDefaultVoice === voiceName) {
          setGlobalDefaultVoice("alba");
        }
      } else {
        const err = await resp.text();
        addLog(`Failed to delete voice: ${err}`, "error");
      }
    } catch (e) {
      addLog(`Error contacting server: ${e}`, "error");
    }
  };


  // API Call: Voice cloning upload proxy
  const handleCloneVoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    addLog(`Uploading audio sample '${file.name}' for cloning to PocketTTS...`, "info");
    setIsCloning(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch("/api/voices/clone", {
        method: "POST",
        body: formData
      });

      if (resp.ok) {
        const data = await resp.json();
        addLog(`Voice '${data.voice_name}' successfully cloned & registered in PocketTTS!`, "success");
        await fetchVoices();
      } else {
        const err = await resp.text();
        addLog(`Cloning failed: ${err}`, "error");
      }
    } catch (err) {
      addLog(`Connection error during voice cloning: ${err}`, "error");
    } finally {
      setIsCloning(false);
      e.target.value = ""; // clear input element
    }
  };

  // API Call: Load project manifest
  const loadProject = async (name) => {
    addLog(`Loading project '${name}'...`, "info");
    try {
      const resp = await fetch("/api/project/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_name: name })
      });
      if (resp.ok) {
        const data = await resp.json();
        setProject(data);
        addLog(`Project '${name}' loaded successfully.`, "success");
      } else {
        addLog("Failed loading project.", "error");
      }
    } catch (e) {
      addLog(`Error contacting server: ${e}`, "error");
    }
  };

  // API Call: Save manifest
  const saveProject = async (newManifest = null) => {
    const manifestToSave = newManifest || getMergedManifest();
    try {
      const resp = await fetch("/api/project/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manifestToSave)
      });
      if (resp.ok) {
        addLog("Project workspace saved.", "success");
      } else {
        addLog("Failed saving project.", "error");
      }
    } catch (e) {
      addLog("Connection failed when saving project.", "error");
    }
  };

  // Layer Management Methods
  const addTimelineLayer = (type) => {
    if (!type) return;
    const typeCount = timelineLayers.filter(l => l.type === type).length + 1;
    const typeLabel = type === 'video' ? 'VIDEO' : (type === 'sfx' ? 'SFX' : 'VOICE');
    const newLayerId = `${type}-${Date.now()}`;
    const targetLen = project.video_blocks.length;
    const blocks = [];
    for (let i = 0; i < targetLen; i++) {
      if (type === 'video') {
        blocks.push({
          id: `v_${newLayerId}_${i}`,
          file_path: "",
          filename: `Blank_Clip.mp4`,
          duration_s: 5.0,
          thumbnail_path: "/static/thumbnails/placeholder.jpg",
          order: i
        });
      } else if (type === 'sfx') {
        blocks.push({
          id: `sfx_${newLayerId}_${i}`,
          prompt: "",
          order: i,
          status: "idle",
          file_path: null
        });
      } else if (type === 'voice') {
        blocks.push({
          id: `vo_${newLayerId}_${i}`,
          order: i,
          status: "idle",
          prompt: "",
          file_path: null,
          voice: "alba"
        });
      }
    }
    const newLayer = {
      id: newLayerId,
      type,
      name: `${typeLabel} ${typeCount}`,
      blocks
    };
    const updatedLayers = [...timelineLayers, newLayer];
    setTimelineLayers(updatedLayers);
    saveProject(getMergedManifest(updatedLayers));
    addLog(`Added a new dynamic timeline layer: "${newLayer.name}"`, "success");
  };

  const removeTimelineLayer = (layerId) => {
    if (['video-1', 'sfx-1', 'voice-1'].includes(layerId)) {
      addLog("Cannot delete default primary system layer.", "error");
      return;
    }
    const layer = timelineLayers.find(l => l.id === layerId);
    if (!layer) return;
    const confirm = window.confirm(`Are you sure you want to delete the dynamic layer "${layer.name}"? All custom blocks in this layer will be removed.`);
    if (!confirm) return;
    const updatedLayers = timelineLayers.filter(l => l.id !== layerId);
    setTimelineLayers(updatedLayers);
    saveProject(getMergedManifest(updatedLayers));
    addLog(`Deleted dynamic timeline layer: "${layer.name}"`, "success");
  };

  // API Call: Scan Video directory
  const scanVideos = async () => {
    if (!videoFolderInput.trim()) {
      addLog("Please enter a valid directory path.", "error");
      return;
    }
    addLog(`Scanning directory for video clips: ${videoFolderInput}...`, "info");
    try {
      const resp = await fetch("/api/videos/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: project.project_name,
          video_folder: videoFolderInput
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setProject(data.manifest);
        addLog(`Video scan complete. Found ${data.manifest.video_blocks.length} clips!`, "success");
      } else {
        const err = await resp.json();
        addLog(`Scan failed: ${err.detail}`, "error");
      }
    } catch (e) {
      addLog(`Error scanning folder: ${e}`, "error");
    }
  };

  const addBlankSlot = () => {
    const newIdx = project.video_blocks.length;
    const v_id = `v_${String(newIdx).padStart(2, '0')}`;
    const sfx_id = `sfx_${String(newIdx).padStart(2, '0')}`;
    const vo_id = `vo_${String(newIdx).padStart(2, '0')}`;

    const newVideo = [
      ...project.video_blocks,
      {
        id: v_id,
        file_path: "",
        filename: `Clip_${String(newIdx + 1).padStart(2, '0')}.mp4`,
        duration_s: 5.0,
        thumbnail_path: "/static/thumbnails/placeholder.jpg",
        order: newIdx
      }
    ];

    const newSfx = [
      ...project.sfx_blocks,
      {
        id: sfx_id,
        prompt: "",
        order: newIdx,
        status: "idle",
        file_path: null
      }
    ];

    const newVoice = [
      ...project.voice_blocks,
      {
        id: vo_id,
        order: newIdx,
        status: "idle",
        prompt: "",
        file_path: null
      }
    ];

    const updated = {
      ...project,
      video_blocks: newVideo,
      sfx_blocks: newSfx,
      voice_blocks: newVoice
    };

    setProject(updated);
    addLog(`Added a new blank timeline slot (Index ${newIdx}).`, "success");
    saveProject(updated);
  };

  const deleteSlot = (index) => {
    if (index < 0) return;
    addLog(`Deleting timeline slot ${index}...`, "info");
    
    setTimelineLayers(prev => prev.map(layer => {
      const blocks = layer.blocks.filter((_, idx) => idx !== index).map((b, idx) => ({ ...b, order: idx }));
      return { ...layer, blocks };
    }));

    const video_blocks = project.video_blocks.filter((_, idx) => idx !== index).map((b, idx) => ({ ...b, order: idx }));
    const sfx_blocks = project.sfx_blocks.filter((_, idx) => idx !== index).map((b, idx) => ({ ...b, order: idx }));
    const voice_blocks = project.voice_blocks.filter((_, idx) => idx !== index).map((b, idx) => ({ ...b, order: idx }));
    
    const newManifest = {
      ...project,
      video_blocks,
      sfx_blocks,
      voice_blocks
    };
    
    setProject(newManifest);
    saveProject(newManifest);
    setSelectedBlock(null);
    setSelectedIndices([]);
    addLog(`Timeline slot ${index} removed successfully.`, "success");
  };

  // API Call: Clear specific block media without deleting the whole slot column
  const clearBlockMedia = async (lane, index) => {
    addLog(`Clearing ${lane.toUpperCase()} media for slot index ${index}...`, "info");
    try {
      const resp = await fetch(`/api/clear/block?project_name=${project.project_name}&lane=${lane}&index=${index}`, {
        method: "POST"
      });
      if (resp.ok) {
        const data = await resp.json();
        setProject(data.manifest);
        setSelectedBlock(null);
        addLog(`Cleared ${lane.toUpperCase()} media block successfully.`, "success");
      } else {
        addLog(`Failed clearing media block.`, "error");
      }
    } catch (e) {
      addLog(`Error contacting server: ${e}`, "error");
    }
  };

  // API Call: Upload custom video file to specific slot
  const handleCustomVideoUpload = async (index, file) => {
    if (!file) return;
    const isDuplicate = project.video_blocks.some((b, idx) => idx !== index && b.filename && b.filename.toLowerCase() === file.name.toLowerCase());
    if (isDuplicate) {
      addLog(`Upload blocked: The file "${file.name}" is already used in another video slot. Duplications are not allowed.`, "error");
      alert(`The file "${file.name}" is already used in another video slot. Duplications are not allowed.`);
      return;
    }
    addLog(`Uploading custom video clip '${file.name}' for slot ${index}...`, "info");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch(`/api/upload/video?project_name=${project.project_name}&index=${index}`, {
        method: "POST",
        body: formData
      });
      if (resp.ok) {
        const data = await resp.json();
        setProject(data.manifest);
        setSelectedBlock({ lane: 'video', index });
        addLog(`Custom video clip uploaded successfully for slot ${index}!`, "success");
      } else {
        addLog("Failed uploading custom video clip.", "error");
      }
    } catch (e) {
      addLog(`Upload error: ${e}`, "error");
    }
  };

  // API Call: Upload custom speech audio file to specific slot
  const handleCustomVoiceUpload = async (index, file) => {
    if (!file) return;
    const isDuplicate = project.voice_blocks.some((b, idx) => idx !== index && b.file_path && b.file_path.toLowerCase().endsWith(file.name.toLowerCase()));
    if (isDuplicate) {
      addLog(`Upload blocked: The file "${file.name}" is already used in another voice slot. Duplications are not allowed.`, "error");
      alert(`The file "${file.name}" is already used in another voice slot. Duplications are not allowed.`);
      return;
    }
    addLog(`Uploading custom speech audio '${file.name}' for slot ${index}...`, "info");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch(`/api/upload/voice?project_name=${project.project_name}&index=${index}`, {
        method: "POST",
        body: formData
      });
      if (resp.ok) {
        const data = await resp.json();
        setProject(data.manifest);
        setSelectedBlock({ lane: 'voice', index });
        addLog(`Custom speech audio uploaded successfully for slot ${index}!`, "success");
      } else {
        addLog("Failed uploading custom speech audio.", "error");
      }
    } catch (e) {
      addLog(`Upload error: ${e}`, "error");
    }
  };

  // API Call: Upload custom sound effect to specific slot
  const handleCustomSfxUpload = async (index, file) => {
    if (!file) return;
    const isDuplicate = project.sfx_blocks.some((b, idx) => idx !== index && b.file_path && b.file_path.toLowerCase().endsWith(file.name.toLowerCase()));
    if (isDuplicate) {
      addLog(`Upload blocked: The file "${file.name}" is already used in another SFX slot. Duplications are not allowed.`, "error");
      alert(`The file "${file.name}" is already used in another SFX slot. Duplications are not allowed.`);
      return;
    }
    addLog(`Uploading custom sound effect '${file.name}' for slot ${index}...`, "info");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch(`/api/upload/sfx?project_name=${project.project_name}&index=${index}`, {
        method: "POST",
        body: formData
      });
      if (resp.ok) {
        const data = await resp.json();
        setProject(data.manifest);
        setSelectedBlock({ lane: 'sfx', index });
        addLog(`Custom sound effect uploaded successfully for slot ${index}!`, "success");
      } else {
        addLog("Failed uploading custom sound effect.", "error");
      }
    } catch (e) {
      addLog(`Upload error: ${e}`, "error");
    }
  };

  const handleToggleSelectIndex = (index) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(idx => idx !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIndices.length === project.video_blocks.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(project.video_blocks.map((_, i) => i));
    }
  };

  const deleteSelectedSlots = () => {
    if (selectedIndices.length === 0) return;
    addLog(`Deleting selected slots: ${selectedIndices.join(", ")}...`, "info");
    
    setTimelineLayers(prev => prev.map(layer => {
      const blocks = layer.blocks.filter((_, idx) => !selectedIndices.includes(idx)).map((b, idx) => ({ ...b, order: idx }));
      return { ...layer, blocks };
    }));

    const video_blocks = project.video_blocks.filter((_, idx) => !selectedIndices.includes(idx)).map((b, idx) => ({ ...b, order: idx }));
    const sfx_blocks = project.sfx_blocks.filter((_, idx) => !selectedIndices.includes(idx)).map((b, idx) => ({ ...b, order: idx }));
    const voice_blocks = project.voice_blocks.filter((_, idx) => !selectedIndices.includes(idx)).map((b, idx) => ({ ...b, order: idx }));
    
    const newManifest = {
      ...project,
      video_blocks,
      sfx_blocks,
      voice_blocks
    };
    
    setProject(newManifest);
    saveProject(newManifest);
    setSelectedIndices([]);
    setSelectedBlock(null);
    addLog(`Successfully removed ${selectedIndices.length} slots from timeline.`, "success");
  };

  const handleMoveSlot = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= project.video_blocks.length || to >= project.video_blocks.length) return;
    addLog(`Re-aligning sequence: Moving slot ${from} to slot ${to}...`, "info");

    const reorder = (arr) => {
      const copy = [...arr];
      const [removed] = copy.splice(from, 1);
      copy.splice(to, 0, removed);
      return copy.map((item, idx) => ({ ...item, order: idx }));
    };

    setTimelineLayers(prev => prev.map(layer => {
      return { ...layer, blocks: reorder(layer.blocks) };
    }));

    const newManifest = {
      ...project,
      video_blocks: reorder(project.video_blocks),
      sfx_blocks: reorder(project.sfx_blocks),
      voice_blocks: reorder(project.voice_blocks)
    };

    setProject(newManifest);
    saveProject(newManifest);
    setSelectedIndices([]);
    setSelectedBlock(null);
    addLog(`Timeline sequence aligned successfully.`, "success");
  };

  const insertBlankSlotAt = (index) => {
    if (index < 0 || index > project.video_blocks.length) return;
    addLog(`Inserting a blank composition slot at index ${index}...`, "info");

    const insertAt = (arr, newItem) => {
      const copy = [...arr];
      copy.splice(index, 0, newItem);
      return copy.map((item, idx) => ({ ...item, order: idx }));
    };

    setTimelineLayers(prev => prev.map(layer => {
      const copy = [...layer.blocks];
      let newBlock;
      if (layer.type === 'video') {
        newBlock = {
          id: `v_ins_${layer.id}_${Date.now()}`,
          file_path: "",
          filename: `Blank_Clip.mp4`,
          duration_s: 5.0,
          thumbnail_path: "/static/thumbnails/placeholder.jpg",
          order: index
        };
      } else if (layer.type === 'sfx') {
        newBlock = {
          id: `sfx_ins_${layer.id}_${Date.now()}`,
          prompt: "",
          order: index,
          status: "idle",
          file_path: null
        };
      } else if (layer.type === 'voice') {
        newBlock = {
          id: `vo_ins_${layer.id}_${Date.now()}`,
          order: index,
          status: "idle",
          prompt: "",
          file_path: null,
          voice: "alba"
        };
      }
      copy.splice(index, 0, newBlock);
      return { ...layer, blocks: copy.map((item, idx) => ({ ...item, order: idx })) };
    }));

    const v_id = `v_ins_${Date.now()}`;
    const sfx_id = `sfx_ins_${Date.now()}`;
    const vo_id = `vo_ins_${Date.now()}`;

    const newVideo = {
      id: v_id,
      file_path: "",
      filename: `Blank_Clip.mp4`,
      duration_s: 5.0,
      thumbnail_path: "/static/thumbnails/placeholder.jpg",
      order: index
    };

    const newSfx = {
      id: sfx_id,
      prompt: "",
      order: index,
      status: "idle",
      file_path: null
    };

    const newVoice = {
      id: vo_id,
      order: index,
      status: "idle",
      prompt: "",
      file_path: null
    };

    const newManifest = {
      ...project,
      video_blocks: insertAt(project.video_blocks, newVideo),
      sfx_blocks: insertAt(project.sfx_blocks, newSfx),
      voice_blocks: insertAt(project.voice_blocks, newVoice)
    };

    setProject(newManifest);
    saveProject(newManifest);
    setSelectedBlock({ lane: 'video', index });
    setSelectedIndices([]);
    addLog(`New blank slot inserted at position ${index}.`, "success");
  };

  const importTextFile = (lane, file) => {
    if (!file) return;
    addLog(`Reading prompts from ${file.name}...`, "info");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = [...new Set(text.split("\n").map(l => l.trim()).filter(l => l.length > 0))];
      if (lines.length === 0) {
        addLog("Import failed: Select file has no text lines.", "error");
        return;
      }
      
      addLog(`Found ${lines.length} prompts in file. Aligning to timeline slots...`, "success");
      
      let video_blocks = [...project.video_blocks];
      let sfx_blocks = [...project.sfx_blocks];
      let voice_blocks = [...project.voice_blocks];
      
      const targetLen = Math.max(lines.length, video_blocks.length);
      
      while (video_blocks.length < targetLen) {
        const newIdx = video_blocks.length;
        const v_id = `v_${String(newIdx).padStart(2, '0')}`;
        video_blocks.push({
          id: v_id,
          file_path: "",
          filename: `Clip_${String(newIdx + 1).padStart(2, '0')}.mp4`,
          duration_s: 5.0,
          thumbnail_path: "/static/thumbnails/placeholder.jpg",
          order: newIdx
        });
      }
      
      while (sfx_blocks.length < targetLen) {
        const newIdx = sfx_blocks.length;
        sfx_blocks.push({ id: `sfx_${String(newIdx).padStart(2, '0')}`, prompt: "", order: newIdx, status: "idle", file_path: null });
      }
      
      while (voice_blocks.length < targetLen) {
        const newIdx = voice_blocks.length;
        voice_blocks.push({ id: `vo_${String(newIdx).padStart(2, '0')}`, order: newIdx, status: "idle", prompt: "", file_path: null });
      }
      
      lines.forEach((line, idx) => {
        if (lane === 'sfx') {
          sfx_blocks[idx].prompt = line;
          sfx_blocks[idx].status = 'idle';
        } else if (lane === 'voice') {
          voice_blocks[idx].prompt = line;
          voice_blocks[idx].status = 'idle';
        }
      });
      
      const updatedManifest = {
        ...project,
        video_blocks,
        sfx_blocks,
        voice_blocks
      };
      
      setProject(updatedManifest);
      saveProject(updatedManifest);
      addLog(`Successfully imported ${lines.length} prompts into the ${lane.toUpperCase()} lane!`, "success");
    };
    reader.readAsText(file);
  };

  // API Call: Run TTS generation
  const generateTts = async (index, text, voice) => {
    if (!text.trim()) {
      addLog("Please write a speech script first.", "error");
      return;
    }
    const isDuplicate = project.voice_blocks.some((b, idx) => idx !== index && b.prompt && b.prompt.trim().toLowerCase() === text.trim().toLowerCase());
    if (isDuplicate) {
      addLog(`Failed to generate TTS: The prompt "${text}" is already used in another slot. Duplications are not allowed.`, "error");
      alert(`The prompt "${text}" is already used in another slot. Duplications are not allowed.`);
      return;
    }
    const block = project.voice_blocks[index];
    addLog(`Synthesizing voiceover block ${block.id}...`, "info");
    
    // Optimistic status update in UI
    const updatedVoice = [...project.voice_blocks];
    updatedVoice[index].status = 'generating';
    updatedVoice[index].prompt = text;
    setProject(prev => ({ ...prev, voice_blocks: updatedVoice }));

    try {
      const resp = await fetch("/api/generate/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: project.project_name,
          block_id: block.id,
          text: text,
          voice: voice
        })
      });
      if (resp.ok) {
        addLog(`TTS generation task queued for slot ${index}.`, "info");
        // Start polling project manifest to check when done
        pollProjectManifest();
      } else {
        addLog("Failed initiating TTS task.", "error");
      }
    } catch (e) {
      addLog("Failed contacting server.", "error");
    }
  };

  // API Call: Run SFX generation
  const generateSfx = async (index, prompt, params) => {
    if (!prompt.trim()) {
      addLog("Please describe your sound effect first.", "error");
      return;
    }
    const isDuplicate = project.sfx_blocks.some((b, idx) => idx !== index && b.prompt && b.prompt.trim().toLowerCase() === prompt.trim().toLowerCase());
    if (isDuplicate) {
      addLog(`Failed to generate SFX: The prompt "${prompt}" is already used in another slot. Duplications are not allowed.`, "error");
      alert(`The prompt "${prompt}" is already used in another slot. Duplications are not allowed.`);
      return;
    }
    const block = project.sfx_blocks[index];
    addLog(`Generating sound effect block ${block.id}...`, "info");

    // Optimistic status update in UI
    const updatedSfx = [...project.sfx_blocks];
    updatedSfx[index].status = 'generating';
    updatedSfx[index].prompt = prompt;
    setProject(prev => ({ ...prev, sfx_blocks: updatedSfx }));

    try {
      const resp = await fetch("/api/generate/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: project.project_name,
          block_id: block.id,
          prompt: prompt,
          model: params.model || "small-sfx",
          duration: params.duration || 5.0,
          steps: params.steps || 8,
          seed: params.seed || -1
        })
      });
      if (resp.ok) {
        addLog(`Stable Audio task launched for slot ${index}.`, "info");
        pollProjectManifest();
      } else {
        addLog("Failed initiating SFX task.", "error");
      }
    } catch (e) {
      addLog("Failed contacting server.", "error");
    }
  };

  // Poll project manifest status
  const pollProjectManifest = () => {
    const timer = setInterval(async () => {
      try {
        const resp = await fetch("/api/project/load", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_name: project.project_name })
        });
        if (resp.ok) {
          const data = await resp.json();
          setProject(data);
          
          // Check if any block is still generating
          const isSfxGen = data.sfx_blocks.some(b => b.status === 'generating');
          const isVoiceGen = data.voice_blocks.some(b => b.status === 'generating');
          
          if (!isSfxGen && !isVoiceGen) {
            addLog("All pending generations finished.", "success");
            clearInterval(timer);
          }
        }
      } catch (e) {
        clearInterval(timer);
      }
    }, 3000);
  };

  // API Call: Trigger render
  const startRender = async () => {
    if (project.video_blocks.length === 0) {
      addLog("Please load video tracks before rendering.", "error");
      return;
    }
    addLog("Stitching final output via FFmpeg...", "info");
    setRenderState({ status: 'rendering', progress: 0.0, error: null });
    try {
      const resp = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: project.project_name,
          concat: true
        })
      });
      if (resp.ok) {
        addLog("Stitching task launched successfully. Polling progress...", "info");
      } else {
        addLog("Failed running stitching pipeline.", "error");
        setRenderState({ status: 'error', progress: 0.0, error: "Initialization failed" });
      }
    } catch (e) {
      addLog("Server error starting render.", "error");
      setRenderState({ status: 'error', progress: 0.0, error: e.toString() });
    }
  };

  // Update prompt inputs directly in local state without blocking keystrokes
  const handlePromptChange = (lane, index, text) => {
    if (lane === 'sfx') {
      setProject(prev => {
        const updated = [...prev.sfx_blocks];
        if (updated[index]) {
          updated[index] = { ...updated[index], prompt: text, status: 'idle' };
        }
        return { ...prev, sfx_blocks: updated };
      });
    } else if (lane === 'voice') {
      setProject(prev => {
        const updated = [...prev.voice_blocks];
        if (updated[index]) {
          updated[index] = { ...updated[index], prompt: text, status: 'idle' };
        }
        return { ...prev, voice_blocks: updated };
      });
    }
  };

  // Reorder visual tracks using simple shifting logic
  const handleMoveBlock = (lane, index, direction) => {
    const blocks = lane === 'video' ? [...project.video_blocks] : (lane === 'sfx' ? [...project.sfx_blocks] : [...project.voice_blocks]);
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    
    // Swap blocks
    const temp = blocks[index];
    blocks[index] = blocks[targetIdx];
    blocks[targetIdx] = temp;
    
    // Re-index orders
    blocks.forEach((b, i) => b.order = i);
    
    const updatedManifest = { ...project };
    if (lane === 'video') updatedManifest.video_blocks = blocks;
    else if (lane === 'sfx') updatedManifest.sfx_blocks = blocks;
    else updatedManifest.voice_blocks = blocks;
    
    setProject(updatedManifest);
    addLog(`Reordered block ${temp.id} to slot ${targetIdx}.`, "info");
    saveProject(updatedManifest);
  };

  // Selected Detail Element Data
  const blockData = getSelectedBlockData();

  return (
    <div className="h-full flex flex-col select-text text-sm">
      
      {/* ── TOP NAV BAR ── */}
      <nav className="h-14 flex items-center justify-between px-6 bg-carbon-panel border-b border-carbon-border z-10 glass-panel">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-purple-800 text-white font-extrabold text-lg shadow-lg">
            A
          </div>
          <div>
            <h1 className="font-extrabold text-md tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              AutoStitch <span className="text-xs font-semibold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-full ml-1 font-mono">v1 STUDIO</span>
            </h1>
          </div>
        </div>

        {/* Project Selector & Server Status Badges */}
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-carbon-card/50 border border-carbon-border/50 px-3 py-1 rounded-lg">
            <span className="text-xs text-gray-500 font-mono mr-2">PROJECT:</span>
            <input 
              value={project.project_name}
              onChange={(e) => setProject(prev => ({ ...prev, project_name: e.target.value }))}
              onBlur={() => saveProject()}
              className="bg-transparent outline-none font-bold text-white max-w-[120px]"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {/* TTS Status */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health.tts_server.online ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-gray-600'}`}></span>
              <span className="text-gray-400">TTS:</span>
              <span className={health.tts_server.online ? 'text-gray-200' : 'text-gray-500'}>
                {health.tts_server.online ? (health.tts_server.model_loaded ? 'LOADED' : 'READY') : 'OFFLINE'}
              </span>
            </div>
            {/* SFX Status */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health.sfx_server.online ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-gray-600'}`}></span>
              <span className="text-gray-400">SFX:</span>
              <span className={health.sfx_server.online ? 'text-gray-200' : 'text-gray-500'}>
                {health.sfx_server.online ? `GPU (${health.sfx_server.device})` : 'OFFLINE'}
              </span>
            </div>
            {/* FFmpeg Status */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health.ffmpeg.ok ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-gray-600'}`}></span>
              <span className="text-gray-400">FFMPEG:</span>
              <span className={health.ffmpeg.ok ? 'text-gray-200' : 'text-gray-500'}>
                {health.ffmpeg.ok ? 'OK' : 'MISSING'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {selectedIndices.length > 0 && (
            <button 
              onClick={deleteSelectedSlots}
              className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-400 px-3 py-2 rounded-lg transition-all text-xs font-semibold font-mono"
              title="Delete all selected timeline slots"
            >
              <Icon name="trash-2" className="w-3.5 h-3.5" />
              <span>DELETE SELECTED ({selectedIndices.length})</span>
            </button>
          )}

          <button 
            onClick={() => setShowSettingsModal(true)}
            className="p-2 border border-carbon-border hover:bg-carbon-card/50 text-gray-400 hover:text-white rounded-lg transition-all"
            title="Settings"
          >
            <Icon name="settings" className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className={`p-2 border rounded-lg transition-all ${isSidebarOpen ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-carbon-border text-gray-400 hover:text-white hover:bg-carbon-card/50'}`}
            title="Toggle Slot Settings Sidebar"
          >
            <Icon name="sliders-horizontal" className="w-4 h-4" />
          </button>

          <button 
            onClick={addBlankSlot}
            className="flex items-center gap-1.5 border border-accent-primary/50 hover:bg-accent-primary/10 text-accent-primary px-3 py-2 rounded-lg transition-all text-xs font-semibold"
            title="Add blank timeline slot"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
            <span>+ ADD SLOT</span>
          </button>
          
          <button 
            onClick={startRender}
            disabled={renderState.status === 'rendering'}
            className="flex items-center gap-2 bg-gradient-to-r from-accent-primary to-indigo-600 hover:from-accent-primary hover:to-indigo-500 text-white font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-accent-primary/20 disabled:opacity-50 transition-all"
          >
            {renderState.status === 'rendering' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>RENDERING ({renderState.progress}%)</span>
              </>
            ) : (
              <>
                <Icon name="play" className="w-3.5 h-3.5 fill-current" />
                <span>RENDER ▶</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* ── WORKSPACE CORE LAYOUT ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Expandable Left asset Browser */}
        <div className="w-64 border-r border-carbon-border bg-carbon-panel flex flex-col overflow-hidden">
          <div className="flex border-b border-carbon-border">
            <button 
              onClick={() => setActiveTab("video")}
              className={`flex-1 py-3 text-center text-xs font-semibold ${activeTab === 'video' ? 'text-accent-primary border-b-2 border-accent-primary bg-carbon-card/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              VIDEOS
            </button>
            <button 
              onClick={() => setActiveTab("sfx")}
              className={`flex-1 py-3 text-center text-xs font-semibold ${activeTab === 'sfx' ? 'text-accent-primary border-b-2 border-accent-primary bg-carbon-card/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              SFX
            </button>
            <button 
              onClick={() => setActiveTab("voice")}
              className={`flex-1 py-3 text-center text-xs font-semibold ${activeTab === 'voice' ? 'text-accent-primary border-b-2 border-accent-primary bg-carbon-card/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              VOICE / TTS
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            
            {/* Tab: Videos Scan */}
            {activeTab === 'video' && (
              <div className="flex flex-col gap-4">
                <div className="bg-carbon-card/30 border border-carbon-border p-3 rounded-lg flex flex-col gap-2.5">
                  <h3 className="text-xs font-bold font-mono text-gray-400">SCAN LOCAL FOLDER</h3>
                  
                  {/* Browse Button */}
                  <button 
                    onClick={async () => {
                      addLog("Opening native directory picker...", "info");
                      try {
                        const resp = await fetch("/api/videos/select-folder", { method: "POST" });
                        if (resp.ok) {
                          const data = await resp.json();
                          if (data.status === 'ok' && data.folder) {
                            setVideoFolderInput(data.folder);
                            addLog(`Selected videos directory: "${data.folder}"`, "success");
                          } else {
                            addLog("Folder selection cancelled.", "info");
                          }
                        }
                      } catch (e) {
                        addLog("Failed loading native directory picker.", "error");
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-carbon border border-carbon-border hover:border-accent-primary text-xs text-gray-300 py-2.5 rounded-lg transition-all font-semibold font-mono"
                    title="Open Windows directory selection dialog"
                  >
                    <Icon name="folder-search" className="w-4 h-4 text-accent-primary" />
                    <span>BROWSE FOLDER 📂</span>
                  </button>

                  {/* Subtle path display */}
                  {videoFolderInput && (
                    <div className="text-[10px] font-mono text-gray-500 truncate text-center my-0.5 select-text" title={videoFolderInput}>
                      Selected: <span className="text-gray-300">{videoFolderInput}</span>
                    </div>
                  )}

                  <button 
                    onClick={scanVideos}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-primary/20 to-purple-600/20 border border-accent-primary/40 hover:border-accent-primary text-xs text-white hover:text-white py-2.5 rounded-lg transition-all font-bold font-mono"
                  >
                    <Icon name="sparkles" className="w-3.5 h-3.5" />
                    <span>SCAN VIDEOS ⚡</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold font-mono text-gray-500">CLIPS ({project.video_blocks.length})</h3>
                  {project.video_blocks.length === 0 ? (
                    <span className="text-xs text-gray-600 italic">No clips scanned yet.</span>
                  ) : (
                    project.video_blocks.map((v, i) => (
                      <div 
                        key={v.id}
                        onClick={() => setSelectedBlock({ lane: 'video', index: i })}
                        className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all ${selectedBlock?.lane === 'video' && selectedBlock?.index === i ? 'bg-accent-primary/10 border-accent-primary text-white' : 'bg-carbon-card/20 border-carbon-border/50 hover:border-carbon-border hover:bg-carbon-card/40'}`}
                      >
                        <img src={v.thumbnail_path} className="w-10 h-7 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-gray-300">{v.filename}</p>
                          <span className="text-[10px] text-gray-500 font-mono">{v.duration_s.toFixed(1)}s</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab: SFX guide presets */}
            {activeTab === 'sfx' && (
              <div className="flex flex-col gap-4">
                <div className="bg-carbon-card/30 border border-carbon-border p-3 rounded-lg flex flex-col gap-2">
                  <h3 className="text-xs font-bold font-mono text-gray-400">LOAD PROMPTS TXT</h3>
                  <input 
                    type="file" 
                    accept=".txt" 
                    onChange={(e) => importTextFile('sfx', e.target.files[0])}
                    className="hidden" 
                    id="sfx-txt-import" 
                  />
                  <label 
                    htmlFor="sfx-txt-import"
                    className="w-full flex items-center justify-center gap-2 bg-carbon border border-carbon-border hover:border-accent-secondary text-xs hover:text-white py-2 rounded-lg cursor-pointer transition-all"
                  >
                    <Icon name="file-text" className="w-3.5 h-3.5 text-accent-secondary" />
                    <span>SELECT PROMPTS TXT</span>
                  </label>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold font-mono text-gray-400">PROMPT PRESETS</h3>
                  <p className="text-[11px] text-gray-500">Click any preset to copy text.</p>
                  
                  {[
                    "TrackType: SFX. Thunder crack followed by rain",
                    "TrackType: SFX. Satisfying mechanical keyboard key press",
                    "TrackType: SFX. Mobile application swipe transition whoosh",
                    "TrackType: SFX. Deep cinematic rumble bass drop"
                  ].map(preset => (
                    <div 
                      key={preset}
                      onClick={() => {
                        navigator.clipboard.writeText(preset);
                        addLog(`Copied prompt preset: "${preset}"`, "info");
                        if (selectedBlock && selectedBlock.lane === 'sfx') {
                          const updated = [...project.sfx_blocks];
                          if (updated[selectedBlock.index]) {
                            updated[selectedBlock.index] = { ...updated[selectedBlock.index], prompt: preset, status: 'idle' };
                          }
                          const newManifest = { ...project, sfx_blocks: updated };
                          setProject(newManifest);
                          saveProject(newManifest);
                          addLog(`Pasted preset into SFX slot ${selectedBlock.index}`, "success");
                        }
                      }}
                      className="p-2 border border-carbon-border/50 hover:border-accent-secondary bg-carbon-card/20 hover:bg-carbon-card/40 rounded-lg text-xs cursor-pointer select-text text-gray-400 transition-all font-mono"
                    >
                      {preset}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Voice / TTS Info */}
            {activeTab === 'voice' && (
              <div className="flex flex-col gap-4">
                <div className="bg-carbon-card/30 border border-carbon-border p-3 rounded-lg flex flex-col gap-2">
                  <h3 className="text-xs font-bold font-mono text-gray-400">LOAD SCRIPTS TXT</h3>
                  <input 
                    type="file" 
                    accept=".txt" 
                    onChange={(e) => importTextFile('voice', e.target.files[0])}
                    className="hidden" 
                    id="voice-txt-import" 
                  />
                  <label 
                    htmlFor="voice-txt-import"
                    className="w-full flex items-center justify-center gap-2 bg-carbon border border-carbon-border hover:border-accent-tertiary text-xs hover:text-white py-2 rounded-lg cursor-pointer transition-all"
                  >
                    <Icon name="file-text" className="w-3.5 h-3.5 text-accent-tertiary" />
                    <span>SELECT SCRIPTS TXT</span>
                  </label>
                </div>

                {/* 🎙️ CLONE CUSTOM VOICE INSTEAD OF PRESETS */}
                <div className="bg-carbon-card/30 border border-carbon-border p-3 rounded-lg flex flex-col gap-2">
                  <h3 className="text-xs font-bold font-mono text-gray-400">🎙️ CLONE CUSTOM VOICE</h3>
                  <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
                    Upload a short audio sample (.wav, .mp3, etc.) to clone the voice instantly using PocketTTS!
                  </p>
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleCloneVoiceUpload} 
                    className="hidden" 
                    id="voice-clone-upload" 
                  />
                  <label 
                    htmlFor="voice-clone-upload"
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-tertiary/10 to-teal-500/10 border border-accent-tertiary/30 hover:border-accent-tertiary text-xs hover:text-white py-2 rounded-lg cursor-pointer transition-all font-semibold font-mono"
                  >
                    <span>{isCloning ? "CLONING VOICE... 🔄" : "CLONE VOICE SAMPLE 📂"}</span>
                  </label>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold font-mono text-gray-400">VOICES AVAILABLE</h3>
                  <p className="text-[11px] text-gray-500">Click a voice to select it globally or assign to the active track block.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {availableVoices.map(voice => {
                      const activeVoice = (selectedBlock && selectedBlock.lane === 'voice') 
                        ? (project.voice_blocks[selectedBlock.index]?.voice || "alba")
                        : globalDefaultVoice;
                      const isVoiceSelected = voice === activeVoice;

                      return (
                         <div 
                           key={voice}
                           onClick={() => {
                             if (selectedBlock && selectedBlock.lane === 'voice') {
                               const updated = [...project.voice_blocks];
                               if (updated[selectedBlock.index]) {
                                 updated[selectedBlock.index] = { ...updated[selectedBlock.index], voice: voice };
                               }
                               const newManifest = { ...project, voice_blocks: updated };
                               setProject(newManifest);
                               saveProject(newManifest);
                               addLog(`Applied voice '${voice}' to voice slot ${selectedBlock.index}`, "success");
                             } else {
                               setGlobalDefaultVoice(voice);
                               addLog(`Set global default voice to '${voice}'`, "success");
                             }
                           }}
                           className={`flex items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-all border-2 relative group ${
                             isVoiceSelected 
                               ? 'bg-accent-tertiary/10 border-accent-tertiary text-white shadow-[0_0_8px_rgba(108,255,204,0.2)]' 
                               : 'bg-carbon-card/30 border-carbon-border/50 text-gray-400 hover:border-accent-tertiary/50 hover:bg-carbon-card/50'
                           }`}
                         >
                           <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isVoiceSelected ? 'bg-accent-tertiary shadow-[0_0_6px_#6cffcc]' : 'bg-gray-600'}`}></span>
                           <span className="text-xs font-mono font-semibold truncate flex-1" title={voice}>{voice}</span>
                           {!["alba", "marius", "fantine", "cosette", "jean", "eponine"].includes(voice) && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 deleteVoice(voice);
                               }}
                               className="text-gray-500 hover:text-red-500 hover:scale-110 p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 font-bold leading-none shrink-0"
                               title={`Delete custom voice ${voice}`}
                             >
                               ✕
                             </button>
                           )}
                         </div>
                       );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER TIMELINE & RUN CONTROL */}
        <div className="flex-1 flex flex-col min-w-0 bg-carbon overflow-hidden">
          
          {/* ── UPPER PART: MASTER MEDIA PREVIEWER & AUDIO COMPOSER MIXER ── */}
          <div className="shrink-0 border-b border-carbon-border bg-carbon-panel/20 p-5 flex flex-col items-center justify-center gap-4 select-text">
            
            {/* Centered Video Screen Section */}
            <div className="w-[600px] h-[280px] rounded-xl bg-black overflow-hidden relative border border-carbon-border/60 flex flex-col justify-center items-center group shadow-2xl">
              {previewMode === 'composer' ? (
                selectedBlock !== null && project.video_blocks[selectedBlock.index] ? (
                  project.video_blocks[selectedBlock.index].file_path ? (
                    <div className="relative w-full h-full">
                      <video 
                        ref={videoRef}
                        src={`/api/video/serve?path=${encodeURIComponent(project.video_blocks[selectedBlock.index].file_path)}`}
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleVideoSeek}
                        onEnded={() => setIsPlaying(false)}
                        onClick={togglePlayAll}
                      />
                      
                      {/* Hidden Audios */}
                      {project.voice_blocks[selectedBlock.index] && (project.voice_blocks[selectedBlock.index].status === 'done' || project.voice_blocks[selectedBlock.index].status === 'provided') && (
                        <audio 
                          ref={voiceAudioRef} 
                          src={`/projects/${project.project_name}/voice/vo_${String(selectedBlock.index).padStart(2, '0')}.wav`} 
                        />
                      )}
                      {project.sfx_blocks[selectedBlock.index] && project.sfx_blocks[selectedBlock.index].status === 'done' && (
                        <audio 
                          ref={sfxAudioRef} 
                          src={`/projects/${project.project_name}/sfx/sfx_${String(selectedBlock.index).padStart(2, '0')}.wav`} 
                        />
                      )}

                      {/* Hover Overlay Play button */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer" onClick={togglePlayAll}>
                        <div className="w-14 h-14 rounded-full bg-accent-primary/95 text-white flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all">
                          {isPlaying ? <span className="text-xl font-bold">||</span> : <Icon name="play" className="w-7 h-7 fill-current ml-1" />}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full h-full flex flex-col justify-center items-center p-6 bg-gradient-to-b from-carbon-panel to-black text-center cursor-pointer group select-none" onClick={togglePlayAll}>
                      {/* Glowing circular active waves */}
                      <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-accent-tertiary/10 border border-accent-tertiary/20 shadow-[0_0_50px_rgba(108,255,204,0.15)] mb-4 transition-transform group-hover:scale-105 duration-300">
                        {isPlaying ? (
                          <div className="absolute inset-0 rounded-full border-2 border-accent-tertiary/30 animate-ping opacity-75"></div>
                        ) : null}
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-tertiary to-teal-600 text-carbon flex items-center justify-center shadow-lg">
                          {isPlaying ? (
                            <span className="text-sm font-bold font-mono">||</span>
                          ) : (
                            <Icon name="mic" className="w-6 h-6 stroke-[2.5]" />
                          )}
                        </div>
                      </div>

                      <h4 className="text-xs font-extrabold text-white tracking-wider uppercase font-mono">📻 Synced Audio Preview</h4>
                      <p className="text-[11px] text-gray-300 mt-2 font-mono max-w-[280px] truncate">
                        {project.voice_blocks[selectedBlock.index]?.prompt ? `VO: "${project.voice_blocks[selectedBlock.index].prompt}"` : "No speech narration written."}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 font-mono max-w-[280px] truncate">
                        {project.sfx_blocks[selectedBlock.index]?.prompt ? `SFX: "${project.sfx_blocks[selectedBlock.index].prompt}"` : "No sound effects prompt."}
                      </p>

                      {/* Premium Animated wave pulse */}
                      <div className="flex items-center gap-1 mt-5 h-6 justify-center w-full">
                        {[16, 24, 8, 30, 12, 28, 20, 14, 26, 10, 18, 6].map((h, idx) => {
                          const duration = [0.8, 1.2, 0.6, 1.4, 0.7, 1.3, 1.0, 0.9, 1.5, 0.7, 1.1, 0.5];
                          return (
                            <div 
                              key={idx} 
                              style={{ 
                                height: `${h}px`,
                                transformOrigin: 'bottom',
                                animation: isPlaying ? `wave-pulse ${duration[idx]}s ease-in-out infinite alternate` : 'none'
                              }}
                              className="w-1 bg-accent-tertiary rounded-full opacity-80"
                            />
                          );
                        })}
                      </div>

                      {/* Hidden Audios */}
                      {project.voice_blocks[selectedBlock.index] && (project.voice_blocks[selectedBlock.index].status === 'done' || project.voice_blocks[selectedBlock.index].status === 'provided') && (
                        <audio 
                          ref={voiceAudioRef} 
                          src={`/projects/${project.project_name}/voice/vo_${String(selectedBlock.index).padStart(2, '0')}.wav`} 
                          onEnded={() => setIsPlaying(false)}
                        />
                      )}
                      {project.sfx_blocks[selectedBlock.index] && project.sfx_blocks[selectedBlock.index].status === 'done' && (
                        <audio 
                          ref={sfxAudioRef} 
                          src={`/projects/${project.project_name}/sfx/sfx_${String(selectedBlock.index).padStart(2, '0')}.wav`} 
                          onEnded={() => {
                            if (!project.voice_blocks[selectedBlock.index]?.prompt) {
                              setIsPlaying(false);
                            }
                          }}
                        />
                      )}
                    </div>
                  )
                ) : (
                  <div className="text-center p-6 flex flex-col items-center gap-2.5">
                    <div className="w-12 h-12 rounded-full bg-carbon-card/50 flex items-center justify-center text-accent-primary border border-carbon-border">
                      <Icon name="video" className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-gray-500 font-mono italic max-w-xs">
                      Select a timeline slot to load Interactive Pre-Render Previewer.
                    </p>
                  </div>
                )
              ) : (
                project.render_complete ? (
                  <div className="relative w-full h-full">
                    <video 
                      src={`/output/master.mp4?t=${Date.now()}`}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-center p-6 flex flex-col items-center gap-2.5">
                    <div className="w-12 h-12 rounded-full bg-carbon-card/50 flex items-center justify-center text-accent-secondary border border-carbon-border">
                      <Icon name="sparkles" className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-gray-400 font-mono font-semibold">Master Video Not Yet Rendered</p>
                    <p className="text-[11px] text-gray-500 max-w-[300px] leading-relaxed">
                      Stitch your tracks by hitting the <strong className="text-white">RENDER ▶</strong> button in the upper right. Once compiled, play and download here.
                    </p>
                  </div>
                )
              )}

              {/* Screen Footer Info */}
              <div className="absolute bottom-2 left-3 bg-black/60 backdrop-blur border border-white/5 px-2 py-0.5 rounded text-[9px] font-mono text-gray-400 z-10">
                {previewMode === 'composer' 
                  ? (selectedBlock ? `SLOT ${selectedBlock.index} ACTIVE PREVIEW` : "COMPOSER PREVIEW") 
                  : "MASTER EXPORT PREVIEW"
                }
              </div>
            </div>

            {/* Selection Buttons & Mixer Strip */}
            <div className="w-[600px] flex flex-col gap-3">
              
              {/* Preview Selection toggles below player screen */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setPreviewMode("composer")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${previewMode === 'composer' ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30 shadow-[0_0_10px_rgba(124,108,255,0.1)]' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary"></span>
                  ⚡ COMPOSER PREVIEW
                </button>
                <button
                  onClick={() => setPreviewMode("master")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${previewMode === 'master' ? 'bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/30 shadow-[0_0_10px_rgba(255,108,157,0.1)]' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-secondary"></span>
                  🎬 MASTER VIDEO
                </button>
              </div>

              {/* Slider Controls directly below buttons (Composer Mode) */}
              {previewMode === 'composer' && (
                <div className="flex gap-4 items-center bg-carbon-card/25 border border-carbon-border/30 rounded-xl p-3 shadow-lg select-none">
                  
                  {/* Video Volume */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-accent-primary font-mono w-10 shrink-0">VIDEO</span>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={videoVolume}
                      onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                      className="custom-slider flex-1"
                    />
                    <span className="text-[9px] font-mono text-gray-500 w-8 text-right">{Math.round(videoVolume * 100)}%</span>
                  </div>

                  {/* Voice Volume */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-accent-tertiary font-mono w-10 shrink-0">VOICE</span>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                      className="custom-slider flex-1"
                    />
                    <span className="text-[9px] font-mono text-gray-500 w-8 text-right">{Math.round(voiceVolume * 100)}%</span>
                  </div>

                  {/* SFX Volume */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-accent-secondary font-mono w-8 shrink-0">SFX</span>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={sfxVolume}
                      onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                      className="custom-slider flex-1"
                    />
                    <span className="text-[9px] font-mono text-gray-500 w-8 text-right">{Math.round(sfxVolume * 100)}%</span>
                  </div>

                  {/* Play Trigger */}
                  {selectedBlock !== null && (
                    <button
                      onClick={togglePlayAll}
                      className="flex items-center justify-center gap-1 bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/40 hover:border-accent-primary text-white text-[10px] font-bold px-3 py-1.5 rounded transition-all shrink-0 font-mono"
                    >
                      {isPlaying ? "❚❚ PAUSE" : "▶ PLAY"}
                    </button>
                  )}

                </div>
              )}

              {/* Master Video Download bar (Master Mode) */}
              {previewMode === 'master' && (
                <div className="flex gap-4 items-center bg-carbon-card/25 border border-carbon-border/30 rounded-xl p-3 shadow-lg select-none">
                  <div className="flex-1 text-[10px] font-mono text-gray-400">
                    <span className="text-white font-bold">🎬 master.mp4: </span>
                    {project.render_complete ? "Your master render is compiled! Click to download final composition." : "Master video compilation has not been run yet."}
                  </div>
                  <a 
                    href={`/output/master.mp4`} 
                    download={`${project.project_name}_master.mp4`}
                    onClick={(e) => {
                      if (!project.render_complete) {
                        e.preventDefault();
                        addLog("Cannot download! Master video has not been rendered yet.", "error");
                      }
                    }}
                    className={`flex items-center justify-center gap-2 bg-gradient-to-r from-accent-secondary to-pink-600 hover:from-accent-secondary hover:to-pink-500 text-white font-bold px-4 py-2 rounded-lg transition-all text-xs font-mono shrink-0 shadow-md ${!project.render_complete ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span>DOWNLOAD MASTER 📥</span>
                  </a>
                </div>
              )}

            </div>

          </div>

          {/* ── LOWER PART: INTERACTIVE MULTI-LANE TRACKS TIMELINE ── */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 overflow-x-hidden min-h-[220px]">
            
            {/* Timeline Wrapper Container */}
            <div className="flex-1 flex flex-col border border-carbon-border/50 rounded-xl bg-carbon-panel/30 overflow-hidden relative select-none">
              
              {/* RULER TRACK HEADER */}
              <div className="flex h-10 border-b border-carbon-border bg-carbon-panel/60">
                <div className="w-20 border-r border-carbon-border flex items-center justify-center font-mono text-xs text-gray-500 font-semibold select-none gap-1.5">
                  <input 
                    type="checkbox"
                    checked={selectedIndices.length === project.video_blocks.length && project.video_blocks.length > 0}
                    onChange={handleToggleSelectAll}
                    className="rounded border-carbon-border bg-carbon text-accent-primary focus:ring-0 cursor-pointer"
                    title="Select All Slots"
                  />
                  <span>TIME</span>
                </div>
                
                <div 
                  ref={timelineHeaderRef}
                  className="flex-1 overflow-x-auto sync-scroll-container timeline-ruler flex items-center relative"
                >
                  {project.video_blocks.map((v, i) => {
                    const isSelected = selectedIndices.includes(i);
                    return (
                      <div 
                        key={v.id} 
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", i);
                          setDraggedIndex(i);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDragEnter={() => setDragOverIndex(i)}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
                          handleMoveSlot(fromIdx, i);
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        style={{ width: '140px', minWidth: '140px' }}
                        className={`h-full border-r border-carbon-border/30 flex items-center pl-2 font-mono text-[10px] text-gray-500 select-none gap-1.5 draggable-ruler-tick ${dragOverIndex === i && draggedIndex !== i ? 'bg-accent-primary/20 border-l-2 border-accent-primary' : 'hover:bg-carbon-card/30'}`}
                        title="Drag to reposition sequence"
                      >
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectIndex(i)}
                          className="rounded border-carbon-border bg-carbon text-accent-primary focus:ring-0 cursor-pointer shrink-0"
                          title="Select Column"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>{formatTime(i * 5)}s</span>
                        
                        {/* Quick Insert button inside ruler tick */}
                        <button
                          onClick={(e) => { e.stopPropagation(); insertBlankSlotAt(i); }}
                          className="text-gray-600 hover:text-white text-xs font-extrabold ml-auto mr-2 focus:outline-none"
                          title="Insert blank slot before this column"
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                  {project.video_blocks.length === 0 && (
                    <span className="text-xs text-gray-600 italic pl-4">Ruler empty. Load videos to see seconds.</span>
                  )}
                </div>
              </div>

              {/* TIMELINE LANES */}
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto relative">
                
                {/* Rendering Vertical Hover-Insertion Dividers */}
                {project.video_blocks.map((v, i) => (
                  <div
                    key={`divider-${i}`}
                    style={{ left: `${(i * 146) + 143}px` }}
                    className="timeline-insert-divider"
                    onClick={() => insertBlankSlotAt(i + 1)}
                    title={`Insert slot between position ${i} and ${i + 1}`}
                  >
                    <div className="timeline-insert-button">+</div>
                  </div>
                ))}
                
                {/* Divider at the very beginning (position 0) */}
                {project.video_blocks.length > 0 && (
                  <div
                    style={{ left: `-3px` }}
                    className="timeline-insert-divider"
                    onClick={() => insertBlankSlotAt(0)}
                    title="Insert slot at the very beginning (position 0)"
                  >
                    <div className="timeline-insert-button">+</div>
                  </div>
                )}

                {/* DYNAMIC TIMELINE LAYERS */}
                {timelineLayers.map((layer, layerIdx) => {
                  let accentColor = 'text-accent-primary';
                  let iconName = 'video';
                  if (layer.type === 'sfx') {
                    accentColor = 'text-accent-secondary';
                    iconName = 'music';
                  } else if (layer.type === 'voice') {
                    accentColor = 'text-accent-tertiary';
                    iconName = 'mic';
                  }

                  const isDefaultLayer = ['video-1', 'sfx-1', 'voice-1'].includes(layer.id);

                  return (
                    <div key={layer.id} className="flex h-24 border-b border-carbon-border bg-carbon-panel/10 hover:bg-carbon-panel/20 transition-all relative group/row">
                      
                      {/* Left Track Header */}
                      <div className="w-20 border-r border-carbon-border flex flex-col items-center justify-center text-[10px] font-bold select-none p-1 text-center relative shrink-0">
                        <Icon name={iconName} className={`w-3.5 h-3.5 mb-1 ${accentColor}`} />
                        <span className="truncate max-w-full text-gray-300" title={layer.name}>{layer.name}</span>
                        
                        {/* Layer removal button for custom layers */}
                        {!isDefaultLayer && (
                          <button
                            onClick={() => removeTimelineLayer(layer.id)}
                            className="absolute top-1 right-1 text-gray-500 hover:text-red-500 font-extrabold text-[9px] focus:outline-none opacity-0 group-hover/row:opacity-100 transition-opacity"
                            title={`Remove layer: ${layer.name}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Timeline Lane Track */}
                      <div 
                        ref={layer.type === 'video' ? laneVideoRef : (layer.type === 'sfx' ? laneSfxRef : laneVoiceRef)}
                        onScroll={handleScroll}
                        className="flex-1 overflow-x-auto flex items-center py-2 px-2 timeline-lane-track gap-1.5"
                      >
                        {layer.blocks.map((block, i) => {
                          const isBlockSelected = selectedBlock?.layerId === layer.id && selectedBlock?.index === i;
                          const isColSelected = selectedIndices.includes(i);
                          
                          // Render Video block
                          if (layer.type === 'video') {
                            return (
                              <div 
                                key={block.id}
                                onClick={(e) => {
                                  if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                    e.stopPropagation();
                                    handleToggleSelectIndex(i);
                                  } else {
                                    setSelectedBlock({ lane: 'video', index: i, layerId: layer.id });
                                  }
                                }}
                                style={{ width: '140px', minWidth: '140px' }}
                                className={`relative h-[68px] rounded-lg p-1.5 flex flex-col justify-between border cursor-pointer select-none transition-all group ${
                                  isBlockSelected
                                    ? 'bg-accent-primary/10 border-accent-primary shadow-[0_0_8px_rgba(124,108,255,0.2)] text-white'
                                    : (isColSelected
                                        ? 'bg-carbon-card/40 border-accent-primary/60 text-gray-300'
                                        : 'bg-carbon-card/25 border-carbon-border/50 text-gray-400 hover:border-accent-primary/40 hover:bg-carbon-card/35')
                                }`}
                              >
                                <img src={block.thumbnail_path} className="w-full h-11 rounded object-cover" />
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="truncate font-semibold text-gray-300 max-w-[80px]">{block.filename}</span>
                                  <span className="font-mono text-gray-500">{block.duration_s.toFixed(1)}s</span>
                                </div>
                              </div>
                            );
                          }

                          // Render SFX block
                          if (layer.type === 'sfx') {
                            return (
                              <div 
                                key={block.id}
                                onClick={(e) => {
                                  if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                    e.stopPropagation();
                                    handleToggleSelectIndex(i);
                                  } else {
                                    setSelectedBlock({ lane: 'sfx', index: i, layerId: layer.id });
                                  }
                                }}
                                style={{ width: '140px', minWidth: '140px' }}
                                className={`relative h-[68px] rounded-lg p-1.5 flex flex-col justify-between border cursor-pointer select-none transition-all group ${
                                  isBlockSelected
                                    ? 'bg-accent-secondary/15 border-accent-secondary shadow-[0_0_8px_rgba(255,108,157,0.25)] text-white'
                                    : (isColSelected
                                        ? 'bg-carbon-card/40 border-accent-secondary/60 text-gray-300'
                                        : 'bg-carbon-card/25 border-carbon-border/50 text-gray-400 hover:border-accent-secondary/40 hover:bg-carbon-card/35')
                                }`}
                              >
                                <div className="flex-1 flex flex-col gap-1 w-full h-full">
                                  <textarea
                                    value={block.prompt}
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      setTimelineLayers(prev => prev.map(l => {
                                        if (l.id === layer.id) {
                                          const newBlocks = [...l.blocks];
                                          newBlocks[i] = { ...newBlocks[i], prompt: text, status: 'idle' };
                                          return { ...l, blocks: newBlocks };
                                        }
                                        return l;
                                      }));
                                    }}
                                    onBlur={() => saveProject()}
                                    placeholder="Type sfx prompt..."
                                    className="w-full flex-1 bg-transparent text-[10px] text-gray-300 outline-none resize-none leading-tight font-mono border-0 focus:ring-0 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[9px] font-mono mt-1 pt-1 border-t border-carbon-border/20">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      generateSfx(i, block.prompt, { model: 'small-sfx', duration: 5.0, steps: 8, seed: -1 });
                                    }}
                                    disabled={block.status === 'generating'}
                                    className="bg-accent-secondary/20 hover:bg-accent-secondary/40 text-accent-secondary px-1.5 py-0.5 rounded font-bold transition-all text-[8px]"
                                  >
                                    {block.status === 'generating' ? '...' : '⚡ GEN'}
                                  </button>
                                  <span className={getStatusBadgeClass(block.status)}>
                                    {block.status.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          // Render Voice block
                          if (layer.type === 'voice') {
                            return (
                              <div 
                                key={block.id}
                                onClick={(e) => {
                                  if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                    e.stopPropagation();
                                    handleToggleSelectIndex(i);
                                  } else {
                                    setSelectedBlock({ lane: 'voice', index: i, layerId: layer.id });
                                  }
                                }}
                                style={{ width: '140px', minWidth: '140px' }}
                                className={`relative h-[68px] rounded-lg p-1.5 flex flex-col justify-between border cursor-pointer select-none transition-all group ${
                                  isBlockSelected
                                    ? 'bg-accent-tertiary/15 border-accent-tertiary shadow-[0_0_8px_rgba(108,255,204,0.25)] text-white'
                                    : (isColSelected
                                        ? 'bg-carbon-card/40 border-accent-tertiary/60 text-gray-300'
                                        : 'bg-carbon-card/25 border-carbon-border/50 text-gray-400 hover:border-accent-tertiary/40 hover:bg-carbon-card/35')
                                }`}
                              >
                                <div className="flex-1 flex flex-col gap-1 w-full h-full">
                                  <textarea
                                    value={block.prompt || ""}
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      setTimelineLayers(prev => prev.map(l => {
                                        if (l.id === layer.id) {
                                          const newBlocks = [...l.blocks];
                                          newBlocks[i] = { ...newBlocks[i], prompt: text, status: 'idle' };
                                          return { ...l, blocks: newBlocks };
                                        }
                                        return l;
                                      }));
                                    }}
                                    onBlur={() => saveProject()}
                                    placeholder="Type script..."
                                    className="w-full flex-1 bg-transparent text-[10px] text-gray-300 outline-none resize-none leading-tight font-mono border-0 focus:ring-0 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[9px] font-mono mt-1 pt-1 border-t border-carbon-border/20 gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      generateTts(i, block.prompt || "", block.voice || globalDefaultVoice || "alba");
                                    }}
                                    disabled={block.status === 'generating'}
                                    className="bg-accent-tertiary/20 hover:bg-accent-tertiary/40 text-accent-tertiary px-1.5 py-0.5 rounded font-bold transition-all text-[8px] shrink-0"
                                  >
                                    {block.status === 'generating' ? '...' : '⚡ GEN'}
                                  </button>
                                  
                                  <span 
                                    className="text-[8px] text-accent-tertiary/80 font-mono truncate max-w-[42px]" 
                                    title={`Voice: ${block.voice || globalDefaultVoice || "alba"}`}
                                  >
                                    🗣️ {block.voice || globalDefaultVoice || "alba"}
                                  </span>

                                  <span className={getStatusBadgeClass(block.status)}>
                                    {block.status.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>

                    </div>
                  );
                })}

                {/* + ADD LAYER MENU ROW */}
                <div className="flex h-10 border-b border-carbon-border bg-carbon-card/5 select-none items-center justify-start px-4 gap-2">
                  <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Lanes Area</span>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => addTimelineLayer('video')}
                      className="flex items-center gap-1.5 bg-accent-primary/10 hover:bg-accent-primary/20 border border-accent-primary/30 hover:border-accent-primary text-accent-primary hover:text-white px-2.5 py-1 rounded text-[9px] font-bold font-mono transition-all"
                      title="Add a new dynamic Video layer"
                    >
                      ➕ VIDEO LAYER 🎬
                    </button>
                    <button
                      onClick={() => addTimelineLayer('sfx')}
                      className="flex items-center gap-1.5 bg-accent-secondary/10 hover:bg-accent-secondary/20 border border-accent-secondary/30 hover:border-accent-secondary text-accent-secondary hover:text-white px-2.5 py-1 rounded text-[9px] font-bold font-mono transition-all"
                      title="Add a new dynamic SFX layer"
                    >
                      ➕ SFX LAYER 🎵
                    </button>
                    <button
                      onClick={() => addTimelineLayer('voice')}
                      className="flex items-center gap-1.5 bg-accent-tertiary/10 hover:bg-accent-tertiary/20 border border-accent-tertiary/30 hover:border-accent-tertiary text-accent-tertiary hover:text-white px-2.5 py-1 rounded text-[9px] font-bold font-mono transition-all"
                      title="Add a new dynamic Voice layer"
                    >
                      ➕ VOICE LAYER 🎙️
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* REAL TIME CONSOLE LOGGER (Bottom) */}
          <div className="h-44 border-t border-carbon-border bg-carbon-panel flex flex-col overflow-hidden">
            <div className="h-8 border-b border-carbon-border bg-carbon-card/20 px-4 flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-gray-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary shadow-[0_0_6px_#7c6cff]"></span>
                LIVE CONSOLE LOGS
              </span>
              <button 
                onClick={() => setLogs([])}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-all font-mono"
              >
                CLEAR LOGS
              </button>
            </div>
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs flex flex-col gap-1 select-text selection:bg-accent-primary/30">
              {logs.length === 0 ? (
                <span className="text-gray-600 italic">No operations recorded yet. Scanners, proxy generation updates, and compiler logs will show up here.</span>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-gray-500">[{log.time}]</span>
                    <span className={log.type === 'error' ? 'text-red-400 font-semibold' : (log.type === 'success' ? 'text-emerald-400 font-semibold' : 'text-gray-300')}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={consoleBottomRef} />
            </div>
          </div>

        </div>

        {/* SIDEBAR BLOCK PARAMETER CONTROLLER (Right) */}
        {isSidebarOpen && (
          <div className="w-80 border-l border-carbon-border bg-carbon-panel flex flex-col overflow-hidden">
            <div className="h-12 border-b border-carbon-border px-4 flex items-center justify-between bg-carbon-card/10">
              <span className="font-bold text-xs text-gray-400 uppercase tracking-wider font-mono">Slot Settings</span>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
              
              {!selectedBlock ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <Icon name="sliders-horizontal" className="w-8 h-8 text-gray-600 mb-2" />
                  <p className="text-xs text-gray-500 italic">Select any block in the timeline grid to edit its parameters and trigger local generation.</p>
                </div>
              ) : (
                <>
                  {/* Block Basics */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold font-mono text-gray-500">SELECTED ITEM</span>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${selectedBlock.lane === 'video' ? 'bg-accent-primary' : (selectedBlock.lane === 'sfx' ? 'bg-accent-secondary' : 'bg-accent-tertiary')}`}></span>
                      {selectedBlock.lane.toUpperCase()} BLOCK {blockData?.id}
                    </h3>
                    <span className="text-[10px] text-gray-500 font-mono">Order Index: {selectedBlock.index}</span>
                  </div>

                  {/* Video Block Detail View */}
                  {selectedBlock.lane === 'video' && blockData && (
                    <div className="flex flex-col gap-4">
                      <img src={blockData.thumbnail_path} className="w-full h-32 rounded-lg object-cover border border-carbon-border" />
                      <div className="bg-carbon/50 p-3 rounded-lg border border-carbon-border/50 font-mono text-xs flex flex-col gap-2">
                        <div>
                          <span className="text-gray-500">File Name:</span>
                          <p className="text-gray-200 truncate mt-0.5">{blockData.filename}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <p className="text-gray-200 mt-0.5">{blockData.duration_s.toFixed(2)}s</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Absolute Path:</span>
                          <p className="text-gray-400 text-[10px] break-all select-text mt-0.5">{blockData.file_path}</p>
                        </div>
                      </div>

                      {/* Video Manual Upload and Clear actions */}
                      <div className="flex flex-col gap-2 border-t border-carbon-border/40 pt-4 mt-2">
                        <span className="text-[10px] font-bold font-mono text-gray-500">MANUAL COMPOSITION</span>
                        <input 
                          type="file" 
                          accept="video/*" 
                          onChange={(e) => handleCustomVideoUpload(selectedBlock.index, e.target.files[0])} 
                          className="hidden" 
                          id="custom-video-upload-btn" 
                        />
                        <label 
                          htmlFor="custom-video-upload-btn"
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-primary/20 to-indigo-600/20 border border-accent-primary/50 hover:border-accent-primary text-xs text-white hover:text-white py-2 rounded-lg cursor-pointer transition-all font-semibold font-mono"
                        >
                          <span>UPLOAD VIDEO CLIP 📤</span>
                        </label>

                        {blockData.file_path && (
                          <button 
                            onClick={() => clearBlockMedia('video', selectedBlock.index)}
                            className="w-full flex items-center justify-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500 text-yellow-400 font-mono text-[10px] py-2 rounded-lg transition-all font-semibold"
                          >
                            <span>🧹 CLEAR VIDEO MEDIA</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SFX Block Controller */}
                  {selectedBlock.lane === 'sfx' && blockData && (
                    <SfxController 
                      index={selectedBlock.index}
                      block={blockData}
                      project={project}
                      onPromptChange={(text) => handlePromptChange('sfx', selectedBlock.index, text)}
                      onSaveProject={() => saveProject()}
                      onGenerate={(prompt, params) => generateSfx(selectedBlock.index, prompt, params)}
                      addLog={addLog}
                      onCustomSfxUpload={(file) => handleCustomSfxUpload(selectedBlock.index, file)}
                      onClearSfx={() => clearBlockMedia('sfx', selectedBlock.index)}
                    />
                  )}

                  {/* Voice Block Controller */}
                  {selectedBlock.lane === 'voice' && blockData && (
                    <VoiceController 
                      index={selectedBlock.index}
                      block={blockData}
                      project={project}
                      onPromptChange={(text) => handlePromptChange('voice', selectedBlock.index, text)}
                      onVoiceChange={(voice) => {
                        const updated = [...project.voice_blocks];
                        if (updated[selectedBlock.index]) {
                          updated[selectedBlock.index] = { ...updated[selectedBlock.index], voice: voice };
                         }
                        const newManifest = { ...project, voice_blocks: updated };
                        setProject(newManifest);
                        saveProject(newManifest);
                      }}
                      onSaveProject={() => saveProject()}
                      onGenerate={(text, voice) => generateTts(selectedBlock.index, text, voice)}
                      addLog={addLog}
                      availableVoices={availableVoices}
                      onCustomVoiceUpload={(file) => handleCustomVoiceUpload(selectedBlock.index, file)}
                      onClearVoice={() => clearBlockMedia('voice', selectedBlock.index)}
                    />
                  )}

                  {/* Slot Removal Action */}
                  <div className="border-t border-carbon-border/40 pt-4 mt-auto flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => insertBlankSlotAt(selectedBlock.index)}
                        className="flex items-center justify-center gap-1 bg-carbon border border-carbon-border hover:border-accent-primary text-[9px] font-mono py-2 rounded-lg text-gray-300 transition-all font-semibold"
                        title="Insert blank slot before selected"
                      >
                        <Icon name="plus" className="w-3 h-3 text-accent-primary" />
                        <span>INSERT BEFORE</span>
                      </button>
                      <button
                        onClick={() => insertBlankSlotAt(selectedBlock.index + 1)}
                        className="flex items-center justify-center gap-1 bg-carbon border border-carbon-border hover:border-accent-primary text-[9px] font-mono py-2 rounded-lg text-gray-300 transition-all font-semibold"
                        title="Insert blank slot after selected"
                      >
                        <Icon name="plus" className="w-3 h-3 text-accent-primary" />
                        <span>INSERT AFTER</span>
                      </button>
                    </div>

                    <button
                      onClick={() => deleteSlot(selectedBlock.index)}
                      className="w-full flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-400 font-mono text-[10px] py-2 rounded-lg transition-all font-semibold"
                    >
                      <Icon name="trash-2" className="w-3.5 h-3.5" />
                      <span>DELETE TIMELINE SLOT</span>
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

      </div>

      {/* ── SETTINGS CONFIGURATION MODAL ── */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-carbon-panel border border-carbon-border rounded-xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-carbon-border pb-3">
              <h2 className="text-sm font-extrabold text-white tracking-wide font-mono">SETTINGS CONFIGURATION</h2>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-xs font-mono">
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-500">POCKET TTS SERVER URL</label>
                <input 
                  value={settings.tts_server_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, tts_server_url: e.target.value }))}
                  className="bg-carbon border border-carbon-border/50 focus:border-accent-primary outline-none px-3 py-2 rounded-lg text-white font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-500">STABLE AUDIO SERVER URL (LOCAL/COLAB)</label>
                <input 
                  value={settings.sfx_server_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, sfx_server_url: e.target.value }))}
                  className="bg-carbon border border-carbon-border/50 focus:border-accent-primary outline-none px-3 py-2 rounded-lg text-white font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-500">OUTPUT MASTER DIRECTORY</label>
                <input 
                  value={settings.output_dir}
                  onChange={(e) => setSettings(prev => ({ ...prev, output_dir: e.target.value }))}
                  className="bg-carbon border border-carbon-border/50 focus:border-accent-primary outline-none px-3 py-2 rounded-lg text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="bg-carbon border border-carbon-border hover:bg-carbon-card/50 text-xs px-4 py-2 rounded-lg text-gray-300 transition-all font-semibold"
              >
                CANCEL
              </button>
              <button 
                onClick={async () => {
                  try {
                    const resp = await fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(settings)
                    });
                    if (resp.ok) {
                      addLog("Settings updated successfully.", "success");
                      setShowSettingsModal(false);
                      checkHealth();
                    }
                  } catch (e) {
                    addLog("Failed updating settings.", "error");
                  }
                }}
                className="bg-gradient-to-r from-accent-primary to-indigo-600 text-xs text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-accent-primary/20 transition-all font-semibold"
              >
                SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Subcomponent: SFX Controller Panel
function SfxController({ index, block, project, onPromptChange, onSaveProject, onGenerate, addLog, onCustomSfxUpload, onClearSfx }) {
  const [promptInput, setPromptInput] = useState(block.prompt || "");
  const [model, setModel] = useState("small-sfx");
  const [duration, setDuration] = useState(block.duration_s || 5.0);
  const [steps, setSteps] = useState(8);
  const [seed, setSeed] = useState(-1);

  // Sync inputs on block change
  useEffect(() => {
    setPromptInput(block.prompt || "");
    if (block.duration_s) setDuration(block.duration_s);
  }, [block.id]);

  const handleGen = () => {
    onGenerate(promptInput, { model, duration, steps, seed });
  };

  // Check audio path for play availability
  const hasAudio = block.status === 'done' && block.file_path;
  // Convert project folder to playing route
  // e.g. /projects/Short_01/sfx/sfx_00.wav
  const audioUrl = hasAudio ? `/projects/${project.project_name}/sfx/sfx_${String(block.order).padStart(2, '0')}.wav` : null;

  return (
    <div className="flex flex-col gap-4 text-xs font-mono">
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-500">STABLE AUDIO PROMPT</label>
        <textarea 
          value={promptInput}
          onChange={(e) => {
            setPromptInput(e.target.value);
            onPromptChange(e.target.value);
          }}
          onBlur={() => onSaveProject()}
          placeholder="e.g. TrackType: SFX. Retro game synth sound effect, coin jump"
          className="w-full bg-carbon border border-carbon-border/50 focus:border-accent-secondary outline-none px-2.5 py-2 rounded-lg text-white font-mono h-20 resize-none leading-tight"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-gray-500">MODEL TYPE</label>
        <select 
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-carbon border border-carbon-border/50 outline-none px-2 py-1.5 rounded-lg text-gray-200"
        >
          <option value="small-sfx">small-sfx (Sound Effects)</option>
          <option value="small-music">small-music (Music & Ambient)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-500">STEPS ({steps})</label>
          <input 
            type="range" 
            min="2" 
            max="16" 
            value={steps} 
            onChange={(e) => setSteps(parseInt(e.target.value))}
            className="custom-slider"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-500">DURATION ({duration}s)</label>
          <input 
            type="range" 
            min="1" 
            max="15" 
            step="0.5"
            value={duration} 
            onChange={(e) => setDuration(parseFloat(e.target.value))}
            className="custom-slider"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-gray-500">RANDOM SEED (-1 = random)</label>
        <input 
          type="number" 
          value={seed}
          onChange={(e) => setSeed(parseInt(e.target.value))}
          className="bg-carbon border border-carbon-border/50 outline-none px-2 py-1.5 rounded-lg text-white font-mono"
        />
      </div>

      <button 
        onClick={handleGen}
        disabled={block.status === 'generating'}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-accent-secondary to-pink-700 hover:from-accent-secondary hover:to-pink-600 text-white font-bold py-2.5 rounded-lg shadow-lg hover:shadow-accent-secondary/10 disabled:opacity-50 transition-all mt-1"
      >
        {block.status === 'generating' ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>GENERATING...</span>
          </>
        ) : (
          <>
            <Icon name="sparkles" className="w-3.5 h-3.5" />
            <span>GENERATE SFX</span>
          </>
        )}
      </button>

      {hasAudio && (
        <div className="flex flex-col gap-2 mt-2 bg-carbon/50 p-2.5 border border-carbon-border rounded-lg">
          <span className="text-[10px] text-emerald-400 font-bold">✓ AUDIO GENERATED</span>
          <audio src={audioUrl} controls className="w-full h-8" />
          <a 
            href={audioUrl} 
            download={`sfx_${String(block.order).padStart(2, '0')}.wav`}
            className="text-center text-[10px] text-gray-500 hover:text-white underline"
          >
            Download WAV File
          </a>
        </div>
      )}

      {/* SFX Manual Upload and Clear actions */}
      <div className="flex flex-col gap-2 border-t border-carbon-border/40 pt-4 mt-2">
        <span className="text-[10px] font-bold font-mono text-gray-500">MANUAL COMPOSITION</span>
        <input 
          type="file" 
          accept="audio/*" 
          onChange={(e) => onCustomSfxUpload(e.target.files[0])} 
          className="hidden" 
          id="custom-sfx-upload-btn" 
        />
        <label 
          htmlFor="custom-sfx-upload-btn"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-secondary/20 to-pink-600/20 border border-accent-secondary/50 hover:border-accent-secondary text-xs text-white hover:text-white py-2 rounded-lg cursor-pointer transition-all font-semibold font-mono"
        >
          <span>UPLOAD SFX AUDIO 📤</span>
        </label>

        {block.file_path && (
          <button 
            onClick={onClearSfx}
            className="w-full flex items-center justify-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500 text-yellow-400 font-mono text-[10px] py-2 rounded-lg transition-all font-semibold"
          >
            <span>🧹 CLEAR SFX MEDIA</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Subcomponent: Voice / TTS Controller Panel
function VoiceController({ index, block, project, onPromptChange, onVoiceChange, onSaveProject, onGenerate, addLog, availableVoices = [], onCustomVoiceUpload, onClearVoice }) {
  const [promptInput, setPromptInput] = useState(block.prompt || "");
  const [voice, setVoice] = useState(block.voice || "alba");

  useEffect(() => {
    setPromptInput(block.prompt || "");
    setVoice(block.voice || "alba");
  }, [block.id, block.voice]);

  const handleGen = () => {
    onGenerate(promptInput, voice);
  };

  const hasAudio = (block.status === 'done' || block.status === 'provided') && block.file_path;
  const audioUrl = hasAudio ? `/projects/${project.project_name}/voice/vo_${String(block.order).padStart(2, '0')}.wav` : null;

  return (
    <div className="flex flex-col gap-4 text-xs font-mono">
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-500">VOICEOVER TTS SCRIPT</label>
        <textarea 
          value={promptInput}
          onChange={(e) => {
            setPromptInput(e.target.value);
            onPromptChange(e.target.value);
          }}
          onBlur={() => onSaveProject()}
          placeholder="e.g. Welcome to the future of AI video production, running entirely on your local machine."
          className="w-full bg-carbon border border-carbon-border/50 focus:border-accent-tertiary outline-none px-2.5 py-2 rounded-lg text-white font-mono h-20 resize-none leading-tight"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-gray-500">VOICE SELECTION</label>
        <select 
          value={voice}
          onChange={(e) => {
            const v = e.target.value;
            setVoice(v);
            onVoiceChange(v);
          }}
          className="w-full bg-carbon border border-carbon-border/50 outline-none px-2 py-1.5 rounded-lg text-gray-200 font-mono"
        >
          {availableVoices.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      <button 
        onClick={handleGen}
        disabled={block.status === 'generating'}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-accent-tertiary to-teal-700 hover:from-accent-tertiary hover:to-teal-600 text-white font-bold py-2.5 rounded-lg shadow-lg hover:shadow-accent-tertiary/10 disabled:opacity-50 transition-all mt-1"
      >
        {block.status === 'generating' ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>SYNTHESIZING...</span>
          </>
        ) : (
          <>
            <Icon name="mic" className="w-3.5 h-3.5" />
            <span>SYNTHESIZE SPEECH</span>
          </>
        )}
      </button>

      {hasAudio && (
        <div className="flex flex-col gap-2 mt-2 bg-carbon/50 p-2.5 border border-carbon-border rounded-lg">
          <span className="text-[10px] text-emerald-400 font-bold">✓ SPEECH GENERATED</span>
          <audio src={audioUrl} controls className="w-full h-8" />
          <a 
            href={audioUrl} 
            download={`vo_${String(block.order).padStart(2, '0')}.wav`}
            className="text-center text-[10px] text-gray-500 hover:text-white underline"
          >
            Download WAV File
          </a>
        </div>
      )}

      {/* Voice Manual Upload and Clear actions */}
      <div className="flex flex-col gap-2 border-t border-carbon-border/40 pt-4 mt-2">
        <span className="text-[10px] font-bold font-mono text-gray-500">MANUAL COMPOSITION</span>
        <input 
          type="file" 
          accept="audio/*" 
          onChange={(e) => onCustomVoiceUpload(e.target.files[0])} 
          className="hidden" 
          id="custom-voice-upload-btn" 
        />
        <label 
          htmlFor="custom-voice-upload-btn"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-tertiary/20 to-teal-600/20 border border-accent-tertiary/50 hover:border-accent-tertiary text-xs text-white hover:text-white py-2 rounded-lg cursor-pointer transition-all font-semibold font-mono"
        >
          <span>UPLOAD SPEECH AUDIO 📤</span>
        </label>

        {block.file_path && (
          <button 
            onClick={onClearVoice}
            className="w-full flex items-center justify-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500 text-yellow-400 font-mono text-[10px] py-2 rounded-lg transition-all font-semibold"
          >
            <span>🧹 CLEAR VOICE MEDIA</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Render root App
const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
