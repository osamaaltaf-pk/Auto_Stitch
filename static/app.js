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
    ),
    link: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    unlink: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244M15 9l-6 6" />
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
  const [enginesStatus, setEnginesStatus] = useState({
    tts: { online: false, running: false },
    sfx: { online: false, running: false },
    music: { online: false, running: false },
    ffmpeg: { online: false }
  });
  const [characterLibrary, setCharacterLibrary] = useState([]);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [showCharLibraryModal, setShowCharLibraryModal] = useState(false);
  const [showLipSyncLabModal, setShowLipSyncLabModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [calibratingChar, setCalibratingChar] = useState(null); // charIdx index
  const [logs, setLogs] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null); // { lane: 'video'|'sfx'|'voice', index: number }
  const [rightSidebarTab, setRightSidebarTab] = useState("global");

  useEffect(() => {
    if (selectedBlock) {
      setRightSidebarTab("slot");
    } else {
      setRightSidebarTab("global");
    }
  }, [selectedBlock]);

  const [selectedIndices, setSelectedIndices] = useState([]); // Multiple selected timeline slot indices
  const [videoFolderInput, setVideoFolderInput] = useState("D:\\Osama_mvp\\videos");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [renderState, setRenderState] = useState({ status: 'idle', progress: 0.0, error: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(160); // Default bottom console logger height in px
  const [leftPanelWidth, setLeftPanelWidth] = useState(256); // Default left panel width in px (w-64)
  const [rightPanelWidth, setRightPanelWidth] = useState(320); // Default right panel width in px (w-80)
  const [previewSectionHeight, setPreviewSectionHeight] = useState(420); // Draggable preview section height in px
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
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('as_theme') || 'dark'; } catch { return 'dark'; }
  });
  const [projectsFilter, setProjectsFilter] = useState("all"); // "all" | "active" | "rendered" | "draft"
  const [projectsView, setProjectsView] = useState("grid"); // "grid" | "list"
  const [projectsSearchQuery, setProjectsSearchQuery] = useState("");

  // Persist current view changes to localStorage
  useEffect(() => {
    try { localStorage.setItem('as_current_view', currentView); } catch (e) { }
  }, [currentView]);

  // Synchronize view changes triggered by outer landing page navigation links
  useEffect(() => {
    const handleViewChange = () => {
      try {
        const targetView = localStorage.getItem('as_current_view') || 'start';
        setCurrentView(targetView);
        if (targetView === 'start') {
          fetchLocalProjects();
        }
      } catch (e) {
        console.error("Error handling view change:", e);
      }
    };
    window.addEventListener('as_view_change', handleViewChange);
    return () => window.removeEventListener('as_view_change', handleViewChange);
  }, []);

  // Advanced Preview and Mixer States
  const [previewMode, setPreviewMode] = useState("composer"); // "composer" | "master"
  const [isPlaying, setIsPlaying] = useState(false);
  const [linkVideoVolume, setLinkVideoVolume] = useState(false);
  const [linkVoiceVolume, setLinkVoiceVolume] = useState(false);
  const [linkSfxVolume, setLinkSfxVolume] = useState(false);
  const [audioCacheBuster, setAudioCacheBuster] = useState(Date.now());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const currentVideoVolume = selectedBlock !== null ? (project.video_blocks[selectedBlock.index]?.volume ?? 1.0) : 1.0;
  const currentVoiceVolume = selectedBlock !== null ? (project.voice_blocks[selectedBlock.index]?.volume ?? 1.0) : 1.0;
  const currentSfxVolume = selectedBlock !== null ? (project.sfx_blocks[selectedBlock.index]?.volume ?? 1.0) : 1.0;

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
          else if ((b.status === 'done' || b.status === 'provided' || b.status === 'error') && combinedStatus !== 'generating') {
            combinedStatus = b.status;
          }
          if (b.file_path) combinedFilePath = b.file_path;
        }
      });
      const primarySfxBlock = sfxLayers[0]?.blocks[i] || project.sfx_blocks[i] || { id: `sfx_${String(i).padStart(2, '0')}`, order: i };
      mergedSfxBlocks.push({
        ...primarySfxBlock,
        prompt: prompts.join(", "),
        status: combinedStatus === 'idle' ? (combinedFilePath ? 'done' : 'idle') : combinedStatus,
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
          else if ((b.status === 'done' || b.status === 'provided' || b.status === 'error') && combinedStatus !== 'generating') {
            combinedStatus = b.status;
          }
          if (b.file_path) combinedFilePath = b.file_path;
        }
      });
      const primaryVoiceBlock = voiceLayers[0]?.blocks[i] || project.voice_blocks[i] || { id: `vo_${String(i).padStart(2, '0')}`, order: i };
      mergedVoiceBlocks.push({
        ...primaryVoiceBlock,
        prompt: prompts.join(". "),
        status: combinedStatus === 'idle' ? (combinedFilePath ? 'provided' : 'idle') : combinedStatus,
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
    if (videoRef.current) videoRef.current.volume = currentVideoVolume;
    if (voiceAudioRef.current) voiceAudioRef.current.volume = currentVoiceVolume;
    if (sfxAudioRef.current) sfxAudioRef.current.volume = currentSfxVolume;
  }, [currentVideoVolume, currentVoiceVolume, currentSfxVolume]);

  // Force reload audio elements when audioCacheBuster updates (e.g. generation finishes)
  useEffect(() => {
    if (voiceAudioRef.current) {
      try {
        voiceAudioRef.current.load();
      } catch (e) {
        console.error("Failed to load voice audio element:", e);
      }
    }
    if (sfxAudioRef.current) {
      try {
        sfxAudioRef.current.load();
      } catch (e) {
        console.error("Failed to load sfx audio element:", e);
      }
    }
  }, [audioCacheBuster]);

  // Continuous polling for project manifest to keep UI updated
  useEffect(() => {
    if (currentView !== 'editor' || !project.project_name) return;

    const timer = setInterval(async () => {
      try {
        const resp = await fetch("/api/project/load", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_name: project.project_name })
        });
        if (resp.ok) {
          const data = await resp.json();

          // Use ref/state current project blocks to check transitions safely inside updater
          setProject(prevProject => {
            let statusChanged = false;
            // Check transitions
            data.sfx_blocks.forEach((b, idx) => {
              const oldB = prevProject.sfx_blocks[idx];
              if (oldB && oldB.status === 'generating' && (b.status === 'done' || b.status === 'provided' || b.status === 'error')) {
                statusChanged = true;
                setTimeout(() => {
                  if (b.status === 'done' || b.status === 'provided') {
                    addLog(`SFX slot ${idx} generation completed successfully.`, "success");
                  } else {
                    addLog(`SFX slot ${idx} generation failed.`, "error");
                  }
                }, 0);
              }
            });
            data.voice_blocks.forEach((b, idx) => {
              const oldB = prevProject.voice_blocks[idx];
              if (oldB && oldB.status === 'generating' && (b.status === 'done' || b.status === 'provided' || b.status === 'error')) {
                statusChanged = true;
                setTimeout(() => {
                  if (b.status === 'done' || b.status === 'provided') {
                    addLog(`Voice slot ${idx} generation completed successfully.`, "success");
                  } else {
                    addLog(`Voice slot ${idx} generation failed.`, "error");
                  }
                }, 0);
              }
            });
            
            if (statusChanged) {
              setTimeout(() => {
                setAudioCacheBuster(Date.now());
              }, 0);
            }
            return data;
          });

          // Sync project manifest updates back into timelineLayers blocks
          setTimelineLayers(prev => prev.map(layer => {
            if (layer.id === 'video-1') return { ...layer, blocks: data.video_blocks };
            if (layer.id === 'sfx-1') return { ...layer, blocks: data.sfx_blocks };
            if (layer.id === 'voice-1') return { ...layer, blocks: data.voice_blocks };

            // For custom layers: sync completed status / file paths
            const updatedBlocks = layer.blocks.map((block, idx) => {
              if (layer.type === 'sfx') {
                const canonicalBlock = data.sfx_blocks[idx];
                if (canonicalBlock) {
                  if (canonicalBlock.status === 'done' || canonicalBlock.status === 'provided' || canonicalBlock.status === 'error') {
                    if (block.prompt && block.prompt.trim()) {
                      return { ...block, status: canonicalBlock.status, file_path: canonicalBlock.file_path };
                    }
                  }
                }
              } else if (layer.type === 'voice') {
                const canonicalBlock = data.voice_blocks[idx];
                if (canonicalBlock) {
                  if (canonicalBlock.status === 'done' || canonicalBlock.status === 'provided' || canonicalBlock.status === 'error') {
                    if (block.prompt && block.prompt.trim()) {
                      return { ...block, status: canonicalBlock.status, file_path: canonicalBlock.file_path };
                    }
                  }
                }
              }
              return block;
            });
            return { ...layer, blocks: updatedBlocks };
          }));
        }
      } catch (e) {
        console.error("Error polling project manifest:", e);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [currentView, project.project_name]);

  const handleVideoVolumeChange = (val) => {
    if (selectedBlock === null) return;
    const idx = selectedBlock.index;
    const updatedVideoBlocks = project.video_blocks.map((b, i) => {
      if (i === idx || linkVideoVolume) {
        return { ...b, volume: val };
      }
      return b;
    });
    const updatedManifest = {
      ...project,
      video_blocks: updatedVideoBlocks
    };
    setProject(updatedManifest);
    saveProject(updatedManifest);
  };

  const handleVoiceVolumeChange = (val) => {
    if (selectedBlock === null) return;
    const idx = selectedBlock.index;
    const updatedVoiceBlocks = project.voice_blocks.map((b, i) => {
      if (i === idx || linkVoiceVolume) {
        return { ...b, volume: val };
      }
      return b;
    });
    const updatedManifest = {
      ...project,
      voice_blocks: updatedVoiceBlocks
    };
    setProject(updatedManifest);
    saveProject(updatedManifest);
  };

  const handleSfxVolumeChange = (val) => {
    if (selectedBlock === null) return;
    const idx = selectedBlock.index;
    const updatedSfxBlocks = project.sfx_blocks.map((b, i) => {
      if (i === idx || linkSfxVolume) {
        return { ...b, volume: val };
      }
      return b;
    });
    const updatedManifest = {
      ...project,
      sfx_blocks: updatedSfxBlocks
    };
    setProject(updatedManifest);
    saveProject(updatedManifest);
  };

  const toggleLinkVideoVolume = () => {
    const newLink = !linkVideoVolume;
    setLinkVideoVolume(newLink);
    if (newLink && selectedBlock !== null) {
      const currentVal = project.video_blocks[selectedBlock.index]?.volume ?? 1.0;
      const updatedVideoBlocks = project.video_blocks.map(b => ({ ...b, volume: currentVal }));
      const updatedManifest = { ...project, video_blocks: updatedVideoBlocks };
      setProject(updatedManifest);
      saveProject(updatedManifest);
    }
  };

  const toggleLinkVoiceVolume = () => {
    const newLink = !linkVoiceVolume;
    setLinkVoiceVolume(newLink);
    if (newLink && selectedBlock !== null) {
      const currentVal = project.voice_blocks[selectedBlock.index]?.volume ?? 1.0;
      const updatedVoiceBlocks = project.voice_blocks.map(b => ({ ...b, volume: currentVal }));
      const updatedManifest = { ...project, voice_blocks: updatedVoiceBlocks };
      setProject(updatedManifest);
      saveProject(updatedManifest);
    }
  };

  const toggleLinkSfxVolume = () => {
    const newLink = !linkSfxVolume;
    setLinkSfxVolume(newLink);
    if (newLink && selectedBlock !== null) {
      const currentVal = project.sfx_blocks[selectedBlock.index]?.volume ?? 1.0;
      const updatedSfxBlocks = project.sfx_blocks.map(b => ({ ...b, volume: currentVal }));
      const updatedManifest = { ...project, sfx_blocks: updatedSfxBlocks };
      setProject(updatedManifest);
      saveProject(updatedManifest);
    }
  };

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

      if (videoRef.current) videoRef.current.play().catch(e => { });
      if (voiceAudioRef.current) voiceAudioRef.current.play().catch(e => { });
      if (sfxAudioRef.current) sfxAudioRef.current.play().catch(e => { });
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
    fetchCharacterLibrary();

    // Session restore: if we were inside the editor, load the active project!
    try {
      const savedProj = localStorage.getItem('as_active_project');
      const savedView = localStorage.getItem('as_current_view');
      if (savedView === 'editor' && savedProj) {
        loadProject(savedProj);
      }
    } catch (e) { }

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
      const resp = await fetch("/api/engines/status");
      if (resp.ok) {
        const data = await resp.json();
        setEnginesStatus(data);
        setHealth({
          tts_server: { online: data.tts.online, model_loaded: data.tts.online, url: "" },
          sfx_server: { online: data.sfx.online || data.music.online, device: "cpu", url: "" },
          ffmpeg: { ok: data.ffmpeg.online, path: "" }
        });
      }
    } catch (e) {
      setEnginesStatus(prev => ({
        ...prev,
        tts: { ...prev.tts, online: false },
        sfx: { ...prev.sfx, online: false },
        music: { ...prev.music, online: false }
      }));
    }
  };

  const fetchCharacterLibrary = async () => {
    try {
      const resp = await fetch("/api/character-library");
      if (resp.ok) {
        const data = await resp.json();
        setCharacterLibrary(data.characters || []);
      }
    } catch (e) {
      console.error("Failed fetching character library:", e);
    }
  };

  const saveCharacterProfile = async (profile) => {
    try {
      const resp = await fetch("/api/character-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      if (resp.ok) {
        addLog(`Saved character profile: ${profile.name}`, "success");
        await fetchCharacterLibrary();
      }
    } catch (e) {
      addLog("Failed to save character profile.", "error");
    }
  };

  const deleteCharacterProfile = async (profileId) => {
    try {
      const resp = await fetch(`/api/character-library/${profileId}`, {
        method: "DELETE"
      });
      if (resp.ok) {
        addLog("Character profile deleted.", "success");
        await fetchCharacterLibrary();
      }
    } catch (e) {
      addLog("Failed to delete character profile.", "error");
    }
  };

  const handleEngineClick = async (engine) => {
    if (engine === 'ffmpeg') return;
    
    const status = enginesStatus[engine];
    const isOnline = status.online;
    
    if (engine === 'tts') {
      if (isOnline) {
        if (confirm("Do you want to shut down the PocketTTS server to save RAM? (PocketTTS uses ~300MB RAM)")) {
          addLog("Shutting down PocketTTS server...", "info");
          try {
            const resp = await fetch("/api/engines/toggle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ engine: "tts", action: "stop" })
            });
            const resData = await resp.json();
            addLog(resData.message, "success");
            await checkHealth();
          } catch (e) {
            addLog("Failed shutting down PocketTTS server.", "error");
          }
        }
      } else {
        let msg = "Do you want to start the PocketTTS server?";
        const activeSA = enginesStatus.sfx.online ? 'sfx' : (enginesStatus.music.online ? 'music' : null);
        if (activeSA) {
          msg = `The Stable Audio ${activeSA.toUpperCase()} model is currently loaded. To conserve RAM, would you like to unload the ${activeSA.toUpperCase()} model before starting the PocketTTS server?`;
        }
        if (confirm(msg)) {
          if (activeSA) {
            addLog(`Unloading ${activeSA.toUpperCase()} model to free RAM...`, "info");
            try {
              await fetch("/api/engines/toggle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ engine: activeSA, action: "stop" })
              });
            } catch (err) {
              console.error(err);
            }
          }
          addLog("Starting PocketTTS server...", "info");
          try {
            const resp = await fetch("/api/engines/toggle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ engine: "tts", action: "start" })
            });
            const resData = await resp.json();
            addLog(resData.message, "success");
            await checkHealth();
          } catch (e) {
            addLog("Failed starting PocketTTS server.", "error");
          }
        }
      }
    } else if (engine === 'sfx') {
      if (isOnline) {
        if (confirm("Do you want to unload the Stable Audio SFX model from RAM? (Saves ~2.5GB RAM)")) {
          addLog("Unloading SFX model...", "info");
          try {
            const resp = await fetch("/api/engines/toggle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ engine: "sfx", action: "stop" })
            });
            const resData = await resp.json();
            addLog(resData.message, "success");
            await checkHealth();
          } catch (e) {
            addLog("Failed unloading SFX model.", "error");
          }
        }
      } else {
        let msg = "Would you like to load the Stable Audio SFX model? (This requires ~2.5GB RAM)";
        let unloadMusic = false;
        let unloadTts = false;
        
        if (enginesStatus.music.online) {
          msg = "The Stable Audio MUSIC model is currently loaded. To save RAM, it is highly recommended to unload the MUSIC model before loading the SFX model. Would you like to unload the MUSIC model and load the SFX model?";
          unloadMusic = true;
        } else if (enginesStatus.tts.online) {
          msg = "The PocketTTS server is currently running. To conserve RAM, would you like to shut down the PocketTTS server and load the SFX model?";
          unloadTts = true;
        }
        
        if (confirm(msg)) {
          if (unloadMusic) {
            addLog("Unloading MUSIC model...", "info");
            try {
              await fetch("/api/engines/toggle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ engine: "music", action: "stop" })
              });
            } catch (err) {}
          }
          if (unloadTts) {
            addLog("Shutting down PocketTTS server...", "info");
            try {
              await fetch("/api/engines/toggle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ engine: "tts", action: "stop" })
              });
            } catch (err) {}
          }
          addLog("Loading Stable Audio SFX model (Warmup)... This may take 1-2 minutes.", "info");
          try {
            const resp = await fetch("/api/engines/toggle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ engine: "sfx", action: "start" })
            });
            const resData = await resp.json();
            addLog(resData.message, "success");
            await checkHealth();
          } catch (e) {
            addLog("Failed loading SFX model. Ensure you have accepted models on HuggingFace and setup_all.bat ran successfully.", "error");
          }
        }
      }
    } else if (engine === 'music') {
      if (isOnline) {
        if (confirm("Do you want to unload the Stable Audio MUSIC model from RAM? (Saves ~2.5GB RAM)")) {
          addLog("Unloading MUSIC model...", "info");
          try {
            const resp = await fetch("/api/engines/toggle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ engine: "music", action: "stop" })
            });
            const resData = await resp.json();
            addLog(resData.message, "success");
            await checkHealth();
          } catch (e) {
            addLog("Failed unloading MUSIC model.", "error");
          }
        }
      } else {
        let msg = "Would you like to load the Stable Audio MUSIC model? (This requires ~2.5GB RAM)";
        let unloadSfx = false;
        let unloadTts = false;
        
        if (enginesStatus.sfx.online) {
          msg = "The Stable Audio SFX model is currently loaded. To save RAM, it is highly recommended to unload the SFX model before loading the MUSIC model. Would you like to unload the SFX model and load the MUSIC model?";
          unloadSfx = true;
        } else if (enginesStatus.tts.online) {
          msg = "The PocketTTS server is currently running. To conserve RAM, would you like to shut down the PocketTTS server and load the MUSIC model?";
          unloadTts = true;
        }
        
        if (confirm(msg)) {
          if (unloadSfx) {
            addLog("Unloading SFX model...", "info");
            try {
              await fetch("/api/engines/toggle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ engine: "sfx", action: "stop" })
              });
            } catch (err) {}
          }
          if (unloadTts) {
            addLog("Shutting down PocketTTS server...", "info");
            try {
              await fetch("/api/engines/toggle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ engine: "tts", action: "stop" })
              });
            } catch (err) {}
          }
          addLog("Loading Stable Audio MUSIC model (Warmup)... This may take 1-2 minutes.", "info");
          try {
            const resp = await fetch("/api/engines/toggle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ engine: "music", action: "start" })
            });
            const resData = await resp.json();
            addLog(resData.message, "success");
            await checkHealth();
          } catch (e) {
            addLog("Failed loading MUSIC model. Ensure you have accepted models on HuggingFace and setup_all.bat ran successfully.", "error");
          }
        }
      }
    }
  };

  const updateVideoBlockField = (index, fieldName, value) => {
    const updated = [...project.video_blocks];
    if (updated[index]) {
      updated[index] = { ...updated[index], [fieldName]: value };
    }
    const newManifest = { ...project, video_blocks: updated };
    setProject(newManifest);
    setTimelineLayers(prev => prev.map(l => {
      if (l.type === 'video') {
        const newBlocks = [...l.blocks];
        if (newBlocks[index]) {
          newBlocks[index] = { ...newBlocks[index], [fieldName]: value };
        }
        return { ...l, blocks: newBlocks };
      }
      return l;
    }));
    saveProject(newManifest);
  };

  const updateCharConfig = (cIdx, fieldName, value) => {
    setEditingProfile(prev => {
      if (!prev) return prev;
      const updatedChars = [...prev.chars];
      if (updatedChars[cIdx]) {
        updatedChars[cIdx] = { ...updatedChars[cIdx], [fieldName]: value };
      }
      return { ...prev, chars: updatedChars };
    });
  };

  const handleCharacterImageUpload = async (e, profileId) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    addLog(`Uploading character base image "${file.name}"...`, "info");
    try {
      const resp = await fetch("/api/upload/voice?project_name=" + project.project_name + "&index=0", {
        method: "POST",
        body: formData
      });
      if (resp.ok) {
        const resData = await resp.json();
        addLog("Character base image uploaded successfully.", "success");
        setEditingProfile(prev => ({ ...prev, image_path: resData.block.file_path }));
      } else {
        addLog("Failed uploading character image.", "error");
      }
    } catch (err) {
      addLog(`Upload error: ${err.message}`, "error");
    }
  };

  const defaultProfileTemplate = () => ({
    id: "p_" + Date.now(),
    name: "",
    image_path: "",
    chars: [
      {
        x: 50.0, y: 50.0, width: 10.0, height: 10.0,
        style: "rounded", skin_color: "#ffcc99", line_color: "#000000",
        rotation: 0.0, perspective: 1.0, face_angle: 0.0
      }
    ]
  });

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
          try { localStorage.setItem('as_default_voice', 'alba'); } catch { }
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
    e.target.value = ''; // Reset input to allow re-upload of same file
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
        try { localStorage.setItem('as_active_project', name); } catch (e) { }
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
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
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
    const block = project.voice_blocks[index];
    if (block && block.status === 'generating') {
      addLog(`TTS generation for block ${block.id} is already in progress.`, "warning");
      return;
    }
    addLog(`Synthesizing voiceover block ${block.id}...`, "info");

    // Optimistic status update in UI (both project and timelineLayers)
    const updatedVoice = [...project.voice_blocks];
    if (updatedVoice[index]) {
      updatedVoice[index].status = 'generating';
      updatedVoice[index].prompt = text;
    }
    setProject(prev => ({ ...prev, voice_blocks: updatedVoice }));
    setTimelineLayers(prev => prev.map(l => {
      if (l.type === 'voice') {
        const newBlocks = [...l.blocks];
        if (newBlocks[index]) {
          newBlocks[index] = { ...newBlocks[index], status: 'generating', prompt: text };
        }
        return { ...l, blocks: newBlocks };
      }
      return l;
    }));

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
    // Use overrideBlockId (from timeline layer block) or fall back to merged manifest block
    const mergedBlock = merged.sfx_blocks[index];
    if (mergedBlock && mergedBlock.status === 'generating') {
      addLog(`SFX generation for slot ${index} is already in progress.`, "warning");
      return;
    }
    const blockId = overrideBlockId || (mergedBlock ? mergedBlock.id : `sfx_${String(index).padStart(2, '0')}`);
    addLog(`Generating sound effect block ${blockId} (slot ${index})...`, "info");

    // Save latest prompt and set to generating in both project and timelineLayers
    setTimelineLayers(prev => prev.map(l => {
      if (l.id === (overrideBlockId ? l.id : 'sfx-1')) {
        const newBlocks = [...l.blocks];
        if (newBlocks[index]) {
          newBlocks[index] = { ...newBlocks[index], status: 'generating', prompt };
        }
        return { ...l, blocks: newBlocks };
      }
      return l;
    }));

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
      } else {
        const errData = await resp.json().catch(() => ({}));
        addLog(`Failed initiating SFX task: ${errData.detail || resp.status}`, "error");
      }
    } catch (e) {
      addLog("Failed contacting server.", "error");
    }
  };

  // Trigger sequential generation for all voice blocks that have prompts but are not yet done
  const generateAllVoice = async (layerId = null) => {
    const targetLayerId = layerId || 'voice-1';
    const targetLayer = timelineLayers.find(l => l.id === targetLayerId);
    if (!targetLayer) {
      addLog("No voice blocks found to generate.", "error");
      return;
    }
    
    // Filter blocks that have prompts and are not actively generating
    const blocksToGen = targetLayer.blocks
      .map((b, index) => ({ b, index }))
      .filter(({ b }) => b.prompt && b.prompt.trim().length > 0 && b.status !== 'generating');
      
    if (blocksToGen.length === 0) {
      addLog("All eligible voice blocks are already generating or have no text prompts.", "info");
      return;
    }
    
    addLog(`Initiating bulk sequential TTS generation for ${blocksToGen.length} slots in layer "${targetLayer.name}"...`, "info");
    
    // Optimistic status update in UI to avoid lag
    const updatedLayers = timelineLayers.map(l => {
      if (l.id === targetLayerId) {
        const newBlocks = l.blocks.map((block, idx) => {
          if (blocksToGen.some(bg => bg.index === idx)) {
            return { ...block, status: 'generating' };
          }
          return block;
        });
        return { ...l, blocks: newBlocks };
      }
      return l;
    });
    setTimelineLayers(updatedLayers);
    
    const newManifest = getMergedManifest(updatedLayers);
    setProject(newManifest);
    await saveProject(newManifest);
    
    // We send them to the server sequentially (so they hit the backend queue nicely)
    for (const { b, index } of blocksToGen) {
      const text = b.prompt;
      const voice = b.voice || globalDefaultVoice || "alba";
      const canonicalId = newManifest.voice_blocks[index]?.id || `vo_${String(index).padStart(2, '0')}`;
      
      try {
        addLog(`Queueing TTS block ${canonicalId} (slot ${index})...`, "info");
        await fetch("/api/generate/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_name: project.project_name,
            block_id: canonicalId,
            text: text,
            voice: voice
          })
        });
      } catch (e) {
        console.error(`Error initiating bulk TTS for block ${canonicalId}:`, e);
      }
    }
    
    addLog(`All ${blocksToGen.length} TTS requests queued successfully. Processing one by one.`, "success");
  };

  // Trigger sequential generation for all SFX blocks that have prompts but are not yet done
  const generateAllSfx = async (layerId = null) => {
    const targetLayerId = layerId || 'sfx-1';
    const targetLayer = timelineLayers.find(l => l.id === targetLayerId);
    if (!targetLayer) {
      addLog("No SFX blocks found to generate.", "error");
      return;
    }
    
    const blocksToGen = targetLayer.blocks
      .map((b, index) => ({ b, index }))
      .filter(({ b }) => b.prompt && b.prompt.trim().length > 0 && b.status !== 'generating');
      
    if (blocksToGen.length === 0) {
      addLog("All eligible SFX blocks are already generating or have no prompts.", "info");
      return;
    }
    
    addLog(`Initiating bulk sequential SFX generation for ${blocksToGen.length} slots in layer "${targetLayer.name}"...`, "info");
    
    // Save prompts and set to generating
    const updatedLayers = timelineLayers.map(l => {
      if (l.id === targetLayerId) {
        const newBlocks = l.blocks.map((block, idx) => {
          if (blocksToGen.some(bg => bg.index === idx)) {
            return { ...block, status: 'generating' };
          }
          return block;
        });
        return { ...l, blocks: newBlocks };
      }
      return l;
    });
    setTimelineLayers(updatedLayers);
    
    const newManifest = getMergedManifest(updatedLayers);
    setProject(newManifest);
    await saveProject(newManifest);
    
    // Fire all requests to hit the backend queue
    for (const { b, index } of blocksToGen) {
      const canonicalId = newManifest.sfx_blocks[index]?.id || `sfx_${String(index).padStart(2, '0')}`;
      
      try {
        addLog(`Queueing SFX block ${canonicalId} (slot ${index})...`, "info");
        await fetch("/api/generate/sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_name: project.project_name,
            block_id: canonicalId,
            prompt: b.prompt,
            model: "small-sfx",
            duration: 5.0,
            steps: 8,
            seed: -1
          })
        });
      } catch (e) {
        console.error(`Error initiating bulk SFX for block ${canonicalId}:`, e);
      }
    }
    
    addLog(`All ${blocksToGen.length} SFX requests queued successfully. Processing one by one.`, "success");
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
          concat: true,
          video_volume: 1.0,
          voice_volume: 1.0,
          sfx_volume: 1.0
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
    const filteredProjects = localProjects.filter(p => {
      const nameMatch = p.project_name.toLowerCase().includes(projectsSearchQuery.toLowerCase());

      const clipsCount = p.clips_count || 0;
      const isRendered = p.render_complete;

      let status = "In Progress";
      if (isRendered) {
        status = "Rendered";
      } else if (clipsCount === 0) {
        status = "Draft";
      }

      const filterMatch = (projectsFilter === "all" ||
        (projectsFilter === "active" && status === "In Progress") ||
        (projectsFilter === "rendered" && status === "Rendered") ||
        (projectsFilter === "draft" && status === "Draft"));

      return nameMatch && filterMatch;
    });

    const totalCount = localProjects.length;
    const renderedCount = localProjects.filter(p => p.render_complete).length;
    const draftCount = localProjects.filter(p => !p.render_complete && (p.clips_count || 0) === 0).length;
    const activeCount = localProjects.filter(p => !p.render_complete && (p.clips_count || 0) > 0).length;

    const cardIcons = [
      { icon: "folder", bg: "ci-purple" },
      { icon: "video", bg: "ci-gold" },
      { icon: "device-tv", bg: "ci-teal" },
      { icon: "wand", bg: "ci-green" },
      { icon: "music", bg: "ci-purple" },
      { icon: "photo", bg: "ci-teal" },
      { icon: "stars", bg: "ci-purple" }
    ];

    return (
      <div className="w-full h-full bg-[#08080d] text-[#eeeaff] flex flex-col overflow-hidden select-text font-sans">
        {/* Sleek Topbar Navigation */}
        <div className="flex items-center justify-between px-8 h-[54px] bg-[#0e0e16]/85 backdrop-blur border-b border-white/5 sticky top-0 z-[100] shrink-0">
          <div className="flex items-center gap-4">
            <div
              onClick={() => {
                if (window.showLanding) {
                  window.showLanding();
                }
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#8a87aa] hover:text-[#eeeaff] cursor-pointer tracking-wide"
            >
              <i className="ti ti-layout-grid text-[16px] text-[#8b7fff]"></i>
              AutoStitch
            </div>
            <div className="w-[1px] bg-white/10 self-center h-4"></div>
            <div className="text-[11px] text-[#4a4868]">
              <span className="text-[#8a87aa]">Workspace</span> · Projects
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.showLanding) {
                  window.showLanding();
                }
              }}
              className="text-xs text-[#8a87aa] hover:text-white transition-all font-semibold font-mono border border-carbon-border px-3 py-1.5 rounded-lg bg-carbon-card/30"
            >
              ← HOME
            </button>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="btn-primary"
            >
              <i className="ti ti-plus"></i>
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Main Body Page */}
        <div className="projects-page animate-fade-in flex-1">
          <div className="page-header">
            <div className="workspace-tag">Workspace</div>
            <div className="page-title">Your <em>Projects</em></div>
            <div className="page-sub">{totalCount} project{totalCount !== 1 ? 's' : ''} · last updated just now</div>
          </div>

          {/* Search, Filters, View Toggles Toolbar */}
          <div className="toolbar">
            <div className="glass-search">
              <i className="ti ti-search"></i>
              <input
                type="text"
                placeholder="Search projects..."
                value={projectsSearchQuery}
                onChange={(e) => setProjectsSearchQuery(e.target.value)}
              />
            </div>

            <div className="toolbar-divider"></div>

            <button
              className={`filter-pill ${projectsFilter === 'all' ? 'active' : ''}`}
              onClick={() => setProjectsFilter('all')}
            >
              <span className="dot"></span>All
            </button>
            <button
              className={`filter-pill ${projectsFilter === 'active' ? 'active' : ''}`}
              onClick={() => setProjectsFilter('active')}
            >
              <span className="dot"></span>Active
            </button>
            <button
              className={`filter-pill ${projectsFilter === 'rendered' ? 'active' : ''}`}
              onClick={() => setProjectsFilter('rendered')}
            >
              <span className="dot"></span>Rendered
            </button>
            <button
              className={`filter-pill ${projectsFilter === 'draft' ? 'active' : ''}`}
              onClick={() => setProjectsFilter('draft')}
            >
              <span className="dot"></span>Draft
            </button>

            <div className="toolbar-divider"></div>

            <div className="view-toggle">
              <button
                className={`view-btn ${projectsView === 'grid' ? 'active' : ''}`}
                onClick={() => setProjectsView('grid')}
                title="Grid View"
              >
                <i className="ti ti-layout-grid"></i>
              </button>
              <button
                className={`view-btn ${projectsView === 'list' ? 'active' : ''}`}
                onClick={() => setProjectsView('list')}
                title="List View"
              >
                <i className="ti ti-list"></i>
              </button>
            </div>
          </div>

          {/* Stats Summary Row */}
          <div className="stats-row">
            <div className="stat-pill">
              <span className="sdot bg-[#8b7fff]"></span>
              <span className="scount">{totalCount}</span>&nbsp;total
            </div>
            <div className="stat-pill">
              <span className="sdot bg-[#8b7fff]"></span>
              <span className="scount">{activeCount}</span>&nbsp;active
            </div>
            <div className="stat-pill">
              <span className="sdot bg-[#2fcb82]"></span>
              <span className="scount">{renderedCount}</span>&nbsp;rendered
            </div>
            <div className="stat-pill">
              <span className="sdot bg-[#4a4868]"></span>
              <span className="scount">{draftCount}</span>&nbsp;draft
            </div>
          </div>

          <div className="section-label">
            {projectsFilter === 'all' ? 'All Projects' : `${projectsFilter.charAt(0).toUpperCase() + projectsFilter.slice(1)} Projects`} — {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </div>

          {/* Project View (Grid vs List) */}
          {filteredProjects.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-mood-empty text-3xl"></i>
              <p className="mt-2 font-mono text-xs text-[#4a4868]">No projects match your search.</p>
            </div>
          ) : (
            projectsView === 'grid' ? (
              <div className="grid">
                {filteredProjects.map((p, idx) => {
                  const savedDate = new Date(p.updated_at).toLocaleDateString() + ' ' + new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  const isRendered = p.render_complete;
                  const clipsCount = p.clips_count || 0;

                  let status = "In Progress";
                  let badgeClass = "sb-progress";
                  if (isRendered) {
                    status = "Rendered";
                    badgeClass = "sb-rendered";
                  } else if (clipsCount === 0) {
                    status = "Draft";
                    badgeClass = "sb-draft";
                  }

                  const activeIcon = cardIcons[idx % cardIcons.length];

                  return (
                    <div
                      key={p.project_name}
                      className={`project-card ${isRendered ? 'rendered' : ''}`}
                      onClick={() => handleSelectProject(p.project_name)}
                    >
                      <div className={`card-icon ${activeIcon.bg}`}>
                        <i className={`ti ti-${activeIcon.icon}`}></i>
                      </div>
                      <div className="card-name truncate" title={p.project_name}>{p.project_name}</div>
                      <div className="card-meta">
                        Saved&nbsp;<b>{savedDate}</b><br />
                        Clips&nbsp;<b>{clipsCount}</b> · Duration&nbsp;<b>{(p.duration_s || 0.0).toFixed(1)}s</b>
                      </div>
                      <div className="card-footer">
                        <span className={`sbadge ${badgeClass}`}>
                          <span className="d"></span>{status}
                        </span>
                        <span className="open-link font-sans font-semibold">Open <i className="ti ti-arrow-right"></i></span>
                      </div>
                    </div>
                  );
                })}

                {/* Dotted "New Project" Card */}
                <div
                  className="new-card"
                  onClick={() => setShowNewProjectModal(true)}
                >
                  <div className="new-card-icon">
                    <i className="ti ti-plus"></i>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text2)' }}>New Project</div>
                  <p>Start a fresh composition</p>
                </div>
              </div>
            ) : (
              <div className="list-view">
                <div className="lrow lhdr">
                  <span></span>
                  <span>Name</span>
                  <span>Last Saved</span>
                  <span>Clips</span>
                  <span>Duration</span>
                  <span>Status</span>
                  <span></span>
                </div>
                {filteredProjects.map((p, idx) => {
                  const savedDate = new Date(p.updated_at).toLocaleDateString() + ' ' + new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  const isRendered = p.render_complete;
                  const clipsCount = p.clips_count || 0;

                  let status = "In Progress";
                  let badgeClass = "sb-progress";
                  if (isRendered) {
                    status = "Rendered";
                    badgeClass = "sb-rendered";
                  } else if (clipsCount === 0) {
                    status = "Draft";
                    badgeClass = "sb-draft";
                  }

                  const activeIcon = cardIcons[idx % cardIcons.length];
                  const bgStyle = activeIcon.bg === 'ci-purple' ? 'rgba(108,95,255,0.18)' : activeIcon.bg === 'ci-gold' ? 'rgba(233,168,75,0.18)' : activeIcon.bg === 'ci-teal' ? 'rgba(46,196,204,0.18)' : 'rgba(47,203,130,0.18)';
                  const clStyle = activeIcon.bg === 'ci-purple' ? 'var(--accent2)' : activeIcon.bg === 'ci-gold' ? 'var(--gold)' : activeIcon.bg === 'ci-teal' ? 'var(--teal)' : 'var(--green)';

                  return (
                    <div
                      key={p.project_name}
                      className="lrow"
                      onClick={() => handleSelectProject(p.project_name)}
                    >
                      <div className="licon" style={{ background: bgStyle, color: clStyle }}>
                        <i className={`ti ti-${activeIcon.icon}`}></i>
                      </div>
                      <div className="lname truncate" title={p.project_name}>{p.project_name}</div>
                      <div className="lmono"><b>{savedDate}</b></div>
                      <div className="lmono"><b>{clipsCount}</b> clips</div>
                      <div className="lmono"><b>{(p.duration_s || 0.0).toFixed(1)}s</b></div>
                      <div>
                        <span className={`sbadge ${badgeClass}`}>
                          <span className="d"></span>{status}
                        </span>
                      </div>
                      <div className="lopen font-sans font-semibold">Open <i className="ti ti-arrow-right"></i></div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* ── CREATE NEW PROJECT MODAL ── */}
        {showNewProjectModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#0e0e16] border border-white/10 rounded-[18px] p-8 w-[420px] max-w-full shadow-2xl flex flex-col gap-4">
              <div className="text-[17px] font-medium text-white flex items-center gap-2 font-mono">
                <i className="ti ti-folder-plus text-[#8b7fff] text-lg"></i> Create New Project
              </div>
              <div className="text-xs text-[#8a87aa]">Give your project a name to get started</div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold tracking-wider uppercase text-[#4a4868]">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Promo_Video_v1"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newProjectName.trim()) {
                      const name = newProjectName.trim();
                      setShowNewProjectModal(false);
                      setNewProjectName("");
                      await loadProject(name);
                      await fetchLocalProjects();
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-sm outline-none focus:border-[#6c5fff] transition-all"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setNewProjectName("");
                  }}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (newProjectName.trim()) {
                      const name = newProjectName.trim();
                      setShowNewProjectModal(false);
                      setNewProjectName("");
                      await loadProject(name);
                      await fetchLocalProjects();
                    }
                  }}
                  className="btn-primary"
                >
                  <i className="ti ti-rocket"></i>
                  <span>Create Project</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
            <h1 className="font-extrabold text-md tracking-tight" style={{ color: 'var(--text-bright)' }}>
              <span style={{ background: 'linear-gradient(to right, var(--text-bright), var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AutoStitch</span>
              {' '}<span className="text-xs font-semibold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-full ml-1 font-mono">v1 STUDIO</span>
            </h1>
          </div>
        </div>

        {/* Project Selector & Server Status Badges */}
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-carbon-card/50 border border-carbon-border/50 px-3 py-1 rounded-lg">
            <span className="text-xs font-mono mr-2" style={{ color: 'var(--text-muted)' }}>PROJECT:</span>
            <input
              value={project.project_name}
              onChange={(e) => setProject(prev => ({ ...prev, project_name: e.target.value }))}
              onBlur={() => saveProject()}
              className="bg-transparent outline-none font-bold max-w-[120px]"
              style={{ color: 'var(--text-bright)' }}
            />
          </div>

          {/* Aspect Ratio Canvas Select */}
          <div className="flex items-center bg-carbon-card/50 border border-carbon-border/50 px-2 py-1 rounded-lg">
            <span className="text-xs font-mono mr-1.5 text-gray-500">ASPECT:</span>
            <select
              value={project.canvas || "16:9"}
              onChange={(e) => {
                const val = e.target.value;
                let w = 1920, h = 1080;
                if (val === "9:16") { w = 1080; h = 1920; }
                else if (val === "1:1") { w = 1080; h = 1080; }
                const newManifest = { ...project, canvas: val, canvas_width: w, canvas_height: h };
                setProject(newManifest);
                saveProject(newManifest);
                addLog(`Changed aspect ratio to ${val} (${w}x${h})`, "info");
              }}
              className="bg-transparent border-none text-white text-xs font-bold font-mono outline-none cursor-pointer p-0"
            >
              <option value="16:9" className="bg-[#0f0f18]">16:9 Landscape</option>
              <option value="9:16" className="bg-[#0f0f18]">9:16 Portrait</option>
              <option value="1:1" className="bg-[#0f0f18]">1:1 Square</option>
            </select>
          </div>

          {/* Captions/Subtitles Enable checkbox */}
          <div className="flex items-center bg-carbon-card/50 border border-carbon-border/50 px-2.5 py-1.5 rounded-lg">
            <label className="flex items-center gap-1.5 text-xs font-mono text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={project.captions_enabled || false}
                onChange={(e) => {
                  const val = e.target.checked;
                  const newManifest = { ...project, captions_enabled: val };
                  setProject(newManifest);
                  saveProject(newManifest);
                  addLog(`Subtitles/Captions ${val ? 'enabled' : 'disabled'}`, "info");
                }}
                className="w-3.5 h-3.5 accent-accent-primary"
              />
              <span>Burn Subtitles</span>
            </label>
          </div>

          {/* Interactive Status Pills */}
          <div className="flex items-center gap-2.5 text-xs font-mono">
            <div
              onClick={() => handleEngineClick('tts')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer select-none transition-all active:scale-[0.97] hover:brightness-110 ${enginesStatus.tts.online ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
              title={`TTS Server: ${enginesStatus.tts.online ? 'ONLINE (Click to stop)' : 'OFFLINE (Click to warm up)'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${enginesStatus.tts.online ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
              <span>TTS</span>
            </div>
            <div
              onClick={() => handleEngineClick('sfx')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer select-none transition-all active:scale-[0.97] hover:brightness-110 ${enginesStatus.sfx.online ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
              title={`SFX Weight: ${enginesStatus.sfx.online ? 'LOADED (Click to unload)' : 'UNLOADED (Click to load)'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${enginesStatus.sfx.online ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
              <span>SFX</span>
            </div>
            <div
              onClick={() => handleEngineClick('music')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer select-none transition-all active:scale-[0.97] hover:brightness-110 ${enginesStatus.music.online ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
              title={`MUSIC Weight: ${enginesStatus.music.online ? 'LOADED (Click to unload)' : 'UNLOADED (Click to load)'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${enginesStatus.music.online ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
              <span>MUSIC</span>
            </div>
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-default select-none ${enginesStatus.ffmpeg.online ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
              title={`FFmpeg engine: ${enginesStatus.ffmpeg.online ? 'OK' : 'MISSING'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${enginesStatus.ffmpeg.online ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
              <span>FFMPEG</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Tools Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowToolsDropdown(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 border border-carbon-border hover:bg-carbon-card/50 text-gray-300 hover:text-white rounded-lg transition-all text-xs font-semibold font-mono cursor-pointer"
              title="Open Tools menu"
            >
              <span>🛠️ Tools</span>
              <span className="text-[9px]">▼</span>
            </button>
            {showToolsDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0f0f18] border border-carbon-border rounded-lg shadow-2xl z-50 py-1 font-mono text-xs">
                <button
                  onClick={() => {
                    setShowToolsDropdown(false);
                    setShowCharLibraryModal(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-gray-300 hover:bg-accent-primary/20 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>👥 Character Library</span>
                </button>
                <button
                  onClick={() => {
                    setShowToolsDropdown(false);
                    setShowLipSyncLabModal(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-gray-300 hover:bg-accent-primary/20 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>👄 Lip-Sync Standalone Lab</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 border border-carbon-border hover:bg-carbon-card/50 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer"
            title="Settings"
          >
            <Icon name="settings" className="w-4 h-4" />
          </button>

          {/* Soft Theme Toggler Button */}
          <button
            onClick={() => {
              const nextTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(nextTheme);
              try { localStorage.setItem('as_theme', nextTheme); } catch { }
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

      {/* ── SUB-HEADER TOOLBAR: panel toggles + MEDIA / SFX / VOICE ── */}
      <div style={{
        height: '46px', flexShrink: 0, display: 'flex', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,10,18,0.95)',
        padding: '6px 12px 0', gap: '6px', userSelect: 'none'
      }}>

        {/* ◀/▶ LEFT PANEL TOGGLE */}
        <button
          onClick={() => setIsLeftSidebarOpen(prev => !prev)}
          style={{
            width:'28px', height:'28px', display:'flex', alignItems:'center',
            justifyContent:'center', borderRadius:'6px', fontSize:'11px',
            fontWeight:'bold', border:'1px solid', cursor:'pointer',
            borderColor: isLeftSidebarOpen ? '#7c6cff' : 'rgba(255,255,255,0.18)',
            background: isLeftSidebarOpen ? 'rgba(124,108,255,0.18)' : 'rgba(255,255,255,0.06)',
            color: isLeftSidebarOpen ? '#a89fff' : '#888'
          }}
          title={isLeftSidebarOpen ? 'Collapse Asset Browser' : 'Expand Asset Browser'}
        >
          {isLeftSidebarOpen ? '◀' : '▶'}
        </button>

        <div style={{ width:'1px', height:'20px', background:'rgba(255,255,255,0.1)', margin:'0 4px' }} />

        {/* MEDIA TAB */}
        <button
          onClick={() => { setActiveTab('video'); setIsLeftSidebarOpen(true); }}
          style={{
            height:'28px', padding:'0 14px', borderRadius:'6px', fontSize:'11px',
            fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.06em',
            cursor:'pointer', border:'1px solid',
            borderColor:(activeTab==='video' && isLeftSidebarOpen) ? '#7c6cff' : 'transparent',
            background:(activeTab==='video' && isLeftSidebarOpen) ? 'rgba(124,108,255,0.18)' : 'transparent',
            color:(activeTab==='video' && isLeftSidebarOpen) ? '#a89fff' : '#aaa'
          }}
          title="Media / Video Browser"
        >MEDIA</button>

        {/* SFX TAB */}
        <button
          onClick={() => { setActiveTab('sfx'); setIsLeftSidebarOpen(true); }}
          style={{
            height:'28px', padding:'0 14px', borderRadius:'6px', fontSize:'11px',
            fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.06em',
            cursor:'pointer', border:'1px solid',
            borderColor:(activeTab==='sfx' && isLeftSidebarOpen) ? '#ff6c9d' : 'transparent',
            background:(activeTab==='sfx' && isLeftSidebarOpen) ? 'rgba(255,108,157,0.18)' : 'transparent',
            color:(activeTab==='sfx' && isLeftSidebarOpen) ? '#ff9dbf' : '#aaa'
          }}
          title="Sound Effects Browser"
        >SFX</button>

        {/* VOICE TAB */}
        <button
          onClick={() => { setActiveTab('voice'); setIsLeftSidebarOpen(true); }}
          style={{
            height:'28px', padding:'0 14px', borderRadius:'6px', fontSize:'11px',
            fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.06em',
            cursor:'pointer', border:'1px solid',
            borderColor:(activeTab==='voice' && isLeftSidebarOpen) ? '#6cffcc' : 'transparent',
            background:(activeTab==='voice' && isLeftSidebarOpen) ? 'rgba(108,255,204,0.18)' : 'transparent',
            color:(activeTab==='voice' && isLeftSidebarOpen) ? '#6cffcc' : '#aaa'
          }}
          title="Voice Over Browser"
        >VOICE</button>

        <div style={{ flex:1 }} />

        {/* ▶/◀ RIGHT PANEL TOGGLE */}
        <button
          onClick={() => setIsSidebarOpen(prev => !prev)}
          style={{
            width:'28px', height:'28px', display:'flex', alignItems:'center',
            justifyContent:'center', borderRadius:'6px', fontSize:'11px',
            fontWeight:'bold', border:'1px solid', cursor:'pointer',
            borderColor: isSidebarOpen ? '#ff6c9d' : 'rgba(255,255,255,0.18)',
            background: isSidebarOpen ? 'rgba(255,108,157,0.18)' : 'rgba(255,255,255,0.06)',
            color: isSidebarOpen ? '#ff9dbf' : '#888'
          }}
          title={isSidebarOpen ? 'Collapse Slot Settings' : 'Expand Slot Settings'}
        >
          {isSidebarOpen ? '▶' : '◀'}
        </button>

      </div>

      {/* ── WORKSPACE CORE LAYOUT ── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Floating Side Panel Toggle Buttons */}
        {!isLeftSidebarOpen && (
          <button
            onClick={() => setIsLeftSidebarOpen(true)}
            className="absolute left-0 top-3 z-40 bg-carbon-panel/90 backdrop-blur border-y border-r border-carbon-border hover:border-accent-primary text-accent-primary hover:text-white px-2.5 py-3 rounded-r-lg transition-all shadow-[0_0_10px_rgba(124,108,255,0.15)] flex items-center justify-center font-bold"
            title="Expand Asset Browser"
          >
            ▶
          </button>
        )}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute right-0 top-3 z-40 bg-carbon-panel/90 backdrop-blur border-y border-l border-carbon-border hover:border-accent-secondary text-accent-secondary hover:text-white px-2.5 py-3 rounded-l-lg transition-all shadow-[0_0_10px_rgba(255,108,157,0.15)] flex items-center justify-center font-bold"
            title="Expand Slot Settings"
          >
            ◀
          </button>
        )}

        {/* Expandable Left asset Browser */}
        {isLeftSidebarOpen && (
          <div style={{ width: `${leftPanelWidth}px`, minWidth: '180px', maxWidth: '420px' }} className="border-r border-carbon-border bg-carbon-panel flex flex-col shrink-0 relative z-[1]">

            {/* Left Panel Edge Close Button */}
            <button
              onClick={() => setIsLeftSidebarOpen(false)}
              className="absolute -right-3 top-3 z-50 bg-carbon-panel border-y border-r border-carbon-border hover:border-accent-primary text-accent-primary hover:text-white px-1 py-3 rounded-r-md transition-all shadow-[0_0_10px_rgba(124,108,255,0.15)] flex items-center justify-center font-bold text-[9px] cursor-pointer"
              title="Collapse Asset Browser"
            >
              ◀
            </button>

            <div className="flex border-b border-carbon-border bg-carbon-card/10">
              <button
                onClick={() => setActiveTab("video")}
                className={`flex-1 py-3 text-center text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'video' ? 'bg-carbon-card/30 border-b-2' : 'hover:bg-carbon-card/10'}`}
                style={{
                  color: activeTab === 'video' ? 'var(--text-bright)' : 'var(--text-muted)',
                  borderBottomColor: activeTab === 'video' ? '#7c6cff' : 'transparent'
                }}
              >
                MEDIA
              </button>
              <button
                onClick={() => setActiveTab("sfx")}
                className={`flex-1 py-3 text-center text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'sfx' ? 'bg-carbon-card/30 border-b-2' : 'hover:bg-carbon-card/10'}`}
                style={{
                  color: activeTab === 'sfx' ? 'var(--text-bright)' : 'var(--text-muted)',
                  borderBottomColor: activeTab === 'sfx' ? '#7c6cff' : 'transparent'
                }}
              >
                SFX
              </button>
              <button
                onClick={() => setActiveTab("voice")}
                className={`flex-1 py-3 text-center text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'voice' ? 'bg-carbon-card/30 border-b-2' : 'hover:bg-carbon-card/10'}`}
                style={{
                  color: activeTab === 'voice' ? 'var(--text-bright)' : 'var(--text-muted)',
                  borderBottomColor: activeTab === 'voice' ? '#7c6cff' : 'transparent'
                }}
              >
                VOICE
              </button>
            </div>
            {/* Left Panel Resize Handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = leftPanelWidth;
                const doDrag = (mv) => {
                  const newW = Math.max(180, Math.min(420, startW + (mv.clientX - startX)));
                  setLeftPanelWidth(newW);
                };
                const stopDrag = () => {
                  document.removeEventListener('mousemove', doDrag);
                  document.removeEventListener('mouseup', stopDrag);
                };
                document.addEventListener('mousemove', doDrag);
                document.addEventListener('mouseup', stopDrag);
              }}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent-primary/50 active:bg-accent-primary/70 bg-transparent transition-colors z-50 group"
              title="Drag to resize panel"
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-12 bg-carbon-border group-hover:bg-accent-primary/60 rounded-full transition-colors" />
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
                          {v.thumbnail_path ? (
                            <img src={v.thumbnail_path} className="w-10 h-7 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-7 rounded bg-carbon-card/60 flex items-center justify-center text-[10px] text-gray-500">🎥</div>
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
                      onChange={(e) => {
                        importTextFile('sfx', e.target.files[0]);
                        e.target.value = ''; // Reset input to allow re-import
                      }}
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
                      onChange={(e) => {
                        importTextFile('voice', e.target.files[0]);
                        e.target.value = ''; // Reset input to allow re-import
                      }}
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
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold font-mono text-gray-400">VOICES AVAILABLE</h3>
                      <button
                        onClick={() => {
                          const activeVoice = (selectedBlock && selectedBlock.lane === 'voice')
                            ? (project.voice_blocks[selectedBlock.index]?.voice || "alba")
                            : globalDefaultVoice;
                          if (confirm(`Are you sure you want to apply the voice '${activeVoice}' to all timeline slots?`)) {
                            const updated = project.voice_blocks.map(b => ({ ...b, voice: activeVoice }));
                            const newManifest = { ...project, voice_blocks: updated };
                            setProject(newManifest);
                            setTimelineLayers(prev => prev.map(l => {
                              if (l.type === 'voice') {
                                const newBlocks = l.blocks.map(b => ({ ...b, voice: activeVoice }));
                                return { ...l, blocks: newBlocks };
                              }
                              return l;
                            }));
                            saveProject(newManifest);
                            addLog(`Applied voice '${activeVoice}' to all voice slots.`, "success");
                          }
                        }}
                        className="px-2 py-1 bg-accent-tertiary/20 hover:bg-accent-tertiary/40 border border-accent-tertiary/40 text-[9px] font-bold font-mono rounded text-accent-tertiary transition-all cursor-pointer"
                        title="Assign the currently active voice to all slots in the project"
                      >
                        APPLY TO ALL SLOTS 🗣️
                      </button>
                    </div>
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
                                try { localStorage.setItem('as_default_voice', voice); } catch { }
                                addLog(`Set global default voice to '${voice}'`, "success");
                              }
                            }}
                            className={`flex items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-all border-2 relative group ${isVoiceSelected
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
        )}

        {/* CENTER TIMELINE & RUN CONTROL */}
        <div className="flex-1 flex flex-col min-w-0 bg-carbon overflow-hidden relative">

          {/* ── UPPER PART: MASTER MEDIA PREVIEWER & AUDIO COMPOSER MIXER ── */}
          <div
            style={{ height: `${previewSectionHeight}px`, minHeight: '260px', maxHeight: '75vh' }}
            className="shrink-0 border-b border-carbon-border bg-carbon-panel/40 flex flex-col items-center justify-start gap-3 select-text overflow-hidden pt-4 pb-3 px-5"
          >
            {/* Centered Video Screen Section — grows with preview section height */}
            <div className="w-[600px] flex-1 min-h-[160px] rounded-xl bg-carbon-card overflow-hidden relative border border-carbon-border/60 flex flex-col justify-center items-center group shadow-2xl">
              {previewMode === 'composer' ? (
                selectedBlock !== null && project.video_blocks[selectedBlock.index] ? (
                  project.video_blocks[selectedBlock.index].file_path ? (
                    (() => {
                      const filePath = project.video_blocks[selectedBlock.index].file_path.toLowerCase();
                      const isImage = filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.webp') || project.video_blocks[selectedBlock.index].media_type === 'image';
                      return (
                        <div className="relative w-full h-full">
                          {isImage ? (
                            <img
                              src={`/api/video/serve?path=${encodeURIComponent(project.video_blocks[selectedBlock.index].file_path)}`}
                              className="w-full h-full object-contain"
                              onClick={togglePlayAll}
                            />
                          ) : (
                            <video
                              ref={videoRef}
                              src={`/api/video/serve?path=${encodeURIComponent(project.video_blocks[selectedBlock.index].file_path)}`}
                              className="w-full h-full object-contain"
                              onTimeUpdate={handleVideoSeek}
                              onEnded={() => setIsPlaying(false)}
                              onClick={togglePlayAll}
                            />
                          )}

                          {/* Hidden Audios */}
                          {project.voice_blocks[selectedBlock.index] && (project.voice_blocks[selectedBlock.index].status === 'done' || project.voice_blocks[selectedBlock.index].status === 'provided') && (
                            <audio
                              ref={voiceAudioRef}
                              src={`/projects/${project.project_name}/voice/vo_${String(selectedBlock.index).padStart(2, '0')}.wav?t=${audioCacheBuster}`}
                              onEnded={() => setIsPlaying(false)}
                            />
                          )}
                          {project.sfx_blocks[selectedBlock.index] && project.sfx_blocks[selectedBlock.index].status === 'done' && (
                            <audio
                              ref={sfxAudioRef}
                              src={`/projects/${project.project_name}/sfx/sfx_${String(selectedBlock.index).padStart(2, '0')}.wav?t=${audioCacheBuster}`}
                              onEnded={() => {
                                if (!project.voice_blocks[selectedBlock.index]?.prompt) {
                                  setIsPlaying(false);
                                }
                              }}
                            />
                          )}

                          {/* Hover Overlay Play button */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer" onClick={togglePlayAll}>
                            <div className="w-14 h-14 rounded-full bg-accent-primary/95 text-white flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all">
                              {isPlaying ? <span className="text-xl font-bold">||</span> : <Icon name="play" className="w-7 h-7 fill-current ml-1" />}
                            </div>
                          </div>
                        </div>
                      );
                    })()
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
                          src={`/projects/${project.project_name}/voice/vo_${String(selectedBlock.index).padStart(2, '0')}.wav?t=${audioCacheBuster}`}
                          onEnded={() => setIsPlaying(false)}
                        />
                      )}
                      {project.sfx_blocks[selectedBlock.index] && project.sfx_blocks[selectedBlock.index].status === 'done' && (
                        <audio
                          ref={sfxAudioRef}
                          src={`/projects/${project.project_name}/sfx/sfx_${String(selectedBlock.index).padStart(2, '0')}.wav?t=${audioCacheBuster}`}
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
              <div className="flex gap-2 justify-center items-center">
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
                {/* Small green download icon for master preview — always visible in master mode */}
                {previewMode === 'master' && (
                  <a
                    href={`/output/master.mp4`}
                    download={`${project.project_name}_master.mp4`}
                    onClick={(e) => {
                      if (!project.render_complete) {
                        e.preventDefault();
                        addLog("Cannot download! Master video has not been rendered yet.", "error");
                      }
                    }}
                    title={project.render_complete ? "Download Master Render" : "Master not rendered yet"}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all shadow-sm ${project.render_complete
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/40 hover:border-emerald-400 hover:scale-110'
                        : 'bg-carbon-card/20 border-carbon-border/30 text-gray-600 cursor-not-allowed opacity-50'
                      }`}
                  >
                    <Icon name="download" className="w-3.5 h-3.5" />
                  </a>
                )}
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
                      value={currentVideoVolume}
                      disabled={selectedBlock === null}
                      onChange={(e) => handleVideoVolumeChange(parseFloat(e.target.value))}
                      className="custom-slider flex-1"
                      title={selectedBlock === null ? "Select a slot on timeline to adjust volumes" : ""}
                    />
                    <span className="text-[9px] font-mono text-gray-500 w-8 text-right">{Math.round(currentVideoVolume * 100)}%</span>
                    <button
                      onClick={toggleLinkVideoVolume}
                      className={`w-6 h-6 flex items-center justify-center rounded transition-all shrink-0 cursor-pointer ${
                        linkVideoVolume
                          ? 'bg-accent-primary/20 border border-accent-primary text-accent-primary shadow-[0_0_8px_rgba(124,108,255,0.2)]'
                          : 'bg-carbon-card/50 border border-carbon-border/30 text-gray-500 hover:text-white'
                      }`}
                      title={linkVideoVolume ? "Unlink video volume across slots" : "Link and sync video volume to all slots"}
                    >
                      <Icon name={linkVideoVolume ? "link" : "unlink"} className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Voice Volume */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-accent-tertiary font-mono w-10 shrink-0">VOICE</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={currentVoiceVolume}
                      disabled={selectedBlock === null}
                      onChange={(e) => handleVoiceVolumeChange(parseFloat(e.target.value))}
                      className="custom-slider flex-1"
                      title={selectedBlock === null ? "Select a slot on timeline to adjust volumes" : ""}
                    />
                    <span className="text-[9px] font-mono text-gray-500 w-8 text-right">{Math.round(currentVoiceVolume * 100)}%</span>
                    <button
                      onClick={toggleLinkVoiceVolume}
                      className={`w-6 h-6 flex items-center justify-center rounded transition-all shrink-0 cursor-pointer ${
                        linkVoiceVolume
                          ? 'bg-accent-tertiary/20 border border-accent-tertiary text-accent-tertiary shadow-[0_0_8px_rgba(236,72,153,0.2)]'
                          : 'bg-carbon-card/50 border border-carbon-border/30 text-gray-500 hover:text-white'
                      }`}
                      title={linkVoiceVolume ? "Unlink voice volume across slots" : "Link and sync voice volume to all slots"}
                    >
                      <Icon name={linkVoiceVolume ? "link" : "unlink"} className="w-3 h-3" />
                    </button>
                  </div>

                  {/* SFX Volume */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-accent-secondary font-mono w-8 shrink-0">SFX</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={currentSfxVolume}
                      disabled={selectedBlock === null}
                      onChange={(e) => handleSfxVolumeChange(parseFloat(e.target.value))}
                      className="custom-slider flex-1"
                      title={selectedBlock === null ? "Select a slot on timeline to adjust volumes" : ""}
                    />
                    <span className="text-[9px] font-mono text-gray-500 w-8 text-right">{Math.round(currentSfxVolume * 100)}%</span>
                    <button
                      onClick={toggleLinkSfxVolume}
                      className={`w-6 h-6 flex items-center justify-center rounded transition-all shrink-0 cursor-pointer ${
                        linkSfxVolume
                          ? 'bg-accent-secondary/20 border border-accent-secondary text-accent-secondary shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                          : 'bg-carbon-card/50 border border-carbon-border/30 text-gray-500 hover:text-white'
                      }`}
                      title={linkSfxVolume ? "Unlink SFX volume across slots" : "Link and sync SFX volume to all slots"}
                    >
                      <Icon name={linkSfxVolume ? "link" : "unlink"} className="w-3 h-3" />
                    </button>
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

              {/* Master render status hint — small, not a big bar */}
              {previewMode === 'master' && !project.render_complete && (
                <div className="text-[10px] font-mono text-gray-600 text-center italic">
                  Hit <strong className="text-gray-400">RENDER ▶</strong> to compile your master video, then download via the green icon above.
                </div>
              )}

            </div>

          </div>

          {/* ── HORIZONTAL RESIZE HANDLE between Preview and Timeline ── */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startH = previewSectionHeight;
              const doDrag = (mv) => {
                const newH = Math.max(260, Math.min(window.innerHeight * 0.75, startH + (mv.clientY - startY)));
                setPreviewSectionHeight(newH);
              };
              const stopDrag = () => {
                document.removeEventListener('mousemove', doDrag);
                document.removeEventListener('mouseup', stopDrag);
              };
              document.addEventListener('mousemove', doDrag);
              document.addEventListener('mouseup', stopDrag);
            }}
            className="h-2 cursor-row-resize shrink-0 bg-carbon-border/10 hover:bg-accent-primary/40 active:bg-accent-primary/60 transition-colors group relative z-20"
            title="Drag to resize preview / timeline split"
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 mx-auto w-16 bg-carbon-border/40 group-hover:bg-accent-primary/60 rounded-full transition-colors" />
          </div>
          {/* ── LOWER PART: INTERACTIVE MULTI-LANE TRACKS TIMELINE ── */}
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto p-6 overflow-x-hidden">

            {/* Timeline Wrapper Container */}
            <div className="flex-1 flex flex-col border border-carbon-border/50 rounded-xl bg-carbon-panel/30 overflow-hidden relative select-none">

              {/* RULER TRACK HEADER */}
              <div className="flex h-10 border-b border-carbon-border bg-carbon-panel/60">
                <div className="w-20 border-r border-carbon-border flex items-center justify-center font-mono text-xs text-gray-300 font-semibold select-none gap-1">
                  <input
                    type="checkbox"
                    checked={selectedIndices.length === project.video_blocks.length && project.video_blocks.length > 0}
                    onChange={handleToggleSelectAll}
                    className="rounded border-carbon-border bg-carbon text-accent-primary focus:ring-0 cursor-pointer"
                    title="Select All Slots"
                  />
                  {selectedIndices.length > 0 ? (
                    <button
                      onClick={deleteSelectedSlots}
                      className="text-red-400 hover:text-red-500 transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                      title={`Delete selected slots (${selectedIndices.length})`}
                    >
                      <Icon name="trash-2" className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span>TIME</span>
                  )}
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
                        style={{ width: '140px', minWidth: '140px', flexShrink: 0 }}
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

                        {/* Quick Insert and Delete buttons inside ruler tick */}
                        <div className="flex items-center gap-1.5 ml-auto mr-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSlot(i); }}
                            className="flex items-center justify-center w-4 h-4 rounded-full border border-red-500/30 bg-carbon hover:bg-red-600 hover:border-red-600 text-red-500 hover:text-white text-[11px] font-extrabold focus:outline-none transition-all shadow-sm cursor-pointer"
                            title="Delete this column slot sequence"
                          >
                            -
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); insertBlankSlotAt(i + 1); }}
                            className="flex items-center justify-center w-4 h-4 rounded-full border border-carbon-border/50 bg-carbon hover:bg-accent-primary hover:border-accent-primary text-gray-400 hover:text-white text-[11px] font-extrabold focus:outline-none transition-all shadow-sm cursor-pointer"
                            title="Insert blank slot to the right of this column"
                          >
                            +
                          </button>
                        </div>
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

                        {/* Compact GEN ALL button inside lane header for SFX and Voice tracks */}
                        {(layer.type === 'sfx' || layer.type === 'voice') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (layer.type === 'sfx') {
                                generateAllSfx(layer.id);
                              } else {
                                generateAllVoice(layer.id);
                              }
                            }}
                            className={`mt-1.5 px-1 py-0.5 rounded text-[8px] font-bold border transition-all cursor-pointer font-mono shrink-0 ${
                              layer.type === 'sfx'
                                ? "bg-accent-secondary/15 hover:bg-accent-secondary/35 border-accent-secondary/30 hover:border-accent-secondary text-accent-secondary"
                                : "bg-accent-tertiary/15 hover:bg-accent-tertiary/35 border-accent-tertiary/30 hover:border-accent-tertiary text-accent-tertiary"
                            }`}
                            title={`Generate all prompts in ${layer.name}`}
                          >
                            GEN ALL ⚡
                          </button>
                        )}

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
                        className="flex-1 overflow-x-auto flex items-center py-2 px-2 timeline-lane-track" style={{ gap: '0px' }}
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
                                style={{ width: '140px', minWidth: '140px', marginRight: '0px' }}
                                className={`relative h-[68px] rounded-lg p-1.5 flex flex-col justify-between border cursor-pointer select-none transition-all group ${isBlockSelected
                                    ? 'bg-accent-primary/10 border-accent-primary shadow-[0_0_8px_rgba(124,108,255,0.2)] text-white'
                                    : (isColSelected
                                      ? 'bg-carbon-card/40 border-accent-primary/60 text-gray-300'
                                      : 'bg-carbon-card/25 border-carbon-border/50 text-gray-400 hover:border-accent-primary/40 hover:bg-carbon-card/35')
                                  }`}
                              >
                                {block.thumbnail_path ? (
                                  <img src={block.thumbnail_path} className="w-full h-11 rounded object-cover" />
                                ) : (
                                  <div className="w-full h-11 rounded bg-carbon-card/60 flex items-center justify-center text-xs text-gray-500">🎥</div>
                                )}
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="truncate font-semibold text-gray-300 max-w-[80px]">{block.filename}</span>
                                  <span className="font-mono text-gray-500">{block.duration_s.toFixed(1)}s</span>
                                </div>
                                {block.file_path && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clearBlockMedia('video', i);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-[9px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition-all focus:outline-none z-30"
                                    title="Clear video slot composition"
                                  >
                                    ✕
                                  </button>
                                )}
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
                                style={{ width: '140px', minWidth: '140px', marginRight: '0px' }}
                                className={`relative h-[68px] rounded-lg p-1.5 flex flex-col justify-between border cursor-pointer select-none transition-all group ${isBlockSelected
                                    ? 'bg-accent-secondary/15 border-accent-secondary shadow-[0_0_8px_rgba(255,108,157,0.25)] text-white'
                                    : (isColSelected
                                      ? 'bg-carbon-card/40 border-accent-secondary/60 text-gray-300'
                                      : 'bg-carbon-card/25 border-carbon-border/50 text-gray-400 hover:border-accent-secondary/40 hover:bg-carbon-card/35')
                                  }`}
                              >
                                {block.prompt && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clearBlockMedia('sfx', i);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-[9px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition-all focus:outline-none z-30"
                                    title="Clear sfx prompt composition"
                                  >
                                    ✕
                                  </button>
                                )}
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
                                      setProject(prev => {
                                        const updatedBlocks = [...prev.sfx_blocks];
                                        if (updatedBlocks[i]) {
                                          updatedBlocks[i] = { ...updatedBlocks[i], prompt: text, status: 'idle' };
                                        }
                                        return { ...prev, sfx_blocks: updatedBlocks };
                                      });
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
                                style={{ width: '140px', minWidth: '140px', marginRight: '0px' }}
                                className={`relative h-[68px] rounded-lg p-1.5 flex flex-col justify-between border cursor-pointer select-none transition-all group ${isBlockSelected
                                    ? 'bg-accent-tertiary/15 border-accent-tertiary shadow-[0_0_8px_rgba(108,255,204,0.25)] text-white'
                                    : (isColSelected
                                      ? 'bg-carbon-card/40 border-accent-tertiary/60 text-gray-300'
                                      : 'bg-carbon-card/25 border-carbon-border/50 text-gray-400 hover:border-accent-tertiary/40 hover:bg-carbon-card/35')
                                  }`}
                              >
                                {block.prompt && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clearBlockMedia('voice', i);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-[9px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition-all focus:outline-none z-30"
                                    title="Clear voice composition script"
                                  >
                                    ✕
                                  </button>
                                )}
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
                                      setProject(prev => {
                                        const updatedBlocks = [...prev.voice_blocks];
                                        if (updatedBlocks[i]) {
                                          updatedBlocks[i] = { ...updatedBlocks[i], prompt: text, status: 'idle' };
                                        }
                                        return { ...prev, voice_blocks: updatedBlocks };
                                      });
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

          {/* Vertical Resizer Handle between Timeline and Console Logs (always shown when not collapsed) */}
          {!isConsoleCollapsed && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                const startY = e.clientY;
                const startHeight = consoleHeight;
                const doDrag = (moveEvent) => {
                  const newHeight = Math.max(80, Math.min(400, startHeight - (moveEvent.clientY - startY)));
                  setConsoleHeight(newHeight);
                };
                const stopDrag = () => {
                  document.removeEventListener('mousemove', doDrag);
                  document.removeEventListener('mouseup', stopDrag);
                };
                document.addEventListener('mousemove', doDrag);
                document.addEventListener('mouseup', stopDrag);
              }}
              className="h-1.5 cursor-row-resize hover:bg-accent-primary/60 active:bg-accent-primary/80 bg-carbon-border/20 transition-all z-40 shrink-0 group"
              title="Drag to resize console"
            />
          )}

          {/* Persistent console collapse toggle — always visible regardless of collapsed state */}
          <div className="absolute bottom-0 right-4 z-50 pointer-events-none" style={{ bottom: isConsoleCollapsed ? '4px' : `${consoleHeight + 4}px` }}>
            <button
              onClick={() => setIsConsoleCollapsed(prev => !prev)}
              className="pointer-events-auto flex items-center gap-1.5 bg-carbon-panel/95 backdrop-blur border border-carbon-border hover:border-accent-primary/50 text-gray-400 hover:text-white px-2.5 py-1 rounded-t-lg text-[10px] font-mono font-bold transition-all shadow-lg"
              title={isConsoleCollapsed ? 'Expand Console' : 'Collapse Console'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary shadow-[0_0_4px_#7c6cff]"></span>
              CONSOLE {isConsoleCollapsed ? '▲' : '▼'}
            </button>
          </div>

          {/* REAL TIME CONSOLE LOGGER (Bottom) */}
          <div
            style={{ height: isConsoleCollapsed ? '0px' : `${consoleHeight}px` }}
            className="shrink-0 border-t border-carbon-border bg-carbon-panel flex flex-col overflow-hidden transition-[height] duration-200"
          >
            <div className="h-8 border-b border-carbon-border bg-carbon-card/20 px-4 flex items-center justify-between shrink-0">
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
          <div style={{ width: `${rightPanelWidth}px`, minWidth: '220px', maxWidth: '500px' }} className="border-l border-carbon-border bg-carbon-panel flex flex-col relative z-[1]">

            {/* Right Panel Edge Close Button */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute -left-3 top-3 z-50 bg-carbon-panel border-y border-l border-carbon-border hover:border-accent-secondary text-accent-secondary hover:text-white px-1 py-3 rounded-l-md transition-all shadow-[0_0_10px_rgba(255,108,157,0.15)] flex items-center justify-center font-bold text-[9px] cursor-pointer"
              title="Collapse Slot Settings"
            >
              ▶
            </button>
            {/* Right panel resize handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = rightPanelWidth;
                const doDrag = (mv) => {
                  const newW = Math.max(220, Math.min(500, startW - (mv.clientX - startX)));
                  setRightPanelWidth(newW);
                };
                const stopDrag = () => {
                  document.removeEventListener('mousemove', doDrag);
                  document.removeEventListener('mouseup', stopDrag);
                };
                document.addEventListener('mousemove', doDrag);
                document.addEventListener('mouseup', stopDrag);
              }}
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent-secondary/50 active:bg-accent-secondary/70 bg-transparent transition-colors z-50 group"
              title="Drag to resize panel"
            >
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-12 bg-carbon-border group-hover:bg-accent-secondary/60 rounded-full transition-colors" />
            </div>
            <div className="h-12 border-b border-carbon-border flex bg-carbon-card/10 font-mono text-xs select-none">
              <button
                onClick={() => setRightSidebarTab("slot")}
                disabled={!selectedBlock}
                className={`flex-1 h-full font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                  !selectedBlock
                    ? 'text-gray-600 cursor-not-allowed border-transparent'
                    : rightSidebarTab === 'slot'
                    ? 'text-accent-primary border-accent-primary bg-carbon-panel/60'
                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-carbon-card/20'
                }`}
                title={!selectedBlock ? "Select a slot on timeline to view Slot Settings" : "Configure selected block settings"}
              >
                <span>Slot Settings</span>
              </button>
              <button
                onClick={() => setRightSidebarTab("global")}
                className={`flex-1 h-full font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                  rightSidebarTab === 'global'
                    ? 'text-accent-secondary border-accent-secondary bg-carbon-panel/60'
                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-carbon-card/20'
                }`}
                title="Configure global canvas and subtitle styling"
              >
                <span>Global Settings</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">

              {rightSidebarTab === 'global' ? (
                <div className="flex flex-col gap-5 text-gray-200">
                  <div className="flex flex-col gap-1.5 border-b border-carbon-border/20 pb-4">
                    <span className="text-[10px] font-bold font-mono text-accent-primary uppercase tracking-wider">PROJECT CONFIGURATION</span>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Icon name="settings" className="w-4 h-4 text-accent-primary animate-pulse" />
                      Global Settings
                    </h3>
                    <span className="text-[10px] text-gray-500 font-mono">Applies to the entire compilation</span>
                  </div>

                  {/* Aspect Ratio Canvas Select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-mono">ASPECT RATIO / CANVAS</label>
                    <select
                      value={project.canvas || "16:9"}
                      onChange={(e) => {
                        const val = e.target.value;
                        let w = 1920, h = 1080;
                        if (val === "9:16") { w = 1080; h = 1920; }
                        else if (val === "1:1") { w = 1080; h = 1080; }
                        const newManifest = { ...project, canvas: val, canvas_width: w, canvas_height: h };
                        setProject(newManifest);
                        saveProject(newManifest);
                        addLog(`Changed aspect ratio to ${val} (${w}x${h})`, "info");
                      }}
                      className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                    >
                      <option value="16:9">16:9 Landscape (1920x1080)</option>
                      <option value="9:16">9:16 Portrait (1080x1920)</option>
                      <option value="1:1">1:1 Square (1080x1080)</option>
                    </select>
                  </div>

                  {/* Global Transition */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-mono">GLOBAL TRANSITION</label>
                    <select
                      value={project.global_transition || "none"}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newManifest = { ...project, global_transition: val };
                        setProject(newManifest);
                        saveProject(newManifest);
                        addLog(`Set global transition to ${val}`, "info");
                      }}
                      className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                    >
                      <option value="none">None (Cut)</option>
                      <option value="fade">Cross Dissolve (Fade)</option>
                      <option value="slide_left">Slide Left</option>
                      <option value="slide_right">Slide Right</option>
                      <option value="zoom_blur">Zoom Blur</option>
                      <option value="wipe">Wipe</option>
                    </select>
                  </div>

                  {/* Global Visual Overlay */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-mono">GLOBAL FILTER OVERLAY</label>
                    <select
                      value={project.global_overlay || "none"}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newManifest = { ...project, global_overlay: val };
                        setProject(newManifest);
                        saveProject(newManifest);
                        addLog(`Set global filter overlay to ${val}`, "info");
                      }}
                      className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                    >
                      <option value="none">None</option>
                      <option value="film_grain">Classic Film Grain</option>
                      <option value="vhs_glitch">VHS Retro Glitch</option>
                      <option value="light_leak">Warm Light Leak</option>
                      <option value="vignette">Soft Vignette Shadow</option>
                      <option value="film_burn">Cinematic Film Burn</option>
                      <option value="dust">Vintage Dust & Scratches</option>
                      <option value="bw_classic">Noir Black & White</option>
                      <option value="glitch_digital">Digital Chromatic Glitch</option>
                    </select>
                  </div>

                  {/* Global Color Grading */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-mono">GLOBAL COLOR GRADING</label>
                    <select
                      value={project.global_color_grading || "none"}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newManifest = { ...project, global_color_grading: val };
                        setProject(newManifest);
                        saveProject(newManifest);
                        addLog(`Set global color grading to ${val}`, "info");
                      }}
                      className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                    >
                      <option value="none">None (Standard)</option>
                      <option value="cinematic">Cinematic (Warm contrast)</option>
                      <option value="cool_blue">Cool Blue (Teal look)</option>
                      <option value="warm_gold">Warm Gold (Golden look)</option>
                      <option value="vintage">Vintage Sepia</option>
                      <option value="high_contrast">High Contrast</option>
                      <option value="cyberpunk">Cyberpunk Neon</option>
                      <option value="bleach_bypass">Bleach Bypass</option>
                    </select>
                  </div>

                  {/* Subtitles & Styling */}
                  <div className="border-t border-carbon-border/20 pt-4 mt-2 flex flex-col gap-4">
                    <span className="text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider">AUTO-CAPTIONS & SUBTITLES</span>
                    
                    <label className="flex items-center gap-2 text-xs font-mono text-gray-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={project.captions_enabled !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          const newManifest = { ...project, captions_enabled: val };
                          setProject(newManifest);
                          saveProject(newManifest);
                          addLog(`Subtitles/Captions ${val ? 'enabled' : 'disabled'}`, "info");
                        }}
                        className="w-3.5 h-3.5 accent-accent-primary rounded bg-carbon border border-carbon-border cursor-pointer"
                      />
                      <span>Burn Subtitles on Render</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-mono text-gray-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={project.sfx_captions_enabled !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          const newManifest = { ...project, sfx_captions_enabled: val };
                          setProject(newManifest);
                          saveProject(newManifest);
                          addLog(`SFX Subtitles ${val ? 'enabled' : 'disabled'}`, "info");
                        }}
                        className="w-3.5 h-3.5 accent-accent-secondary rounded bg-carbon border border-carbon-border cursor-pointer"
                      />
                      <span>Burn SFX Captions on Render</span>
                    </label>

                    {project.captions_enabled !== false && (
                      <div className="flex flex-col gap-4 pl-4 border-l border-accent-primary/20 animate-fade-in">
                        
                        {/* Caption Mode */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">CAPTION STYLE MODE</label>
                          <select
                            value={project.caption_mode || "word_by_word"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newManifest = { ...project, caption_mode: val };
                              setProject(newManifest);
                              saveProject(newManifest);
                            }}
                            className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="word_by_word">Word by Word (Karaoke-like)</option>
                            <option value="line_by_line">Line by Line (Traditional)</option>
                          </select>
                        </div>

                        {/* Font Family */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">FONT FAMILY</label>
                          <select
                            value={project.caption_font_style || "arial"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newManifest = { ...project, caption_font_style: val };
                              setProject(newManifest);
                              saveProject(newManifest);
                            }}
                            className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="arial">Arial</option>
                            <option value="courier">Courier New</option>
                            <option value="times_new_roman">Times New Roman</option>
                            <option value="impact">Impact</option>
                          </select>
                        </div>

                        {/* Font Size slider */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                            <span>FONT SIZE</span>
                            <span className="text-accent-primary font-bold">{project.caption_font_size || 40}px</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="120"
                            step="2"
                            value={project.caption_font_size || 40}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setProject(prev => ({ ...prev, caption_font_size: val }));
                            }}
                            onMouseUp={() => saveProject()}
                            className="w-full h-1.5 bg-carbon rounded-lg appearance-none cursor-pointer accent-accent-primary"
                          />
                        </div>

                        {/* Font Color */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">FONT COLOR</label>
                          <select
                            value={project.caption_font_color || "yellow"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newManifest = { ...project, caption_font_color: val };
                              setProject(newManifest);
                              saveProject(newManifest);
                            }}
                            className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="yellow">Yellow</option>
                            <option value="white">White</option>
                            <option value="cyan">Cyan</option>
                            <option value="green">Green</option>
                            <option value="magenta">Magenta</option>
                            <option value="red">Red</option>
                          </select>
                        </div>

                        {/* Caption Placement */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">SCREEN PLACEMENT</label>
                          <select
                            value={project.caption_placement || "bottom"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newManifest = { ...project, caption_placement: val };
                              setProject(newManifest);
                              saveProject(newManifest);
                            }}
                            className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="top">Top (Header)</option>
                            <option value="center">Center (Middle)</option>
                            <option value="bottom">Bottom (Subtitle Standard)</option>
                          </select>
                        </div>

                        {/* Box vs Outline styling */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">BACKDROP STYLE</label>
                          <select
                            value={project.caption_box_enabled ? "box" : "outline"}
                            onChange={(e) => {
                              const isBox = e.target.value === "box";
                              const newManifest = { 
                                ...project, 
                                caption_box_enabled: isBox,
                                caption_outline_width: isBox ? 0 : 3
                              };
                              setProject(newManifest);
                              saveProject(newManifest);
                            }}
                            className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="box">Opaque Black Box Backdrop</option>
                            <option value="outline">Text Outline / Stroke</option>
                          </select>
                        </div>

                        {/* Backdrop specifics */}
                        {project.caption_box_enabled ? (
                          <div className="flex flex-col gap-1 animate-fade-in">
                            <label className="text-[10px] text-gray-400 font-mono">BOX OPACITY</label>
                            <select
                              value={project.caption_box_color || "black@0.5"}
                              onChange={(e) => {
                                  const val = e.target.value;
                                  const newManifest = { ...project, caption_box_color: val };
                                  setProject(newManifest);
                                  saveProject(newManifest);
                              }}
                              className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                            >
                              <option value="black@0.2">Light Shadow (20%)</option>
                              <option value="black@0.5">Medium Box (50%)</option>
                              <option value="black@0.75">Dark Box (75%)</option>
                              <option value="black@0.95">Solid Box (95%)</option>
                            </select>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 animate-fade-in">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-gray-400 font-mono">OUTLINE COLOR</label>
                              <select
                                value={project.caption_outline_color || "black"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newManifest = { ...project, caption_outline_color: val };
                                  setProject(newManifest);
                                  saveProject(newManifest);
                                }}
                                className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                              >
                                <option value="black">Black</option>
                                <option value="white">White</option>
                                <option value="red">Red</option>
                                <option value="blue">Blue</option>
                                <option value="yellow">Yellow</option>
                              </select>
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                                <span>OUTLINE WIDTH</span>
                                <span className="text-accent-primary font-bold">{project.caption_outline_width || 3}px</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="8"
                                step="1"
                                value={project.caption_outline_width || 3}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setProject(prev => ({ ...prev, caption_outline_width: val }));
                                }}
                                onMouseUp={() => saveProject()}
                                className="w-full h-1.5 bg-carbon rounded-lg appearance-none cursor-pointer accent-accent-primary"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedBlock ? (
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
                      {blockData.thumbnail_path ? (
                        <img src={blockData.thumbnail_path} className="w-full h-32 rounded-lg object-cover border border-carbon-border" />
                      ) : (
                        <div className="w-full h-32 rounded-lg bg-carbon-card/60 flex items-center justify-center text-xs text-gray-500 border border-carbon-border">🎥</div>
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

                      {/* Slot Overrides and FX */}
                      <div className="flex flex-col gap-3.5 border-t border-carbon-border/20 pt-4 mt-2">
                        <span className="text-[10px] font-bold font-mono text-gray-500">SLOT OVERRIDES & FX</span>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">CANVAS FIT MODE</label>
                          <select
                            value={blockData.canvas_fit_mode || "letterbox"}
                            onChange={(e) => updateVideoBlockField(selectedBlock.index, "canvas_fit_mode", e.target.value)}
                            className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="letterbox">Black Bars (Letterbox)</option>
                            <option value="fill_crop">Crop to Fill</option>
                            <option value="stretch">Stretch to Fit</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">TRANSITION TO NEXT SLOT</label>
                          <select
                            value={blockData.transition || "none"}
                            onChange={(e) => updateVideoBlockField(selectedBlock.index, "transition", e.target.value)}
                            className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="none">None (Cut)</option>
                            <option value="fade">Cross Dissolve (Fade)</option>
                            <option value="slide_left">Slide Left</option>
                            <option value="slide_right">Slide Right</option>
                            <option value="zoom_blur">Zoom Blur</option>
                            <option value="wipe">Wipe</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">VISUAL FILTER OVERLAY</label>
                          <select
                            value={blockData.overlay_effect || "none"}
                            onChange={(e) => updateVideoBlockField(selectedBlock.index, "overlay_effect", e.target.value)}
                            className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="none">None</option>
                            <option value="film_grain">Classic Film Grain</option>
                            <option value="vhs_glitch">VHS Retro Glitch</option>
                            <option value="light_leak">Warm Light Leak</option>
                            <option value="vignette">Soft Vignette Shadow</option>
                            <option value="film_burn">Cinematic Film Burn</option>
                            <option value="dust">Vintage Dust & Scratches</option>
                            <option value="bw_classic">Noir Black & White</option>
                            <option value="glitch_digital">Digital Chromatic Glitch</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">COLOR GRADING</label>
                          <select
                            value={blockData.color_grading || "none"}
                            onChange={(e) => updateVideoBlockField(selectedBlock.index, "color_grading", e.target.value)}
                            className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="none">None (Standard)</option>
                            <option value="cinematic">Cinematic (Warm contrast)</option>
                            <option value="cool_blue">Cool Blue (Teal look)</option>
                            <option value="warm_gold">Warm Gold (Golden look)</option>
                            <option value="vintage">Vintage Sepia</option>
                            <option value="high_contrast">High Contrast</option>
                            <option value="cyberpunk">Cyberpunk Neon</option>
                            <option value="bleach_bypass">Bleach Bypass</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-carbon-border/10 pt-2 mt-1">
                          <label className="flex items-center gap-2 text-xs font-mono text-gray-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={blockData.lip_sync_enabled || false}
                              onChange={(e) => updateVideoBlockField(selectedBlock.index, "lip_sync_enabled", e.target.checked)}
                              className="w-3.5 h-3.5 accent-accent-primary rounded bg-carbon border border-carbon-border cursor-pointer"
                            />
                            <span>Enable Character Lip Sync</span>
                          </label>
                          
                          {blockData.lip_sync_enabled && (
                            <div className="flex flex-col gap-1 animate-fade-in pl-5">
                              <label className="text-[10px] text-gray-400 font-mono">SELECT CHARACTER PROFILE</label>
                              <select
                                value={blockData.lip_sync_character_profile_id || ""}
                                onChange={(e) => updateVideoBlockField(selectedBlock.index, "lip_sync_character_profile_id", e.target.value)}
                                className="bg-carbon border border-carbon-border/50 text-white font-mono text-xs p-2 rounded-lg outline-none cursor-pointer"
                              >
                                <option value="">-- Choose Profile --</option>
                                {characterLibrary.map(profile => (
                                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                                ))}
                              </select>
                              <p className="text-[9px] text-[#8b7fff] font-mono leading-relaxed mt-0.5">
                                👉 Map multiple voices using speaker screenplay labels in the Voice panel below.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Video Manual Upload and Clear actions */}
                      <div className="flex flex-col gap-2 border-t border-carbon-border/20 pt-4 mt-2">
                        <span className="text-[10px] font-bold font-mono text-gray-500">MANUAL COMPOSITION</span>
                        <input
                          type="file"
                          accept="video/*,image/*"
                          onChange={(e) => handleCustomVideoUpload(selectedBlock.index, e.target.files[0])}
                          className="hidden"
                          id="custom-video-upload-btn"
                        />
                        <label
                          htmlFor="custom-video-upload-btn"
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-primary/20 to-indigo-600/20 border border-accent-primary/50 hover:border-accent-primary text-xs text-white hover:text-white py-2 rounded-lg cursor-pointer transition-all font-semibold font-mono"
                        >
                          <span>UPLOAD VIDEO / IMAGE 📤</span>
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
                      audioCacheBuster={audioCacheBuster}
                    />
                  )}

                  {/* Voice Block Controller */}
                  {selectedBlock.lane === 'voice' && blockData && (
                    <VoiceController
                      index={selectedBlock.index}
                      block={blockData}
                      project={project}
                      lipSyncEnabled={project.video_blocks[selectedBlock.index]?.lip_sync_enabled || false}
                      characterProfile={characterLibrary.find(p => p.id === project.video_blocks[selectedBlock.index]?.lip_sync_character_profile_id)}
                      onPromptChange={(text, prompts) => {
                        const updated = [...project.voice_blocks];
                        if (updated[selectedBlock.index]) {
                          updated[selectedBlock.index] = { 
                            ...updated[selectedBlock.index], 
                            prompt: text,
                            prompts: prompts || []
                          };
                        }
                        const newManifest = { ...project, voice_blocks: updated };
                        setProject(newManifest);
                        setTimelineLayers(prev => prev.map(l => {
                          if (l.type === 'voice') {
                            const newBlocks = [...l.blocks];
                            if (newBlocks[selectedBlock.index]) {
                              newBlocks[selectedBlock.index] = { 
                                ...newBlocks[selectedBlock.index], 
                                prompt: text,
                                prompts: prompts || []
                              };
                            }
                            return { ...l, blocks: newBlocks };
                          }
                          return l;
                        }));
                        saveProject(newManifest);
                      }}
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
                      audioCacheBuster={audioCacheBuster}
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
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 font-mono text-xs p-6 text-center select-none">
                  <Icon name="sliders-horizontal" className="w-8 h-8 mb-2 opacity-50" />
                  <span>No slot selected. Select a card on the timeline to configure settings.</span>
                </div>
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
                <div className="flex gap-2">
                  <input
                    value={settings.output_dir}
                    onChange={(e) => setSettings(prev => ({ ...prev, output_dir: e.target.value }))}
                    className="flex-1 bg-carbon border border-carbon-border/50 focus:border-accent-primary outline-none px-3 py-2 rounded-lg text-white font-mono"
                  />
                  <button
                    onClick={async () => {
                      addLog("Opening native output directory picker...", "info");
                      try {
                        const resp = await fetch("/api/videos/select-folder", { method: "POST" });
                        if (resp.ok) {
                          const data = await resp.json();
                          if (data.status === 'ok' && data.folder) {
                            setSettings(prev => ({ ...prev, output_dir: data.folder }));
                            addLog(`Selected output directory: "${data.folder}"`, "success");
                          } else {
                            addLog("Folder selection cancelled.", "info");
                          }
                        }
                      } catch (e) {
                        addLog("Failed loading native directory picker.", "error");
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 bg-carbon border border-carbon-border hover:border-accent-primary text-[10px] text-gray-300 px-3 py-2 rounded-lg transition-all font-semibold font-mono"
                    title="Open Windows directory selection dialog"
                  >
                    <span>BROWSE 📂</span>
                  </button>
                </div>
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

      {/* ── CHARACTER LIBRARY MODAL ── */}
      {showCharLibraryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-[560px] max-w-full bg-[#0c0c14] border border-white/10 rounded-[18px] p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-extrabold text-white tracking-wide font-mono flex items-center gap-2">
                <i className="ti ti-users text-accent-primary"></i>
                <span>CHARACTER LIBRARY MANAGER</span>
              </h3>
              <button
                onClick={() => {
                  setShowCharLibraryModal(false);
                  setEditingProfile(null);
                }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editingProfile ? (
              // CREATE / EDIT PROFILE FORM
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="text-xs text-accent-primary font-bold font-mono">
                  {editingProfile.name ? "EDIT PROFILE" : "CREATE NEW PROFILE"}
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-500 font-mono text-[10px]">PROFILE NAME</label>
                  <input
                    type="text"
                    placeholder="e.g. Dialogue_Scene_Bob_And_Alice"
                    value={editingProfile.name}
                    onChange={(e) => setEditingProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-carbon border border-carbon-border/50 px-3 py-2 rounded-lg text-white text-xs outline-none focus:border-accent-primary font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-500 font-mono text-[10px]">BASE CHARACTER IMAGE PATH (LOCAL OR UPLOADED)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingProfile.image_path}
                      onChange={(e) => setEditingProfile(prev => ({ ...prev, image_path: e.target.value }))}
                      placeholder="D:/Osama_mvp/character.png"
                      className="flex-1 bg-carbon border border-carbon-border/50 px-3 py-2 rounded-lg text-white text-xs outline-none font-mono"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCharacterImageUpload(e, editingProfile.id)}
                      className="hidden"
                      id="char-image-uploader"
                    />
                    <label
                      htmlFor="char-image-uploader"
                      className="px-3 py-2 bg-carbon border border-carbon-border hover:border-accent-primary text-gray-300 rounded-lg text-xs cursor-pointer font-bold font-mono flex items-center justify-center"
                    >
                      BROWSE 📂
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold font-mono text-gray-500">CHARACTER SLOTS ({editingProfile.chars.length})</span>
                  {editingProfile.chars.map((char, cIdx) => (
                    <div key={cIdx} className="bg-carbon/30 border border-carbon-border/50 p-3 rounded-lg flex flex-col gap-2 relative">
                      <div className="text-[10px] font-bold text-gray-400 font-mono flex justify-between items-center">
                        <span>CHARACTER #{cIdx + 1} (Dialogue Tag: [Character {cIdx + 1}])</span>
                        {editingProfile.chars.length > 1 && (
                          <button
                            onClick={() => {
                              const updated = editingProfile.chars.filter((_, idx) => idx !== cIdx);
                              setEditingProfile(prev => ({ ...prev, chars: updated }));
                            }}
                            className="text-red-400 hover:text-red-500 text-[9px] font-bold cursor-pointer"
                          >
                            [REMOVE SLOT]
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400">
                        <div>
                          <label>Center X (%)</label>
                          <input type="number" step="0.1" value={char.x} onChange={(e) => updateCharConfig(cIdx, 'x', parseFloat(e.target.value))} className="w-full bg-carbon border border-carbon-border/50 px-2 py-1 rounded text-white outline-none" />
                        </div>
                        <div>
                          <label>Center Y (%)</label>
                          <input type="number" step="0.1" value={char.y} onChange={(e) => updateCharConfig(cIdx, 'y', parseFloat(e.target.value))} className="w-full bg-carbon border border-carbon-border/50 px-2 py-1 rounded text-white outline-none" />
                        </div>
                        <div>
                          <label>Width (%)</label>
                          <input type="number" step="0.1" value={char.width} onChange={(e) => updateCharConfig(cIdx, 'width', parseFloat(e.target.value))} className="w-full bg-carbon border border-carbon-border/50 px-2 py-1 rounded text-white outline-none" />
                        </div>
                        <div>
                          <label>Height (%)</label>
                          <input type="number" step="0.1" value={char.height} onChange={(e) => updateCharConfig(cIdx, 'height', parseFloat(e.target.value))} className="w-full bg-carbon border border-carbon-border/50 px-2 py-1 rounded text-white outline-none" />
                        </div>
                        <div>
                          <label>Mouth Style</label>
                          <select value={char.style} onChange={(e) => updateCharConfig(cIdx, 'style', e.target.value)} className="w-full bg-carbon border border-carbon-border/50 px-2 py-1 rounded text-white outline-none text-[10px] cursor-pointer">
                            <option value="rounded">Rounded</option>
                            <option value="smile">Smile (Toothy)</option>
                            <option value="u-shaped">U-Shaped</option>
                            <option value="capsule">Capsule</option>
                            <option value="flat">Flat Cel-Shaded</option>
                          </select>
                        </div>
                        <div>
                          <label>Face Angle (deg)</label>
                          <input type="number" step="1" value={char.face_angle} onChange={(e) => updateCharConfig(cIdx, 'face_angle', parseFloat(e.target.value))} className="w-full bg-carbon border border-carbon-border/50 px-2 py-1 rounded text-white outline-none" placeholder="-90 to +90" />
                        </div>
                        <div>
                          <label>Skin Tone Hex</label>
                          <div className="flex gap-1">
                            <input type="text" value={char.skin_color} onChange={(e) => updateCharConfig(cIdx, 'skin_color', e.target.value)} className="w-full bg-carbon border border-carbon-border/50 px-2 py-1 rounded text-white outline-none text-[10px]" />
                            <input type="color" value={char.skin_color} onChange={(e) => updateCharConfig(cIdx, 'skin_color', e.target.value)} className="w-6 h-6 border border-carbon-border/50 bg-transparent rounded cursor-pointer" />
                          </div>
                        </div>
                        <div>
                          <label>Lip Color Hex</label>
                          <div className="flex gap-1">
                            <input type="text" value={char.line_color} onChange={(e) => updateCharConfig(cIdx, 'line_color', e.target.value)} className="w-full bg-carbon border border-carbon-border/50 px-2 py-1 rounded text-white outline-none text-[10px]" />
                            <input type="color" value={char.line_color} onChange={(e) => updateCharConfig(cIdx, 'line_color', e.target.value)} className="w-6 h-6 border border-carbon-border/50 bg-transparent rounded cursor-pointer" />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={async () => {
                            if (!editingProfile.image_path) {
                              alert("Please enter or upload an image path first!");
                              return;
                            }
                            addLog(`Sampling colors at mouth position (${char.x}%, ${char.y}%)...`, "info");
                            try {
                              const resp = await fetch("/api/lipsync/sample-color", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  image_path: editingProfile.image_path,
                                  mouth_x: char.x,
                                  mouth_y: char.y,
                                  mouth_width: char.width,
                                  mouth_height: char.height
                                })
                              });
                              if (resp.ok) {
                                const resData = await resp.json();
                                updateCharConfig(cIdx, 'skin_color', resData.skin_color);
                                updateCharConfig(cIdx, 'line_color', resData.line_color);
                                addLog(`Sampled Skin: ${resData.skin_color}, Lip outline: ${resData.line_color}`, "success");
                              }
                            } catch (err) {
                              addLog("Color sampling failed.", "error");
                            }
                          }}
                          className="flex-1 py-1.5 bg-accent-primary/10 hover:bg-accent-primary/20 border border-accent-primary/30 text-accent-primary text-[10px] font-mono rounded transition-all cursor-pointer"
                        >
                          🧪 AUTO-SAMPLE COLORS
                        </button>
                        <button
                          onClick={() => setCalibratingChar(cIdx)}
                          className="flex-1 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-600/30 text-indigo-400 text-[10px] font-mono rounded transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          🎯 CALIBRATE {char.landmarks_calib ? "✓" : ""}
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const updated = [...editingProfile.chars, {
                        x: 50.0, y: 50.0, width: 10.0, height: 10.0,
                        style: "rounded", skin_color: "#ffcc99", line_color: "#000000",
                        rotation: 0.0, perspective: 1.0, face_angle: 0.0
                      }];
                      setEditingProfile(prev => ({ ...prev, chars: updated }));
                    }}
                    className="w-full py-2.5 border border-dashed border-carbon-border hover:border-accent-primary text-gray-400 hover:text-white rounded-lg text-xs font-bold font-mono transition-all cursor-pointer"
                  >
                    + ADD ANOTHER CHARACTER SLOT
                  </button>
                </div>

                <div className="flex justify-end gap-3 mt-4 border-t border-white/10 pt-4">
                  <button
                    onClick={() => setEditingProfile(null)}
                    className="bg-carbon border border-carbon-border hover:bg-carbon-card/50 text-xs px-4 py-2 rounded-lg text-gray-300 transition-all font-semibold cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={async () => {
                      if (!editingProfile.name) {
                        alert("Please enter a profile name!");
                        return;
                      }
                      if (!editingProfile.image_path) {
                        alert("Please specify or upload a base image path!");
                        return;
                      }
                      await saveCharacterProfile(editingProfile);
                      setEditingProfile(null);
                    }}
                    className="bg-gradient-to-r from-accent-primary to-indigo-600 text-xs text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-accent-primary/20 transition-all font-semibold cursor-pointer"
                  >
                    SAVE PROFILE
                  </button>
                </div>
              </div>
            ) : (
              // PROFILES LIST VIEW
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-mono">Select, edit, or delete character profiles</span>
                  <button
                    onClick={() => setEditingProfile(defaultProfileTemplate())}
                    className="btn-primary py-1 px-3 text-xs"
                  >
                    + Create Profile
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {characterLibrary.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-600 font-mono border border-dashed border-carbon-border rounded-lg">
                      No character profiles in library yet. Click "Create Profile" to start.
                    </div>
                  ) : (
                    characterLibrary.map(profile => (
                      <div key={profile.id} className="bg-carbon/20 border border-carbon-border/50 p-3 rounded-lg flex justify-between items-center">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-white font-mono">{profile.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono truncate max-w-[340px]" title={profile.image_path}>
                            Image: {profile.image_path}
                          </span>
                          <span className="text-[10px] text-accent-primary font-mono">
                            Characters: {profile.chars.length}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingProfile(profile)}
                            className="bg-carbon border border-carbon-border hover:bg-carbon-card/50 text-[10px] px-2.5 py-1.5 rounded text-gray-300 font-mono transition-all cursor-pointer"
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete profile "${profile.name}"?`)) {
                                deleteCharacterProfile(profile.id);
                              }
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] px-2.5 py-1.5 rounded font-mono transition-all cursor-pointer"
                          >
                            DELETE
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end mt-4 border-t border-white/10 pt-4">
                  <button
                    onClick={() => setShowCharLibraryModal(false)}
                    className="bg-carbon border border-carbon-border hover:bg-carbon-card/50 text-xs px-4 py-2 rounded-lg text-gray-300 transition-all font-semibold cursor-pointer"
                  >
                    CLOSE MANAGER
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STANDALONE LAB IFRAME MODAL ── */}
      {showLipSyncLabModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-[90vw] h-[85vh] bg-[#0c0c14] border border-white/10 rounded-[18px] flex flex-col shadow-2xl overflow-hidden">
            <div className="h-12 border-b border-white/10 px-5 flex items-center justify-between bg-carbon-panel">
              <h3 className="text-sm font-extrabold text-white tracking-wide font-mono flex items-center gap-2">
                <span>👄 Lip-Sync Standalone Studio</span>
                <span className="text-[10px] text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-full">Port 8001</span>
              </h3>
              <button
                onClick={() => setShowLipSyncLabModal(false)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer font-bold"
              >
                ✕ CLOSE LAB
              </button>
            </div>
            <div className="flex-1 bg-black">
              <iframe
                src="http://localhost:8001/"
                className="w-full h-full border-none"
                title="Lip-Sync Standalone Lab"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── LANDMARKS CALIBRATION MODAL ── */}
      {calibratingChar !== null && (
        <LandmarksCalibrator
          imagePath={editingProfile.image_path}
          initialCalib={editingProfile.chars[calibratingChar]?.landmarks_calib}
          onClose={() => setCalibratingChar(null)}
          onSave={(points) => {
            const updatedChars = [...editingProfile.chars];
            updatedChars[calibratingChar] = {
              ...updatedChars[calibratingChar],
              landmarks_calib: points
            };
            setEditingProfile(prev => ({
              ...prev,
              chars: updatedChars
            }));
            setCalibratingChar(null);
          }}
        />
      )}

    </div>
  );
}

// Subcomponent: SFX Controller Panel
function SfxController({ index, block, project, onPromptChange, onSaveProject, onGenerate, addLog, onImportTextFile, onClearSfx, audioCacheBuster }) {
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
  const audioUrl = hasAudio ? `/projects/${project.project_name}/sfx/sfx_${String(block.order).padStart(2, '0')}.wav?t=${audioCacheBuster}` : null;

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
          onChange={(e) => {
            onImportTextFile(e.target.files[0]);
            e.target.value = ''; // Reset input to allow re-import
          }}
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
function VoiceController({ index, block, project, lipSyncEnabled, characterProfile, onPromptChange, onVoiceChange, onSaveProject, onGenerate, addLog, availableVoices = [], onImportTextFile, onClearVoice, audioCacheBuster }) {
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
  const audioUrl = hasAudio ? `/projects/${project.project_name}/voice/vo_${String(block.order).padStart(2, '0')}.wav?t=${audioCacheBuster}` : null;

  const showMultiChar = lipSyncEnabled && characterProfile && characterProfile.chars && characterProfile.chars.length > 0;
  const numChars = showMultiChar ? characterProfile.chars.length : 0;
  const promptsList = [];
  
  if (showMultiChar) {
    for (let i = 0; i < numChars; i++) {
      const charName = `Character ${i + 1}`;
      const existing = (block.prompts || []).find(p => p.char_name === charName);
      promptsList.push({
        char_name: charName,
        prompt: existing ? existing.prompt : ""
      });
    }
  }

  return (
    <div className="flex flex-col gap-4 text-xs font-mono">
      {!showMultiChar ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-500">VOICEOVER TTS SCRIPT</label>
          <textarea
            value={promptInput}
            onChange={(e) => {
              setPromptInput(e.target.value);
              onPromptChange(e.target.value, []);
            }}
            onBlur={() => onSaveProject()}
            placeholder="e.g. Welcome to the future of AI video production, running entirely on your local machine."
            className="w-full bg-carbon border border-carbon-border/50 focus:border-accent-tertiary outline-none px-2.5 py-2 rounded-lg text-white font-mono h-20 resize-none leading-tight"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-gray-500 text-[10px] font-bold">MULTIPLE CHARACTER SPEECH</div>
          {promptsList.map((item, i) => (
            <div key={item.char_name} className="flex flex-col gap-1">
              <label className="text-accent-tertiary text-[10px] font-bold font-mono">{item.char_name.toUpperCase()} DIALOGUE</label>
              <textarea
                value={item.prompt}
                onChange={(e) => {
                  const val = e.target.value;
                  const updatedPrompts = [...promptsList];
                  updatedPrompts[i] = { ...updatedPrompts[i], prompt: val };
                  const scriptParts = updatedPrompts.map(p => `[${p.char_name}] ${p.prompt}`).join(" ");
                  setPromptInput(scriptParts);
                  onPromptChange(scriptParts, updatedPrompts);
                }}
                onBlur={() => onSaveProject()}
                placeholder={`Type dialogue for ${item.char_name}...`}
                className="w-full bg-carbon border border-carbon-border/50 focus:border-accent-tertiary outline-none px-2 py-1.5 rounded-lg text-white font-mono h-14 resize-none leading-tight"
              />
            </div>
          ))}
        </div>
      )}

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
          onChange={(e) => {
            onImportTextFile(e.target.files[0]);
            e.target.value = ''; // Reset input to allow re-import
          }}
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

function LandmarksCalibrator({ imagePath, initialCalib, onClose, onSave }) {
  const containerRef = useRef(null);
  const [activePinIndex, setActivePinIndex] = useState(null);
  
  // 6 default points
  const defaultPoints = [
    { name: "forehead_top", label: "1. Forehead", x: 50.0, y: 20.0, color: "#ef4444" },
    { name: "eye_left_center", label: "2. Left Eye", x: 43.0, y: 38.0, color: "#3b82f6" },
    { name: "eye_right_center", label: "3. Right Eye", x: 57.0, y: 38.0, color: "#10b981" },
    { name: "nose_tip", label: "4. Nose Tip", x: 50.0, y: 50.0, color: "#f59e0b" },
    { name: "mouth_center", label: "5. Mouth Center", x: 50.0, y: 68.0, color: "#ec4899" },
    { name: "chin", label: "6. Chin", x: 50.0, y: 82.0, color: "#8b5cf6" }
  ];

  const [pins, setPins] = useState(() => {
    if (initialCalib && initialCalib.length === 6) {
      return defaultPoints.map((p, i) => ({
        ...p,
        x: initialCalib[i].x,
        y: initialCalib[i].y
      }));
    }
    return defaultPoints;
  });

  const handleMouseDown = (index, e) => {
    e.preventDefault();
    setActivePinIndex(index);
  };

  const handleMouseMove = (e) => {
    if (activePinIndex === null) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setPins(prev => prev.map((p, i) => i === activePinIndex ? { ...p, x: parseFloat(px.toFixed(2)), y: parseFloat(py.toFixed(2)) } : p));
  };

  const handleMouseUp = () => {
    setActivePinIndex(null);
  };

  useEffect(() => {
    if (activePinIndex !== null) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [activePinIndex]);

  // Image source proxying
  const imgSrc = `/api/lipsync/serve-image?path=${encodeURIComponent(imagePath)}`;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in select-none">
      <div className="w-[640px] max-w-full bg-[#0c0c14] border border-white/10 rounded-[18px] p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-extrabold text-white tracking-wide font-mono flex items-center gap-2">
            <span>🎯 6-POINT FACE CALIBRATION</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">✕</button>
        </div>

        <p className="text-[10px] text-gray-400 font-mono leading-relaxed mt-0.5">
          👉 Drag the colored pins to align with the character's facial features:
        </p>

        {/* Legend of Points */}
        <div className="grid grid-cols-3 gap-2 text-[9px] font-mono p-2 bg-carbon/30 border border-carbon-border/30 rounded-lg">
          {pins.map((p, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
              <span className="text-gray-300 font-bold">{p.label}</span>
              <span className="text-gray-500">({p.x}%, {p.y}%)</span>
            </div>
          ))}
        </div>

        {/* Drag Wrapper Canvas */}
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-black/40 border border-carbon-border/50 rounded-xl relative p-2 min-h-[300px]">
          <div 
            ref={containerRef}
            className="relative inline-block max-w-full max-h-[50vh]"
            style={{ pointerEvents: 'auto' }}
          >
            <img 
              src={imgSrc} 
              alt="Character base" 
              className="max-w-full max-h-[50vh] object-contain rounded-lg pointer-events-none"
            />
            {/* Overlay Pins */}
            {pins.map((p, idx) => (
              <div
                key={idx}
                onMouseDown={(e) => handleMouseDown(idx, e)}
                className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white flex items-center justify-center cursor-move shadow-lg transition-transform hover:scale-125 select-none"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  backgroundColor: p.color,
                  zIndex: activePinIndex === idx ? 20 : 10
                }}
                title={p.label}
              >
                <span className="text-[9px] font-extrabold text-white font-mono">{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
          <button
            onClick={onClose}
            className="bg-carbon border border-carbon-border hover:bg-carbon-card/50 text-xs px-4 py-2 rounded-lg text-gray-300 transition-all font-semibold cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={() => {
              const results = pins.map(p => ({ x: p.x, y: p.y }));
              onSave(results);
            }}
            className="bg-gradient-to-r from-accent-primary to-indigo-600 text-xs text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-accent-primary/20 transition-all font-semibold cursor-pointer"
          >
            SAVE CALIBRATION
          </button>
        </div>
      </div>
    </div>
  );
}

// Render root App
const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
