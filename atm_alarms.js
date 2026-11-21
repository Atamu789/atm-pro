(function () {
  if (window.__atmAlarmsV3) return;
  window.__atmAlarmsV3 = true;

  const STORE_KEY = "atm_alarms_v1";
  const PREFS_KEY = "atm_alarm_prefs_v1";
  const FOLDERS_KEY = "atm_alarm_folders_v1";
  const DEFAULT_FOLDERS = ["Entrées", "TP / SL", "Zones Clés", "Général"];

  const SVG_BELL = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  const SVG_BELL_RING = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M2 8c0-2.2.7-4.3 2-6"/><path d="M22 8a10 10 0 0 0-2-6"/></svg>';
  const SVG_FOLDER = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
  const SVG_PLUS = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const SVG_EDIT = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  const SVG_CLOSE = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const SVG_VOL = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
  const SVG_PHONE = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';

  let alarms = [];
  let folders = DEFAULT_FOLDERS.slice();
  let prefs = { sound: "pro", vibrate: true, candleChime: false, ntfyTopic: "" };
  let activeFolderFilter = "Tous";
  let selectedFolder = "Entrées";
  let termuxApiReady = false;
  let audioCtx = null;
  let priceLines = [];
  let lastPrices = {};
  let lastCandleTime = null;
  let lastRenderedSym = "";

  try { alarms = JSON.parse(localStorage.getItem(STORE_KEY) || "[]") || []; } catch (_) { alarms = []; }
  try {
    const sf = JSON.parse(localStorage.getItem(FOLDERS_KEY) || "null");
    if (Array.isArray(sf) && sf.length) folders = sf;
  } catch (_) {}
  try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {}); } catch (_) {}
  alarms.forEach((a) => { if (!a.folder) a.folder = "Général"; });

  function syncServerDoc() {
    try {
      fetch("/__atm_alarms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alarms, prefs, folders, updatedAt: Date.now() }),
        keepalive: true
      }).catch(() => {});
    } catch (_) {}
  }

  function saveAlarms() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(alarms)); } catch (_) {}
    syncServerDoc();
    updateBadge();
    syncChartLines();
  }
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_) {}
    syncServerDoc();
  }
  function saveFolders() {
    try { localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders)); } catch (_) {}
    syncServerDoc();
  }

  // CSS chargé via atm_alarms_clean.css

  function unlockAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (_) {}
  }
  ["touchstart", "pointerdown", "click"].forEach((ev) => {
    document.addEventListener(ev, unlockAudio, { passive: true, once: true });
  });

  function playTone(mode) {
    unlockAudio();
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const pattern = mode === "sirene"
        ? [[880, 0, .18], [1320, .20, .18], [880, .40, .18], [1320, .60, .25]]
        : mode === "doux"
        ? [[660, 0, .14], [880, .16, .24]]
        : [[980, 0, .11], [1480, .14, .13], [1960, .30, .22]];
      pattern.forEach(([freq, off, dur]) => {
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.type = mode === "doux" ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, now + off);
        gain.gain.setValueAtTime(0.001, now + off);
        gain.gain.exponentialRampToValueAtTime(0.32, now + off + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + off + dur);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now + off); osc.stop(now + off + dur + 0.03);
      });
    } catch (_) {}
  }

  function showToast(title, body) {
    let wrap = document.getElementById("alm-toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.id = "alm-toast-wrap"; document.body.appendChild(wrap); }
    const el = document.createElement("div");
    el.className = "alm-toast";
    el.innerHTML = '<div style="display:flex;align-items:center;gap:9px"><span style="color:var(--acc,#f8fafc);display:inline-flex">' + SVG_BELL_RING +
      '</span><div><div style="font-weight:900;font-size:12.5px;color:#ffffff">' + title +
      '</div><div style="font-size:11.5px;opacity:.94;margin-top:2px">' + body + '</div></div></div>' +
      '<button type="button" style="padding:6px 10px;border:0;border-radius:8px;background:var(--acc,#e2e8f0);color:#ffffff;font-weight:900;cursor:pointer">OK</button>';
    el.querySelector("button").onclick = () => el.remove();
    wrap.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 9000);
  }

  function fireNotification(title, body, soundOverride) {
    playTone(soundOverride || prefs.sound);
    if (prefs.vibrate && navigator.vibrate) { try { navigator.vibrate([240, 100, 240, 100, 380]); } catch (_) {} }
    showToast(title, body);
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body: body, tag: "atm-alarm-" + Date.now(), renotify: true }); } catch (_) {}
    }
    if (prefs.ntfyTopic || termuxApiReady) {
      fetch("/__atm_push_test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, prefs })
      }).catch(() => {});
    }
  }

  function getCurSym() { return (window.App && App.sym) ? App.sym : "XAUUSD"; }
  function getCurDisp() { return (window.App && App.disp) ? App.disp : getCurSym(); }
  function getCurPrice() {
    if (window.App && Array.isArray(App.candles) && App.candles.length) {
      const c = Number(App.candles[App.candles.length - 1].close);
      if (Number.isFinite(c) && c > 0) return c;
    }
    return null;
  }
  function getDecimals(px) { return px && px < 10 ? 4 : 2; }

  function findChartObj() {
    if (!window.App) return null;
    for (const v of Object.values(window.App)) {
      if (v && typeof v === "object" && typeof v.timeScale === "function" && typeof v.subscribeCrosshairMove === "function") return v;
    }
    return null;
  }

  function findCandleSeries() {
    if (!window.App) return null;
    for (const v of Object.values(window.App)) {
      if (v && typeof v === "object" && typeof v.createPriceLine === "function" && typeof v.coordinateToPrice === "function") return v;
    }
    return null;
  }

  function getAxisWidth(chart) {
    try {
      const w = chart && chart.priceScale && chart.priceScale("right").width();
      if (w && w > 24 && w < 140) return Math.round(w);
    } catch (_) {}
    return 66;
  }

  function syncChartLines() {
    const ser = findCandleSeries();
    if (!ser) return;
    while (priceLines.length) { try { ser.removePriceLine(priceLines.pop()); } catch (_) {} }
    const sym = getCurSym();
    alarms.forEach((a) => {
      if (!a.active || a.sym !== sym) return;
      try {
        const icon = a.cond === "above" ? "▲" : (a.cond === "below" ? "▼" : "⇅");
        const tag = a.note ? a.note : (a.folder || "ALERTE");
        priceLines.push(ser.createPriceLine({
          price: Number(a.price), color: (getComputedStyle(document.documentElement).getPropertyValue("--acc").trim() || "#e2e8f0"), lineWidth: 1, lineStyle: 2,
          axisLabelVisible: true, title: icon + " " + tag
        }));
      } catch (_) {}
    });
  }

  function updateBadge() {
    const btn = document.getElementById("atm-alm-btn");
    if (!btn) return;
    const total = alarms.filter((a) => a.active).length;
    btn.classList.toggle("has-alm", total > 0);
    btn.innerHTML = (total > 0 ? SVG_BELL_RING : SVG_BELL) + (total > 0 ? '<span class="alm-cnt">' + total + '</span>' : '');
  }

  function addAlarmDirect(px, cond, note, repeat, folder) {
    unlockAudio();
    const cur = getCurPrice();
    const finalCond = cond || (cur && px < cur ? "below" : "above");
    const dec = getDecimals(px);
    const fld = folder || selectedFolder || "Général";
    alarms.unshift({
      id: "a" + Date.now() + Math.floor(Math.random() * 999),
      sym: getCurSym(), disp: getCurDisp(),
      price: Number(px.toFixed(dec)), cond: finalCond,
      folder: fld, note: (note || "").trim().slice(0, 32),
      repeat: !!repeat, active: true, cooldownUntil: 0
    });
    saveAlarms();
    const dir = finalCond === "above" ? "≥" : (finalCond === "below" ? "≤" : "⇅");
    playTone("doux");
    showToast("Alerte ajoutée • " + fld, getCurDisp() + " " + dir + " " + Number(px).toFixed(dec) + (note ? " — " + note : ""));
  }

  // === BOUTON + ET BARRE ALERTE SUR LE GRAPHIQUE ===
  let qaPrice = null, qaBarOpen = false, qaHideTimer = null, qaHooked = false;

  function hideQuickAlert() {
    qaBarOpen = false; qaPrice = null; clearTimeout(qaHideTimer);
    ["atm-qa-line", "atm-qa-plus", "atm-qa-bar"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) { el.style.display = "none"; el.classList.remove("open"); }
    });
  }

  function positionQuickAlert() {
    if (qaPrice == null) return;
    const wrap = document.getElementById("chart-wrap"), ser = findCandleSeries(), chart = findChartObj();
    if (!wrap || !ser) return;
    const y = ser.priceToCoordinate(qaPrice), h = wrap.clientHeight;
    const p = document.getElementById("atm-qa-plus"), b = document.getElementById("atm-qa-bar"), l = document.getElementById("atm-qa-line");
    if (y == null || y < 14 || y > h - 28) {
      if (p) p.style.display = "none"; if (b) b.style.display = "none"; if (l) l.style.display = "none";
      return;
    }
    const axisW = getAxisWidth(chart);
    if (p) { p.style.top = y.toFixed(1) + "px"; p.style.right = (axisW + 6) + "px"; p.style.display = "inline-flex"; p.classList.toggle("open", qaBarOpen); }
    if (l) { l.style.top = y.toFixed(1) + "px"; l.style.display = qaBarOpen ? "block" : "none"; }
    if (b) {
      if (qaBarOpen) {
        b.style.top = y.toFixed(1) + "px"; b.style.right = (axisW + 38) + "px"; b.style.display = "inline-flex";
        const s = b.querySelector(".qa-px"); if (s) s.textContent = qaPrice.toFixed(getDecimals(qaPrice));
      } else b.style.display = "none";
    }
  }

  function showQuickPlusAtY(y) {
    if (window.Draw && Draw.active) return;
    const wrap = document.getElementById("chart-wrap"), ser = findCandleSeries();
    if (!wrap || !ser || y < 14 || y > wrap.clientHeight - 28) return;
    const px = ser.coordinateToPrice(y);
    if (!Number.isFinite(px) || px <= 0) return;
    qaPrice = px;
    positionQuickAlert();
    clearTimeout(qaHideTimer);
    if (!qaBarOpen) qaHideTimer = setTimeout(() => { if (!qaBarOpen) hideQuickAlert(); }, 5500);
  }

  function mountQuickAlertOnChart() {
    const wrap = document.getElementById("chart-wrap");
    if (!wrap || document.getElementById("atm-qa-plus")) return;

    const line = document.createElement("div"); line.id = "atm-qa-line";
    const plus = document.createElement("button");
    plus.id = "atm-qa-plus"; plus.type = "button"; plus.innerHTML = SVG_PLUS;
    const bar = document.createElement("div");
    bar.id = "atm-qa-bar";
    bar.innerHTML =
      '<button type="button" class="qa-go" id="qa-create-btn">' + SVG_BELL + '<span>ALERTE</span><span class="qa-px"></span></button>' +
      '<button type="button" class="qa-ic" id="qa-edit-btn" title="Choisir dossier / Note">' + SVG_EDIT + '</button>' +
      '<button type="button" class="qa-ic" id="qa-close-btn" title="Fermer">' + SVG_CLOSE + '</button>';

    [plus, bar].forEach((el) => {
      ["touchstart", "pointerdown", "mousedown"].forEach((ev) => el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
    });
    plus.onclick = (e) => { e.stopPropagation(); unlockAudio(); qaBarOpen = !qaBarOpen; clearTimeout(qaHideTimer); positionQuickAlert(); };
    bar.querySelector("#qa-create-btn").onclick = (e) => {
      e.stopPropagation();
      if (qaPrice != null) addAlarmDirect(qaPrice, null, "", false, activeFolderFilter !== "Tous" ? activeFolderFilter : selectedFolder);
      hideQuickAlert();
    };
    bar.querySelector("#qa-edit-btn").onclick = (e) => { e.stopPropagation(); const px = qaPrice; hideQuickAlert(); openAlarmModal(px); };
    bar.querySelector("#qa-close-btn").onclick = (e) => { e.stopPropagation(); hideQuickAlert(); };

    wrap.appendChild(line); wrap.appendChild(plus); wrap.appendChild(bar);

    let dx = 0, dy = 0, dt0 = 0;
    wrap.addEventListener("pointerdown", (e) => {
      if (e.target.closest("#atm-qa-plus, #atm-qa-bar")) return;
      dx = e.clientX; dy = e.clientY; dt0 = performance.now();
    }, { passive: true });
    wrap.addEventListener("pointerup", (e) => {
      if (e.target.closest("#atm-qa-plus, #atm-qa-bar")) return;
      if (Math.hypot(e.clientX - dx, e.clientY - dy) < 12 && (performance.now() - dt0) < 450) {
        const rect = wrap.getBoundingClientRect();
        if ((e.clientX - rect.left) < rect.width - getAxisWidth(findChartObj()) + 8) {
          qaBarOpen = false;
          showQuickPlusAtY(e.clientY - rect.top);
        }
      }
    }, { passive: true });

    (function loop() { if (qaPrice != null) positionQuickAlert(); requestAnimationFrame(loop); })();
  }

  function tryHookCrosshair() {
    if (qaHooked) return;
    const ch = findChartObj();
    if (!ch) return;
    qaHooked = true;
    try {
      ch.subscribeCrosshairMove((param) => {
        if (!qaBarOpen && param && param.point && typeof param.point.y === "number" && param.point.y >= 14) {
          showQuickPlusAtY(param.point.y);
        }
      });
    } catch (_) {}
  }

  // === MODALE DOSSIERS BLEU TRANSPARENT ===
  let selCond = "above";

  function openAlarmModal(prefillPx) {
    unlockAudio();
    if (window.App && typeof App.closeModals === "function") App.closeModals();
    const m = document.getElementById("alarm-modal");
    if (!m) return;
    const curPx = getCurPrice(), px = Number.isFinite(prefillPx) && prefillPx > 0 ? prefillPx : curPx;
    const dec = getDecimals(px || curPx);
    const inp = document.getElementById("alm-price-inp");
    if (inp && px) inp.value = px.toFixed(dec);
    if (Number.isFinite(prefillPx) && curPx) {
      selCond = prefillPx < curPx ? "below" : "above";
      m.querySelectorAll("[data-cond]").forEach((x) => x.classList.toggle("on", x.dataset.cond === selCond));
    }
    const symEl = document.getElementById("alm-cur-sym");
    if (symEl) symEl.textContent = getCurDisp() + (curPx ? " • " + curPx.toFixed(dec) : "");
    m.style.display = "flex";
    renderFolderBar();
    renderAlarmList();
  }

  function closeAlarmModal() {
    const m = document.getElementById("alarm-modal");
    if (m) m.style.display = "none";
  }

  function renderFolderBar() {
    const bar = document.getElementById("alm-folders-bar");
    const sel = document.getElementById("alm-folder-sel");
    if (sel) {
      sel.innerHTML = folders.map((f) => '<option value="' + f + '">' + f + '</option>').join("");
      sel.value = folders.includes(selectedFolder) ? selectedFolder : folders[0];
    }
    if (!bar) return;
    const tabs = ["Tous"].concat(folders);
    bar.innerHTML = tabs.map((f) => {
      const cnt = f === "Tous"
        ? alarms.filter((a) => a.active).length
        : alarms.filter((a) => a.active && (a.folder || "Général") === f).length;
      return '<button type="button" class="alm-ftab' + (activeFolderFilter === f ? " on" : "") + '" data-fld="' + f + '">' +
        SVG_FOLDER + '<span>' + f + (cnt ? " (" + cnt + ")" : "") + '</span></button>';
    }).join("") + '<button type="button" class="alm-ftab" id="alm-new-fld">+ Dossier</button>';

    bar.querySelectorAll("[data-fld]").forEach((b) => {
      b.onclick = () => {
        activeFolderFilter = b.dataset.fld;
        if (activeFolderFilter !== "Tous") selectedFolder = activeFolderFilter;
        renderFolderBar();
        renderAlarmList();
      };
    });
    const nf = document.getElementById("alm-new-fld");
    if (nf) {
      nf.onclick = () => {
        const name = (prompt("Nom du nouveau dossier d'alarmes :") || "").trim().slice(0, 18);
        if (!name || folders.includes(name)) return;
        folders.push(name);
        selectedFolder = name;
        activeFolderFilter = name;
        saveFolders();
        renderFolderBar();
        renderAlarmList();
      };
    }
  }

  function renderAlarmList() {
    const box = document.getElementById("alm-list");
    if (!box) return;
    const curPx = getCurPrice(), curSym = getCurSym();
    const list = activeFolderFilter === "Tous"
      ? alarms
      : alarms.filter((a) => (a.folder || "Général") === activeFolderFilter);

    if (!list.length) {
      box.innerHTML = '<div style="text-align:center;opacity:.68;padding:14px;font-size:12px">Aucune alarme dans ce dossier</div>';
      return;
    }
    box.innerHTML = list.map((a) => {
      const dec = getDecimals(a.price);
      const lbl = a.cond === "above" ? "Au-dessus ≥" : (a.cond === "below" ? "En-dessous ≤" : "Croisement ⇅");
      let dist = "";
      if (a.sym === curSym && curPx) {
        const pct = ((a.price - curPx) / curPx * 100);
        dist = ' <span style="opacity:.75">(' + (pct >= 0 ? "+" : "") + pct.toFixed(2) + '%)</span>';
      }
      return '<div class="alm-row' + (a.active ? "" : " done") + '">' +
        '<div><div style="font-weight:900;font-size:12.5px"><span class="alm-tag">' + (a.folder || "Général") + '</span>' +
        a.disp + ' • ' + Number(a.price).toFixed(dec) + dist + '</div>' +
        '<div style="font-size:11px;opacity:.80;margin-top:2px">' + lbl + (a.repeat ? " • Répéter" : "") + (a.note ? " • " + a.note : "") +
        (a.active ? "" : " • ✓ Déclenchée") + '</div></div>' +
        '<div class="alm-acts">' +
        '<button type="button" class="alm-mini" data-tog="' + a.id + '">' + (a.active ? "ON" : "OFF") + '</button>' +
        '<button type="button" class="alm-mini" data-del="' + a.id + '">✕</button>' +
        '</div></div>';
    }).join("");

    box.querySelectorAll("[data-tog]").forEach((b) => {
      b.onclick = () => {
        const it = alarms.find((x) => x.id === b.dataset.tog);
        if (it) { it.active = !it.active; it.cooldownUntil = 0; saveAlarms(); renderFolderBar(); renderAlarmList(); }
      };
    });
    box.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = () => { alarms = alarms.filter((x) => x.id !== b.dataset.del); saveAlarms(); renderFolderBar(); renderAlarmList(); };
    });
  }

  function mountUI() {
    if (document.getElementById("alarm-modal")) return;

    const btn = document.createElement("button");
    btn.id = "atm-alm-btn"; btn.type = "button"; btn.title = "Dossier Alarmes";
    btn.onclick = () => openAlarmModal();
    const indBtn = document.getElementById("ind-drop-btn");
    if (indBtn && indBtn.parentElement) indBtn.insertAdjacentElement("afterend", btn);
    else { btn.style.cssText = "position:fixed;top:44px;right:12px;z-index:999;"; document.body.appendChild(btn); }

    const permGranted = ("Notification" in window && Notification.permission === "granted");
    const modal = document.createElement("div");
    modal.id = "alarm-modal"; modal.className = "m-back"; modal.style.display = "none";
    modal.onclick = closeAlarmModal;
    modal.innerHTML = `
      <div class="m-sheet" onclick="event.stopPropagation()">
        <div class="v5-head-zone">
          <div class="v5-handle"></div>
          <div class="m-hdr">
            <div><b class="alm-hdr-t">${SVG_BELL_RING} Dossier Alarmes</b><small id="alm-cur-sym">Flux temps réel</small></div>
            <button type="button" class="m-x" id="alm-x-btn">×</button>
          </div>
        </div>
        <div class="v5-scroll" style="padding:8px 14px 22px">
          <div class="alm-folders" id="alm-folders-bar"></div>

          <div class="alm-card">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
              <button type="button" class="alm-cond-btn on" data-cond="above">Au-dessus ≥</button>
              <button type="button" class="alm-cond-btn" data-cond="below">En-dessous ≤</button>
              <button type="button" class="alm-cond-btn" data-cond="cross">Croisement ⇅</button>
            </div>
            <input id="alm-price-inp" class="alm-inp" type="number" step="any" placeholder="Prix cible">
            <div class="alm-quick">
              <button type="button" class="alm-qbtn" data-pct="-0.005">-0.5%</button>
              <button type="button" class="alm-qbtn" data-pct="-0.001">-0.1%</button>
              <button type="button" class="alm-qbtn" data-pct="0.001">+0.1%</button>
              <button type="button" class="alm-qbtn" data-pct="0.005">+0.5%</button>
            </div>
            <div class="alm-grid">
              <select id="alm-folder-sel" class="alm-inp" style="font-size:12px"></select>
              <input id="alm-note-inp" class="alm-inp" type="text" placeholder="Note (Demand, TP...)" style="font-size:12px">
            </div>
            <div style="display:flex;gap:7px;margin-top:8px;align-items:center">
              <label class="alm-qbtn" style="padding:10px 10px"><input id="alm-rep-cb" type="checkbox"> Répéter</label>
              <button type="button" class="alm-add" id="alm-add-btn" style="margin-top:0;flex:1">+ Ajouter l'alarme</button>
            </div>
          </div>

          <div class="alm-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
              <b style="font-size:11.5px;display:inline-flex;align-items:center;gap:6px">${SVG_PHONE} Notif écran verrouillé (Push Mobile)</b>
              <span id="alm-tapi-st" style="font-size:10px;opacity:.85">ntfy.sh</span>
            </div>
            <div style="display:flex;gap:6px">
              <input id="alm-ntfy-inp" class="alm-inp" type="text" placeholder="Canal ntfy.sh (ex: atm-trade-987)" value="${prefs.ntfyTopic || ""}" style="font-size:11.5px;flex:1">
              <button type="button" class="alm-qbtn" id="alm-push-test" style="padding:0 11px">Tester</button>
            </div>
            <div style="display:flex;gap:6px;margin-top:7px">
              <button type="button" class="alm-qbtn" style="flex:1" id="alm-perm-btn">${permGranted ? SVG_BELL_RING + " Chrome ON" : SVG_BELL + " Notifs Chrome"}</button>
              <button type="button" class="alm-qbtn" id="alm-test-btn">${SVG_VOL} Son</button>
              <select id="alm-snd-sel" class="alm-qbtn" style="width:86px">
                <option value="pro">Bip Pro</option>
                <option value="sirene">Sirène</option>
                <option value="doux">Doux</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;font-size:11.5px;font-weight:800">
              <span>Bip à chaque nouvelle bougie</span>
              <input id="alm-chime-cb" type="checkbox" ${prefs.candleChime ? "checked" : ""}>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 6px">
            <small style="font-weight:900;opacity:.82">MES ALARMES</small>
            <button type="button" class="alm-mini" id="alm-clear-btn">Tout effacer</button>
          </div>
          <div id="alm-list"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    document.getElementById("alm-x-btn").onclick = closeAlarmModal;
    document.getElementById("alm-folder-sel").onchange = (e) => { selectedFolder = e.target.value; };
    document.getElementById("alm-perm-btn").onclick = () => {
      unlockAudio();
      if ("Notification" in window) {
        Notification.requestPermission().then((res) => {
          document.getElementById("alm-perm-btn").innerHTML = res === "granted" ? SVG_BELL_RING + " Chrome ON" : SVG_BELL + " Notifs Chrome";
        });
      }
    };
    document.getElementById("alm-test-btn").onclick = () => fireNotification("Test Alarme ATM", "Son + Vibration + Bannière Bleu Pro OK !");

    const ntfyInp = document.getElementById("alm-ntfy-inp");
    ntfyInp.onchange = () => { prefs.ntfyTopic = ntfyInp.value.trim().replace(/^https?:\/\/ntfy\.sh\//i, ""); ntfyInp.value = prefs.ntfyTopic; savePrefs(); };
    document.getElementById("alm-push-test").onclick = () => {
      prefs.ntfyTopic = ntfyInp.value.trim().replace(/^https?:\/\/ntfy\.sh\//i, "");
      ntfyInp.value = prefs.ntfyTopic; savePrefs();
      fetch("/__atm_push_test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "ATM Push Mobile OK", body: "Tes alertes fonctionneront meme ecran verrouille !", prefs })
      }).then((r) => r.json()).then((d) => {
        showToast(d.ok ? "Push envoyé !" : "Canal requis", d.ok ? "Vérifie la notification sur ton téléphone." : "Renseigne un canal ntfy.sh ou installe Termux:API.");
      }).catch(() => {});
    };

    const sndSel = document.getElementById("alm-snd-sel");
    sndSel.value = prefs.sound;
    sndSel.onchange = () => { prefs.sound = sndSel.value; savePrefs(); playTone(prefs.sound); };
    document.getElementById("alm-chime-cb").onchange = (e) => { prefs.candleChime = !!e.target.checked; savePrefs(); };

    modal.querySelectorAll("[data-cond]").forEach((b) => {
      b.onclick = () => { selCond = b.dataset.cond; modal.querySelectorAll("[data-cond]").forEach((x) => x.classList.toggle("on", x === b)); };
    });
    modal.querySelectorAll("[data-pct]").forEach((b) => {
      b.onclick = () => {
        const cur = getCurPrice(); if (!cur) return;
        const pct = parseFloat(b.dataset.pct);
        document.getElementById("alm-price-inp").value = (cur * (1 + pct)).toFixed(getDecimals(cur));
        selCond = pct >= 0 ? "above" : "below";
        modal.querySelectorAll("[data-cond]").forEach((x) => x.classList.toggle("on", x.dataset.cond === selCond));
      };
    });

    document.getElementById("alm-add-btn").onclick = () => {
      const px = parseFloat(document.getElementById("alm-price-inp").value);
      if (!Number.isFinite(px) || px <= 0) return;
      addAlarmDirect(px, selCond, document.getElementById("alm-note-inp").value, document.getElementById("alm-rep-cb").checked, document.getElementById("alm-folder-sel").value);
      document.getElementById("alm-note-inp").value = "";
      renderFolderBar(); renderAlarmList();
    };
    document.getElementById("alm-clear-btn").onclick = () => { alarms = []; saveAlarms(); renderFolderBar(); renderAlarmList(); };

    // Synchronise avec le serveur (récupère l'état Termux:API + alarmes déclenchées en veille)
    fetch("/__atm_alarms", { cache: "no-store" }).then((r) => r.json()).then((doc) => {
      termuxApiReady = !!doc.termuxApi;
      const stEl = document.getElementById("alm-tapi-st");
      if (stEl) stEl.textContent = termuxApiReady ? "Termux:API + ntfy" : "via ntfy.sh";
      if (Array.isArray(doc.alarms) && doc.alarms.length && !alarms.length) {
        alarms = doc.alarms;
        localStorage.setItem(STORE_KEY, JSON.stringify(alarms));
      } else {
        syncServerDoc();
      }
      updateBadge(); syncChartLines();
    }).catch(() => {});

    updateBadge(); mountQuickAlertOnChart(); tryHookCrosshair();
    setTimeout(() => { tryHookCrosshair(); syncChartLines(); }, 900);
  }

  // Envoie périodiquement le prix broker au serveur Python pour calibrer l'offset en veille
  setInterval(() => {
    const px = getCurPrice();
    if (!px) return;
    fetch("/__atm_ping", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sym: getCurSym(), price: px })
    }).catch(() => {});
  }, 12000);

  setInterval(() => {
    tryHookCrosshair();
    const sym = getCurSym(), px = getCurPrice();
    if (sym !== lastRenderedSym) { lastRenderedSym = sym; lastCandleTime = null; hideQuickAlert(); syncChartLines(); }
    if (!px) return;

    if (window.App && Array.isArray(App.candles) && App.candles.length) {
      const ct = App.candles[App.candles.length - 1].time;
      if (lastCandleTime !== null && ct > lastCandleTime && prefs.candleChime) {
        playTone("doux");
        showToast("Nouvelle bougie", getCurDisp() + " (" + (App.tf || "") + ") • " + px.toFixed(getDecimals(px)));
      }
      lastCandleTime = ct;
    }

    const prev = lastPrices[sym]; lastPrices[sym] = px;
    const now = Date.now(); let changed = false;

    alarms.forEach((a) => {
      if (!a.active || a.sym !== sym || (a.cooldownUntil && now < a.cooldownUntil)) return;
      let hit = false;
      if (a.cond === "above" && px >= a.price) hit = true;
      else if (a.cond === "below" && px <= a.price) hit = true;
      else if (a.cond === "cross" && prev != null && ((prev < a.price && px >= a.price) || (prev > a.price && px <= a.price))) hit = true;

      if (hit) {
        const dec = getDecimals(px);
        const dirTxt = a.cond === "above" ? "au-dessus de" : (a.cond === "below" ? "en-dessous de" : "a croisé");
        fireNotification(
          "ALARME " + a.disp,
          "[" + (a.folder || "Général") + "] Prix " + dirTxt + " " + Number(a.price).toFixed(dec) + " (actuel : " + px.toFixed(dec) + ")" + (a.note ? " — " + a.note : "")
        );
        if (a.repeat) a.cooldownUntil = now + 60000;
        else a.active = false;
        changed = true;
      }
    });

    if (changed) {
      saveAlarms();
      const m = document.getElementById("alarm-modal");
      if (m && m.style.display !== "none") { renderFolderBar(); renderAlarmList(); }
    }
  }, 250);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountUI);
  else mountUI();
})();
