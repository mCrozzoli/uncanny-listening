// Uncanny Listening: copied from Dark Music Corpus (web_implementation/coi-sw.js, MIT, Miguel Angel Crozzoli), unchanged below.
// Cross-origin isolation for GitHub Pages (which sends no COOP/COEP headers), so ONNX Runtime can run CLAP on several
// threads (SharedArrayBuffer). COEP "credentialless" (not require-corp) so cross-origin resources without CORP headers —
// the Google Fonts of the style kit — still load. Scope: this folder only. Browsers without credentialless (Safari) stay
// unisolated and CLAP runs on one thread there.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.cache === "only-if-cached" && req.mode !== "same-origin") return;
  e.respondWith((async () => {
    const res = await fetch(req);
    if (res.status === 0) return res;
    const h = new Headers(res.headers);
    h.set("Cross-Origin-Embedder-Policy", "credentialless");
    h.set("Cross-Origin-Opener-Policy", "same-origin");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  })());
});
