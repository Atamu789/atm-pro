(function () {
  const PIN = "7890"; // <-- Change ton code ici si tu veux
  const KEY = "atm_unlock_v1_" + PIN;
  if (localStorage.getItem(KEY) === "1") return;

  const lock = document.createElement("div");
  lock.id = "atm-pin-lock";
  lock.style.cssText =
    "position:fixed;inset:0;z-index:999999;background:#0b0f19;color:#f8fafc;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center;";
  lock.innerHTML =
    '<div style="width:100%;max-width:300px;background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:24px;box-shadow:0 20px 40px rgba(0,0,0,.6)">' +
      '<div style="font-size:22px;font-weight:900;letter-spacing:1px;color:#38bdf8;margin-bottom:6px">Atm</div>' +
      '<div style="font-size:12px;color:#94a3b8;margin-bottom:18px">Accès privé • Code requis</div>' +
      '<input id="atm-pin-in" type="password" inputmode="numeric" placeholder="Code d\'accès" ' +
        'style="width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#0b0f19;color:#fff;font-size:18px;text-align:center;letter-spacing:6px;outline:none;margin-bottom:12px">' +
      '<button id="atm-pin-btn" type="button" ' +
        'style="width:100%;padding:12px;border:0;border-radius:10px;background:#38bdf8;color:#0b0f19;font-weight:900;font-size:14px;cursor:pointer">Déverrouiller</button>' +
      '<div id="atm-pin-err" style="font-size:12px;color:#fb7185;margin-top:10px;min-height:16px"></div>' +
    '</div>';

  const mount = () => {
    if (!document.body) return setTimeout(mount, 20);
    document.body.appendChild(lock);
    const inp = document.getElementById("atm-pin-in");
    const btn = document.getElementById("atm-pin-btn");
    const err = document.getElementById("atm-pin-err");
    const check = () => {
      if ((inp.value || "").trim() === PIN) {
        localStorage.setItem(KEY, "1");
        lock.remove();
      } else {
        err.textContent = "Code incorrect";
        inp.value = "";
        inp.focus();
      }
    };
    btn.onclick = check;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
    setTimeout(() => inp.focus(), 100);
  };
  mount();
})();
