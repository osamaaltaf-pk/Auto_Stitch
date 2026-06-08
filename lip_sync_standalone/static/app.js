// ==========================================
// STATE
// ==========================================
let activeChar = null;          // null = no character selected yet
let uploadedImagePath = "";

function createDefaultConfig(n) {
  return {
    enabled: false,
    placed: false,
    x: n === 1 ? 50 : 60,
    y: n === 1 ? 40 : 50,
    width: 16,
    height: 10,
    style: 'rounded',
    skin_color: n === 1 ? '#ffcc99' : '#a18262',
    line_color: '#000000',
    rotation: 0,
    perspective: 1.0,
    face_angle: 0
  };
}

const configs = {
  1: createDefaultConfig(1),
  2: createDefaultConfig(2)
};

// ==========================================
// DOM REFS
// ==========================================
const workspace        = document.getElementById("workspace");
const charImg          = document.getElementById("char-img");
const imageContainer   = document.getElementById("image-container");
const markerOverlay    = document.getElementById("marker-overlay");
const imageFile        = document.getElementById("image-file");
const logsContainer    = document.getElementById("logs-container");
const generateBtn      = document.getElementById("generate-btn");
const outputVideo      = document.getElementById("output-video");
const videoPlaceholder = document.getElementById("video-placeholder");
const ghost            = document.getElementById("mouth-ghost");
const popup            = document.getElementById("mouth-popup");

// ==========================================
// LOGGER
// ==========================================
function addLog(msg, type = "info") {
  const e = document.createElement("div");
  e.className = `log-entry ${type}`;
  e.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logsContainer.appendChild(e);
  logsContainer.scrollTop = logsContainer.scrollHeight;
}

// ==========================================
// COORDINATE SYNC
// ==========================================
function syncContainerToImage() {
  if (!charImg.naturalWidth) return;
  const r = charImg.getBoundingClientRect();
  imageContainer.style.width  = r.width  + 'px';
  imageContainer.style.height = r.height + 'px';
}

charImg.addEventListener('load', () => requestAnimationFrame(syncContainerToImage));
const _ro = new ResizeObserver(syncContainerToImage);
_ro.observe(workspace);

// ==========================================
// UPLOAD
// ==========================================
imageFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  addLog(`Uploading ${file.name}...`, "info");
  try {
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    if (r.ok) {
      const d = await r.json();
      uploadedImagePath = d.file_path;
      charImg.src = `/api/serve-image?path=${encodeURIComponent(uploadedImagePath)}&t=${Date.now()}`;
      imageContainer.style.display = "block";
      document.getElementById("workspace-placeholder").style.display = "none";
      addLog("Character media uploaded successfully!", "success");
      requestAnimationFrame(() => {
        syncContainerToImage();
        updateMarkers();
        triggerColorAutoSample();
      });
    } else { addLog("Upload failed.", "error"); }
  } catch (err) { addLog(`Upload error: ${err.message}`, "error"); }
});

