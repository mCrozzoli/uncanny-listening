// Uncanny Listening — CLAP embeddings, the opt-in extra (Miguel 2026-10-28), in one worker with ONNX Runtime Web's threads
// (cross-origin isolated pages; one thread in Safari). The model and the runtime are Dark Music Corpus's (core/clap.js, copied;
// the 8-bit ONNX audio encoders it hosts). Each 10 s segment of a song (her L1 windows) is one CLAP clip — CLAP's own input
// length — taken from the mono mix resampled to 48 kHz; the song's embedding is the L2-normalised mean of its segments' (as
// dmc/clap.embed_file).
// in:  {type: "load", model, ort, wasm, fused} → {type: "ready", threads} · progress {type: "model", got, total}
//      {type: "song", id, flac: ArrayBuffer | y: Float32Array, sr, wins: [[t0, t1], …]} → {type: "song", id, seg: Float32Array[], song: Float32Array}
import * as CLAP from "./clap.js";
import { decodeFlac } from "./flac.js";
import { resample } from "./mir.js";
self.onmessage = async (ev) => {
  const m = ev.data;
  try {
    if (m.type === "load") { await CLAP.load(m.model, m.ort, m.wasm, (got, total) => self.postMessage({ type: "model", got, total }), !!m.fused); self.postMessage({ type: "ready", threads: CLAP.threads() }); return; }
    if (m.type !== "song") return;
    let y = m.y, sr = m.sr;
    if (m.flac) { const d = decodeFlac(m.flac, { mono: true }); y = d.y; sr = d.sampleRate; }
    const y48 = sr === CLAP.CLAP_SR ? y : resample(y, sr, CLAP.CLAP_SR), seg = [];
    for (const [t0, t1] of m.wins) {
      const a = Math.max(0, Math.round(t0 * CLAP.CLAP_SR)), b = Math.min(y48.length, Math.round(t1 * CLAP.CLAP_SR));
      seg.push(await CLAP.embed(y48.subarray(a, Math.max(a + 1, Math.min(b, a + CLAP.MAX)))));
    }
    const song = seg.length ? CLAP.l2mean(seg) : await CLAP.embed(y48.subarray(0, Math.min(y48.length, CLAP.MAX)));
    self.postMessage({ type: "song", id: m.id, seg, song });
  } catch (e) { self.postMessage({ type: "error", id: m.id, error: String(e && e.stack || e) }); }
};
