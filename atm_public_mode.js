(function () {
  const origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.includes("/__atm_push_test")) {
      try {
        const d = JSON.parse((init && init.body) || "{}");
        const topic = String((d.prefs && d.prefs.ntfyTopic) || "").trim().replace(/^https?:\/\/ntfy\.sh\//i, "");
        if (!topic) return Promise.resolve(new Response('{"ok":false}', { status: 200, headers: { "Content-Type": "application/json" } }));
        const title = String(d.title || "ATM Alerte").replace(/[^\x20-\x7E]/g, "").trim() || "ATM Alerte";
        return origFetch("https://ntfy.sh/" + encodeURIComponent(topic), {
          method: "POST", body: String(d.body || ""), headers: { Title: title, Priority: "high" }
        }).then(() => new Response('{"ok":true}', { status: 200, headers: { "Content-Type": "application/json" } }))
          .catch(() => new Response('{"ok":false}', { status: 200, headers: { "Content-Type": "application/json" } }));
      } catch (_) {}
    }
    if (url.includes("/__atm_")) {
      return Promise.resolve(new Response('{"ok":true,"alarms":[],"termuxApi":false}', {
        status: 200, headers: { "Content-Type": "application/json" }
      }));
    }
    return origFetch(input, init);
  };
  if (navigator.sendBeacon) {
    const origB = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (u, d) => (String(u).includes("/__atm_") ? true : origB(u, d));
  }
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