// ==========================================
// SVG MOUTH PREVIEW
// ==========================================
function renderMouthSVG(style, skin, line, faceAngle = 0) {
  if (style === 'designed') {
    return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="3" y="3" width="94" height="94" rx="12" fill="rgba(139, 92, 246, 0.1)" stroke="var(--accent-primary)" stroke-width="3" stroke-dasharray="6,4"/>
      <path d="M 25 50 C 35 58, 65 58, 75 50 C 65 42, 35 42, 25 50 Z" fill="rgba(255, 255, 255, 0.2)" stroke="var(--text-color)" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M 40 50 Q 50 42 60 50" stroke="var(--text-color)" stroke-width="2" fill="none"/>
      <circle cx="78" cy="22" r="8" fill="var(--accent-secondary)"/>
      <circle cx="76" cy="20" r="1.5" fill="#fff"/>
      <circle cx="80" cy="24" r="1.5" fill="#fff"/>
    </svg>`;
  }
  const absAngle = Math.abs(faceAngle);
  const side = faceAngle >= 0 ? 1 : -1; // +1 = right, -1 = left

  let c = '';
  if (absAngle < 20) {
    // FRONT VIEW
    if (style === 'rounded') {
      c = `<ellipse cx="50" cy="50" rx="47" ry="47" fill="${skin}" stroke="${line}" stroke-width="4"/>
           <ellipse cx="50" cy="50" rx="38" ry="38" fill="#111"/>
           <path d="M16 50 Q50 14 84 50 Z" fill="#fff"/>
           <path d="M26 68 Q50 42 74 68 Q50 88 26 68Z" fill="#f56e7d"/>`;
    } else if (style === 'capsule') {
      c = `<rect x="3" y="3" width="94" height="94" rx="26" fill="${skin}" stroke="${line}" stroke-width="4"/>
           <rect x="11" y="11" width="78" height="78" rx="18" fill="#111"/>
           <rect x="18" y="12" width="64" height="22" fill="#fff"/>
           <rect x="18" y="66" width="64" height="22" fill="#fff"/>`;
    } else if (style === 'flat') {
      c = `<ellipse cx="50" cy="50" rx="47" ry="22" fill="${skin}" stroke="${line}" stroke-width="4"/>
           <ellipse cx="50" cy="50" rx="38" ry="12" fill="#111"/>`;
    } else if (style === 'smile') {
      c = `<ellipse cx="50" cy="50" rx="47" ry="47" fill="${skin}" stroke="${line}" stroke-width="4"/>
           <ellipse cx="50" cy="50" rx="43" ry="43" fill="#fff" stroke="${line}" stroke-width="2"/>
           <line x1="7" y1="50" x2="93" y2="50" stroke="${line}" stroke-width="3"/>
           <line x1="20" y1="24" x2="20" y2="76" stroke="${line}" stroke-width="1.5"/>
           <line x1="35" y1="13" x2="35" y2="87" stroke="${line}" stroke-width="1.5"/>
           <line x1="50" y1="9"  x2="50" y2="91" stroke="${line}" stroke-width="1.5"/>
           <line x1="65" y1="13" x2="65" y2="87" stroke="${line}" stroke-width="1.5"/>
           <line x1="80" y1="24" x2="80" y2="76" stroke="${line}" stroke-width="1.5"/>`;
    } else if (style === 'u-shaped') {
      c = `<path d="M 3 50 A 47 47 0 0 0 97 50 Z" fill="${skin}" stroke="${line}" stroke-width="4"/>
           <path d="M 12 50 A 38 38 0 0 0 88 50 Z" fill="#111"/>
           <rect x="25" y="50" width="50" height="10" fill="#fff"/>
           <path d="M 30 75 Q 50 88 70 75 Z" fill="#f56e7d"/>`;
    }
  } else if (absAngle < 65) {
    // 3/4 VIEW
    const t = (absAngle - 20) / 45;
    const farScale = 1.0 - t * 0.75; // squashes down to 25% width
    const nearScale = 1.0 - t * 0.15; // squashes down to 85% width

    // Shift pivot point horizontally based on facing direction
    const ls = side > 0 ? farScale : nearScale;
    const rs = side > 0 ? nearScale : farScale;
    const px = 50 + side * t * 15; // Smoothly shifts towards the profile edge

    if (style === 'rounded') {
      c = `<path d="M 3 50 A 47 47 0 0 1 97 50 A 47 47 0 0 1 3 50" fill="${skin}"/>
           <path d="M ${px - 45 * ls} 50 A ${45 * ls} 38 0 0 1 ${px + 45 * rs} 50 A ${45 * ls} 38 0 0 1 ${px - 45 * ls} 50" fill="#111" stroke="${line}" stroke-width="4"/>
           <path d="M ${px - 35 * ls} 50 Q ${px} 14 ${px + 35 * rs} 50 Z" fill="#fff"/>
           <path d="M ${px - 25 * ls} 68 Q ${px} 42 ${px + 25 * rs} 68 Q ${px} 88 ${px - 25 * ls} 68Z" fill="#f56e7d"/>`;
    } else if (style === 'capsule') {
      c = `<rect x="3" y="3" width="94" height="94" rx="26" fill="${skin}"/>
           <path d="M ${px - 40 * ls} 11 L ${px + 40 * rs} 11 A 18 18 0 0 1 ${px + 40 * rs} 89 L ${px - 40 * ls} 89 A 18 18 0 0 1 ${px - 40 * ls} 11 Z" fill="#111" stroke="${line}" stroke-width="4"/>
           <rect x="${px - 32 * ls}" y="12" width="${32 * ls + 32 * rs}" height="22" fill="#fff"/>
           <rect x="${px - 32 * ls}" y="66" width="${32 * ls + 32 * rs}" height="22" fill="#fff"/>`;
    } else if (style === 'flat') {
      c = `<ellipse cx="50" cy="50" rx="47" ry="22" fill="${skin}"/>
           <ellipse cx="${px}" cy="50" rx="${38 * (ls + rs) / 2}" ry="12" fill="#111" stroke="${line}" stroke-width="4"/>`;
    } else if (style === 'smile') {
      c = `<ellipse cx="50" cy="50" rx="47" ry="47" fill="${skin}"/>
           <ellipse cx="${px}" cy="50" rx="${43 * (ls + rs) / 2}" ry="43" fill="#fff" stroke="${line}" stroke-width="2"/>
           <line x1="${px - 43 * ls}" y1="50" x2="${px + 43 * rs}" y2="50" stroke="${line}" stroke-width="3"/>`;
      const xs = [20, 35, 50, 65, 80];
      xs.forEach(x => {
        const shiftedX = px + (x - 50) * (x < 50 ? ls : rs);
        const yLen = 50 - Math.abs(x - 50) * 0.6;
        c += `<line x1="${shiftedX}" y1="${50 - yLen}" x2="${shiftedX}" y2="${50 + yLen}" stroke="${line}" stroke-width="1.5"/>`;
      });
    } else if (style === 'u-shaped') {
      c = `<path d="M ${px - 47 * ls} 50 A ${47 * ls} 47 0 0 0 ${px + 47 * rs} 50 Z" fill="${skin}"/>
           <path d="M ${px - 38 * ls} 50 A ${38 * ls} 38 0 0 0 ${px + 38 * rs} 50 Z" fill="#111" stroke="${line}" stroke-width="4"/>
           <rect x="${px - 25 * ls}" y="50" width="${25 * ls + 25 * rs}" height="10" fill="#fff"/>
           <path d="M ${px - 20 * ls} 75 Q ${px} 88 ${px + 20 * rs} 75 Z" fill="#f56e7d"/>`;
    }
  } else {
    // PROFILE VIEW
    const ax = side > 0 ? 15 : 85;   // hinge
    const tip = side > 0 ? 78 : 22;  // tip of lips
    
    if (style === 'flat') {
      c = `<path d="M ${ax} 50 C ${ax + 20 * side} 45, ${ax + 40 * side} 45, ${tip} 50 C ${ax + 40 * side} 55, ${ax + 20 * side} 55, ${ax} 50 Z" fill="${skin}" stroke="${line}" stroke-width="4"/>`;
    } else if (style === 'u-shaped') {
      const lowerY = 65;
      const ctrlX = side > 0 ? 45 : 55;
      c = `<path d="M ${ax} 50 L ${tip} 50 Q ${ctrlX} ${lowerY + 10} ${ax} 50 Z" fill="${skin}" stroke="${line}" stroke-width="4"/>
           <path d="M ${ax + 5 * side} 50 L ${tip - 2 * side} 50 Q ${ctrlX} ${lowerY + 5} ${ax + 5 * side} 50 Z" fill="#111"/>
           <rect x="${side > 0 ? tip - 15 : tip}" y="50" width="15" height="6" fill="#fff"/>
           <ellipse cx="${ax + 25 * side}" cy="60" rx="10" ry="6" fill="#f56e7d"/>`;
    } else if (style === 'capsule') {
      const upperY = 35;
      const lowerY = 65;
      c = `<path d="M ${ax} 50 L ${ax} ${upperY} L ${tip} ${upperY} L ${tip} ${lowerY} L ${ax} ${lowerY} Z" fill="${skin}" stroke="${line}" stroke-width="4"/>
           <path d="M ${ax + 5 * side} 50 L ${ax + 5 * side} ${upperY + 4} L ${tip - 4 * side} ${upperY + 4} L ${tip - 4 * side} ${lowerY - 4} L ${ax + 5 * side} ${lowerY - 4} Z" fill="#111"/>
           <rect x="${side > 0 ? tip - 16 : tip + 1}" y="${upperY + 4}" width="15" height="6" fill="#fff"/>
           <rect x="${side > 0 ? tip - 16 : tip + 1}" y="${lowerY - 10}" width="15" height="6" fill="#fff"/>`;
    } else {
      const upperY = 35;
      const lowerY = 65;
      const ctrlX = side > 0 ? 45 : 55;
      
      c = `<path d="M ${ax} 50 Q ${ctrlX} ${upperY - 10} ${tip} ${upperY} Q ${ctrlX} ${lowerY + 10} ${ax} 50 Z" fill="${skin}" stroke="${line}" stroke-width="4"/>
           <path d="M ${ax + 5 * side} 50 Q ${ctrlX} ${upperY - 5} ${tip - 2 * side} ${upperY + 2} Q ${ctrlX} ${lowerY + 5} ${ax + 5 * side} 50 Z" fill="#111"/>
           <path d="M ${tip - 10 * side} ${upperY + 2} L ${tip - 2 * side} ${upperY + 2} Q ${ctrlX + 5 * side} ${upperY + 10} ${tip - 15 * side} ${upperY + 12} Z" fill="#fff"/>`;
      
      if (style === 'smile') {
        c += `<line x1="${tip - 7 * side}" y1="${upperY + 2}" x2="${tip - 7 * side}" y2="${upperY + 7}" stroke="${line}" stroke-width="1.2"/>
              <line x1="${tip - 4 * side}" y1="${upperY + 2}" x2="${tip - 4 * side}" y2="${upperY + 5}" stroke="${line}" stroke-width="1.2"/>`;
      }
      
      c += `<ellipse cx="${ax + 25 * side}" cy="60" rx="10" ry="6" fill="#f56e7d"/>`;
    }
  }
  return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">${c}</svg>`;
}

// ==========================================
// RESIZE HANDLES
// ==========================================
function buildHandles(n = 36) {
  let html = '';
  for (let i = 0; i < n; i++) {
    const t = i / n;        // 0..1 around the perimeter
    let cssLeft, cssTop, ex, ey, cursor;

    if (t < 0.25) {                         // TOP edge  left->right
      const s = t / 0.25;
      cssLeft = `${(s * 100).toFixed(1)}%`; cssTop = '-1px';
      ex = s < 0.12 ? -1 : s > 0.88 ? 1 : 0;
      ey = -1;
      cursor = s < 0.12 ? 'nwse-resize' : s > 0.88 ? 'nesw-resize' : 'n-resize';

    } else if (t < 0.5) {                   // RIGHT edge  top->bottom
      const s = (t - 0.25) / 0.25;
      cssLeft = 'calc(100% + 1px)'; cssTop = `${(s * 100).toFixed(1)}%`;
      ex = 1;
      ey = s < 0.12 ? -1 : s > 0.88 ? 1 : 0;
      cursor = s < 0.12 ? 'nesw-resize' : s > 0.88 ? 'nwse-resize' : 'e-resize';

    } else if (t < 0.75) {                  // BOTTOM edge  right->left
      const s = (t - 0.5) / 0.25;
      cssLeft = `${((1 - s) * 100).toFixed(1)}%`; cssTop = 'calc(100% + 1px)';
      ex = s < 0.12 ? 1 : s > 0.88 ? -1 : 0;
      ey = 1;
      cursor = s < 0.12 ? 'nwse-resize' : s > 0.88 ? 'nesw-resize' : 's-resize';

    } else {                                 // LEFT edge  bottom->top
      const s = (t - 0.75) / 0.25;
      cssLeft = '-1px'; cssTop = `${((1 - s) * 100).toFixed(1)}%`;
      ex = -1;
      ey = s < 0.12 ? 1 : s > 0.88 ? -1 : 0;
      cursor = s < 0.12 ? 'nesw-resize' : s > 0.88 ? 'nwse-resize' : 'w-resize';
    }

    html += `<div class="resize-handle"
                  style="left:${cssLeft};top:${cssTop};cursor:${cursor};"
                  data-ex="${ex}" data-ey="${ey}"></div>`;
  }
  return html;
}

// ==========================================
// DRAG / RESIZE / PIPETTE STATE
// ==========================================
let isDragging  = false, dragChar   = null;
let isResizing  = false, resizeChar = null;
let resizeEX = 0, resizeEY = 0;
let initState   = {};
let isPickingColor  = null;
let mouseOverMarker = false;

/* Popup drag state */
let popupDragging = false, popupDX = 0, popupDY = 0, popupL0 = 0, popupT0 = 0;

// ==========================================
// FAST TRANSFORM UPDATE
// ==========================================
function quickTransformUpdate(charNum) {
  const cfg = configs[charNum];
  const marker = document.getElementById(`marker-char${charNum}`);
  if (!marker) return;
  const side = cfg.face_angle >= 0 ? 1 : -1;
  const tx = `translate(-50%,-50%) scaleX(${cfg.perspective}) rotate(${cfg.rotation * side}deg)`;
  marker.style.transform = tx;
  if (ghost) ghost.style.transform = tx;
}

// ==========================================
// FULL MARKER REBUILD
// ==========================================
function updateMarkers() {
  if (!uploadedImagePath) return;
  const handles = buildHandles(36);

  Object.keys(configs).forEach(cKey => {
    const c = parseInt(cKey);
    const cfg = configs[c];
    let marker = document.getElementById(`marker-char${c}`);
    
    if (!cfg.enabled) {
      if (marker) marker.style.display = 'none';
      return;
    }

    if (!marker) {
      marker = document.createElement("div");
      marker.id = `marker-char${c}`;
      marker.className = `mouth-marker char${c}`;
      markerOverlay.appendChild(marker);
    }

    marker.style.left      = `${cfg.x}%`;
    marker.style.top       = `${cfg.y}%`;
    marker.style.width     = `${cfg.width}%`;
    marker.style.height    = `${cfg.height}%`;
    marker.style.display   = 'flex';
    const side             = cfg.face_angle >= 0 ? 1 : -1;
    marker.style.transform = `translate(-50%,-50%) scaleX(${cfg.perspective}) rotate(${cfg.rotation * side}deg)`;
    marker.classList.toggle('active-marker', activeChar === c);
    marker.innerHTML = `
      <div class="mouth-marker-wrapper">
        <div class="mouth-marker-label">Char ${c}</div>
        <div class="mouth-marker-svg-container">
          ${renderMouthSVG(cfg.style, cfg.skin_color, cfg.line_color, cfg.face_angle)}
        </div>
        ${activeChar === c ? handles : ''}
      </div>`;
  });

  updateGhostStyle();
}

function updateGhostStyle() {
  if (!ghost) return;
  // Only show ghost if we have an active enabled character that is not yet placed
  if (!activeChar || !configs[activeChar]?.enabled || configs[activeChar]?.placed) {
    ghost.style.display = 'none';
    return;
  }
  const cfg = configs[activeChar];
  ghost.style.width     = `${cfg.width}%`;
  ghost.style.height    = `${cfg.height}%`;
  const side            = cfg.face_angle >= 0 ? 1 : -1;
  ghost.style.transform = `translate(-50%,-50%) scaleX(${cfg.perspective}) rotate(${cfg.rotation * side}deg)`;
  ghost.className = `mouth-ghost-cursor char${activeChar}-ghost`;
  ghost.innerHTML = `
    <div class="mouth-ghost-wrapper">
      <div class="mouth-marker-label">Click to place - Char ${activeChar}</div>
      <div class="mouth-marker-svg-container">
        ${renderMouthSVG(cfg.style, cfg.skin_color, cfg.line_color, cfg.face_angle)}
      </div>
    </div>`;
}

// ==========================================
// EYEDROPPER
// ==========================================
function startColorPicker(type) {
  if (!uploadedImagePath) { addLog("Upload an image first.", "warning"); return; }
  isPickingColor = type;
  document.getElementById("pipette-skin").classList.toggle("active-picker", type === 'skin');
  document.getElementById("pipette-outline").classList.toggle("active-picker", type === 'outline');
  markerOverlay.classList.add("eyedropper-active");
  addLog(`Eyedropper: click image to sample ${type} color...`, "info");
}

function stopColorPicker() {
  isPickingColor = null;
  document.getElementById("pipette-skin").classList.remove("active-picker");
  document.getElementById("pipette-outline").classList.remove("active-picker");
  markerOverlay.classList.remove("eyedropper-active");
}

function sampleColorAt(e) {
  const rect = charImg.getBoundingClientRect();
  const px = Math.floor(((e.clientX - rect.left) / rect.width)  * charImg.naturalWidth);
  const py = Math.floor(((e.clientY - rect.top)  / rect.height) * charImg.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = charImg.naturalWidth; canvas.height = charImg.naturalHeight;
  const ctx = canvas.getContext("2d");
  try {
    ctx.drawImage(charImg, 0, 0);
    const [r, g, b] = ctx.getImageData(px, py, 1, 1).data;
    const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    if (isPickingColor === 'skin') {
      configs[activeChar].skin_color = hex;
      document.getElementById("color-skin").value = hex;
      document.getElementById("skin-hex").innerText = hex.toUpperCase();
      document.getElementById("popup-color-skin").value = hex;
    } else {
      configs[activeChar].line_color = hex;
      document.getElementById("color-outline").value = hex;
      document.getElementById("outline-hex").innerText = hex.toUpperCase();
      document.getElementById("popup-color-outline").value = hex;
    }
    addLog(`Sampled ${isPickingColor}: ${hex.toUpperCase()}`, "success");
  } catch (err) { addLog(`Eyedropper error: ${err.message}`, "error"); }
  stopColorPicker();
  updateMarkers();
}

// ==========================================
// MARKER OVERLAY EVENTS
// ==========================================
markerOverlay.addEventListener("mousedown", (e) => {
  if (!uploadedImagePath) return;
  if (isPickingColor) { sampleColorAt(e); return; }

  // Resize handle?
  const handle = e.target.closest(".resize-handle");
  if (handle) {
    e.stopPropagation(); e.preventDefault();
    const marker = handle.closest(".mouth-marker");
    const cNum = parseInt(marker.id.replace("marker-char", ""));
    selectCharacterTab(cNum);
    isResizing  = true;
    resizeChar  = cNum;
    resizeEX    = parseInt(handle.dataset.ex);  // -1, 0, or +1
    resizeEY    = parseInt(handle.dataset.ey);
    const cfg   = configs[cNum];
    initState   = {
      x: cfg.x, y: cfg.y,
      width: cfg.width, height: cfg.height,
      overlayRect: markerOverlay.getBoundingClientRect(),
      clientX: e.clientX, clientY: e.clientY
    };
    return;
  }

  // Marker wrapper (drag)?
  const wrapper = e.target.closest(".mouth-marker-wrapper");
  if (wrapper) {
    e.stopPropagation(); e.preventDefault();
    const marker = wrapper.closest(".mouth-marker");
    const cNum = parseInt(marker.id.replace("marker-char", ""));
    selectCharacterTab(cNum);
    isDragging = true; dragChar = cNum;
    initState = { 
      overlayRect: markerOverlay.getBoundingClientRect(),
      startX: e.clientX,
      startY: e.clientY,
      started: false
    };
    showPopupNearMarker(cNum);
    return;
  }

  // Click on overlay background -> place active marker (only if not placed yet)
  if (activeChar && configs[activeChar]?.enabled && !configs[activeChar]?.placed) {
    const rect = markerOverlay.getBoundingClientRect();
    configs[activeChar].x = parseFloat(((e.clientX - rect.left) / rect.width  * 100).toFixed(2));
    configs[activeChar].y = parseFloat(((e.clientY - rect.top)  / rect.height * 100).toFixed(2));
    configs[activeChar].placed = true;
    addLog(`Char ${activeChar} mouth placed -> (${configs[activeChar].x}%, ${configs[activeChar].y}%)`, "success");
    updateMarkers();
    showPopupNearMarker(activeChar);
    triggerColorAutoSample();
  }
});

/* Hide ghost when hovering over any marker */
markerOverlay.addEventListener("mouseover", (e) => {
  if (e.target.closest(".mouth-marker")) {
    mouseOverMarker = true;
    if (ghost) ghost.style.display = "none";
  }
});
markerOverlay.addEventListener("mouseout", (e) => {
  if (e.target.closest(".mouth-marker") && !e.relatedTarget?.closest(".mouth-marker"))
    mouseOverMarker = false;
});

/* Ghost cursor movement */
workspace.addEventListener("mousemove", (e) => {
  if (!uploadedImagePath || isDragging || isResizing || isPickingColor || mouseOverMarker) {
    if (ghost) ghost.style.display = "none";
    return;
  }
  const rect = markerOverlay.getBoundingClientRect();
  ghost.style.left = `${((e.clientX - rect.left) / rect.width  * 100)}%`;
  ghost.style.top  = `${((e.clientY - rect.top)  / rect.height * 100)}%`;
  ghost.style.display = "block";
  updateGhostStyle();
});

workspace.addEventListener("mouseleave", () => {
  if (ghost) ghost.style.display = "none";
  mouseOverMarker = false;
});

// ==========================================
// GLOBAL MOUSEMOVE - drag, resize, popup drag
// ==========================================
window.addEventListener("mousemove", (e) => {

  /* Popup drag */
  if (popupDragging) {
    popup.style.left = Math.max(0, popupL0 + e.clientX - popupDX) + 'px';
    popup.style.top  = Math.max(0, popupT0 + e.clientY - popupDY) + 'px';
    return;
  }

  /* Marker drag with 5px threshold */
  if (isDragging && dragChar !== null) {
    const dx = e.clientX - initState.startX;
    const dy = e.clientY - initState.startY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (!initState.started && dist < 5) {
      return; 
    }
    initState.started = true;

    const rect = initState.overlayRect;
    configs[dragChar].x = parseFloat(Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width  * 100)).toFixed(2));
    configs[dragChar].y = parseFloat(Math.max(0, Math.min(100, (e.clientY - rect.top)  / rect.height * 100)).toFixed(2));
    const m = document.getElementById(`marker-char${dragChar}`);
    if (m) {
      m.style.left = `${configs[dragChar].x}%`;
      m.style.top  = `${configs[dragChar].y}%`;
    }
    repositionPopup(dragChar);
    return;
  }

  /* Resize */
  if (isResizing && resizeChar !== null) {
    const rect   = initState.overlayRect;
    const dx = (e.clientX - initState.clientX) / rect.width  * 100;
    const dy = (e.clientY - initState.clientY) / rect.height * 100;
    const cfg = configs[resizeChar];

    let newW = initState.width, newH = initState.height;
    let newX = initState.x,     newY = initState.y;

    if (resizeEX === 1) {
      newW = Math.max(2, initState.width  + dx);
      newX = initState.x + (newW - initState.width) / 2;
    } else if (resizeEX === -1) {
      newW = Math.max(2, initState.width  - dx);
      newX = initState.x - (newW - initState.width) / 2;
    }

    if (resizeEY === 1) {
      newH = Math.max(1, initState.height + dy);
      newY = initState.y + (newH - initState.height) / 2;
    } else if (resizeEY === -1) {
      newH = Math.max(1, initState.height - dy);
      newY = initState.y - (newH - initState.height) / 2;
    }

    cfg.width  = parseFloat(newW.toFixed(2));
    cfg.height = parseFloat(newH.toFixed(2));
    cfg.x      = parseFloat(newX.toFixed(2));
    cfg.y      = parseFloat(newY.toFixed(2));

    const m = document.getElementById(`marker-char${resizeChar}`);
    if (m) {
      m.style.left   = `${cfg.x}%`;
      m.style.top    = `${cfg.y}%`;
      m.style.width  = `${cfg.width}%`;
      m.style.height = `${cfg.height}%`;
    }
    repositionPopup(resizeChar);

    if (resizeChar === activeChar) {
      document.getElementById("mouth-width").value         = Math.round(cfg.width);
      document.getElementById("mouth-width-val").innerText = `${Math.round(cfg.width)}%`;
      document.getElementById("mouth-height").value        = Math.round(cfg.height);
      document.getElementById("mouth-height-val").innerText= `${Math.round(cfg.height)}%`;
    }
  }
});

