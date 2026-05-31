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
  const [globalDefaultVoice, setGlobalDefaultVoice] = useState(() => {
    try { return localStorage.getItem('as_default_voice') || 'alba'; } catch { return 'alba'; }
  });
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
  // Stable timestamp for master video URL — only updated when a new render finishes, NOT on every render cycle
  const [masterVideoTs, setMasterVideoTs] = useState(() => Date.now());
  const [licenseStatus, setLicenseStatus] = useState({ valid: true, message: "", gmail: "", expiry_date: "", license_key: "" });
  const [isActivatingLicense, setIsActivatingLicense] = useState(false);

  const [currentView, setCurrentView] = useState(() => {
    try { return localStorage.getItem('as_current_view') || 'start'; } catch { return 'start'; }
  }); // "start" | "editor"
  const [localProjects, setLocalProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('as_theme') || 'dark'; } catch { return 'dark'; }
  });

  // Persist current view changes to localStorage
  useEffect(() => {
    try { localStorage.setItem('as_current_view', currentView); } catch (e) {}
  }, [currentView]);

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

  // SQLite local database history states
  const [dbHistory, setDbHistory] = useState([]);
  const [dbRenders, setDbRenders] = useState([]);

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
      // Pick voice: first look for explicit per-block voice assignment, then default
      let chosenVoice = globalDefaultVoice || "alba";
      voiceLayers.forEach(l => {
        const b = l.blocks[i];
        if (b) {
          if (b.voice) chosenVoice = b.voice; // always read voice regardless of prompt
          if (b.prompt && b.prompt.trim()) prompts.push(b.prompt.trim());
          if (b.status === 'generating') combinedStatus = 'generating';
          if (b.file_path) combinedFilePath = b.file_path;
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

  const checkLicenseStatus = async () => {
    try {
      const resp = await fetch("/api/license/status");
      const data = await resp.json();
      setLicenseStatus(data);
      if (!data.valid) {
        addLog(`License Validation: ${data.message}`, "error");
      }
    } catch (e) {
      console.error("Failed to check license:", e);
    }
  };

  const fetchDbHistory = async () => {
    try {
      const [hResp, rResp] = await Promise.all([
        fetch("/api/db/history"),
        fetch("/api/db/renders")
      ]);
      const hData = await hResp.json();
      const rData = await rResp.json();
      setDbHistory(hData.history || []);
      setDbRenders(rData.renders || []);
    } catch (e) {
      console.error("Failed to fetch database history:", e);
    }
  };

  const fetchLocalProjects = async () => {
    try {
      const resp = await fetch("/api/db/projects");
      if (resp.ok) {
        const data = await resp.json();
        setLocalProjects(data.projects || []);
      }
    } catch (e) {
      console.error("Failed to load local projects:", e);
    }
  };

  // Load project & health on launch
  useEffect(() => {
    addLog("Initializing AutoStitch Studio UI...", "info");
    checkLicenseStatus();
    fetchSettings();
    checkHealth();
    fetchVoices();
    fetchLocalProjects();

    // Session restore: if we were inside the editor, load the active project!
    try {
      const savedProj = localStorage.getItem('as_active_project');
      const savedView = localStorage.getItem('as_current_view');
      if (savedView === 'editor' && savedProj) {
        loadProject(savedProj);
      }
    } catch (e) {}

    // Establish periodic health checks every 10 seconds
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize dynamic dark/light theme triggers
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-theme');
      document.body.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const handleSelectProject = async (name) => {
    await loadProject(name);
    setCurrentView("editor");
  };

  const handleCreateProject = async (e) => {
    if (e) e.preventDefault();
    const name = newProjectName.trim();
    if (!name) {
      alert("Please enter a valid project name!");
      return;
    }
    await loadProject(name);
    await fetchLocalProjects();
    setCurrentView("editor");
    setNewProjectName("");
  };

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
            // Stamp a new stable timestamp ONCE — this is the only place the video src will update
            setMasterVideoTs(Date.now());
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
          try { localStorage.setItem('as_default_voice', 'alba'); } catch {}
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
    setTimelineLayers([]); // Clear dynamic layers to prevent memory leaking from other projects
    try {
      const resp = await fetch("/api/project/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_name: name })
      });
      if (resp.ok) {
        const data = await resp.json();
        setProject(data);
        try { localStorage.setItem('as_active_project', name); } catch (e) {}
        addLog(`Project '${name}' loaded successfully.`, "success");
      } else {
        addLog("Failed loading project.", "error");
      }
    } catch (e) {
      addLog(`Error contacting server: ${e}`, "error");
    }
  };

  // API Call: Save manifest
  const saveProject = async (newManifest = null, showNotification = false) => {
    const manifestToSave = newManifest || getMergedManifest();
    try {
      const resp = await fetch("/api/project/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manifestToSave)
      });
      if (resp.ok) {
        addLog("Project workspace saved.", "success");
        if (showNotification) {
          alert("💾 Progress saved successfully!");
        }
      } else {
        addLog("Failed saving project.", "error");
        if (showNotification) {
          alert("❌ Failed to save project progress.");
        }
      }
    } catch (e) {
      addLog("Connection failed when saving project.", "error");
      if (showNotification) {
        alert("❌ Network error: Could not contact local backend.");
      }
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
    
    // Check duplication across the selected video layer track, ignoring default blank placeholders
    const activeLayer = timelineLayers.find(l => l.id === (selectedBlock?.layerId || 'video-1'));
    const blocksToSearch = activeLayer ? activeLayer.blocks : project.video_blocks;
    
    const isDuplicate = blocksToSearch.some((b, idx) => 
      idx !== index && 
      b.filename && 
      b.filename.toLowerCase() === file.name.toLowerCase() && 
      b.filename.toLowerCase() !== 'blank_clip.mp4' && 
      !b.filename.toLowerCase().startsWith('clip_')
    );
    
    if (isDuplicate) {
      addLog(`Upload blocked: The file "${file.name}" is already used in another slot in this layer. Duplications are not allowed.`, "error");
      alert(`The file "${file.name}" is already used in another slot in this layer. Duplications are not allowed.`);
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
        
        // Update the block directly in timelineLayers so it lands immediately
        setTimelineLayers(prev => prev.map(layer => {
          if (layer.id === (selectedBlock?.layerId || 'video-1')) {
            const newBlocks = [...layer.blocks];
            newBlocks[index] = {
              ...newBlocks[index],
              file_path: data.block.file_path,
              filename: data.block.filename,
              duration_s: data.block.duration_s,
              thumbnail_path: data.block.thumbnail_path,
              status: 'provided'
            };
            return { ...layer, blocks: newBlocks };
          }
          return layer;
        }));
        
        // Update root project manifest
        setProject(data.manifest);
        setSelectedBlock({ lane: 'video', index, layerId: selectedBlock?.layerId || 'video-1' });
        addLog(`Custom video clip uploaded successfully for slot ${index}!`, "success");
      } else {
        const errData = await resp.json().catch(() => ({}));
        const errMsg = errData.detail || "Failed uploading custom video clip.";
        addLog(`Upload failed: ${errMsg}`, "error");
        alert(`Upload failed: ${errMsg}`);
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
  const generateSfx = async (index, prompt, params, overrideBlockId = null) => {
    if (!prompt || !prompt.trim()) {
      addLog("Please describe your sound effect first.", "error");
      return;
    }
    // Use the merged manifest so we always get the canonical block ID saved to disk
    const merged = getMergedManifest();
    const isDuplicate = merged.sfx_blocks.some((b, idx) => idx !== index && b.prompt && b.prompt.trim().toLowerCase() === prompt.trim().toLowerCase());
    if (isDuplicate) {
      addLog(`Failed to generate SFX: The prompt "${prompt}" is already used in another slot. Duplications are not allowed.`, "error");
      alert(`The prompt "${prompt}" is already used in another slot. Duplications are not allowed.`);
      return;
    }
    // Use overrideBlockId (from timeline layer block) or fall back to merged manifest block
    const mergedBlock = merged.sfx_blocks[index];
    const blockId = overrideBlockId || (mergedBlock ? mergedBlock.id : `sfx_${String(index).padStart(2,'0')}`);
    addLog(`Generating sound effect block ${blockId} (slot ${index})...`, "info");

    // Save latest prompt to manifest before firing request
    if (mergedBlock) {
      mergedBlock.prompt = prompt;
      mergedBlock.status = 'generating';
    }
    const updatedMerged = { ...merged, sfx_blocks: merged.sfx_blocks.map((b, idx) => idx === index ? { ...b, prompt, status: 'generating' } : b) };
    setProject(updatedMerged);
    await saveProject(updatedMerged);

    try {
      const resp = await fetch("/api/generate/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: project.project_name,
          block_id: blockId,
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
        const errData = await resp.json().catch(() => ({}));
        addLog(`Failed initiating SFX task: ${errData.detail || resp.status}`, "error");
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

  if (!licenseStatus.valid) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-carbon text-gray-200 font-sans overflow-hidden relative">
        {/* Background decorative orbs */}
        <div className="absolute w-[450px] h-[450px] bg-accent-primary/5 rounded-full blur-[100px] top-[-10%] right-[-10%] -z-10 animate-pulse"></div>
        <div className="absolute w-[350px] h-[350px] bg-accent-secondary/5 rounded-full blur-[80px] bottom-[-5%] left-[-5%] -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative w-full max-w-[480px] p-8 rounded-3xl bg-carbon-card/80 border border-white/5 shadow-2xl flex flex-col items-center gap-6 z-10 backdrop-blur-2xl">
          {/* Glowing logo lock icon */}
          <div className="w-14 h-14 bg-gradient-to-tr from-red-500 to-accent-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 border border-white/10 glow-logo">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="w-7 h-7 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight text-center">AutoStitch Studio</h1>
            <p className="text-[10px] text-red-400 font-extrabold uppercase tracking-wider text-center bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full mt-1 max-w-[400px]">
              🔒 {licenseStatus.message}
            </p>
          </div>

          {/* Locked screen Credentials activation Form */}
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const key = e.target.license_key.value.trim();
              const gmail = e.target.gmail.value.trim();
              const password = e.target.password.value.trim();

              if (!key || !gmail || !password) {
                alert("Please fill in all activation fields!");
                return;
              }

              setIsActivatingLicense(true);
              try {
                const resp = await fetch("/api/license/activate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ license_key: key, gmail, password })
                });

                const data = await resp.json();

                if (resp.ok && data.status === 'success') {
                  alert("Product successfully unlocked! Welcome to AutoStitch Studio.");
                  // Refresh status to unlock UI immediately!
                  await checkLicenseStatus();
                } else {
                  alert(`Activation Failed: ${data.message || data.detail || "Invalid credentials or device slot limit reached."}`);
                }
              } catch (err) {
                console.error(err);
                alert("Network error. Verify Vercel licensing server configuration is active.");
              } finally {
                setIsActivatingLicense(false);
              }
            }}
            className="w-full flex flex-col gap-4 mt-1"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">GMAIL ADDRESS</label>
              <input type="email" name="gmail" placeholder="Enter Gmail Address" required
                     className="w-full bg-carbon-card border border-white/5 focus:border-accent-primary/50 text-white rounded-xl px-4 py-3.5 text-xs outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(124,108,255,0.08)]" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">PASSWORD</label>
              <input type="password" name="password" placeholder="Enter Password" required
                     className="w-full bg-carbon-card border border-white/5 focus:border-accent-primary/50 text-white rounded-xl px-4 py-3.5 text-xs outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(124,108,255,0.08)]" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">MONTHLY LICENSE KEY</label>
              <input type="text" name="license_key" placeholder="OMNI-AS-XXXX-YYYY-ZZZZ-WWWW" required
                     className="w-full bg-carbon-card border border-white/5 focus:border-accent-primary/50 text-white rounded-xl px-4 py-3.5 text-xs font-mono outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(124,108,255,0.08)]" />
            </div>

            <button 
              type="submit" 
              disabled={isActivatingLicense}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary hover:opacity-95 text-white font-bold text-xs tracking-wide shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] mt-2 disabled:opacity-50"
            >
              {isActivatingLicense ? "⚡ Activating Product..." : "⚡ Activate Product"}
            </button>
          </form>

          <p className="text-[9px] text-gray-500 text-center font-mono leading-relaxed max-w-[280px] mt-2 uppercase tracking-wide">
            Licenses are bound to Motherboard UUID. Need a new key or slot reset? Contact Administrator.
          </p>
        </div>
      </div>
    );
  }

  if (currentView === "guide") {
    return (
      <div className="h-full w-full bg-carbon flex flex-col items-center justify-start p-8 text-gray-200 select-text overflow-y-auto bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,108,255,0.12),rgba(255,255,255,0))] font-sans animate-fade-in">
        <div className="w-full max-w-6xl flex flex-col gap-8 py-4">
          
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-carbon-border/30 pb-6">
            <div className="flex items-center gap-3.5">
              <button 
                onClick={() => setCurrentView("start")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-carbon-border bg-carbon-card/50 hover:bg-carbon hover:text-white text-gray-300 text-xs font-semibold font-sans transition-all active:scale-[0.97]"
                title="Return to Projects Dashboard"
              >
                <span>🏠 Projects Dashboard</span>
              </button>
              <div>
                <h1 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  Interactive Quick Start Guide
                </h1>
                <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-0.5">Mastering the AutoStitch Studio Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-carbon-card border border-carbon-border/80 px-4.5 py-2.5 rounded-2xl backdrop-blur-md shadow-lg shadow-black/30">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse shadow-[0_0_8px_#7c6cff]"></span>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-none">SYSTEM EDITION</span>
                <span className="text-xs font-mono font-bold text-gray-300 mt-1">Enterprise Studio v1</span>
              </div>
            </div>
          </div>

          {/* Guide Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Visual Medias & Showcase */}
            <div className="flex flex-col gap-6">
              
              {/* Card: Stock Video Preview Loop */}
              <div className="glass-card p-6 rounded-2xl border border-carbon-border bg-carbon-panel/40 flex flex-col gap-3">
                <h3 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🎥</span> SYSTEM COMPILATION LOOP
                </h3>
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                  Your final output is rendered using our proprietary multi-lane FFmpeg compiler. Here is a visual preview of high-fidelity particle compositions:
                </p>
                <div className="w-full h-44 rounded-xl overflow-hidden border border-white/10 shadow-lg relative bg-black">
                  <video 
                    src="https://player.vimeo.com/external/435674703.sd.mp4?s=79d5df65d4ebcfc2807f6e492ad170949d2149b1&profile_id=139&oauth2_token_id=57447761" 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover opacity-80" 
                  />
                  <div className="absolute top-2.5 left-2.5 bg-carbon-card/70 backdrop-blur-md border border-white/10 px-2.5 py-0.5 rounded text-[8px] font-mono text-accent-secondary uppercase tracking-widest">
                    STOCK LOOP • ACTIVE
                  </div>
                </div>
              </div>

              {/* Card: Premium Workspace Image */}
              <div className="glass-card p-6 rounded-2xl border border-carbon-border bg-carbon-panel/40 flex flex-col gap-3">
                <h3 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                  <span>💡</span> CREATIVE WORKSPACE DESIGN
                </h3>
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                  AutoStitch Studio offers a dark-themed space, preventing eye strain during intense composition and editing sessions.
                </p>
                <div className="w-full h-40 rounded-xl overflow-hidden border border-white/10 shadow-lg relative bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop')" }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 bg-carbon-card/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg">
                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">4K Studio Environment</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column (Spans 2): Interactive Chapters & Image callouts */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              
              {/* Interactive Dashboard Showcase (With our dashboard.png!) */}
              <div className="glass-card p-6 rounded-2xl border border-carbon-border bg-carbon-panel/40 flex flex-col gap-4">
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🖥️</span> INTERACTIVE DASHBOARD MAP
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Review the exact layout of the AutoStitch Studio editing timeline. Click on the dashboard layout illustration to learn all the system controls:
                </p>
                
                {/* Embed the dashboard.png locally loaded! */}
                <div className="w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl relative bg-carbon-card/50 group cursor-zoom-in">
                  <img 
                    src="/static/dashboard.png" 
                    alt="AutoStitch Studio Workspace Layout" 
                    className="w-full h-auto object-cover group-hover:scale-[1.01] transition-all duration-500" 
                  />
                  <div className="absolute bottom-3 right-3 bg-carbon-card/75 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg text-[10px] text-accent-tertiary font-mono">
                    🟢 ACTIVE WORKSPACE LAYOUT
                  </div>
                </div>
              </div>

              {/* Guide Chapters Accordion */}
              <div className="flex flex-col gap-4">
                <h3 className="font-extrabold text-sm text-gray-400 uppercase tracking-wider">📖 CORE COMPOSITION CHAPTERS</h3>

                {/* Chapter 1 */}
                <div className="glass-card p-5 rounded-2xl border border-carbon-border bg-carbon-panel/30 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold text-sm shrink-0 border border-accent-primary/20">
                    01
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Video Scanning & Timeline Layout</h4>
                    <p className="text-xs text-gray-400 leading-relaxed mt-1">
                      Start by scanning a local folder of MP4 files. The compiler parses the frame count, duration, and extracts thumbnails. The timeline (Lane 1) will expand to match the total count of scanned clips. You can also manually upload custom video clips into any specific timeline slot!
                    </p>
                  </div>
                </div>

                {/* Chapter 2 */}
                <div className="glass-card p-5 rounded-2xl border border-carbon-border bg-carbon-panel/30 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-secondary/10 flex items-center justify-center text-accent-secondary font-bold text-sm shrink-0 border border-accent-secondary/20">
                    02
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Sound Effects (SFX) AI Orchestration</h4>
                    <p className="text-xs text-gray-400 leading-relaxed mt-1">
                      Type sound effect descriptions directly into the SFX row slots (Lane 2). AutoStitch leverages our local Stable Audio generator to convert text descriptions to realistic high-fidelity WAV files. You can customize the generation steps, seeds, and duration, or clear assets instantly to keep your storage neat.
                    </p>
                  </div>
                </div>

                {/* Chapter 3 */}
                <div className="glass-card p-5 rounded-2xl border border-carbon-border bg-carbon-panel/30 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-tertiary/10 flex items-center justify-center text-accent-tertiary font-bold text-sm shrink-0 border border-accent-tertiary/20">
                    03
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Voiceover (TTS) Speech Synthesizer</h4>
                    <p className="text-xs text-gray-400 leading-relaxed mt-1">
                      Enter script texts into the Voice row slots (Lane 3). The local PocketTTS engine synthesizes scripts into professional voice narration. You can select standard voices or upload an audio sample to clone a new custom voice. When you edit a script and regenerate, previous audios are physically deleted to ensure optimal disk cleanliness.
                    </p>
                  </div>
                </div>

                {/* Chapter 4 */}
                <div className="glass-card p-5 rounded-2xl border border-carbon-border bg-carbon-panel/30 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0 border border-purple-500/20">
                    04
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Multi-Track Rendering & Mastering</h4>
                    <p className="text-xs text-gray-400 leading-relaxed mt-1">
                      Preview synchronized multi-track audio elements inline within the Composer screen. Once you are satisfied with the timeline composition, click the <b>RENDER ▶</b> button. Our back-end FFmpeg engine seamlessly weaves all visual tracks, AI sound effects, and voice narration into a master cinematic MP4 file ready for download!
                    </p>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </div>
    );
  }

  if (currentView === "start") {
    return (
      <div className="h-full w-full bg-carbon flex flex-col items-center justify-start p-8 text-gray-200 select-text overflow-y-auto bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,108,255,0.12),rgba(255,255,255,0))] font-sans animate-fade-in">
        <div className="w-full max-w-6xl flex flex-col gap-8 py-4">
          
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-carbon-border/30 pb-6">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-primary to-purple-800 text-white font-extrabold text-2xl shadow-xl shadow-accent-primary/20">
                A
              </div>
              <div>
                <h1 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  AutoStitch Studio
                </h1>
                <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-0.5">AI-Powered Video Composer • v1.0.0</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Soft Theme toggler button */}
              <button 
                onClick={() => {
                  const nextTheme = theme === 'dark' ? 'light' : 'dark';
                  setTheme(nextTheme);
                  try { localStorage.setItem('as_theme', nextTheme); } catch {}
                  addLog(`Toggled UI theme to: ${nextTheme.toUpperCase()}`, "success");
                }}
                className="p-3 rounded-2xl border border-carbon-border bg-carbon-card/50 hover:bg-carbon text-gray-400 hover:text-white transition-all duration-300 active:scale-[0.96] shadow-lg flex items-center justify-center"
                title={theme === 'dark' ? "Switch to Soft Light Theme" : "Switch to Dark Theme"}
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-amber-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-indigo-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </button>

              {/* License details */}
              <div className="flex items-center gap-3 bg-carbon-card border border-carbon-border/80 px-4.5 py-2.5 rounded-2xl backdrop-blur-md shadow-lg shadow-black/30">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-tertiary animate-pulse shadow-[0_0_8px_#6cffcc]"></span>
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-none">ACTIVE USER</span>
                  <span className="text-xs font-mono font-bold text-gray-300 mt-1">{licenseStatus.gmail || "osamaaltaf.pk@gmail.com"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Majestic Balanced Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column (Span 4): Configuration & Actions */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Card: Create New Project */}
              <div className="glass-card p-6 rounded-2xl border border-carbon-border bg-carbon-panel/40 flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-accent-primary/10 text-accent-primary">
                    <Icon name="plus" className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">CREATE NEW PROJECT</h3>
                </div>
                
                <form onSubmit={handleCreateProject} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest font-mono">Project Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Promo_Video_v1" 
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      required
                      className="w-full bg-carbon border border-carbon-border focus:border-accent-primary/50 text-white rounded-xl px-4 py-3.5 text-xs outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(124,108,255,0.05)]"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-primary to-indigo-600 hover:from-accent-primary hover:to-indigo-500 text-white font-bold text-xs tracking-wider shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-1"
                  >
                    <span>Create Project 🚀</span>
                  </button>
                </form>
              </div>

              {/* Card: System Developer Credit */}
              <div className="glass-card p-6 rounded-2xl border border-carbon-border flex flex-col gap-4 bg-[linear-gradient(135deg,rgba(20,22,34,0.4),rgba(124,108,255,0.03))]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-accent-primary/20">
                    OA
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">SYSTEM CREATOR</h4>
                    <p className="text-sm font-extrabold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent font-sans">Osama Altaf</p>
                  </div>
                </div>
                
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                  Professional Fullstack Architect & AI Specialist. Hit me up on Fiverr or WhatsApp for enterprise-level automation tools, custom local AI integrations, and desktop apps.
                </p>
                
                <div className="grid grid-cols-2 gap-2.5 text-[10px] font-bold">
                  <a href="https://wa.me/923187661096" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 transition-all font-mono">
                    <span>💬 WhatsApp</span>
                  </a>
                  <a href="https://www.linkedin.com/in/osamaaltafpk" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 transition-all font-mono">
                    <span>👔 LinkedIn</span>
                  </a>
                  <a href="https://www.fiverr.com/neural_networks" target="_blank" rel="noopener noreferrer" 
                     className="col-span-2 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-accent-tertiary/20 bg-accent-tertiary/5 hover:bg-accent-tertiary/10 text-accent-tertiary transition-all font-mono">
                    <span>🛒 Fiverr Profile</span>
                  </a>
                </div>
              </div>

            </div>

            {/* Right Column (Span 8): Recent Folders & Interactive Pipeline Map */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Card 1: Recent Projects Grid */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-carbon-border/30 pb-2">
                  <h3 className="font-extrabold text-sm text-gray-400 uppercase tracking-wider">🕒 RECENT PROJECTS ({localProjects.length})</h3>
                  <button 
                    onClick={fetchLocalProjects}
                    className="px-3 py-1.5 rounded-lg border border-carbon-border bg-carbon-card/50 hover:bg-carbon text-accent-primary text-[10px] font-mono font-bold hover:border-accent-primary transition-all active:scale-[0.98]"
                  >
                    SYNC DATABASE 🔄
                  </button>
                </div>

                {localProjects.length === 0 ? (
                  <div className="glass-card p-12 rounded-2xl border border-carbon-border/50 bg-carbon-panel/20 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-carbon-border/50 flex items-center justify-center text-gray-600">
                      📂
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-300">No Projects Found</h4>
                      <p className="text-xs text-gray-500 max-w-[280px] leading-relaxed mt-1">
                        You haven't initialized any composition projects yet. Enter a name on the left to start!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[320px] overflow-y-auto pr-2">
                    {localProjects.map(p => (
                      <div 
                        key={p.project_name}
                        onClick={() => handleSelectProject(p.project_name)}
                        className="glass-card p-5 rounded-2xl border border-carbon-border/80 hover:border-accent-primary/60 bg-carbon-panel/30 hover:bg-[linear-gradient(135deg,rgba(13,14,20,0.6),rgba(124,108,255,0.04))] flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-accent-primary/5 group-hover:bg-accent-primary/10 flex items-center justify-center text-xl text-accent-primary border border-accent-primary/15 group-hover:scale-105 transition-all">
                            📂
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-white truncate leading-tight group-hover:text-accent-primary transition-colors">{p.project_name}</h4>
                            <div className="flex flex-col gap-0.5 text-[9px] text-gray-500 font-mono mt-1 leading-none">
                              <span>CREATED: {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              <span className="text-accent-primary/50 group-hover:text-accent-primary/80 transition-colors">SAVED: {new Date(p.updated_at).toLocaleDateString()} {new Date(p.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-8 h-8 rounded-full border border-carbon-border flex items-center justify-center text-gray-500 group-hover:text-accent-primary group-hover:border-accent-primary group-hover:translate-x-0.5 transition-all shrink-0">
                          →
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 2: Gorgeous Horizontal Production Pipeline Step Guide */}
              <div className="glass-card p-6 rounded-2xl border border-carbon-border bg-carbon-panel/40 flex flex-col gap-4 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-accent-secondary/10 text-accent-secondary">
                      <Icon name="sparkles" className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">CREATIVE PRODUCTION PIPELINE</h3>
                  </div>
                  <button 
                    onClick={() => setCurrentView("guide")}
                    className="flex items-center gap-1.5 bg-accent-secondary/15 hover:bg-accent-secondary/30 text-accent-secondary text-[10px] font-bold px-3 py-1.5 rounded-lg border border-accent-secondary/20 transition-all active:scale-[0.98]"
                  >
                    <span>📖 Open Interactive Guide</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-1">
                  {/* Step 1 */}
                  <div className="p-4 rounded-xl border border-carbon-border bg-carbon-panel/20 flex flex-col gap-2 relative">
                    <div className="absolute top-2.5 right-3 text-[10px] font-mono text-accent-secondary font-bold">01</div>
                    <div className="text-lg">🎬</div>
                    <h4 className="font-bold text-xs text-white leading-tight">Scan Media</h4>
                    <p className="text-[10px] text-gray-500 leading-snug">Load a local folder of clips directly into visual Lane 1.</p>
                  </div>
                  {/* Step 2 */}
                  <div className="p-4 rounded-xl border border-carbon-border bg-carbon-panel/20 flex flex-col gap-2 relative">
                    <div className="absolute top-2.5 right-3 text-[10px] font-mono text-accent-secondary font-bold">02</div>
                    <div className="text-lg">🎵</div>
                    <h4 className="font-bold text-xs text-white leading-tight">Convert SFX</h4>
                    <p className="text-[10px] text-gray-500 leading-snug">Write prompt descriptions and synthesize Lane 2 audio.</p>
                  </div>
                  {/* Step 3 */}
                  <div className="p-4 rounded-xl border border-carbon-border bg-carbon-panel/20 flex flex-col gap-2 relative">
                    <div className="absolute top-2.5 right-3 text-[10px] font-mono text-accent-secondary font-bold">03</div>
                    <div className="text-lg">🎙️</div>
                    <h4 className="font-bold text-xs text-white leading-tight">Narrate Voice</h4>
                    <p className="text-[10px] text-gray-500 leading-snug">Compose scripts, select cloned voices and synthesize Lane 3.</p>
                  </div>
                  {/* Step 4 */}
                  <div className="p-4 rounded-xl border border-carbon-border bg-carbon-panel/20 flex flex-col gap-2 relative">
                    <div className="absolute top-2.5 right-3 text-[10px] font-mono text-accent-secondary font-bold">04</div>
                    <div className="text-lg">🚀</div>
                    <h4 className="font-bold text-xs text-white leading-tight">Master Render</h4>
                    <p className="text-[10px] text-gray-500 leading-snug">Preview in sync, then render the master video using FFmpeg.</p>
                  </div>
                </div>
              </div>

              {/* Card 3: Creative Loops Stock Media Showcase */}
              <div className="glass-card p-6 rounded-2xl border border-carbon-border bg-carbon-panel/40 flex flex-col gap-3.5 mt-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-accent-tertiary/10 text-accent-tertiary">
                    <Icon name="video" className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">CREATIVE STOCK SHOWCASE</h3>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                  AutoStitch Studio integrates high-fidelity video looping and visual canvas elements. Preview our pre-loaded cinematic stock graphic:
                </p>
                <div className="w-full h-36 rounded-xl overflow-hidden border border-white/5 shadow-inner bg-carbon-card/40 relative">
                  <video 
                    src="https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c022773507846992594a90f2d658b99d&profile_id=139&oauth2_token_id=57447761" 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover opacity-85" 
                  />
                  <div className="absolute top-2.5 left-2.5 bg-carbon-card/70 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded text-[8px] font-mono text-accent-tertiary uppercase tracking-widest">
                    STOCK LOOP • ACTIVE
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col select-text text-sm">
      
      {/* ── TOP NAV BAR ── */}
      <nav className="h-14 flex items-center justify-between px-6 bg-carbon-panel border-b border-carbon-border z-10 glass-panel">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (window.showLanding) {
                window.showLanding();
              } else {
                setCurrentView("start");
                fetchLocalProjects();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-carbon-border bg-carbon-card/50 hover:bg-carbon hover:text-white text-gray-300 text-xs font-semibold font-sans transition-all active:scale-[0.97]"
            title="Return to Projects Dashboard"
          >
            <span>🏠 Projects</span>
          </button>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-purple-800 text-white font-extrabold text-lg shadow-lg">
            A
          </div>
          <div>
            <h1 className="font-extrabold text-md tracking-tight" style={{color: 'var(--text-bright)'}}>
              <span style={{background: 'linear-gradient(to right, var(--text-bright), var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>AutoStitch</span>
              {' '}<span className="text-xs font-semibold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-full ml-1 font-mono">v1 STUDIO</span>
            </h1>
          </div>
        </div>

        {/* Project Selector & Server Status Badges */}
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-carbon-card/50 border border-carbon-border/50 px-3 py-1 rounded-lg">
            <span className="text-xs font-mono mr-2" style={{color: 'var(--text-muted)'}}>PROJECT:</span>
            <input 
              value={project.project_name}
              onChange={(e) => setProject(prev => ({ ...prev, project_name: e.target.value }))}
              onBlur={() => saveProject()}
              className="bg-transparent outline-none font-bold max-w-[120px]"
              style={{color: 'var(--text-bright)'}}
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {/* TTS Status */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health.tts_server.online ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-gray-600'}`}></span>
              <span style={{color:'var(--text-muted)'}}>TTS:</span>
              <span style={{color: health.tts_server.online ? 'var(--text-main)' : 'var(--text-muted)'}}>
                {health.tts_server.online ? (health.tts_server.model_loaded ? 'LOADED' : 'READY') : 'OFFLINE'}
              </span>
            </div>
            {/* SFX Status */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health.sfx_server.online ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-gray-600'}`}></span>
              <span style={{color:'var(--text-muted)'}}>SFX:</span>
              <span style={{color: health.sfx_server.online ? 'var(--text-main)' : 'var(--text-muted)'}}>
                {health.sfx_server.online ? `GPU (${health.sfx_server.device})` : 'OFFLINE'}
              </span>
            </div>
            {/* FFmpeg Status */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health.ffmpeg.ok ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-gray-600'}`}></span>
              <span style={{color:'var(--text-muted)'}}>FFMPEG:</span>
              <span style={{color: health.ffmpeg.ok ? 'var(--text-main)' : 'var(--text-muted)'}}>
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

          {/* Soft Theme Toggler Button */}
          <button 
            onClick={() => {
              const nextTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(nextTheme);
              try { localStorage.setItem('as_theme', nextTheme); } catch {}
            }}
            className="p-2 border border-carbon-border hover:bg-carbon-card/50 text-gray-400 hover:text-white rounded-lg transition-all flex items-center justify-center"
            title={theme === 'dark' ? "Switch to Soft Light Theme" : "Switch to Dark Theme"}
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-amber-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-indigo-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
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
            onClick={() => saveProject(null, true)}
            className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 px-3.5 py-2 rounded-lg transition-all text-xs font-bold font-sans active:scale-[0.98]"
            title="Save Project Progress to Local Database & Disk"
          >
            <span>💾 SAVE PROGRESS</span>
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
              className={`flex-1 py-3 text-center text-[10px] font-semibold ${activeTab === 'video' ? 'text-accent-primary border-b-2 border-accent-primary bg-carbon-card/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              VIDEOS
            </button>
            <button 
              onClick={() => setActiveTab("sfx")}
              className={`flex-1 py-3 text-center text-[10px] font-semibold ${activeTab === 'sfx' ? 'text-accent-primary border-b-2 border-accent-primary bg-carbon-card/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              SFX
            </button>
            <button 
              onClick={() => setActiveTab("voice")}
              className={`flex-1 py-3 text-center text-[10px] font-semibold ${activeTab === 'voice' ? 'text-accent-primary border-b-2 border-accent-primary bg-carbon-card/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              VOICE
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
                        {v.file_path ? (
                          <video 
                            src={`/api/video/serve?path=${encodeURIComponent(v.file_path)}#t=0.1`} 
                            preload="metadata" 
                            muted 
                            playsInline 
                            className="w-10 h-7 rounded object-cover pointer-events-none bg-carbon-card/60" 
                          />
                        ) : (
                          <img src={v.thumbnail_path} className="w-10 h-7 rounded object-cover" />
                        )}
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
                               // Update project.voice_blocks
                               const updated = [...project.voice_blocks];
                               if (updated[selectedBlock.index]) {
                                 updated[selectedBlock.index] = { ...updated[selectedBlock.index], voice };
                               }
                               const newManifest = { ...project, voice_blocks: updated };
                               setProject(newManifest);
                               // Also sync into timelineLayers so getMergedManifest picks it up
                               setTimelineLayers(prev => prev.map(l => {
                                 if (l.type === 'voice') {
                                   const newBlocks = [...l.blocks];
                                   if (newBlocks[selectedBlock.index]) {
                                     newBlocks[selectedBlock.index] = { ...newBlocks[selectedBlock.index], voice };
                                   }
                                   return { ...l, blocks: newBlocks };
                                 }
                                 return l;
                               }));
                               saveProject(newManifest);
                               addLog(`Applied voice '${voice}' to voice slot ${selectedBlock.index}`, "success");
                             } else {
                               setGlobalDefaultVoice(voice);
                               try { localStorage.setItem('as_default_voice', voice); } catch {}
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
          <div className="shrink-0 border-b border-carbon-border bg-carbon-panel/40 p-5 flex flex-col items-center justify-center gap-4 select-text">
            
            {/* Centered Video Screen Section */}
            <div className="w-[600px] h-[280px] rounded-xl bg-carbon-card overflow-hidden relative border border-carbon-border/60 flex flex-col justify-center items-center group shadow-2xl">
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
                    {/* key={masterVideoTs} ensures React only remounts this element when a NEW render completes, not on every state change */}
                    <video
                      key={masterVideoTs}
                      src={`/output/master.mp4?t=${masterVideoTs}`}
                      controls
                      playsInline
                      preload="auto"
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
              <div className="absolute bottom-2 left-3 bg-carbon-card/70 backdrop-blur border border-white/5 px-2 py-0.5 rounded text-[9px] font-mono text-gray-400 z-10">
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
                <div className="w-20 border-r border-carbon-border flex items-center justify-center font-mono text-xs text-gray-300 font-semibold select-none gap-1.5">
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
                        className={`h-full border-r border-carbon-border/20 flex items-center pl-2 font-mono text-[10px] text-gray-400 select-none gap-1.5 draggable-ruler-tick ${dragOverIndex === i && draggedIndex !== i ? 'bg-accent-primary/20 border-l-2 border-accent-primary' : 'hover:bg-carbon-card/30'}`}
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
                          onClick={(e) => { e.stopPropagation(); insertBlankSlotAt(i + 1); }}
                          className="flex items-center justify-center w-5 h-5 rounded-full border border-carbon-border/50 bg-carbon hover:bg-accent-primary hover:border-accent-primary text-gray-400 hover:text-white text-[11px] font-extrabold ml-auto mr-1.5 focus:outline-none transition-all shadow-sm cursor-pointer"
                          title="Insert blank slot to the right of this column"
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
                                {block.file_path ? (
                                  <video 
                                    src={`/api/video/serve?path=${encodeURIComponent(block.file_path)}#t=0.1`} 
                                    preload="metadata" 
                                    muted 
                                    playsInline 
                                    className="w-full h-11 rounded object-cover pointer-events-none bg-carbon-card/60" 
                                  />
                                ) : (
                                  <img src={block.thumbnail_path} className="w-full h-11 rounded object-cover" />
                                )}
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
                                <div className="flex items-center justify-between text-[9px] font-mono mt-1 pt-1 border-t border-carbon-border/15">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Pass the timeline layer block.id as override so backend finds it in manifest
                                      generateSfx(i, block.prompt, { model: 'small-sfx', duration: 5.0, steps: 8, seed: -1 }, block.id);
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
                                <div className="flex items-center justify-between text-[9px] font-mono mt-1 pt-1 border-t border-carbon-border/15 gap-1">
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
                <div className="flex h-10 border-b border-carbon-border bg-carbon-card/15 select-none items-center justify-start px-4 gap-2">
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
                      {blockData.file_path ? (
                        <video 
                          src={`/api/video/serve?path=${encodeURIComponent(blockData.file_path)}#t=0.1`} 
                          preload="metadata" 
                          muted 
                          playsInline 
                          className="w-full h-32 rounded-lg object-cover border border-carbon-border pointer-events-none bg-carbon-card/60" 
                        />
                      ) : (
                        <img src={blockData.thumbnail_path} className="w-full h-32 rounded-lg object-cover border border-carbon-border" />
                      )}
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
                      <div className="flex flex-col gap-2 border-t border-carbon-border/20 pt-4 mt-2">
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
                      onImportTextFile={(file) => importTextFile('sfx', file)}
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
                        // Update project.voice_blocks
                        const updated = [...project.voice_blocks];
                        if (updated[selectedBlock.index]) {
                          updated[selectedBlock.index] = { ...updated[selectedBlock.index], voice };
                        }
                        const newManifest = { ...project, voice_blocks: updated };
                        setProject(newManifest);
                        // Also sync into timelineLayers so getMergedManifest uses it
                        setTimelineLayers(prev => prev.map(l => {
                          if (l.type === 'voice') {
                            const newBlocks = [...l.blocks];
                            if (newBlocks[selectedBlock.index]) {
                              newBlocks[selectedBlock.index] = { ...newBlocks[selectedBlock.index], voice };
                            }
                            return { ...l, blocks: newBlocks };
                          }
                          return l;
                        }));
                        saveProject(newManifest);
                      }}
                      onSaveProject={() => saveProject()}
                      onGenerate={(text, voice) => generateTts(selectedBlock.index, text, voice)}
                      addLog={addLog}
                      availableVoices={availableVoices}
                      onImportTextFile={(file) => importTextFile('voice', file)}
                      onClearVoice={() => clearBlockMedia('voice', selectedBlock.index)}
                    />
                  )}

                  {/* Slot Removal Action */}
                  <div className="border-t border-carbon-border/20 pt-4 mt-auto flex flex-col gap-2">
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
        <div className="fixed inset-0 bg-carbon-card/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                  placeholder="https://your-tunnel.loca.lt"
                  className="bg-carbon border border-carbon-border/50 focus:border-accent-primary outline-none px-3 py-2 rounded-lg text-white font-mono"
                />
                <p className="text-[10px] text-gray-600 font-mono leading-relaxed">
                  💡 Paste your Colab loca.lt / ngrok tunnel URL here — trailing slashes are stripped automatically.
                </p>
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
function SfxController({ index, block, project, onPromptChange, onSaveProject, onGenerate, addLog, onImportTextFile, onClearSfx }) {
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

      {/* SFX Prompt TXT Import */}
      <div className="flex flex-col gap-2 border-t border-carbon-border/20 pt-4 mt-2">
        <span className="text-[10px] font-bold font-mono text-gray-500">IMPORT PROMPTS</span>
        <input 
          type="file" 
          accept=".txt" 
          onChange={(e) => onImportTextFile(e.target.files[0])} 
          className="hidden" 
          id="custom-sfx-prompt-import" 
        />
        <label 
          htmlFor="custom-sfx-prompt-import"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-secondary/20 to-pink-600/20 border border-accent-secondary/50 hover:border-accent-secondary text-xs text-white hover:text-white py-2 rounded-lg cursor-pointer transition-all font-semibold font-mono"
        >
          <Icon name="file-text" className="w-3.5 h-3.5 text-accent-secondary" />
          <span>UPLOAD PROMPT TXT 📤</span>
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
function VoiceController({ index, block, project, onPromptChange, onVoiceChange, onSaveProject, onGenerate, addLog, availableVoices = [], onImportTextFile, onClearVoice }) {
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

      {/* Voice Prompt TXT Import */}
      <div className="flex flex-col gap-2 border-t border-carbon-border/20 pt-4 mt-2">
        <span className="text-[10px] font-bold font-mono text-gray-500">IMPORT SCRIPT</span>
        <input 
          type="file" 
          accept=".txt" 
          onChange={(e) => onImportTextFile(e.target.files[0])} 
          className="hidden" 
          id="custom-voice-prompt-import" 
        />
        <label 
          htmlFor="custom-voice-prompt-import"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-tertiary/20 to-teal-600/20 border border-accent-tertiary/50 hover:border-accent-tertiary text-xs text-white hover:text-white py-2 rounded-lg cursor-pointer transition-all font-semibold font-mono"
        >
          <Icon name="file-text" className="w-3.5 h-3.5 text-accent-tertiary" />
          <span>UPLOAD SCRIPT TXT 📤</span>
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
