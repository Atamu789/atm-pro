(function () {
  if (window.__atmNativePro) return;
  window.__atmNativePro = true;

  const STORE_KEY = "atm_native_state_v1";
  let diskTimer = null;
  let restoring = false;

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; }
    catch (_) { return {}; }
  }

  function syncToDisk(obj, immediate) {
    const payload = JSON.stringify(obj);
    if (immediate && navigator.sendBeacon) {
      try { navigator.sendBeacon("/__atm_state", new Blob([payload], { type: "application/json" })); return; }
      catch (_) {}
    }
    clearTimeout(diskTimer);
    diskTimer = setTimeout(() => {
      fetch("/__atm_state", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
    }, immediate ? 0 : 120);
  }
  window.__atmSyncToDisk = syncToDisk;

  function savePatch(partial, immediate) {
    if (restoring) return;
    try {
      const next = Object.assign({}, loadState(), partial, { updatedAt: Date.now() });
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
      syncToDisk(next, !!immediate);
    } catch (_) {}
  }

  function snapshotNow(immediate) {
    if (restoring) return;
    const snap = {};
    if (window.App) {
      if (App.sym) snap.sym = App.sym;
      if (App.tf) snap.tf = App.tf;
    }
    if (window.Ind && Ind.on) {
      snap.indOn = Object.assign({}, Ind.on);
    }
    const sc = document.getElementById("scanner-card");
    if (sc) {
      snap.scannerOn = getComputedStyle(sc).display !== "none";
      if (sc.style.left) snap.scLeft = sc.style.left;
      if (sc.style.top) snap.scTop = sc.style.top;
    }
    const a2 = document.getElementById("atm2-panel");
    if (a2) snap.atm2On = getComputedStyle(a2).display !== "none";
    if (window.Draw && typeof Draw.save === "function") {
      try { Draw.save(); } catch (_) {}
    }
    savePatch(snap, immediate);
  }

  // 1) Empêche le menu #ind-dropdown de se fermer quand on clique sur un indicateur
  const dd = document.getElementById("ind-dropdown");
  if (dd) {
    dd.addEventListener("click", (e) => {
      if (!e.target || !e.target.closest || !e.target.closest(".idd-cfg")) {
        e.stopPropagation();
      }
    });
  }

  // 2) Hook natif direct sur App, Ind, Scanner, Draw et Themes
  if (window.App) {
    if (typeof App.setPair === "function") {
      const _setPair = App.setPair.bind(App);
      App.setPair = function (sym) {
        if (window.Draw && typeof Draw.save === "function") try { Draw.save(); } catch (_) {}
        const r = _setPair(sym);
        savePatch({ sym: App.sym }, true);
        if (typeof window.__atmResetPriceScale === "function") {
          window.__atmResetPriceScale();
          setTimeout(window.__atmResetPriceScale, 250);
          setTimeout(window.__atmResetPriceScale, 750);
        }
        return r;
      };
    }
    if (typeof App.setTF === "function") {
      const _setTF = App.setTF.bind(App);
      App.setTF = function (tf) {
        const r = _setTF(tf);
        savePatch({ tf: App.tf }, true);
        return r;
      };
    }
    if (typeof App.toggleAtm2Panel === "function") {
      const _tA2 = App.toggleAtm2Panel.bind(App);
      App.toggleAtm2Panel = function () {
        const r = _tA2();
        const p = document.getElementById("atm2-panel");
        savePatch({ atm2On: !!(p && getComputedStyle(p).display !== "none") }, true);
        return r;
      };
    }
  }

  if (window.Ind && typeof Ind.toggle === "function") {
    const _indToggle = Ind.toggle.bind(Ind);
    Ind.toggle = function (k) {
      const r = _indToggle(k);
      savePatch({ indOn: Object.assign({}, Ind.on) }, true);
      return r;
    };
  }

  if (window.Scanner && typeof Scanner.toggle === "function") {
    const _scToggle = Scanner.toggle.bind(Scanner);
    Scanner.toggle = function () {
      const r = _scToggle();
      const sc = document.getElementById("scanner-card");
      savePatch({ scannerOn: !!(sc && getComputedStyle(sc).display !== "none") }, true);
      return r;
    };
  }

  // Hook automatique des fonctions de thème (Themes / Theme / V5)
  ["Themes", "Theme"].forEach((globalName) => {
    const obj = window[globalName];
    if (!obj) return;
    ["set", "apply", "setTheme", "select", "pick", "use"].forEach((fn) => {
      if (typeof obj[fn] === "function") {
        const orig = obj[fn].bind(obj);
        obj[fn] = function (...args) {
          const r = orig(...args);
          if (args.length && (typeof args[0] === "string" || typeof args[0] === "number")) {
            savePatch({ themeObj: globalName, themeFn: fn, themeArg: args[0] }, true);
          }
          return r;
        };
      }
    });
  });

  // Fallback sauvegarde thème si déclenché par bouton dans Studio Apparence
  document.addEventListener("click", (e) => {
    if (restoring) return;
    const sheet = e.target && e.target.closest ? e.target.closest("#theme-modal, .m-sheet") : null;
    if (sheet && /Studio Apparence/i.test(sheet.textContent || "")) {
      const btn = e.target.closest("button, [onclick], .th-card, .th-item");
      if (btn && btn.getAttribute("onclick") && !/thTab|closeModal/i.test(btn.getAttribute("onclick"))) {
        savePatch({ themeOnclick: btn.getAttribute("onclick") }, true);
      }
    }
  }, true);

  // Sauvegarde dessins + position scanner à chaque relâchement et à la fermeture
  ["touchend", "pointerup"].forEach((ev) => {
    document.addEventListener(ev, () => {
      if (restoring) return;
      if (window.Draw && typeof Draw.save === "function") try { Draw.save(); } catch (_) {}
      const sc = document.getElementById("scanner-card");
      if (sc && sc.style.left && sc.style.top) {
        savePatch({ scLeft: sc.style.left, scTop: sc.style.top }, false);
      }
    }, { passive: true });
  });

  window.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") snapshotNow(true); });
  window.addEventListener("pagehide", () => snapshotNow(true));
  window.addEventListener("beforeunload", () => snapshotNow(true));

  // 3) Restauration native complète au démarrage
  function applySavedState(s) {
    if (!s || !s.updatedAt) return;
    restoring = true;
    try {
      // A) Thème
      if (s.themeObj && s.themeFn && s.themeArg !== undefined && window[s.themeObj] && typeof window[s.themeObj][s.themeFn] === "function") {
        try { window[s.themeObj][s.themeFn](s.themeArg); } catch (_) {}
      } else if (s.themeOnclick) {
        try { (new Function(s.themeOnclick))(); } catch (_) {}
      }

      // B) Indicateurs (Ind.on)
      if (window.Ind && Ind.on && s.indOn && typeof s.indOn === "object") {
        Object.keys(s.indOn).forEach((k) => { Ind.on[k] = !!s.indOn[k]; });
        const dxyPill = document.getElementById("dxy-pill");
        if (dxyPill && !Ind.on.dxy) dxyPill.style.display = "none";
      }

      // C) Scanner HTF + ATM2 Panel
      const sc = document.getElementById("scanner-card");
      if (sc && typeof s.scannerOn === "boolean") {
        const curOn = getComputedStyle(sc).display !== "none";
        if (curOn !== s.scannerOn) {
          if (window.Scanner && typeof Scanner.toggle === "function") {
            try { Scanner.toggle(); } catch (_) { sc.style.display = s.scannerOn ? "block" : "none"; }
          } else {
            sc.style.display = s.scannerOn ? "block" : "none";
          }
        }
        if (s.scLeft) sc.style.left = s.scLeft;
        if (s.scTop) sc.style.top = s.scTop;
      }

      const a2 = document.getElementById("atm2-panel");
      if (a2 && typeof s.atm2On === "boolean") {
        a2.style.display = s.atm2On ? "block" : "none";
      }

      // D) Actif (sym) et Timeframe (tf) + Rechargement propre des bougies & dessins
      let needReload = false;
      if (window.App) {
        if (s.sym && App.sym !== s.sym && Array.isArray(App.pairs)) {
          const p = App.pairs.find((x) => x.sym === s.sym);
          if (p) { App.sym = p.sym; App.disp = p.disp; needReload = true; }
        }
        if (s.tf && App.tf !== s.tf) {
          App.tf = typeof App.parseTF === "function" ? App.parseTF(s.tf).code : s.tf;
          needReload = true;
        }
        if (typeof App.renderIndDrop === "function") try { App.renderIndDrop(); } catch (_) {}
        if (needReload && typeof App.load === "function") {
          try { App.load(); } catch (_) {}
        } else {
          if (window.Draw && typeof Draw.load === "function") try { Draw.load(); } catch (_) {}
          if (window.Ind) {
            if (typeof Ind.draw === "function") try { Ind.draw(); } catch (_) {}
            else if (typeof Ind.calc === "function") try { Ind.calc(); } catch (_) {}
          }
        }
      }
    } finally {
      setTimeout(() => {
        restoring = false;
        if (window.App && typeof App.renderIndDrop === "function") try { App.renderIndDrop(); } catch (_) {}
      }, 350);
    }
  }

  // Charge depuis localStorage (instantané) puis synchronise si session_state.json est plus récent
  const localSnap = loadState();
  if (localSnap && localSnap.updatedAt) {
    setTimeout(() => applySavedState(localSnap), 80);
  }
  fetch("/__atm_state", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((srv) => {
      if (srv && srv.updatedAt && (!localSnap.updatedAt || srv.updatedAt > localSnap.updatedAt)) {
        localStorage.setItem(STORE_KEY, JSON.stringify(srv));
        applySavedState(srv);
      }
    })
    .catch(() => {});
})();

;(function atmLightSync(){
  function check(){
    try{
      const bg = getComputedStyle(document.body).backgroundColor || "";
      const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      const lum = m ? (+m[1]*299 + +m[2]*587 + +m[3]*114)/1000 : 0;
      document.documentElement.classList.toggle("atm-light-ui", lum > 145);
    }catch(_){}
  }
  check();
  setInterval(check, 400);
})();