window.addEventListener("mouseup", () => {
  popupDragging = false;
  if (isDragging) {
    isDragging = false;
    if (initState.started) {
      addLog(`Char ${dragChar} moved -> (${configs[dragChar].x}%, ${configs[dragChar].y}%)`, "success");
    }
    dragChar = null;
    triggerColorAutoSample();
    updateMarkers(); 
  }
  if (isResizing) {
    isResizing = false;
    resizeChar = null;
    triggerColorAutoSample();
    updateMarkers(); 
  }
});

// ==========================================
// DRAGGABLE POPUP
// ==========================================
const popupHeader = document.getElementById("popup-drag-handle");
popupHeader.addEventListener("mousedown", (e) => {
  popupDragging = true;
  popupDX = e.clientX;
  popupDY = e.clientY;
  popupL0 = parseInt(popup.style.left) || 0;
  popupT0 = parseInt(popup.style.top)  || 0;
  e.stopPropagation();
  e.preventDefault();
});

// ==========================================
// FLOATING POPUP - show / reposition / close
// ==========================================
function showPopupNearMarker(charNum) {
  const cfg  = configs[charNum];
  const rect = markerOverlay.getBoundingClientRect();
  const popW = 244, popH = 320; 

  let left = rect.left + (cfg.x / 100 + cfg.width / 200) * rect.width  + 18;
  let top  = rect.top  + (cfg.y / 100) * rect.height - popH / 2;
  if (left + popW > window.innerWidth  - 8) left = rect.left + (cfg.x / 100 - cfg.width / 200) * rect.width - popW - 18;
  left = Math.max(4, left);
  top  = Math.max(4, Math.min(window.innerHeight - popH - 4, top));

  popup.style.left    = `${left}px`;
  popup.style.top     = `${top}px`;
  popup.style.display = 'flex';
  popup.className     = `mouth-popup${charNum === 2 ? ' char2-popup' : ''}`;

  document.getElementById("popup-char-label").textContent = `Char ${charNum} - Mouth Controls`;

  const cfg2 = configs[charNum];
  document.getElementById("popup-rotation").value          = cfg2.rotation;
  document.getElementById("popup-rotation-val").innerText  = `${cfg2.rotation}\u00b0`;
  document.getElementById("popup-perspective").value       = cfg2.perspective;
  document.getElementById("popup-perspective-val").innerText = cfg2.perspective.toFixed(2);
  
  const faceAngle = cfg2.face_angle || 0;
  document.getElementById("popup-face-angle").value        = faceAngle;
  document.getElementById("popup-face-angle-val").innerText = `${faceAngle}\u00b0`;
  document.querySelectorAll('.angle-preset-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.angle) === faceAngle);
  });

  document.getElementById("popup-color-skin").value        = cfg2.skin_color;
  document.getElementById("popup-color-outline").value     = cfg2.line_color;
}

function repositionPopup(charNum) {
  if (popup.style.display !== 'flex') return;
  if (popupDragging) return;
}

function closeMouthPopup() {
  popup.style.display = 'none';
}

// ==========================================
// POPUP CONTROLS
// ==========================================
function updatePopupRotation() {
  const v = parseFloat(document.getElementById("popup-rotation").value);
  configs[activeChar].rotation = v;
  document.getElementById("popup-rotation-val").innerText = `${v}\u00b0`;
  document.getElementById("mouth-rotation").value          = v;
  document.getElementById("mouth-rotation-val").innerText  = `${v}\u00b0`;
  quickTransformUpdate(activeChar);   
}

function updatePopupPerspective() {
  const v = parseFloat(document.getElementById("popup-perspective").value);
  configs[activeChar].perspective = v;
  document.getElementById("popup-perspective-val").innerText  = v.toFixed(2);
  document.getElementById("mouth-perspective").value          = v;
  document.getElementById("mouth-perspective-val").innerText  = v.toFixed(1);
  quickTransformUpdate(activeChar);   
}

function setFaceAngle(val) {
  if (activeChar === null) return;
  configs[activeChar].face_angle = val;
  document.getElementById('popup-face-angle').value = val;
  document.getElementById('popup-face-angle-val').innerText = `${val}\u00b0`;
  
  document.querySelectorAll('.angle-preset-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.angle) === val);
  });
  
  updateMarkers(); 
}

function updateFaceAngle() {
  const val = parseInt(document.getElementById('popup-face-angle').value);
  if (activeChar === null) return;
  configs[activeChar].face_angle = val;
  document.getElementById('popup-face-angle-val').innerText = `${val}\u00b0`;
  
  document.querySelectorAll('.angle-preset-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.angle) === val);
  });
  
  updateMarkers(); 
}

function updatePopupColors() {
  const skin = document.getElementById("popup-color-skin").value;
  const lip  = document.getElementById("popup-color-outline").value;
  configs[activeChar].skin_color = skin;
  configs[activeChar].line_color = lip;
  document.getElementById("color-skin").value        = skin;
  document.getElementById("color-outline").value     = lip;
  document.getElementById("skin-hex").innerText      = skin.toUpperCase();
  document.getElementById("outline-hex").innerText   = lip.toUpperCase();
  updateMarkers();  
}

// ==========================================
// ADD / REMOVE CHARACTER
// ==========================================
function addCharacter(n) {
  configs[n].enabled = true;
  configs[n].placed = false;
  activeChar = n;
  renderCharTabs();
  syncCharSettingsPanel(n);
  updateMarkers();
  if (uploadedImagePath) {
    addLog(`Character ${n} added. Click on the image to place the mouth.`, "info");
    showPopupNearMarker(n);
  } else {
    addLog(`Character ${n} added. Upload an image to start placing the mouth.`, "info");
  }
}

function removeCharacter(n) {
  configs[n].enabled = false;
  configs[n].placed = false;
  configs[n].x = n === 1 ? 50 : 60;
  configs[n].y = n === 1 ? 40 : 50;
  configs[n].rotation = 0;
  configs[n].perspective = 1.0;
  configs[n].face_angle = 0;

  if (activeChar === n) {
    const keys = Object.keys(configs).map(Number).filter(k => configs[k].enabled);
    activeChar = keys.length > 0 ? keys[0] : null;
  }

  // Cleanup dynamic DOM element
  const marker = document.getElementById(`marker-char${n}`);
  if (marker) marker.remove();

  closeMouthPopup();
  renderCharTabs();
  updateMarkers();
  addLog(`Character ${n} removed.`, "info");
}

/* Re-render the character tab bar based on enabled state */
function renderCharTabs() {
  const bar = document.getElementById("char-tab-bar");
  bar.innerHTML = '';

  const keys = Object.keys(configs).map(Number).sort((a,b)=>a-b);

  keys.forEach(n => {
    const cfg = configs[n];
    const dot = n === 1 ? 'dot1' : n === 2 ? 'dot2' : 'dot3';
    const accentClass = n % 2 === 0 ? 'char2-add-btn' : '';

    if (!cfg.enabled) {
      const btn = document.createElement('button');
      btn.className = `add-char-btn ${accentClass}`;
      btn.innerHTML = `<span style="font-size:1.1rem;line-height:1;">+</span> Add Character ${n}`;
      btn.onclick = () => addCharacter(n);
      bar.appendChild(btn);
    } else {
      const tab = document.createElement('div');
      tab.className = `char-tab${activeChar === n ? ' active-tab' : ''}`;
      if (n === 2) tab.classList.add('char2-tab');
      if (n > 2) tab.classList.add('char-other-tab');
      tab.innerHTML = `
        <span class="tab-dot ${dot}"></span>
        <span onclick="selectCharacterTab(${n})" style="flex:1;cursor:pointer;">Character ${n}</span>
        <button class="char-tab-remove" onclick="removeCharacter(${n})" title="Remove Character ${n}">x</button>`;
      bar.appendChild(tab);
    }
  });

  const allEnabled = keys.every(n => configs[n].enabled);
  if (allEnabled) {
    const nextN = keys.length + 1;
    configs[nextN] = createDefaultConfig(nextN);
    renderCharTabs();
    return;
  }

  const hasActive = activeChar && configs[activeChar]?.enabled;
  document.getElementById("char-settings-panel").style.display = hasActive ? 'flex' : 'none';
  document.getElementById("char-settings-empty").style.display = hasActive ? 'none' : 'flex';
}

