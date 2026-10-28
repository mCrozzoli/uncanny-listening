// Uncanny Listening — one song's features in a Web Worker (her preset: core/darklibrosa.js).
// in:  {type: "song", id, y: Float32Array (mono, native rate; transferred), sr, cfg}
//      or {type: "song", id, flac: ArrayBuffer (the file's bytes; transferred), cfg}: decoded here by core/flac.js (libsndfile-exact)
//      with cfg.stereo "midside" / "descriptors": the side signal too (s, or decoded here from the FLAC), see darklibrosa.js
// out: {type: "done", id, duration, sr_native, peak, l0, l1, ms} · {type: "progress", id, done, total} · {type: "error", id, error}
import { analyseFile, ANA_PRESET } from "./darklibrosa.js";
import { decodeFlac } from "./flac.js";
self.onmessage = (ev) => {
  const m = ev.data; if (m.type !== "song") return;
  const t0 = performance.now();
  try {
    const cfg = Object.assign({}, ANA_PRESET, m.cfg || {}), side = !!cfg.stereo && cfg.stereo !== "mono";
    let y = m.y, sr = m.sr, sd = m.s || null;
    if (m.flac) { const d = decodeFlac(m.flac, { mono: true, side }); m.flac = null; y = d.y; sd = d.s || null; sr = d.sampleRate; if (!y.length) throw new Error("decoded 0 samples"); }
    const r = analyseFile(y, sr, cfg, (done, total) => self.postMessage({ type: "progress", id: m.id, done, total }), sd);
    self.postMessage({ type: "done", id: m.id, ms: performance.now() - t0, ...r });
  } catch (e) { self.postMessage({ type: "error", id: m.id, error: String(e && e.stack || e) }); }
};
