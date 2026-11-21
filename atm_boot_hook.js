(function () {
  if (window.__atmBootV3) return;
  window.__atmBootV3 = true;

  const STORE_KEY = "atm_native_state_v1";
  const bootTs = performance.now();
  const origSetTimeout = window.setTimeout.bind(window);
  const origRAF = window.requestAnimationFrame.bind(window);

  let overlayDraws = 0;
  try {
    const origClear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) {
      if (this.canvas && this.canvas.id === "overlay-canvas") overlayDraws++;
      return origClear.call(this, x, y, w, h);
    };
  } catch (_) {}

  function readSaved() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; }
    catch (_) { return {}; }
  }

  function saveZoomPatch(partial) {
    try {
      const next = Object.assign({}, readSaved(), partial, { updatedAt: Date.now() });
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
      if (typeof window.__atmSyncToDisk === "function") window.__atmSyncToDisk(next);
    } catch (_) {}
  }

  function safeWrap(obj, prop, makeFn) {
    try {
      if (!obj || typeof obj[prop] !== "function") return;
      const orig = obj[prop].bind(obj);
      const wrapped = makeFn(orig);
      Object.defineProperty(obj, prop, { value: wrapped, writable: true, configurable: true });
    } catch (_) {}
  }

  function forceOverlayRedraw(before) {
    if (overlayDraws > before) return;
    if (window.App) {
      for (const fn of ["drawOverlay", "renderOverlay", "redrawOverlay", "redraw", "render", "draw"]) {
        if (typeof App[fn] === "function") {
          try { App[fn](); } catch (_) {}
          if (overlayDraws > before) return;
        }
      }
    }
    if (window.Ind) {
      for (const fn of ["draw", "render", "drawOverlay", "renderOverlay"]) {
        if (typeof Ind[fn] === "function") {
          try { Ind[fn](); } catch (_) {}
          if (overlayDraws > before) break;
        }
      }
    }
    if (window.Draw) {
      for (const fn of ["draw", "render", "drawAll"]) {
        if (typeof Draw[fn] === "function") {
          try { Draw[fn](); } catch (_) {}
          break;
        }
      }
    }
  }

  let hookedChart = false;

  function attachSync(chart, container, initSeries) {
    if (!chart || chart.__atmSyncV3) return chart;
    chart.__atmSyncV3 = true;
    hookedChart = true;

    let mainSeries = initSeries || null, hasCandle = !!initSeries, totalBars = 0, lastSetClose = 0;
    function resetPriceScale(){
      try{ chart.priceScale("right").applyOptions({ autoScale: true }); }catch(_){}
      try{ if(mainSeries && mainSeries.priceScale) mainSeries.priceScale().applyOptions({ autoScale: true }); }catch(_){}
    }
    window.__atmResetPriceScale = resetPriceScale;
    let userTouched = false, applyingZoom = false;
    const logicalCbs = new Set(), timeCbs = new Set();
    const ts = chart.timeScale();

    function applySavedZoom() {
      if (userTouched || totalBars < 5) return false;
      const s = readSaved();
      if (typeof s.visibleBars !== "number" || s.visibleBars < 4 || typeof s.rightOffset !== "number") return false;
      const to = totalBars - s.rightOffset;
      const from = to - s.visibleBars;
      applyingZoom = true;
      try { ts.setVisibleLogicalRange({ from, to }); } catch (_) {}
      origSetTimeout(() => { applyingZoom = false; }, 80);
      return true;
    }

    safeWrap(ts, "fitContent", (origFit) => function () {
      resetPriceScale();
      if (!userTouched && (performance.now() - bootTs < 4500) && applySavedZoom()) return;
      return origFit();
    });

    function hookSeries(s, isCandle) {
      if (!s || s.__atmSeriesV3) return s;
      s.__atmSeriesV3 = true;
      if (isCandle || (!hasCandle && !mainSeries)) {
        mainSeries = s;
        if (isCandle) hasCandle = true;
        safeWrap(s, "setData", (origSet) => function (data) {
          const res = origSet(data);
          if (Array.isArray(data) && data.length >= 2) {
            totalBars = data.length;
            const lb = data[data.length - 1], nc = lb && Number(lb.close);
            if (nc > 0 && lastSetClose > 0 && Math.abs(nc - lastSetClose) / lastSetClose > 0.12) {
              resetPriceScale(); origSetTimeout(resetPriceScale, 120); origSetTimeout(resetPriceScale, 400);
            }
            if (nc > 0) lastSetClose = nc;
            if (!userTouched) {
              applySavedZoom();
              origSetTimeout(applySavedZoom, 120);
              origSetTimeout(applySavedZoom, 450);
            }
          }
          return res;
        });
      }
      return s;
    }

    ["addCandlestickSeries", "addBarSeries", "addAreaSeries", "addLineSeries", "addSeries"].forEach((fn) => {
      safeWrap(chart, fn, (origAdd) => function (...args) {
        const s = origAdd(...args);
        const isCandle = fn === "addCandlestickSeries" || fn === "addBarSeries" ||
          (fn === "addSeries" && args[0] && /candle|bar/i.test(String(args[0].type || args[0].name || "")));
        return hookSeries(s, isCandle);
      });
    });

    function saveCurrentZoom() {
      if (applyingZoom || !userTouched || totalBars < 5) return;
      try {
        const lr = ts.getVisibleLogicalRange();
        if (!lr) return;
        const vb = lr.to - lr.from;
        if (vb >= 4 && vb <= 1500) {
          saveZoomPatch({ visibleBars: +vb.toFixed(3), rightOffset: +(totalBars - lr.to).toFixed(3) });
        }
      } catch (_) {}
    }

    let zTimer = null;
    if (ts && typeof ts.subscribeVisibleLogicalRangeChange === "function") {
      try {
        ts.subscribeVisibleLogicalRangeChange(() => {
          if (applyingZoom || !userTouched) return;
          clearTimeout(zTimer);
          zTimer = origSetTimeout(saveCurrentZoom, 180);
        });
      } catch (_) {}
      safeWrap(ts, "subscribeVisibleLogicalRangeChange", (origL) => function (cb) {
        if (typeof cb === "function") logicalCbs.add(cb);
        return origL(cb);
      });
    }
    safeWrap(ts, "subscribeVisibleTimeRangeChange", (origT) => function (cb) {
      if (typeof cb === "function") timeCbs.add(cb);
      return origT(cb);
    });

    window.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveCurrentZoom(); });
    window.addEventListener("pagehide", saveCurrentZoom);

    let lastKey = "", boost = 0, busy = false;
    function flush60() {
      if (busy) return;
      busy = true;
      const before = overlayDraws;
      try {
        const lr = ts.getVisibleLogicalRange();
        const tr = ts.getVisibleRange();
        const lrC = lr ? { from: lr.from, to: lr.to } : lr;
        const trC = tr ? { from: tr.from, to: tr.to } : tr;
        logicalCbs.forEach((cb) => { try { cb(lrC); } catch (_) {} });
        timeCbs.forEach((cb) => { try { cb(trC); } catch (_) {} });
        if (overlayDraws === before) forceOverlayRedraw(before);
      } catch (_) {}
      busy = false;
    }

    const wake = () => { boost = 16; userTouched = true; };
    const el = container || document.getElementById("chart") || document.getElementById("chart-wrap");
    if (el && el.addEventListener) {
      ["touchstart", "touchmove", "touchend", "pointerdown", "pointermove", "pointerup", "wheel"].forEach((ev) => {
        el.addEventListener(ev, wake, { passive: true, capture: true });
      });
    }

    function loop60() {
      try {
        if (mainSeries) {
          const lr = ts.getVisibleLogicalRange();
          const box = el || container;
          const w = box ? box.clientWidth : 0, h = box ? box.clientHeight : 0;
          const pTop = mainSeries.coordinateToPrice(6);
          const pMid = mainSeries.coordinateToPrice(Math.max(10, Math.round(h * 0.5)));
          const pBot = mainSeries.coordinateToPrice(Math.max(16, h - 24));
          const xR = lr ? ts.logicalToCoordinate(Math.round(lr.to)) : null;
          const key = [
            lr ? lr.from.toFixed(4) : "", lr ? lr.to.toFixed(4) : "",
            pTop != null ? pTop.toFixed(4) : "", pMid != null ? pMid.toFixed(4) : "",
            pBot != null ? pBot.toFixed(4) : "", xR != null ? xR.toFixed(1) : "", w, h
          ].join("|");
          if (key !== lastKey || boost > 0) {
            lastKey = key;
            if (boost > 0) boost--;
            flush60();
          }
        }
      } catch (_) {}
      origRAF(loop60);
    }
    origRAF(loop60);
    return chart;
  }

  // Clone mutable simple (jamais de Proxy sur un module gelé)
  function wrapLib(lib) {
    if (!lib || lib.__atmBootV3 || typeof lib.createChart !== "function") return lib;
    const origCreate = lib.createChart.bind(lib);
    const clone = { __atmBootV3: true };
    try {
      Object.getOwnPropertyNames(lib).forEach((k) => {
        if (k === "createChart") return;
        try { clone[k] = lib[k]; } catch (_) {}
      });
    } catch (_) {}
    clone.createChart = function (container, options) {
      const chart = origCreate(container, options);
      try { attachSync(chart, container, null); } catch (_) {}
      return chart;
    };
    return clone;
  }

  if (window.LightweightCharts) {
    try { window.LightweightCharts = wrapLib(window.LightweightCharts); } catch (_) {}
  }

  // Filet de sécurité si le graphique a été créé sans passer par wrapLib
  [400, 1200].forEach((ms) => {
    origSetTimeout(() => {
      if (hookedChart || !window.App) return;
      let ch = null, ser = null;
      for (const v of Object.values(window.App)) {
        if (!v || typeof v !== "object") continue;
        if (!ch && typeof v.timeScale === "function" && typeof v.addCandlestickSeries === "function") ch = v;
        if (!ser && typeof v.priceToCoordinate === "function" && typeof v.coordinateToPrice === "function") ser = v;
      }
      if (ch) attachSync(ch, document.getElementById("chart"), ser);
    }, ms);
  });
})();