// ==========================================
// CHARACTER TAB SELECT
// ==========================================
function selectCharacterTab(n) {
  if (!configs[n].enabled) return;  
  activeChar = n;
  renderCharTabs();
  syncCharSettingsPanel(n);
  updateMarkers();
  if (popup.style.display === 'flex') {
    showPopupNearMarker(n);
  }
}

function syncCharSettingsPanel(n) {
  const cfg = configs[n];
  document.getElementById("color-skin").value         = cfg.skin_color;
  document.getElementById("skin-hex").innerText       = cfg.skin_color.toUpperCase();
  document.getElementById("color-outline").value      = cfg.line_color;
  document.getElementById("outline-hex").innerText    = cfg.line_color.toUpperCase();
  document.getElementById("mouth-width").value        = cfg.width;
  document.getElementById("mouth-width-val").innerText  = `${cfg.width}%`;
  document.getElementById("mouth-height").value       = cfg.height;
  document.getElementById("mouth-height-val").innerText = `${cfg.height}%`;
  document.getElementById("mouth-rotation").value     = cfg.rotation;
  document.getElementById("mouth-rotation-val").innerText = `${cfg.rotation}\u00b0`;
  document.getElementById("mouth-perspective").value  = cfg.perspective;
  document.getElementById("mouth-perspective-val").innerText = cfg.perspective.toFixed(1);
  selectPresetCard(cfg.style);
}

// ==========================================
// PRESETS
// ==========================================
function selectPreset(name) {
  configs[activeChar].style = name;
  selectPresetCard(name);
  updateMarkers();
}

function selectPresetCard(name) {
  document.querySelectorAll("#presets-container .preset-card").forEach(c => c.classList.remove("active"));
  const el = document.getElementById(`preset-${name}`);
  if (el) el.classList.add("active");
}

// ==========================================
// SIDEBAR COLOR / SLIDER UPDATES
// ==========================================
function updateColors() {
  configs[activeChar].skin_color = document.getElementById("color-skin").value;
  configs[activeChar].line_color = document.getElementById("color-outline").value;
  document.getElementById("skin-hex").innerText    = configs[activeChar].skin_color.toUpperCase();
  document.getElementById("outline-hex").innerText = configs[activeChar].line_color.toUpperCase();
  document.getElementById("popup-color-skin").value    = configs[activeChar].skin_color;
  document.getElementById("popup-color-outline").value = configs[activeChar].line_color;
  updateMarkers();
}

function updateSliderVal(id) {
  const v = document.getElementById(id).value;
  if (id === "mouth-width") {
    configs[activeChar].width = parseFloat(v);
    document.getElementById("mouth-width-val").innerText = `${v}%`;
    updateMarkers();
  }
  if (id === "mouth-height") {
    configs[activeChar].height = parseFloat(v);
    document.getElementById("mouth-height-val").innerText = `${v}%`;
    updateMarkers();
  }
  if (id === "mouth-rotation") {
    configs[activeChar].rotation = parseFloat(v);
    document.getElementById("mouth-rotation-val").innerText = `${v}\u00b0`;
    document.getElementById("popup-rotation").value = v;
    document.getElementById("popup-rotation-val").innerText = `${v}\u00b0`;
    quickTransformUpdate(activeChar); 
  }
  if (id === "mouth-perspective") {
    configs[activeChar].perspective = parseFloat(v);
    document.getElementById("mouth-perspective-val").innerText = parseFloat(v).toFixed(1);
    document.getElementById("popup-perspective").value = v;
    document.getElementById("popup-perspective-val").innerText = parseFloat(v).toFixed(2);
    quickTransformUpdate(activeChar); 
  }
}

// ==========================================
// AUTO COLOR SAMPLE
// ==========================================
async function triggerColorAutoSample() {
  if (!uploadedImagePath || activeChar === null) return;
  const cfg = configs[activeChar];
  if (!cfg || !cfg.enabled) return;
  try {
    const r = await fetch("/api/character/sample-color", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_path: uploadedImagePath, mouth_x: cfg.x, mouth_y: cfg.y, mouth_width: cfg.width, mouth_height: cfg.height })
    });
    if (r.ok) {
      const d = await r.json();
      cfg.skin_color = d.skin_color; cfg.line_color = d.line_color;
      document.getElementById("color-skin").value         = cfg.skin_color;
      document.getElementById("skin-hex").innerText       = cfg.skin_color.toUpperCase();
      document.getElementById("color-outline").value      = cfg.line_color;
      document.getElementById("outline-hex").innerText    = cfg.line_color.toUpperCase();
      document.getElementById("popup-color-skin").value   = cfg.skin_color;
      document.getElementById("popup-color-outline").value= cfg.line_color;
      addLog(`Colors sampled -> Skin: ${d.skin_color}  Lip: ${d.line_color}`, "success");
      updateMarkers();
    }
  } catch (err) { addLog(`Color sample error: ${err.message}`, "warning"); }
}

// ==========================================
// SCRIPT TEMPLATES
// ==========================================
function loadSampleScript(t) {
  document.getElementById("script-input").value = t === 1
    ? "[Character 1] Hello! How is the lip-syncing test going? [Character 2] It works perfectly. Look how dynamically my mouth moves! [Character 1] That is amazing!"
    : "[Character 1] Welcome to the standalone demonstration. I am speaking a monologue using the procedural vector drawing mouth shapes generator. Everything is dynamically created on the fly!";
}

// ==========================================
// GENERATION
// ==========================================
async function startGeneration() {
  if (!uploadedImagePath) { addLog("Upload a character image first.", "error"); return; }
  const script = document.getElementById("script-input").value.trim();
  if (!script) { addLog("Write a script first.", "error"); return; }

  const enabledChars = Object.keys(configs).map(Number).filter(n => configs[n].enabled);
  if (enabledChars.length === 0) {
    addLog("Add at least one character mouth before generating.", "error");
    return;
  }

  generateBtn.disabled = true;
  generateBtn.innerText = "Generating...";
  outputVideo.style.display = "none";
  videoPlaceholder.style.display = "flex";
  const safeMode = document.getElementById("safe-mode-checkbox")?.checked || false;
  addLog("Starting lip-sync pipeline...", "info");

  // ── If uploaded file is a video AND we have annotation tracking data, use full pipeline ────
  // The user ran tracking in the Annotation Lab for this same video → use that per-frame data.
  const isVideoUpload = /\.(mp4|avi|mov|mkv|webm)$/i.test(uploadedImagePath) ||
    (uploadedImagePath.length > 0 && !/\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i.test(uploadedImagePath));
  const hasAnnoData   = isVideoUpload && videoAnnotations
    && Array.isArray(videoAnnotations.frames) && videoAnnotations.frames.length > 0;

  if (isVideoUpload && !hasAnnoData) {
    // Try auto-loading saved dataset by character name / session
    const charName  = document.getElementById("dataset-char-name")?.value.trim();
    const sessionId = document.getElementById("dataset-session-id")?.value.trim();
    if (charName && sessionId) {
      addLog(`Auto-loading saved dataset for ${charName}/${sessionId}...`, "info");
      try {
        const lr = await fetch(`/api/dataset/load?character_name=${encodeURIComponent(charName)}&session_id=${encodeURIComponent(sessionId)}`);
        if (lr.ok) { videoAnnotations = (await lr.json()).annotations; }
      } catch (_) {}
    }
  }

  const useAnnotationPath = isVideoUpload && videoAnnotations
    && Array.isArray(videoAnnotations.frames) && videoAnnotations.frames.length > 0;
  if (useAnnotationPath) {
    addLog("Using per-frame 20-point tracked data for this video — mouth will follow the face!", "info");
  }

  const renderAll = document.getElementById("render-all-smoothing-chk")?.checked || false;

  try {
    const r = await fetch("/api/generate/lip-sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script,
        image_path: uploadedImagePath,
        chars: enabledChars.map(n => configs[n]),
        char_names: enabledChars.map(n => `Character ${n}`),
        safe_mode: safeMode,
        render_all_smoothing: renderAll,
        smoothing_level: activeSmoothingLevel,
        ...(useAnnotationPath ? {
          video_path:  uploadedImagePath,
          annotations: videoAnnotations
        } : {})
      })
    });
    if (r.ok) {
      const d = await r.json();
      
      if (d.videos) {
        smoothingLevelsUrls = d.videos;
        document.getElementById("smoothing-selector-container").style.display = "flex";
        selectSmoothing(activeSmoothingLevel);
      } else {
        document.getElementById("smoothing-selector-container").style.display = "none";
        outputVideo.src = `${d.video_url}?t=${Date.now()}`;
        outputVideo.style.display = "block";
        videoPlaceholder.style.display = "none";
        outputVideo.play();
      }
      
      addLog("Generation complete!", "success");
    } else {
      const err = await r.json();
      addLog(`Failed: ${err.detail || "unknown"}`, "error");
    }
  } catch (err) { addLog(`Render error: ${err.message}`, "error"); }
  finally {
    generateBtn.disabled = false;
    generateBtn.innerText = "Generate Lip-Sync Animation";
  }
}

closeMouthPopup();
renderCharTabs();
addLog("Lip-Sync Lab ready. Upload an image or video, then add character mouths.", "info");

// ==========================================
// VIDEO ANNOTATION MODE STATE
// ==========================================
let currentMode = 'static';
let uploadedVideoPath = "";
let videoAnnotations = null;         // DEPRECATED: kept for single-char compat
let multiCharAnnotations = {};       // { "1": {fps, frame_count, frames:[...]}, "2": ... }
let activeAnnoChar = "1";            // currently displayed character in annotation lab
let currentFrameIndex = 0;
let activeLandmarkName = null;
let visibleLandmarks = {};
let activeSmoothingLevel = 3;
let smoothingLevelsUrls = {};

// ── Convenience getter: current character's annotation object ────────────────
function currentCharAnn() {
  return multiCharAnnotations[activeAnnoChar] || null;
}

const LANDMARK_NAMES_LIST = [
  "forehead_top", "temple_left", "temple_right", "eyebrow_left", "eyebrow_right",
  "eye_left", "eye_right", "ear_left", "ear_right", "nose_tip",
  "cheek_left", "cheek_right",
  "mouth_lip_0", "mouth_lip_1", "mouth_lip_2", "mouth_lip_3", "mouth_lip_4", "mouth_lip_5",
  "mouth_lip_6", "mouth_lip_7", "mouth_lip_8", "mouth_lip_9", "mouth_lip_10", "mouth_lip_11",
  "jaw_left", "jaw_center", "jaw_right",
  "neck_base", "shoulder_left", "shoulder_right", "chest_center"
];

let mouthDensityMode = 6;
const hiddenIn6PointMode = [
  "mouth_lip_1", "mouth_lip_3", "mouth_lip_5", "mouth_lip_7", "mouth_lip_9", "mouth_lip_11"
];

function shouldShowLandmarkInUI(name) {
  if (mouthDensityMode === 6 && hiddenIn6PointMode.includes(name)) {
    return false;
  }
  return true;
}

LANDMARK_NAMES_LIST.forEach(name => {
  visibleLandmarks[name] = true;
});

function isHeuristicPoint(name) {
  return ["forehead_top", "temple_left", "temple_right", "ear_left", "ear_right", "neck_base", "shoulder_left", "shoulder_right", "chest_center"].includes(name);
}

