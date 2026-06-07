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
      addLog("Image uploaded!", "success");
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

  try {
    const r = await fetch("/api/generate/lip-sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script,
        image_path: uploadedImagePath,
        chars: enabledChars.map(n => configs[n]),
        char_names: enabledChars.map(n => `Character ${n}`),
        safe_mode: safeMode
      })
    });
    if (r.ok) {
      const d = await r.json();
      outputVideo.src = `${d.video_url}?t=${Date.now()}`;
      outputVideo.style.display = "block";
      videoPlaceholder.style.display = "none";
      outputVideo.play();
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

// ==========================================
// INIT
// ==========================================
closeMouthPopup();
renderCharTabs();
addLog("Lip-Sync Lab ready. Upload an image, then add character mouths.", "info");
