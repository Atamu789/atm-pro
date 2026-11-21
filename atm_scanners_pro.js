(function () {
  if (window.__atmScannersProV3) return;
  window.__atmScannersProV3 = true;

  const POS_KEY = "atm_scanners_pos_v1";
  const CFG_KEY = "atm_scanners_cfg_v1";
  let posState = {};
  let cfg = { swing: false, lineAlert: true };
  try { posState = JSON.parse(localStorage.getItem(POS_KEY) || "{}") || {}; } catch (_) { posState = {}; }
  try { cfg = Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || "{}") || {}); } catch (_) {}

  function savePos() { try { localStorage.setItem(POS_KEY, JSON.stringify(posState)); } catch (_) {} }
  function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (_) {} }

  function clampPosition(el, x, y) {
    const vw = window.innerWidth || 390, vh = window.innerHeight || 800;
    const w = el.offsetWidth || 220, h = Math.min(el.offsetHeight || 120, vh - 120);
    const maxX = Math.max(4, vw - Math.min(w, vw - 8) - 4);
    const maxY = Math.max(58, vh - Math.min(h, 90) - 66);
    return { x: Math.round(Math.min(Math.max(4, x), maxX)), y: Math.round(Math.min(Math.max(56, y), maxY)) };
  }

  function applySavedPos(el, key) {
    if (!el) return;
    const saved = posState[key];
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      const c = clampPosition(el, saved.x, saved.y);
      el.style.left = c.x + "px"; el.style.top = c.y + "px";
      el.style.right = "auto"; el.style.bottom = "auto"; el.style.margin = "0";
    }
    if (saved && saved.folded) el.classList.add("atm-folded");
  }

  function makeDraggable(el, key, titleTxt) {
    if (!el) return;
    let bar = el.querySelector(":scope > .atm-drag-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "atm-drag-bar";
      bar.innerHTML =
        '<span class="atm-drag-title"><span class="atm-grip-dots">⋮⋮</span><span>' + titleTxt + '</span></span>' +
        '<button type="button" class="atm-mini-btn" title="Plier / Déplier">' + (el.classList.contains("atm-folded") ? "+" : "—") + '</button>';
      el.insertBefore(bar, el.firstChild);
      const mini = bar.querySelector(".atm-mini-btn");
      mini.addEventListener("click", (e) => {
        e.stopPropagation();
        const folded = el.classList.toggle("atm-folded");
        mini.textContent = folded ? "+" : "—";
        posState[key] = Object.assign({}, posState[key] || {}, { folded });
        savePos();
      });
    }
    if (el.__atmDragBound) return;
    el.__atmDragBound = true;

    let dragging = false, moved = false, startX = 0, startY = 0, baseX = 0, baseY = 0, fromBar = false;
    const getPt = (e) => {
      const t = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e);
      return { x: t.clientX, y: t.clientY };
    };
    function onStart(e) {
      if (e.target && e.target.closest(".atm-mini-btn, .acf-tog")) return;
      fromBar = !!(e.target && e.target.closest(".atm-drag-bar"));
      if (!fromBar && e.target && e.target.closest("button, input, select, textarea, a, label, [onclick]")) return;
      const pt = getPt(e), r = el.getBoundingClientRect();
      startX = pt.x; startY = pt.y; baseX = Math.round(r.left); baseY = Math.round(r.top);
      dragging = true; moved = false;
      if (fromBar) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }
    }
    function onMove(e) {
      if (!dragging) return;
      const pt = getPt(e), dx = pt.x - startX, dy = pt.y - startY;
      if (!moved && Math.hypot(dx, dy) < (fromBar ? 2 : 7)) return;
      moved = true; e.stopPropagation(); if (e.cancelable) e.preventDefault();
      const c = clampPosition(el, baseX + dx, baseY + dy);
      el.style.left = c.x + "px"; el.style.top = c.y + "px";
      el.style.right = "auto"; el.style.bottom = "auto"; el.style.margin = "0";
    }
    function onEnd() {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        const r = el.getBoundingClientRect();
        posState[key] = Object.assign({}, posState[key] || {}, { x: Math.round(r.left), y: Math.round(r.top) });
        savePos();
      }
    }
    el.addEventListener("touchstart", onStart, { capture: true, passive: false });
    window.addEventListener("touchmove", onMove, { capture: true, passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("mousedown", onStart, { capture: true });
    window.addEventListener("mousemove", onMove, { capture: true });
    window.addEventListener("mouseup", onEnd);
  }

  function fmtPx(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return "--";
    return n < 10 ? n.toFixed(4) : n.toFixed(2);
  }

  function getCurPrice() {
    if (window.App && Array.isArray(App.candles) && App.candles.length) {
      const c = Number(App.candles[App.candles.length - 1].close);
      if (Number.isFinite(c) && c > 0) return c;
    }
    return null;
  }

  function readAtm2() {
    let dir = "", entry = null, sl = null, tp1 = null, tp2 = null, mtfAlign = 0;
    let t1H = false, t2H = false, slH = false;
    if (window.Ind && Ind.data && Array.isArray(Ind.data.sigs) && Ind.data.sigs.length) {
      const cur = Ind.data.sigs[Ind.data.sigs.length - 1];
      if (cur) {
        dir = cur.isB ? "ACHAT" : "VENTE";
        entry = cur.entry; sl = cur.sl; tp1 = cur.tp1; tp2 = cur.tp2;
        t1H = !!cur.t1H; t2H = !!cur.t2H; slH = !!cur.slH;
      }
    }
    const p = document.getElementById("atm2-panel");
    if (!dir && p) {
      const txt = p.innerText || "";
      if (/VENTE/i.test(txt)) dir = "VENTE";
      else if (/ACHAT/i.test(txt)) dir = "ACHAT";
      const grab = (lbl) => {
        const m = txt.match(new RegExp(lbl + "\\s+([0-9]+(?:\\.[0-9]+)?)", "i"));
        return m ? parseFloat(m[1]) : null;
      };
      if (!entry) entry = grab("Entr[ée]e");
      if (!sl) sl = grab("SL");
      if (!tp1) tp1 = grab("TP1");
      if (!tp2) tp2 = grab("TP2");
    }
    if (window.App && App.htf && dir) {
      const want = dir === "ACHAT" ? 1 : -1;
      ["5m", "15m", "1h", "4h"].forEach((tf) => { if (App.htf[tf] === want) mtfAlign++; });
    }
    return { dir, entry, sl, tp1, tp2, mtfAlign, t1H, t2H, slH };
  }

  function readHtfScanner() {
    const sc = document.getElementById("scanner-card");
    if (!sc) return { score: null, bias: "WAIT", reason: "", isLow: false };
    const clone = sc.cloneNode(true);
    ["#atm-conf-box", ".atm-drag-bar"].forEach((sel) => { const rm = clone.querySelector(sel); if (rm) rm.remove(); });
    const txt = (clone.innerText || clone.textContent || "").replace(/\s+/g, " ").trim();
    const sm = txt.match(/(\d{1,3})\s*\/\s*100/);
    const score = sm ? Math.min(100, parseInt(sm[1], 10)) : null;
    let bias = "WAIT";
    if (/\b(STRONG\s*BUY|ACHAT|BUY\b|LONG\b)/i.test(txt) && !/\bWAIT\b/i.test(txt)) bias = "ACHAT";
    else if (/\b(STRONG\s*SELL|VENTE|SELL\b|SHORT\b)/i.test(txt) && !/\bWAIT\b/i.test(txt)) bias = "VENTE";
    let reason = "";
    const rm = txt.match(/(WAIT\s*[—–-]\s*[^S]+?)(?:SCAN|RISK|$)/i);
    if (rm) reason = rm[1].trim().slice(0, 34);
    const isLow = /QUALITY\s*LOW/i.test(txt) || /RANGE/i.test(txt);
    return { score, bias, reason, isLow };
  }

  function computeConfirmation(hitsSummary) {
    const a2 = readAtm2(), ia = readHtfScanner(), curPx = getCurPrice();
    if (!a2.dir) {
      return { cls: "st-wait", badge: "EN VEILLE • AUCUN TRADE ATM 2", shortTxt: "En attente signal", msg: "Attends un setup PE / SL / TP sur ATM 2.", a2, ia };
    }
    const isBuy = a2.dir === "ACHAT";
    const scTxt = ia.score !== null ? ia.score + "/100" : "--";

    // 1) Contrôle TP2 atteint / SL touché / TP1 déjà dépassé
    const hitTP2 = a2.t2H || (curPx && a2.tp2 && (isBuy ? curPx >= a2.tp2 : curPx <= a2.tp2));
    const hitSL = a2.slH || (curPx && a2.sl && (isBuy ? curPx <= a2.sl : curPx >= a2.sl));
    const hitTP1 = a2.t1H || (curPx && a2.tp1 && (isBuy ? curPx >= a2.tp1 : curPx <= a2.tp1));

    if (hitTP2) {
      return {
        cls: "st-bad", badge: "⛔ TP2 ATTEINT • TROP TARDIF", shortTxt: "⛔ TP2 ATTEINT",
        msg: "Prix actuel (" + fmtPx(curPx) + ") au-delà du TP2 (" + fmtPx(a2.tp2) + "). N'entre plus, attends le prochain signal.",
        a2, ia
      };
    }
    if (hitSL) {
      return {
        cls: "st-bad", badge: "✖ SL TOUCHÉ • INVALIDÉ", shortTxt: "✖ SL TOUCHÉ",
        msg: "Le SL (" + fmtPx(a2.sl) + ") a été touché. Setup terminé, attends le prochain signal ATM 2.",
        a2, ia
      };
    }
    if (hitTP1) {
      return {
        cls: "st-wait", badge: "⚠ TP1 DÉJÀ PASSÉ • RETARD", shortTxt: "⚠ TP1 PASSÉ",
        msg: "TP1 (" + fmtPx(a2.tp1) + ") déjà atteint. Entrée tardive : attends un pullback ou le prochain setup.",
        a2, ia
      };
    }

    // 2) Confluence IA + Lignes Verte/Rouge
    const opp = (isBuy && ia.bias === "VENTE") || (!isBuy && ia.bias === "ACHAT");
    const extraHit = hitsSummary ? " • " + hitsSummary : "";

    if (opp || (a2.mtfAlign <= 1 && ia.score !== null && ia.score < 45)) {
      return {
        cls: "st-bad", badge: "⚠ CONFLIT HTF (" + a2.dir + ")", shortTxt: "⚠ CONFLIT " + scTxt,
        msg: "HTF IA contredit ATM 2 (MTF " + a2.mtfAlign + "/4 • IA " + scTxt + ")" + extraHit + ".",
        a2, ia
      };
    }
    const strongIA = (ia.bias === a2.dir && (ia.score === null || ia.score >= 55)) ||
                     (a2.mtfAlign >= 3 && ia.score !== null && ia.score >= 65 && !ia.isLow);
    if (strongIA) {
      return {
        cls: "st-ok", badge: "✓ " + a2.dir + " CONFIRMÉ PAR IA", shortTxt: "✓ VALIDÉ " + scTxt,
        msg: "Confluence validée : MTF " + a2.mtfAlign + "/4 • IA " + scTxt + extraHit + ".",
        a2, ia
      };
    }
    return {
      cls: "st-wait", badge: "⏳ ATTENTE CONFIRMATION (" + a2.dir + ")", shortTxt: "⏳ ATTENTE " + scTxt,
      msg: "MTF " + a2.mtfAlign + "/4 • IA " + scTxt + (ia.reason ? " • " + ia.reason : "") + extraHit + ".",
      a2, ia
    };
  }

  // === MOTEUR MULTI-TF STRICT : LIGNE VERTE / ROUGE SUPERTREND UNIQUEMENT ===
  const BASE_TFS = ["5m", "15m", "1h", "4h"];
  const SWING_TFS = ["1d", "1w"];
  const TF_LBL = { "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1J", "1w": "1S" };
  const TF_CD_MS = { "5m": 300000, "15m": 900000, "1h": 1800000, "4h": 3600000, "1d": 3600000, "1w": 3600000 };
  const CD_KEY = "atm_line_cd_v1";

  let mtfCache = {};
  let mtfStatus = {};
  let alertCooldown = {};
  let lastScanSym = "";
  let scanBusy = false;

  try { alertCooldown = JSON.parse(localStorage.getItem(CD_KEY) || "{}") || {}; } catch (_) { alertCooldown = {}; }
  function saveCooldown() { try { localStorage.setItem(CD_KEY, JSON.stringify(alertCooldown)); } catch (_) {} }
  function activeTfs() { return cfg.swing ? BASE_TFS.concat(SWING_TFS) : BASE_TFS; }

  function getStParams() {
    let per = 10, mult = 3.0;
    try {
      if (window.Ind) {
        const c = Ind.cfg || Ind.conf || Ind.params || Ind.opt || Ind.settings || {};
        const p = Number(c.atrPer ?? c.atrLen ?? c.stPer ?? c.period ?? c.atr ?? c.len);
        const m = Number(c.atrMult ?? c.stMult ?? c.mult ?? c.factor ?? c.m);
        if (Number.isFinite(p) && p >= 2 && p <= 100) per = Math.round(p);
        if (Number.isFinite(m) && m >= 0.5 && m <= 10) mult = m;
      }
    } catch (_) {}
    return { per, mult };
  }

  function mapToBinance(sym) {
    const s = String(sym || "").toUpperCase();
    if (/XAU|GOLD|PAXG/.test(s)) return { url: "https://api.binance.com/api/v3/klines?symbol=PAXGUSDT" };
    let b = s.replace(/[_-]?(FUT|VT|CFD|SPOT)$/i, "").replace(/[^A-Z0-9]/g, "");
    if (b.endsWith("USD") && !b.endsWith("USDT")) b += "T";
    else if (!b.endsWith("USDT")) b += "USDT";
    const host = /FUT/i.test(s) ? "https://fapi.binance.com/fapi/v1/klines" : "https://api.binance.com/api/v3/klines";
    return { url: host + "?symbol=" + b };
  }

  function calcSupertrendOnly(cs) {
    const { per, mult } = getStParams();
    if (!Array.isArray(cs) || cs.length < per + 5) return null;
    const n = cs.length;
    const tr = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const c = cs[i], p = cs[i - 1];
      tr[i] = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    }
    // ATR Wilder (standard TradingView / ATM 2)
    let atr = 0;
    for (let i = 1; i <= per; i++) atr += tr[i];
    atr /= per;
    let stUp = 0, stDn = 0, stDir = 1;
    for (let i = per; i < n; i++) {
      if (i > per) atr = (atr * (per - 1) + tr[i]) / per;
      const hl2 = (cs[i].high + cs[i].low) / 2;
      const upB = hl2 + mult * atr;
      const dnB = hl2 - mult * atr;
      if (i === per) {
        stUp = upB; stDn = dnB; stDir = 1;
      } else {
        stUp = (upB < stUp || cs[i - 1].close > stUp) ? upB : stUp;
        stDn = (dnB > stDn || cs[i - 1].close < stDn) ? dnB : stDn;
        if (stDir === 1 && cs[i].close < stDn) stDir = -1;
        else if (stDir === -1 && cs[i].close > stUp) stDir = 1;
      }
    }
    return {
      dir: stDir,
      green: stDir === 1 ? stDn : null,
      red: stDir === -1 ? stUp : null,
      atr: Math.max(atr, cs[n - 1].close * 0.0003),
      ts: Date.now()
    };
  }

  function readExactNativeSt(curPx) {
    try {
      if (!window.Ind || !Ind.data) return null;
      const d = Ind.data;
      const arr = d.st || d.supertrend || d.stLine || d.line || d.pts;
      if (!Array.isArray(arr) || !arr.length) return null;
      const last = arr[arr.length - 1];
      let val = null, dir = null;
      if (typeof last === "number") {
        val = last;
        const dArr = d.stDir || d.dir || d.trend;
        if (Array.isArray(dArr) && dArr.length) dir = Number(dArr[dArr.length - 1]) >= 0 ? 1 : -1;
      } else if (last && typeof last === "object") {
        val = Number(last.v ?? last.val ?? last.value ?? last.price ?? last.y);
        if (last.dir !== undefined) dir = Number(last.dir) >= 0 ? 1 : -1;
        else if (last.isB !== undefined) dir = last.isB ? 1 : -1;
        else if (last.bull !== undefined) dir = last.bull ? 1 : -1;
      }
      if (!Number.isFinite(val) || val <= 0) return null;
      if (curPx && Math.abs(val - curPx) / curPx > 0.25) return null;
      if (dir === null && curPx) dir = val <= curPx ? 1 : -1;
      return { dir, green: dir === 1 ? val : null, red: dir === -1 ? val : null };
    } catch (_) { return null; }
  }

  async function fetchTfLevels(sym, tf) {
    const curPx = getCurPrice();
    if (window.App && App.tf === tf && Array.isArray(App.candles) && App.candles.length >= 20) {
      const lv = calcSupertrendOnly(App.candles.slice(-140));
      const nat = readExactNativeSt(curPx);
      if (lv && nat) { lv.dir = nat.dir; lv.green = nat.green; lv.red = nat.red; }
      return lv;
    }
    const info = mapToBinance(sym);
    try {
      const res = await fetch(info.url + "&interval=" + tf + "&limit=140", { cache: "no-store" });
      if (!res.ok) return null;
      const arr = await res.json();
      if (!Array.isArray(arr) || arr.length < 20) return null;
      const rawLast = parseFloat(arr[arr.length - 1][4]);
      let offset = 0;
      if (curPx && rawLast > 0 && Math.abs(curPx - rawLast) / curPx < 0.08) offset = curPx - rawLast;
      const cs = arr.map((k) => ({
        high: parseFloat(k[2]) + offset,
        low: parseFloat(k[3]) + offset,
        close: parseFloat(k[4]) + offset
      }));
      return calcSupertrendOnly(cs);
    } catch (_) { return null; }
  }

  async function refreshAllMtfLevels() {
    if (scanBusy || !window.App || !App.sym) return;
    scanBusy = true;
    const sym = App.sym;
    if (sym !== lastScanSym) { lastScanSym = sym; mtfCache = {}; mtfStatus = {}; }
    try {
      await Promise.all(activeTfs().map(async (tf) => {
        const lv = await fetchTfLevels(sym, tf);
        if (lv && App.sym === sym) mtfCache[tf] = lv;
      }));
      evaluateMtfTouches();
    } finally { scanBusy = false; }
  }

  function beepLine(isGreen) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC(), now = ctx.currentTime;
      (isGreen ? [784, 1175] : [620, 440]).forEach((f, idx) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "triangle"; o.frequency.setValueAtTime(f, now + idx * 0.13);
        g.gain.setValueAtTime(0.001, now + idx * 0.13);
        g.gain.exponentialRampToValueAtTime(0.24, now + idx * 0.13 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.13 + 0.16);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + idx * 0.13); o.stop(now + idx * 0.13 + 0.18);
      });
    } catch (_) {}
  }

  function showLineToast(title, body, isGreen) {
    let wrap = document.getElementById("alm-toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.id = "alm-toast-wrap"; document.body.appendChild(wrap); }
    const col = isGreen ? "#10b981" : "#f43f5e";
    const el = document.createElement("div");
    el.className = "alm-toast";
    el.style.borderColor = col;
    el.innerHTML =
      '<div><div style="font-weight:900;font-size:12px;color:' + col + '">' + title + '</div>' +
      '<div style="font-size:11px;opacity:.92;margin-top:2px">' + body + '</div></div>' +
      '<button type="button" style="padding:5px 9px;border:0;border-radius:7px;background:' + col + ';color:#fff;font-weight:900;cursor:pointer">OK</button>';
    el.querySelector("button").onclick = () => el.remove();
    wrap.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 8000);
  }

  function fireLineAlert(tf, side, lvlPx, curPx) {
    if (!cfg.lineAlert) return;
    const sym = (window.App && App.sym) ? App.sym : "ACTIF";
    const disp = (window.App && App.disp) ? App.disp : sym;
    const key = sym + "|" + tf + "|" + side;
    const now = Date.now();
    if (alertCooldown[key] && now < alertCooldown[key]) return;
    alertCooldown[key] = now + (TF_CD_MS[tf] || 600000);
    saveCooldown();

    const isG = side === "G", lbl = TF_LBL[tf] || tf;
    const title = (isG ? "LIGNE VERTE TOUCHÉE [" : "LIGNE ROUGE TOUCHÉE [") + lbl + "] " + disp;
    const body = "Contact réel " + fmtPx(lvlPx) + " (prix : " + fmtPx(curPx) + ")";
    beepLine(isG);
    if (navigator.vibrate) try { navigator.vibrate([180, 90, 220]); } catch (_) {}
    showLineToast(title, body, isG);
    try {
      const p = JSON.parse(localStorage.getItem("atm_alarm_prefs_v1") || "{}") || {};
      if (p.ntfyTopic) {
        fetch("/__atm_push_test", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, prefs: p })
        }).catch(() => {});
      }
    } catch (_) {}
  }

  function evaluateMtfTouches() {
    const curPx = getCurPrice();
    if (!curPx) return "";
    const curC = (window.App && Array.isArray(App.candles) && App.candles.length) ? App.candles[App.candles.length - 1] : null;
    const hitsTxt = [];

    activeTfs().forEach((tf) => {
      const lv = mtfCache[tf];
      if (!lv) return;
      // Tolérance ultra-serrée : uniquement si le prix touche vraiment la ligne verte ou rouge
      const tol = Math.min(Math.max(lv.atr * 0.04, curPx * 0.00012), curPx * 0.0005);
      const nearMax = Math.max(tol * 3, lv.atr * 0.14);
      const sameTf = (window.App && App.tf === tf && curC);
      const chkLow = sameTf ? Math.min(curPx, Number(curC.low || curPx)) : curPx;
      const chkHigh = sameTf ? Math.max(curPx, Number(curC.high || curPx)) : curPx;

      let hitG = false, hitR = false;
      if (lv.dir === 1 && lv.green != null) {
        hitG = (chkLow <= lv.green + tol) && (curPx <= lv.green + nearMax);
      } else if (lv.dir === -1 && lv.red != null) {
        hitR = (chkHigh >= lv.red - tol) && (curPx >= lv.red - nearMax);
      }

      mtfStatus[tf] = { hitG, hitR, dir: lv.dir, lvl: lv.dir === 1 ? lv.green : lv.red };
      if (hitG) { hitsTxt.push("Vert " + (TF_LBL[tf] || tf)); fireLineAlert(tf, "G", lv.green, curPx); }
      if (hitR) { hitsTxt.push("Rouge " + (TF_LBL[tf] || tf)); fireLineAlert(tf, "R", lv.red, curPx); }
    });
    return hitsTxt.length ? "Contact " + hitsTxt.slice(0, 3).join(", ") : "";
  }

  let lastSigKey = "";

  function syncBothScanners() {
    const p2 = document.getElementById("atm2-panel");
    const sc = document.getElementById("scanner-card");
    if (p2) { makeDraggable(p2, "atm2", "ATM 2 • PE / TP / SL"); if (!p2.__posInit) { p2.__posInit = true; applySavedPos(p2, "atm2"); } }
    if (sc) { makeDraggable(sc, "scanner", "CONFIRMATION HTF IA"); if (!sc.__posInit) { sc.__posInit = true; applySavedPos(sc, "scanner"); } }

    const hitsSummary = evaluateMtfTouches();
    const v = computeConfirmation(hitsSummary);
    const tfs = activeTfs();
    const curTf = (window.App && App.tf) ? App.tf : "5m";
    const curSt = mtfStatus[curTf];
    const curLbl = curSt && curSt.lvl ? (" • " + (curSt.dir === 1 ? "V " : "R ") + fmtPx(curSt.lvl)) : "";

    const pillsKey = tfs.map((tf) => {
      const st = mtfStatus[tf] || {};
      return tf + (st.hitG ? "G" : (st.hitR ? "R" : (st.dir || 0)));
    }).join(",");
    const sigKey = [v.cls, v.badge, v.msg, fmtPx(v.a2.entry), fmtPx(v.a2.sl), fmtPx(v.a2.tp1), fmtPx(v.a2.tp2), v.a2.mtfAlign, pillsKey, curLbl, cfg.swing, cfg.lineAlert].join("|");

    if (sc) {
      let box = sc.querySelector("#atm-conf-box");
      if (!box) {
        box = document.createElement("div");
        box.id = "atm-conf-box";
        const bar = sc.querySelector(":scope > .atm-drag-bar");
        if (bar && bar.nextSibling) sc.insertBefore(box, bar.nextSibling);
        else sc.appendChild(box);
        lastSigKey = "";
      }
      if (sigKey !== lastSigKey) {
        box.className = v.cls;
        const pillsHtml = tfs.map((tf) => {
          const st = mtfStatus[tf] || {};
          let cls = "acf-pill", tag = TF_LBL[tf] || tf;
          if (st.hitG) { cls += " hit-g"; tag += " ● V"; }
          else if (st.hitR) { cls += " hit-r"; tag += " ● R"; }
          const tip = st.lvl ? (' title="' + (st.dir === 1 ? "Ligne verte " : "Ligne rouge ") + fmtPx(st.lvl) + '"') : "";
          return '<span class="' + cls + '"' + tip + '>' + tag + '</span>';
        }).join("");

        box.innerHTML =
          '<div class="acf-top"><span class="acf-badge">' + v.badge + '</span><span class="acf-mtf">MTF ' + v.a2.mtfAlign + '/4</span></div>' +
          '<div class="acf-lvls">' +
            '<div class="acf-lv"><span>PE</span><b>' + fmtPx(v.a2.entry) + '</b></div>' +
            '<div class="acf-lv"><span>SL</span><b style="color:#fb7185">' + fmtPx(v.a2.sl) + '</b></div>' +
            '<div class="acf-lv"><span>TP1</span><b style="color:#fbbf24">' + fmtPx(v.a2.tp1) + '</b></div>' +
            '<div class="acf-lv"><span>TP2</span><b style="color:#34d399">' + fmtPx(v.a2.tp2) + '</b></div>' +
          '</div>' +
          '<div class="acf-msg">' + v.msg + '</div>' +
          '<div class="acf-lines-hdr"><span>LIGNE ' + (TF_LBL[curTf] || curTf) + curLbl + '</span><span class="acf-togs">' +
            '<button type="button" class="acf-tog' + (cfg.swing ? " on" : "") + '" id="acf-swing-btn">SWING 1J/1S</button>' +
            '<button type="button" class="acf-tog' + (cfg.lineAlert ? " on" : "") + '" id="acf-alrt-btn">' + (cfg.lineAlert ? "ALERTE ON" : "ALERTE OFF") + '</button>' +
          '</span></div>' +
          '<div class="acf-pills">' + pillsHtml + '</div>';

        const swBtn = box.querySelector("#acf-swing-btn");
        if (swBtn) swBtn.onclick = (e) => { e.stopPropagation(); cfg.swing = !cfg.swing; saveCfg(); lastSigKey = ""; refreshAllMtfLevels(); syncBothScanners(); };
        const alBtn = box.querySelector("#acf-alrt-btn");
        if (alBtn) alBtn.onclick = (e) => { e.stopPropagation(); cfg.lineAlert = !cfg.lineAlert; saveCfg(); lastSigKey = ""; syncBothScanners(); };
      }
    }

    if (p2) {
      let strip = p2.querySelector("#atm2-conf-strip");
      if (!strip) { strip = document.createElement("div"); strip.id = "atm2-conf-strip"; p2.appendChild(strip); }
      strip.className = v.cls;
      strip.innerHTML = '<span>CONFIRM. IA</span><span>' + v.shortTxt + '</span>';
    }
    lastSigKey = sigKey;
  }

  function hookIndRender() {
    if (window.Ind && typeof Ind.renderPanel === "function" && !Ind.renderPanel.__atmSyncV3) {
      const orig = Ind.renderPanel.bind(Ind);
      const wrapped = function (...args) { const r = orig(...args); syncBothScanners(); return r; };
      wrapped.__atmSyncV3 = true;
      Ind.renderPanel = wrapped;
    }
  }

  function boot() {
    hookIndRender();
    syncBothScanners();
    setTimeout(refreshAllMtfLevels, 1000);
    setInterval(() => { hookIndRender(); syncBothScanners(); }, 800);
    setInterval(refreshAllMtfLevels, 15000);
    window.addEventListener("resize", () => {
      applySavedPos(document.getElementById("atm2-panel"), "atm2");
      applySavedPos(document.getElementById("scanner-card"), "scanner");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