function addAnnoLog(msg, type = "info") {
  const container = document.getElementById("anno-logs-container");
  if (!container) return;
  const e = document.createElement("div");
  e.className = `log-entry ${type}`;
  e.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  container.appendChild(e);
  container.scrollTop = container.scrollHeight;
}

function switchMode(mode) {
  currentMode = mode;
  document.getElementById("mode-static").classList.toggle("active", mode === 'static');
  document.getElementById("mode-annotation").classList.toggle("active", mode === 'annotation');
  
  document.getElementById("static-lab-container").style.display = mode === 'static' ? 'flex' : 'none';
  document.getElementById("annotation-lab-container").style.display = mode === 'annotation' ? 'flex' : 'none';
  
  if (mode === 'annotation') {
    closeMouthPopup();
    renderAnnoCharTabs();
    renderSidebarPoints();
  } else {
    updateMarkers();
  }
}

// ── Character tab row in Annotation Lab sidebar ──────────────────────────────
function renderAnnoCharTabs() {
  const container = document.getElementById("anno-char-tabs");
  if (!container) return;
  const enabledNs = Object.keys(configs).map(Number).filter(n => configs[n].enabled);
  
  // Update editing character subtitle
  const subtitleEl = document.getElementById("anno-editing-char-subtitle");
  if (subtitleEl) {
    subtitleEl.textContent = `Editing: Character ${activeAnnoChar}`;
  }
  
  if (enabledNs.length <= 1) {
    container.style.display = "none";
    if (enabledNs.length === 1) activeAnnoChar = String(enabledNs[0]);
    if (subtitleEl) {
      subtitleEl.textContent = `Editing: Character ${activeAnnoChar}`;
    }
    return;
  }
  container.style.display = "flex";
  container.innerHTML = "";
  enabledNs.forEach(n => {
    const charId = String(n);
    const btn = document.createElement("button");
    btn.className = "anno-char-tab-btn" + (charId === activeAnnoChar ? " active" : "");
    btn.id = `anno-char-tab-${charId}`;
    btn.textContent = `Char ${charId}`;
    btn.onclick = () => {
      activeAnnoChar = charId;
      videoAnnotations = multiCharAnnotations[activeAnnoChar] || null;
      renderAnnoCharTabs();
      renderSidebarPoints();
      renderLandmarks();
      renderTimelineFrameStrip();
      updateTimelineUI();
    };
    container.appendChild(btn);
  });
}

// Video Loading Trigger
document.getElementById("load-video-btn").addEventListener("click", () => {
  document.getElementById("video-file-input").click();
});

document.getElementById("video-file-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  addAnnoLog(`Uploading video ${file.name}...`, "info");
  
  try {
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    if (r.ok) {
      const d = await r.json();
      uploadedVideoPath = d.file_path;
      addAnnoLog("Video uploaded successfully!", "success");
      document.getElementById("run-tracking-btn").removeAttribute("disabled");
      document.getElementById("anno-placeholder").style.display = "none";
      document.getElementById("anno-viewport").style.display = "block";
      loadVideoFrame(0);
    } else {
      addAnnoLog("Video upload failed.", "error");
    }
  } catch (err) {
    addAnnoLog(`Video upload error: ${err.message}`, "error");
  }
});

// Folder Frame Sequence Loading Trigger
document.getElementById("load-folder-btn").addEventListener("click", () => {
  document.getElementById("folder-file-input").click();
});

document.getElementById("folder-file-input").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  const validExts = /\.(png|jpg|jpeg|bmp|webp)$/i;
  const imageFiles = files.filter(f => validExts.test(f.name));
  if (!imageFiles.length) {
    addAnnoLog("No valid image files found in folder (png/jpg/jpeg/bmp/webp).", "error");
    return;
  }
  addAnnoLog(`Uploading ${imageFiles.length} frames from folder...`, "info");
  
  const fd = new FormData();
  for (const img of imageFiles) {
    fd.append("files", img);
  }
  
  try {
    const r = await fetch("/api/upload-folder", { method: "POST", body: fd });
    if (r.ok) {
      const d = await r.json();
      uploadedVideoPath = d.file_path;
      const fpsVal = parseFloat(document.getElementById("sequence-fps-input").value) || 25.0;
      multiCharAnnotations = {};
      const enabledNs = Object.keys(configs).map(Number).filter(n => configs[n].enabled);
      if (enabledNs.length === 0) enabledNs.push(1);
      enabledNs.forEach(n => {
        multiCharAnnotations[String(n)] = {
          fps: fpsVal,
          frame_count: d.frame_count,
          base_mw: 0, base_mh: 0, base_eye_dist: 0,
          frames: Array.from({ length: d.frame_count }, (_, i) => ({
            frame_index: i, timestamp: i / fpsVal, confidence_tier: "silver", confidence: 0.5, landmarks: {}
          }))
        };
      });
      activeAnnoChar = String(enabledNs[0]);
      videoAnnotations = multiCharAnnotations[activeAnnoChar];
      addAnnoLog(`Loaded ${d.frame_count} frames from folder! Set Seq FPS to ${fpsVal}.`, "success");
      document.getElementById("run-tracking-btn").removeAttribute("disabled");
      document.getElementById("save-prop-btn").removeAttribute("disabled");
      document.getElementById("anno-placeholder").style.display = "none";
      document.getElementById("anno-viewport").style.display = "block";
      document.getElementById("timeline-container").style.display = "flex";
      renderTimelineFrameStrip();
      loadVideoFrame(0);
    } else {
      const errData = await r.json().catch(() => ({}));
      addAnnoLog(`Folder upload failed: ${errData.detail || "unknown error"}`, "error");
    }
  } catch (err) {
    addAnnoLog(`Folder upload error: ${err.message}`, "error");
  }
});

async function loadVideoFrame(index) {
  if (!uploadedVideoPath) return;
  currentFrameIndex = index;
  
  const img = document.getElementById("anno-frame-img");
  img.src = `/api/video/frame?path=${encodeURIComponent(uploadedVideoPath)}&index=${index}&t=${Date.now()}`;
  
  img.onload = () => {
    applyWorkspaceZoom();
    renderLandmarks();
    updateTimelineUI();
  };
}

let annoWorkspaceZoom = 1.0;

function changeWorkspaceZoom(val, mouseEvt) {
  const img = document.getElementById("anno-frame-img");
  const viewport = document.getElementById("anno-viewport");
  if (!img || !img.naturalWidth || !viewport) return;

  annoWorkspaceZoom = parseFloat(val);
  document.getElementById("anno-zoom-val").textContent = `${Math.round(val * 100)}%`;

  // Get current dimensions before zoom
  const oldWidth = img.offsetWidth;
  const oldHeight = img.offsetHeight;

  // Find mouse coordinates relative to viewport
  let mouseX, mouseY;
  if (mouseEvt) {
    const rect = viewport.getBoundingClientRect();
    mouseX = mouseEvt.clientX - rect.left;
    mouseY = mouseEvt.clientY - rect.top;
  } else {
    // Zoom to center if triggered from slider
    mouseX = viewport.clientWidth / 2;
    mouseY = viewport.clientHeight / 2;
  }

  // Get absolute coordinates on the scrollable content
  const contentX = mouseX + viewport.scrollLeft;
  const contentY = mouseY + viewport.scrollTop;

  // Ratio of mouse coordinate within the scaled image
  const ratioX = oldWidth > 0 ? contentX / oldWidth : 0.5;
  const ratioY = oldHeight > 0 ? contentY / oldHeight : 0.5;

  // Apply new size
  applyWorkspaceZoom();
  renderLandmarks();

  // Scroll to maintain the target point under the cursor
  const newWidth = img.offsetWidth;
  const newHeight = img.offsetHeight;
  
  viewport.scrollLeft = ratioX * newWidth - mouseX;
  viewport.scrollTop = ratioY * newHeight - mouseY;
}

function applyWorkspaceZoom() {
  const img = document.getElementById("anno-frame-img");
  if (!img || !img.naturalWidth) return;
  
  const workspace = document.getElementById("anno-workspace");
  const workspaceRect = workspace.getBoundingClientRect();
  
  const fitScale = Math.min(workspaceRect.width / img.naturalWidth, workspaceRect.height / img.naturalHeight, 1.0);
  const baseWidth = img.naturalWidth * fitScale;
  const baseHeight = img.naturalHeight * fitScale;
  
  img.style.width = `${baseWidth * annoWorkspaceZoom}px`;
  img.style.height = `${baseHeight * annoWorkspaceZoom}px`;
  
  syncAnnoOverlaySize();
}

function syncAnnoOverlaySize() {
  const img = document.getElementById("anno-frame-img");
  const overlay = document.getElementById("anno-marker-overlay");
  const container = document.getElementById("anno-image-container");
  
  const r = img.getBoundingClientRect();
  container.style.width = r.width + 'px';
  container.style.height = r.height + 'px';
  overlay.style.width = r.width + 'px';
  overlay.style.height = r.height + 'px';
}

window.addEventListener("resize", () => {
  if (currentMode === 'annotation' && uploadedVideoPath) {
    applyWorkspaceZoom();
    renderLandmarks();
  }
});

async function runVideoTracking() {
  if (!uploadedVideoPath) return;
  addAnnoLog("Running 20-Point OpenSeeFace + LK body tracker (this may take a few moments)...", "info");
  
  const runBtn = document.getElementById("run-tracking-btn");
  runBtn.disabled = true;
  runBtn.innerText = "Tracking...";
  
  try {
    const enabledNs = Object.keys(configs).map(Number).filter(n => configs[n].enabled);
    const multiCharCalibs = {};
    enabledNs.forEach(n => {
      const cfg = configs[n];
      const mx = cfg.x, my = cfg.y;
      multiCharCalibs[String(n)] = [
        { x: mx,       y: my - 28.0 },
        { x: mx - 7.0, y: my - 15.0 },
        { x: mx + 7.0, y: my - 15.0 },
        { x: mx,       y: my -  7.0 },
        { x: mx,       y: my         },
        { x: mx,       y: my + 10.0 }
      ];
    });
    
    const seqFpsEl = document.getElementById("sequence-fps-input");
    const seqFpsVal = seqFpsEl ? parseFloat(seqFpsEl.value) || null : null;
    const r = await fetch("/api/video/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_path: uploadedVideoPath,
        multi_char_calibs: multiCharCalibs,
        sequence_fps: seqFpsVal
      })
    });
    
    if (r.ok) {
      const d = await r.json();
      
      if (d.characters) {
        multiCharAnnotations = d.characters;
      } else if (d.frames) {
        // Wrap legacy/fallback single-character response
        multiCharAnnotations = {
          "1": {
            fps: d.fps,
            frame_count: d.frame_count,
            base_mw: d.base_mw,
            base_mh: d.base_mh,
            base_eye_dist: d.base_eye_dist,
            frames: d.frames
          }
        };
        // Auto-enable Character 1 tab state if not enabled yet
        if (configs[1]) {
          configs[1].enabled = true;
          configs[1].placed = true;
          renderCharTabs();
        }
      } else {
        multiCharAnnotations = {};
      }
      
      const charIds = Object.keys(multiCharAnnotations);
      if (charIds.length > 0) {
        if (!charIds.includes(activeAnnoChar)) {
          activeAnnoChar = charIds[0];
        }
      } else {
        activeAnnoChar = "1";
      }
      
      videoAnnotations = multiCharAnnotations[activeAnnoChar] || null;
      addAnnoLog(`Tracking complete! Loaded ${d.frame_count} frames.`, "success");
      
      document.getElementById("save-prop-btn").removeAttribute("disabled");
      document.getElementById("export-dataset-btn").removeAttribute("disabled");
      document.getElementById("render-anno-video-btn").removeAttribute("disabled");
      document.getElementById("timeline-container").style.display = "flex";
      
      renderTimelineFrameStrip();
      loadVideoFrame(0);
    } else {
      const err = await r.json();
      addAnnoLog(`Tracking failed: ${err.detail || "unknown"}`, "error");
    }
  } catch (err) {
    addAnnoLog(`Tracking error: ${err.message}`, "error");
  } finally {
    runBtn.disabled = false;
    runBtn.innerText = "⚡ Run OpenSeeFace Tracking";
  }
}

function renderTimelineFrameStrip() {
  const strip = document.getElementById("frame-strip");
  strip.innerHTML = "";
  if (!videoAnnotations) return;
  
  videoAnnotations.frames.forEach((f, idx) => {
    const tab = document.createElement("div");
    tab.className = `frame-tab ${f.confidence_tier || 'silver'}`;
    tab.innerText = idx;
    tab.onclick = () => loadVideoFrame(idx);
    strip.appendChild(tab);
  });
}

function updateTimelineUI() {
  if (!videoAnnotations) return;
  document.getElementById("timeline-info").innerText = `Frame ${currentFrameIndex + 1} / ${videoAnnotations.frame_count}`;
  
  const tabs = document.querySelectorAll("#frame-strip .frame-tab");
  tabs.forEach((tab, idx) => {
    tab.classList.toggle("active-frame", idx === currentFrameIndex);
  });
  
  const activeTab = document.querySelector("#frame-strip .frame-tab.active-frame");
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function renderSidebarPoints() {
  const container = document.getElementById("points-list-container");
  container.innerHTML = "";
  
  LANDMARK_NAMES_LIST.forEach(name => {
    if (!shouldShowLandmarkInUI(name)) return;
    const isHeuristic = isHeuristicPoint(name);
    const badgeClass = isHeuristic ? "badge-heuristic" : "badge-tracked";
    const badgeText = isHeuristic ? "Heuristic" : "Tracked";
    const activeClass = name === activeLandmarkName ? "active-item" : "";
    
    const item = document.createElement("div");
    item.className = `point-list-item ${activeClass}`;
    
    // Explicitly expose global event triggers
    window.toggleLandmarkVisibility = function(n, evt) {
      evt.stopPropagation();
      visibleLandmarks[n] = evt.target.checked;
      renderLandmarks();
    };
    
    window.selectLandmarkPoint = function(n) {
      activeLandmarkName = n;
      renderSidebarPoints();
      renderLandmarks();
    };
    
    item.innerHTML = `
      <div class="point-name-wrapper" onclick="selectLandmarkPoint('${name}')">
        <input type="checkbox" id="chk-vis-${name}" ${visibleLandmarks[name] ? 'checked' : ''} onchange="toggleLandmarkVisibility('${name}', event)" style="width:auto; cursor:pointer;" />
        <span style="font-size:0.8rem; font-weight:500; color:#fff;">${name}</span>
        <span class="point-badge ${badgeClass}">${badgeText}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

function getLandmarkOffset(name) {
  const special = {
    forehead_top: { dx: -60, dy: -45 },
    nose_tip: { dx: 60, dy: 15 },
    jaw_center: { dx: 60, dy: 45 },
    neck_base: { dx: -70, dy: 40 },
    chest_center: { dx: -80, dy: 55 },
    shoulder_left: { dx: -90, dy: 45 },
    shoulder_right: { dx: 90, dy: 45 },
    mouth_lip_0: { dx: 55, dy: -10 },
    mouth_lip_1: { dx: 45, dy: 10 },
    mouth_lip_2: { dx: 35, dy: 30 },
    mouth_lip_3: { dx: 0, dy: 50 },
    mouth_lip_4: { dx: -35, dy: 30 },
    mouth_lip_5: { dx: -45, dy: 10 },
    mouth_lip_6: { dx: -55, dy: -10 },
    mouth_lip_7: { dx: -45, dy: -25 },
    mouth_lip_8: { dx: -35, dy: -40 },
    mouth_lip_9: { dx: 0, dy: -55 },
    mouth_lip_10: { dx: 35, dy: -40 },
    mouth_lip_11: { dx: 45, dy: -25 }
  };
  if (special[name]) return special[name];
  if (name.includes("_left")) return { dx: -65, dy: -15 };
  if (name.includes("_right")) return { dx: 65, dy: -15 };
  return { dx: 0, dy: 45 };
}

function drawGuidelines() {
  const overlay = document.getElementById("anno-marker-overlay");
  if (!overlay || !videoAnnotations) return;

  const frameData = videoAnnotations.frames[currentFrameIndex];
  if (!frameData || !frameData.landmarks) return;

  const img = document.getElementById("anno-frame-img");
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  const rect = img.getBoundingClientRect();

  // Find or create guidelines SVG container
  let svg = document.getElementById("anno-guidelines-svg");
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "anno-guidelines-svg");
    overlay.appendChild(svg);
  }
  svg.innerHTML = "";

  const toggleChk = document.getElementById("chk-toggle-lines");
  if (!toggleChk || !toggleChk.checked) return;

  LANDMARK_NAMES_LIST.forEach(name => {
    if (!shouldShowLandmarkInUI(name)) return;
    if (!visibleLandmarks[name]) return;

    const lm = frameData.landmarks[name];
    if (!lm) return;

    const px = (lm.x / naturalW) * rect.width;
    const py = (lm.y / naturalH) * rect.height;

    const offset = getLandmarkOffset(name);
    const lx = px + offset.dx;
    const ly = py + offset.dy;

    const isHeuristic = isHeuristicPoint(name);
    const isActive = name === activeLandmarkName;

    // Styling configurations
    let lineColor, rectStroke, textColor, strokeWidth, rectStrokeWidth, rectFill;

    if (isActive) {
      lineColor = "rgba(255, 255, 255, 0.85)";
      rectStroke = "#ffffff";
      textColor = "#ffffff";
      strokeWidth = "1.5";
      rectStrokeWidth = "1.5";
      rectFill = "rgba(139, 92, 246, 0.95)"; // highlighted active background
    } else if (isHeuristic) {
      lineColor = "rgba(139, 92, 246, 0.45)";
      rectStroke = "#8b5cf6";
      textColor = "#a78bfa";
      strokeWidth = "1.0";
      rectStrokeWidth = "1.0";
      rectFill = "rgba(15, 18, 36, 0.85)";
    } else {
      lineColor = "rgba(16, 185, 129, 0.45)";
      rectStroke = "#10b981";
      textColor = "#34d399";
      strokeWidth = "1.0";
      rectStrokeWidth = "1.0";
      rectFill = "rgba(15, 18, 36, 0.85)";
    }

    // 1. Draw dashed line from point to label box anchor
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", px);
    line.setAttribute("y1", py);
    line.setAttribute("x2", lx);
    line.setAttribute("y2", ly);
    line.setAttribute("stroke", lineColor);
    line.setAttribute("stroke-width", strokeWidth);
    line.setAttribute("stroke-dasharray", "3,3");
    svg.appendChild(line);

    // 2. Draw small elbow connection horizontal segment
    const elbowOffset = offset.dx >= 0 ? 8 : -8;
    const lineElbow = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lineElbow.setAttribute("x1", lx);
    lineElbow.setAttribute("y1", ly);
    lineElbow.setAttribute("x2", lx + elbowOffset);
    lineElbow.setAttribute("y2", ly);
    lineElbow.setAttribute("stroke", lineColor);
    lineElbow.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(lineElbow);

    // Estimate text width (6px per character + 12px padding)
    const textWidth = name.length * 6.0 + 12;
    const boxWidth = Math.max(70, textWidth);
    const boxHeight = 17;
    const bx = offset.dx >= 0 ? lx + elbowOffset : lx + elbowOffset - boxWidth;
    const by = ly - boxHeight / 2;

    // 3. Draw label rect background
    const rectElem = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rectElem.setAttribute("x", bx);
    rectElem.setAttribute("y", by);
    rectElem.setAttribute("width", boxWidth);
    rectElem.setAttribute("height", boxHeight);
    rectElem.setAttribute("rx", "4");
    rectElem.setAttribute("fill", rectFill);
    rectElem.setAttribute("stroke", rectStroke);
    rectElem.setAttribute("stroke-width", rectStrokeWidth);
    svg.appendChild(rectElem);

    // 4. Draw label text inside rect
    const textElem = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textElem.setAttribute("x", bx + boxWidth / 2);
    textElem.setAttribute("y", by + boxHeight / 2 + 3.5); // vertical align correction
    textElem.setAttribute("fill", textColor);
    textElem.setAttribute("font-size", "8.0");
    textElem.setAttribute("font-family", "Outfit, sans-serif");
    textElem.setAttribute("font-weight", "600");
    textElem.setAttribute("text-anchor", "middle");
    textElem.textContent = name;
    svg.appendChild(textElem);
  });
}

function openReferenceGuideModal() {
  const modal = document.getElementById("guide-modal");
  if (modal) {
    modal.style.display = "flex";
    resetGuideZoom();
    selectGuideTab("neutral");
  }
}

function closeReferenceGuideModal() {
  const modal = document.getElementById("guide-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function resetGuideZoom() {
  const slider = document.getElementById("guide-zoom-slider");
  if (slider) {
    slider.value = 1.0;
  }
  zoomGuide(1.0);
}

function zoomGuide(val) {
  const scale = parseFloat(val);
  const iframe = document.getElementById("guide-svg-iframe");
  const valSpan = document.getElementById("guide-zoom-val");
  if (valSpan) {
    valSpan.textContent = `${Math.round(scale * 100)}%`;
  }
  if (iframe) {
    iframe.style.width = `${scale * 100}%`;
    iframe.style.height = `${scale * 100}%`;
  }
}

function selectGuideTab(shape, btnEl) {
  // Reset zoom on shape switch
  const slider = document.getElementById("guide-zoom-slider");
  if (slider) {
    slider.value = 1.0;
  }
  const valSpan = document.getElementById("guide-zoom-val");
  if (valSpan) {
    valSpan.textContent = "100%";
  }
  const iframe = document.getElementById("guide-svg-iframe");
  if (iframe) {
    iframe.style.width = "100%";
    iframe.style.height = "100%";
  }

  // Deactivate all tab buttons in modal
  document.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.remove("active"));
  
  // Activate clicked button
  const activeBtn = btnEl || document.getElementById(`tab-btn-${shape}`);
  if (activeBtn) activeBtn.classList.add("active");
  
  // Hide standard elements and show/hide designed elements
  const stdContent = document.getElementById("standard-guide-content");
  const desContent = document.getElementById("designed-guide-content");
  const zoomWrapper = document.getElementById("guide-zoom-slider")?.parentElement;
  
  if (shape === 'designed') {
    if (stdContent) stdContent.style.display = "none";
    if (desContent) desContent.style.display = "flex";
    if (zoomWrapper) zoomWrapper.style.display = "none";
    
    // Populate character select
    const charSelect = document.getElementById("upload-sprite-char");
    if (charSelect) {
      charSelect.innerHTML = "";
      const enabledChars = Object.keys(configs).map(Number).filter(n => configs[n].enabled);
      if (enabledChars.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No characters active — Add one first!";
        charSelect.appendChild(opt);
      } else {
        enabledChars.forEach(n => {
          const opt = document.createElement("option");
          opt.value = `Character ${n}`;
          opt.textContent = `Character ${n}`;
          charSelect.appendChild(opt);
        });
      }
    }
  } else {
    if (stdContent) stdContent.style.display = "flex";
    if (desContent) desContent.style.display = "none";
    if (zoomWrapper) zoomWrapper.style.display = "flex";
    
    // Set iframe src to target SVG guide file
    if (iframe) {
      iframe.src = `/static/guides/guide_${shape}.svg`;
    }
  }
}

async function handleSpritesheetUpload(event) {
  event.preventDefault();
  
  const charNameSelect = document.getElementById("upload-sprite-char");
  const angleSelect = document.getElementById("upload-sprite-angle");
  const fileInput = document.getElementById("upload-sprite-file");
  const submitBtn = document.getElementById("btn-upload-spritesheet");
  
  if (!charNameSelect.value) {
    showUploadStatus("Please add a character to the workspace first.", "error");
    return;
  }
  
  if (!fileInput.files || fileInput.files.length === 0) {
    showUploadStatus("Please select a transparent PNG sprite sheet file.", "error");
    return;
  }
  
  const formData = new FormData();
  formData.append("character_name", charNameSelect.value);
  formData.append("angle", angleSelect.value);
  formData.append("file", fileInput.files[0]);
  
  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "⏳ Cropping & Saving...";
    showUploadStatus("Uploading sprite sheet...", "info");
    
    const response = await fetch("/api/character/upload-spritesheet", {
      method: "POST",
      body: formData
    });
    
    const data = await response.json();
    if (response.ok) {
      showUploadStatus(`Success: ${data.message}`, "success");
      fileInput.value = ""; // clear file input
    } else {
      showUploadStatus(`Error: ${data.detail || "Failed to crop sprite sheet"}`, "error");
    }
  } catch (error) {
    console.error("Spritesheet upload failed:", error);
    showUploadStatus(`Network error: ${error.message}`, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "✂️ Crop & Save Sprite Set";
  }
}

function showUploadStatus(msg, type) {
  const statusDiv = document.getElementById("spritesheet-upload-status");
  if (!statusDiv) return;
  
  statusDiv.style.display = "block";
  statusDiv.textContent = msg;
  
  if (type === "success") {
    statusDiv.style.background = "rgba(16, 185, 129, 0.15)";
    statusDiv.style.border = "1px solid rgba(16, 185, 129, 0.4)";
    statusDiv.style.color = "#34d399";
  } else if (type === "error") {
    statusDiv.style.background = "rgba(239, 68, 68, 0.15)";
    statusDiv.style.border = "1px solid rgba(239, 68, 68, 0.4)";
    statusDiv.style.color = "#f87171";
  } else { // info
    statusDiv.style.background = "rgba(59, 130, 246, 0.15)";
    statusDiv.style.border = "1px solid rgba(59, 130, 246, 0.4)";
    statusDiv.style.color = "#60a5fa";
  }
}

function renderLandmarks() {
  const overlay = document.getElementById("anno-marker-overlay");
  if (!overlay) return;
  overlay.innerHTML = "";
  if (!videoAnnotations) return;
  
  const frameData = videoAnnotations.frames[currentFrameIndex];
  if (!frameData || !frameData.landmarks) return;
  
  const img = document.getElementById("anno-frame-img");
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  const rect = img.getBoundingClientRect();
  
  // Create Guidelines SVG container (added first, so trace lines render below dots)
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", "anno-guidelines-svg");
  overlay.appendChild(svg);
  
  LANDMARK_NAMES_LIST.forEach(name => {
    if (!shouldShowLandmarkInUI(name)) return;
    if (!visibleLandmarks[name]) return;
    
    const lm = frameData.landmarks[name];
    if (!lm) return;
    
    const isHeuristic = isHeuristicPoint(name);
    const px = (lm.x / naturalW) * rect.width;
    const py = (lm.y / naturalH) * rect.height;
    
    const dot = document.createElement("div");
    dot.className = `landmark-dot ${isHeuristic ? 'heuristic' : 'tracked'}`;
    dot.classList.toggle("active-dot", name === activeLandmarkName);
    dot.style.left = `${px}px`;
    dot.style.top = `${py}px`;
    dot.title = name;
    
    dot.addEventListener("mousedown", (e) => {
      e.stopPropagation(); e.preventDefault();
      selectLandmarkPoint(name);
      
      const tooltip = document.getElementById("drag-tooltip");
      if (tooltip) {
        tooltip.style.display = "block";
        tooltip.textContent = `Dragging: ${name}`;
        tooltip.style.left = `${e.clientX + 10}px`;
        tooltip.style.top = `${e.clientY + 10}px`;
      }
      
      const onMouseMove = (moveEvt) => {
        const overlayRect = overlay.getBoundingClientRect();
        const nx = Math.max(0, Math.min(overlayRect.width, moveEvt.clientX - overlayRect.left));
        const ny = Math.max(0, Math.min(overlayRect.height, moveEvt.clientY - overlayRect.top));
        
        lm.x = (nx / overlayRect.width) * naturalW;
        lm.y = (ny / overlayRect.height) * naturalH;
        
        dot.style.left = `${nx}px`;
        dot.style.top = `${ny}px`;
        
        if (tooltip) {
          tooltip.style.left = `${moveEvt.clientX + 10}px`;
          tooltip.style.top = `${moveEvt.clientY + 10}px`;
        }
        
        // Redraw guidelines in real-time without destroying the active dot
        drawGuidelines();
      };
      
      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        
        if (tooltip) {
          tooltip.style.display = "none";
        }
        
        // Mark the frame as manual correction (red)
        frameData.confidence_tier = "red";
        frameData.confidence = 1.0;
        
        addAnnoLog(`Repositioned landmark: ${name} to (${Math.round(lm.x)}, ${Math.round(lm.y)})`, "success");
        
        renderTimelineFrameStrip();
        renderLandmarks();
        updateTimelineUI();
      };
      
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
    
    overlay.appendChild(dot);
  });
  
  // Render guidelines instantly
  drawGuidelines();
}

async function saveAndPropagate() {
  if (!videoAnnotations || !uploadedVideoPath) return;
  addAnnoLog(`Running Lucas-Kanade propagation from Frame ${currentFrameIndex}...`, "info");
  
  const saveBtn = document.getElementById("save-prop-btn");
  saveBtn.disabled = true;
  saveBtn.innerText = "Propagating...";
  
  const enabledNs = Object.keys(configs).map(Number).filter(n => configs[n].enabled);
  const multiCharCorrected = {};
  
  enabledNs.forEach(n => {
    const charId = String(n);
    const charAnn = multiCharAnnotations[charId];
    if (charAnn && charAnn.frames && charAnn.frames[currentFrameIndex]) {
      const frameData = charAnn.frames[currentFrameIndex];
      
      if (mouthDensityMode === 6) {
        const lms = frameData.landmarks;
        if (lms["mouth_lip_0"] && lms["mouth_lip_2"]) {
          lms["mouth_lip_1"] = { x: (lms["mouth_lip_0"].x + lms["mouth_lip_2"].x)/2, y: (lms["mouth_lip_0"].y + lms["mouth_lip_2"].y)/2, visible: true, status: "auto" };
          lms["mouth_lip_3"] = { x: (lms["mouth_lip_2"].x + lms["mouth_lip_4"].x)/2, y: (lms["mouth_lip_2"].y + lms["mouth_lip_4"].y)/2, visible: true, status: "auto" };
          lms["mouth_lip_5"] = { x: (lms["mouth_lip_4"].x + lms["mouth_lip_6"].x)/2, y: (lms["mouth_lip_4"].y + lms["mouth_lip_6"].y)/2, visible: true, status: "auto" };
          lms["mouth_lip_7"] = { x: (lms["mouth_lip_6"].x + lms["mouth_lip_8"].x)/2, y: (lms["mouth_lip_6"].y + lms["mouth_lip_8"].y)/2, visible: true, status: "auto" };
          lms["mouth_lip_9"] = { x: (lms["mouth_lip_8"].x + lms["mouth_lip_10"].x)/2, y: (lms["mouth_lip_8"].y + lms["mouth_lip_10"].y)/2, visible: true, status: "auto" };
          lms["mouth_lip_11"] = { x: (lms["mouth_lip_10"].x + lms["mouth_lip_0"].x)/2, y: (lms["mouth_lip_10"].y + lms["mouth_lip_0"].y)/2, visible: true, status: "auto" };
        }
      }
      
      const corrected = {};
      LANDMARK_NAMES_LIST.forEach(name => {
        if (frameData.landmarks[name]) {
          corrected[name] = [frameData.landmarks[name].x, frameData.landmarks[name].y];
        }
      });
      multiCharCorrected[charId] = corrected;
    }
  });
  
  const forceOverwrite = document.getElementById("force-propagate-chk")?.checked || false;
  
  try {
    const r = await fetch("/api/dataset/propagate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_path: uploadedVideoPath,
        start_frame: currentFrameIndex,
        corrected_landmarks: {},
        all_annotations: {},
        multi_char_corrected: multiCharCorrected,
        multi_char_all_annotations: multiCharAnnotations,
        force_overwrite: forceOverwrite
      })
    });
    
    if (r.ok) {
      const d = await r.json();
      if (d.characters) {
        Object.keys(d.characters).forEach(charId => {
          const charAnn = multiCharAnnotations[charId];
          if (charAnn) {
            Object.keys(d.characters[charId]).forEach(k => {
              const idx = parseInt(k);
              charAnn.frames[idx] = d.characters[charId][k];
            });
          }
        });
      }
      videoAnnotations = multiCharAnnotations[activeAnnoChar] || null;
      addAnnoLog("LK Flow propagation complete!", "success");
      renderTimelineFrameStrip();
      renderLandmarks();
      updateTimelineUI();
    } else {
      const err = await r.json();
      addAnnoLog(`Propagation failed: ${err.detail || "unknown"}`, "error");
    }
  } catch (err) {
    addAnnoLog(`Propagation error: ${err.message}`, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = "💾 Save & Propagate Flow";
  }
}

async function exportDataset() {
  if (!videoAnnotations || !uploadedVideoPath) return;
  const charName = document.getElementById("dataset-char-name").value.trim();
  const sessionId = document.getElementById("dataset-session-id").value.trim();
  
  if (!charName || !sessionId) {
    addAnnoLog("Please fill in character name and session ID.", "warning");
    return;
  }
  
  addAnnoLog(`Exporting dataset crops & annotations to projects/characters/${charName}...`, "info");
  
  const exportBtn = document.getElementById("export-dataset-btn");
  exportBtn.disabled = true;
  exportBtn.innerText = "Exporting...";
  
  try {
    const r = await fetch("/api/dataset/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character_name: charName,
        session_id: sessionId,
        video_path: uploadedVideoPath,
        annotations: {
          video_path: uploadedVideoPath,
          fps: videoAnnotations ? videoAnnotations.fps : 25.0,
          frame_count: videoAnnotations ? videoAnnotations.frame_count : 0,
          characters: multiCharAnnotations
        }
      })
    });
    
    if (r.ok) {
      const d = await r.json();
      addAnnoLog(`Dataset exported successfully! Session saved at: ${d.path}`, "success");
    } else {
      const err = await r.json();
      addAnnoLog(`Export failed: ${err.detail || "unknown"}`, "error");
    }
  } catch (err) {
    addAnnoLog(`Export error: ${err.message}`, "error");
  } finally {
    exportBtn.disabled = false;
    exportBtn.innerText = "📁 Export Dataset";
  }
}

async function renderVideoFromAnnotations() {
  if (!videoAnnotations || !uploadedVideoPath) return;
  const script = document.getElementById("script-input").value.trim();
  if (!script) {
    addAnnoLog("Write a script in the left panel first.", "warning");
    return;
  }

  const enabledChars = Object.keys(configs).map(Number).filter(n => configs[n].enabled);
  if (enabledChars.length === 0) {
    addAnnoLog("Add at least one character mouth in the Static Lab first.", "warning");
    return;
  }

  addAnnoLog("Starting video compilation using your manual annotations...", "info");
  const renderBtn = document.getElementById("render-anno-video-btn");
  renderBtn.disabled = true;
  renderBtn.innerText = "Rendering Video...";

  // ── Auto-load saved dataset if videoAnnotations not in memory ──────────────────────────────
  // Workflow: user uploads video → runs tracking → saves dataset → comes back later.
  // Instead of requiring re-tracking, auto-load from the saved character/session dataset.
  const charName   = document.getElementById("dataset-char-name")?.value.trim();
  const sessionId  = document.getElementById("dataset-session-id")?.value.trim();
  if (!videoAnnotations && charName && sessionId) {
    addAnnoLog(`Auto-loading saved dataset for ${charName}/${sessionId}...`, "info");
    try {
      const loadR = await fetch(`/api/dataset/load?character_name=${encodeURIComponent(charName)}&session_id=${encodeURIComponent(sessionId)}`);
      if (loadR.ok) {
        const loadD = await loadR.json();
        videoAnnotations = loadD.annotations;
        addAnnoLog(`Loaded ${videoAnnotations.frame_count} frames from saved dataset.`, "success");
      } else {
        addAnnoLog("Could not auto-load dataset — using tracked data from memory.", "warning");
      }
    } catch (e) {
      addAnnoLog(`Dataset load error: ${e.message}`, "warning");
    }
  }

  if (!videoAnnotations) {
    addAnnoLog("No annotation data in memory. Run tracking first, or fill in Character Name + Session ID to load a saved dataset.", "error");
    renderBtn.disabled = false;
    renderBtn.innerText = "🎬 Render Lip-Sync Video (with Annotations)";
    return;
  }

  const renderAll = document.getElementById("render-all-smoothing-chk")?.checked || false;

  try {
    const r = await fetch("/api/generate/lip-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script,
        image_path: uploadedImagePath || uploadedVideoPath || "static/uploads/character_base.png",
        chars: enabledChars.map(n => configs[n]),
        char_names: enabledChars.map(n => `Character ${n}`),
        video_path: uploadedVideoPath,
        annotations: {
          video_path: uploadedVideoPath,
          fps: videoAnnotations ? videoAnnotations.fps : 25.0,
          frame_count: videoAnnotations ? videoAnnotations.frame_count : 0,
          characters: multiCharAnnotations
        },
        render_all_smoothing: renderAll,
        smoothing_level: activeSmoothingLevel
      })
    });

    if (r.ok) {
      const d = await r.json();
      addAnnoLog("Video lip-sync compilation complete!", "success");
      
      const outputVideo = document.getElementById("output-video");
      const videoPlaceholder = document.getElementById("video-placeholder");
      if (outputVideo && videoPlaceholder) {
        if (d.videos) {
          smoothingLevelsUrls = d.videos;
          document.getElementById("smoothing-selector-container").style.display = "flex";
          selectSmoothing(activeSmoothingLevel);
        } else {
          document.getElementById("smoothing-selector-container").style.display = "none";
          outputVideo.src = `${d.video_url}?t=${Date.now()}`;
          outputVideo.style.display = "block";
          videoPlaceholder.style.display = "none";
          outputVideo.play();
        }
      }
    } else {
      const err = await r.json();
      addAnnoLog(`Render failed: ${err.detail || "unknown"}`, "error");
    }
  } catch (err) {
    addAnnoLog(`Render error: ${err.message}`, "error");
  } finally {
    renderBtn.disabled = false;
    renderBtn.innerText = "🎬 Render Lip-Sync Video (with Annotations)";
  }
}

async function loadDataset() {
  const charName = document.getElementById("dataset-char-name").value.trim();
  const sessionId = document.getElementById("dataset-session-id").value.trim();
  
  if (!charName || !sessionId) {
    addAnnoLog("Please specify character name and session ID to load.", "warning");
    return;
  }
  
  addAnnoLog(`Loading dataset for character '${charName}', session '${sessionId}'...`, "info");
  const loadBtn = document.getElementById("load-dataset-btn");
  loadBtn.disabled = true;
  loadBtn.innerText = "Loading Dataset...";
  
  try {
    const r = await fetch(`/api/dataset/load?character_name=${encodeURIComponent(charName)}&session_id=${encodeURIComponent(sessionId)}`);
    if (r.ok) {
      const d = await r.json();
      const ann = d.annotations;
      
      if (ann.video_path) {
        uploadedVideoPath = ann.video_path;
        document.getElementById("anno-placeholder").style.display = "none";
        document.getElementById("anno-viewport").style.display = "block";
      }
      
      multiCharAnnotations = {};
      if (ann.characters) {
        Object.keys(ann.characters).forEach(charId => {
          const charAnn = ann.characters[charId];
          const frames = charAnn.frames.map(f => {
            const landmarksConverted = {};
            const lmsSource = f.orig_landmarks || f.landmarks || {};
            Object.keys(lmsSource).forEach(name => {
              const pt = lmsSource[name];
              landmarksConverted[name] = {
                x: pt[0],
                y: pt[1],
                visible: true,
                status: isHeuristicPoint(name) ? "yellow" : "auto"
              };
            });
            return {
              frame_index: f.frame_index,
              timestamp: f.timestamp,
              confidence: f.confidence,
              confidence_tier: f.confidence >= 0.65 ? "green" : "yellow",
              landmarks: landmarksConverted,
              scale: f.scale || 1.0,
              roll: f.roll || 0.0,
              yaw: f.yaw || 0.0,
              pitch: f.pitch || 0.0,
              mouth_center: f.mouth_center || [0.0, 0.0],
              mouth_mask_poly: f.mouth_mask_poly || []
            };
          });
          
          multiCharAnnotations[charId] = {
            fps: charAnn.fps,
            frame_count: charAnn.frame_count,
            base_mw: charAnn.base_mw,
            base_mh: charAnn.base_mh,
            base_eye_dist: charAnn.base_eye_dist,
            frames: frames
          };
        });
      }
      
      const charIds = Object.keys(multiCharAnnotations);
      if (charIds.length > 0) {
        if (!charIds.includes(activeAnnoChar)) {
          activeAnnoChar = charIds[0];
        }
      } else {
        activeAnnoChar = "1";
      }
      
      videoAnnotations = multiCharAnnotations[activeAnnoChar] || null;
      addAnnoLog(`Dataset loaded successfully! Found ${charIds.length} character(s).`, "success");
      
      // Auto-enable loaded characters
      charIds.forEach(charId => {
        const n = parseInt(charId);
        if (configs[n]) {
          configs[n].enabled = true;
          configs[n].placed = true;
        }
      });
      renderCharTabs();
      renderAnnoCharTabs();
      
      document.getElementById("save-prop-btn").removeAttribute("disabled");
      document.getElementById("export-dataset-btn").removeAttribute("disabled");
      document.getElementById("render-anno-video-btn").removeAttribute("disabled");
      document.getElementById("timeline-container").style.display = "flex";
      
      renderTimelineFrameStrip();
      loadVideoFrame(0);
    } else {
      const err = await r.json();
      addAnnoLog(`Load failed: ${err.detail || "unknown"}`, "error");
    }
  } catch (err) {
    addAnnoLog(`Load error: ${err.message}`, "error");
  } finally {
    loadBtn.disabled = false;
    loadBtn.innerText = "📂 Load Saved Character Dataset";
  }
}

function setMouthDensity(density) {
  mouthDensityMode = density;
  
  // Toggle UI buttons
  const btn6 = document.getElementById("density-btn-6");
  const btn12 = document.getElementById("density-btn-12");
  if (btn6 && btn12) {
    btn6.classList.toggle("active-density", density === 6);
    btn12.classList.toggle("active-density", density === 12);
  }
  
  addAnnoLog(`Mouth density switched to ${density} points.`, "info");
  
  // Re-render UI elements
  renderSidebarPoints();
  renderLandmarks();
}

function selectSmoothing(num) {
  activeSmoothingLevel = num;
  
  // Toggle active styling on tabs
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`smooth-btn-${i}`);
    if (btn) {
      btn.classList.toggle("active-smoothing", i === num);
    }
  }
  
  // Update video player source
  const videoUrl = smoothingLevelsUrls[num];
  if (videoUrl) {
    const outputVideo = document.getElementById("output-video");
    const videoPlaceholder = document.getElementById("video-placeholder");
    if (outputVideo && videoPlaceholder) {
      outputVideo.src = `${videoUrl}?t=${Date.now()}`;
      outputVideo.style.display = "block";
      videoPlaceholder.style.display = "none";
      outputVideo.load();
      outputVideo.play();
      addLog(`Loaded smoothing level ${num} preview.`, "info");
      addAnnoLog(`Loaded smoothing level ${num} preview.`, "info");
    }
  }
}

async function confirmSmoothingChoice() {
  const charName = document.getElementById("dataset-char-name")?.value.trim();
  const sessionId = document.getElementById("dataset-session-id")?.value.trim();
  
  if (!charName || !sessionId) {
    addLog("Specify character name and session ID to save choices.", "error");
    addAnnoLog("Specify character name and session ID to save choices.", "error");
    return;
  }
  
  const confirmBtn = document.getElementById("confirm-smoothing-btn");
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerText = "Saving Selection...";
  }
  
  try {
    const r = await fetch("/api/dataset/select-smoothing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character_name: charName,
        session_id: sessionId,
        selected_smoothing: activeSmoothingLevel
      })
    });
    
    if (r.ok) {
      addLog(`Smoothing level ${activeSmoothingLevel} confirmed and saved to dataset! Unused render files cleaned up.`, "success");
      addAnnoLog(`Smoothing level ${activeSmoothingLevel} confirmed and saved to dataset!`, "success");
      
      // Hide comparison UI since confirmation is complete
      const container = document.getElementById("smoothing-selector-container");
      if (container) {
        container.style.display = "none";
      }
    } else {
      const err = await r.json();
      addLog(`Failed to save selection: ${err.detail || "unknown"}`, "error");
    }
  } catch (err) {
    addLog(`Confirm error: ${err.message}`, "error");
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerText = "💾 Confirm & Save Choice";
    }
  }
}

// ── MODERN MOUSE WHEEL ZOOM FOR WORKSPACE & REFERENCE GUIDES ──
function setupWheelZoom() {
  const annoViewport = document.getElementById("anno-viewport");
  if (annoViewport) {
    annoViewport.addEventListener("wheel", (e) => {
      // Prevent browser zoom / page scrolling
      e.preventDefault();
      const zoomSlider = document.getElementById("anno-zoom-slider");
      if (!zoomSlider) return;
      
      let zoomVal = parseFloat(zoomSlider.value);
      if (e.deltaY < 0) {
        zoomVal = Math.min(4.0, zoomVal + 0.15); // Zoom In
      } else {
        zoomVal = Math.max(1.0, zoomVal - 0.15); // Zoom Out
      }
      zoomSlider.value = zoomVal.toFixed(2);
      changeWorkspaceZoom(zoomVal, e);
    }, { passive: false });
  }

  const guideWrapper = document.querySelector(".guide-svg-wrapper");
  if (guideWrapper) {
    guideWrapper.addEventListener("wheel", (e) => {
      e.preventDefault();
      const guideSlider = document.getElementById("guide-zoom-slider");
      if (!guideSlider) return;
      
      let zoomVal = parseFloat(guideSlider.value);
      if (e.deltaY < 0) {
        zoomVal = Math.min(2.5, zoomVal + 0.1); // Zoom In
      } else {
        zoomVal = Math.max(1.0, zoomVal - 0.1); // Zoom Out
      }
      guideSlider.value = zoomVal.toFixed(2);
      zoomGuide(zoomVal);
    }, { passive: false });
  }
}

function setupPanning() {
  const viewport = document.getElementById("anno-viewport");
  const overlay = document.getElementById("anno-marker-overlay");
  if (!viewport || !overlay) return;

  let isPanning = false;
  let startX = 0, startY = 0;
  let startScrollLeft = 0, startScrollTop = 0;

  // Set default grab cursor for empty space panning
  viewport.style.cursor = "grab";
  overlay.style.cursor = "grab";

  viewport.addEventListener("mousedown", (e) => {
    // If the click was directly on a marker dot, don't trigger panning
    if (e.target.classList.contains("landmark-dot")) return;

    isPanning = true;
    viewport.style.cursor = "grabbing";
    overlay.style.cursor = "grabbing";

    startX = e.clientX;
    startY = e.clientY;
    startScrollLeft = viewport.scrollLeft;
    startScrollTop = viewport.scrollTop;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isPanning) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    viewport.scrollLeft = startScrollLeft - dx;
    viewport.scrollTop = startScrollTop - dy;
  });

  window.addEventListener("mouseup", () => {
    if (isPanning) {
      isPanning = false;
      viewport.style.cursor = "grab";
      overlay.style.cursor = "grab";
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupWheelZoom();
    setupPanning();
  });
} else {
  setupWheelZoom();
  setupPanning();
}

