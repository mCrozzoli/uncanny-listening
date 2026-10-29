// Uncanny Listening — linked maps (small multiples, D3 + SVG so any view exports as a figure).
// Every map shows the same songs; hovering, selecting, brushing or tracing in one lights the same songs in all of them.
// makeMaps(root, ctx) → {update(), setDefs(defs)}. ctx supplies the data and the state:
//   songs [{id, ...}], value(song, axis) ∈ [0, 1], colour(song), stroke(song) | null, label(axis), title(def),
//   sel: Set of ids, hover: id | null, trace: [ids], brushed: Set | null, field(def) → {nx, ny, p: Float32Array} | null (P2),
//   on: {hover(id), click(id, ev), brush(ids | null, ev)}; tool() → "none" | "brush" | "lasso"; hoverOn() → bool
// The selection tools are the house's (Dark Re-wilding's brush.js, after darkpulsar / dark_ocean): BRUSH = a stroke, every song
// it passes near is picked up (nothing by enclosure); LASSO = a closed path, every song inside it. Armed from TRACE only, so a
// plain drag never selects; shift adds to the selection.
const d3 = window.d3;
const NS = "http://www.w3.org/2000/svg";

export function makeMaps(root, ctx) {
  // Layout (Miguel 2026-10-29): the main map (defs[0]) fills the display; the other maps sit as thumbnails in a strip at
  // the bottom, the proposed one as a thumbnail in the top-right corner; clicking a thumbnail splits the display half and
  // half (main + that map), × closes the split. Thumbnails are drawn at a larger internal size and scaled down, so a figure
  // export stays sharp; they take no pointer events except the click that opens them.
  let defs = [], cells = [], second = null;
  const key = (d) => `${d.x}|${d.y}|${d.proposed ? 1 : 0}`, GAP = 12, THUMB = 118, PIP = 150, INNER = 300;
  const box = () => { const pe = root.parentElement, cs = pe ? getComputedStyle(pe) : null;
    const pad = (a, b) => (cs ? parseFloat(cs[a]) + parseFloat(cs[b]) : 0);
    return { w: root.clientWidth || (pe ? pe.clientWidth - pad("paddingLeft", "paddingRight") : 900), h: root.clientHeight || (pe ? pe.clientHeight - pad("paddingTop", "paddingBottom") : 700) }; };
  const div = (cls) => { const d = document.createElement("div"); d.className = cls; return d; };

  function build() {
    root.innerHTML = ""; cells = []; root.classList.add("mlayout");
    if (!defs.length) return;
    if (second && !defs.some((d) => key(d) === second)) second = null;
    const main = defs[0], prop = defs.find((d, i) => i > 0 && d.proposed), rest = defs.slice(1).filter((d) => d !== prop);
    const sec = second ? defs.find((d) => key(d) === second) : null;
    const { w, h } = box(), stripH = rest.length - (sec && rest.includes(sec) ? 1 : 0) > 0 ? THUMB + 34 : 0;
    const stageH = Math.max(260, h - stripH - (stripH ? GAP : 0)), cap = 30;
    // the stage cells fill the stage (width × height, not square: every axis is 0–1 already)
    const sh = Math.floor(Math.max(220, stageH - cap)), sw = Math.floor(Math.max(260, sec ? (w - GAP) / 2 - 14 : w - 14));
    const stage = div("mstage"), strip = div("mstrip"); root.append(stage);
    cell(main, stage, sw, sh, sw, sh, "main");
    if (sec) cell(sec, stage, sw, sh, sw, sh, "second");
    if (prop && prop !== sec) { const pip = div("mpip"); stage.append(pip); cell(prop, pip, INNER, INNER, PIP, PIP, "thumb"); }
    for (const d of rest) if (d !== sec) cell(d, strip, INNER, INNER, THUMB, THUMB, "thumb");
    if (strip.children.length) root.append(strip);
    update();
  }
  function cell(def, parent, vw, vh, showW, showH, role) {
      const fig = document.createElement("figure"); fig.className = "map" + (role === "main" ? " big" : "") + (role === "thumb" ? " mthumb" : "") + (role === "second" ? " msecond" : "");
      const cap = document.createElement("figcaption"); fig.appendChild(cap);
      const m = { l: 42, r: 8, t: 6, b: 28 };
      const svg = d3.select(fig).append("svg").attr("viewBox", `0 0 ${vw} ${vh}`).attr("width", showW).attr("height", showH).attr("class", "mapsvg");
      const iw = vw - m.l - m.r, ih = vh - m.t - m.b, x = d3.scaleLinear().domain([-0.03, 1.03]).range([m.l, m.l + iw]), y = d3.scaleLinear().domain([-0.03, 1.03]).range([m.t + ih, m.t]);
      svg.append("rect").attr("class", "frame").attr("x", m.l).attr("y", m.t).attr("width", iw).attr("height", ih);
      const gField = svg.append("g").attr("class", "field"), gAx = svg.append("g").attr("class", "axes");
      gAx.append("g").attr("transform", `translate(0,${m.t + ih})`).call(d3.axisBottom(x).ticks(4).tickSize(3));
      gAx.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(3));
      const xl = gAx.append("text").attr("class", "axlabel").attr("x", m.l + iw).attr("y", vh - 2).attr("text-anchor", "end");
      const yl = gAx.append("text").attr("class", "axlabel").attr("transform", `translate(10,${m.t}) rotate(-90)`).attr("text-anchor", "end");
      const gTrace = svg.append("g").attr("class", "trace"), gPts = svg.append("g").attr("class", "pts"), gTop = svg.append("g").attr("class", "top");
      const gTool = svg.append("g").attr("class", "tool"), trail = gTool.append("path").attr("class", "trail");
      const ov = gTool.append("rect").attr("class", "toolov").attr("x", m.l).attr("y", m.t).attr("width", iw).attr("height", ih);
      let stroke = null;
      if (role !== "thumb") ov.on("pointerdown", (ev) => { if (ctx.tool() === "none") return; ev.preventDefault(); ov.node().setPointerCapture(ev.pointerId); stroke = [d3.pointer(ev, svg.node())]; trail.attr("d", null); })
        .on("pointermove", (ev) => { if (!stroke) return; stroke.push(d3.pointer(ev, svg.node()));
          trail.attr("d", (ctx.tool() === "lasso" ? d3.line().curve(d3.curveLinearClosed) : d3.line())(stroke)).classed("closed", ctx.tool() === "lasso"); })
        .on("pointerup pointercancel", (ev) => {
          if (!stroke) return; const pts = stroke, tool = ctx.tool(); stroke = null; trail.attr("d", null);
          const ids = new Set(), r = 9, near = (px, py) => { for (let k = 0; k < pts.length; k++) { const [ax, ay] = pts[k], [bx, by] = pts[Math.min(k + 1, pts.length - 1)];
            const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, u = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
            if ((ax + u * dx - px) ** 2 + (ay + u * dy - py) ** 2 <= r * r) return true; } return false; };
          for (const sg of ctx.songs()) { const px = x(ctx.value(sg, def.x)), py = y(ctx.value(sg, def.y));
            if (tool === "lasso" ? pts.length > 2 && d3.polygonContains(pts, [px, py]) : near(px, py)) ids.add(sg.id); }
          ctx.on.brush(ids, ev);
        });
      if (role === "thumb") { fig.title = ctx.openLabel ? ctx.openLabel() : ""; fig.onclick = (e) => { if (e.target.closest("button")) return; second = key(def); build(); }; }
      if (role === "second") { const b = document.createElement("button"); b.className = "btn sm mclose"; b.textContent = "×"; b.setAttribute("aria-label", "close");
        b.onclick = () => { second = null; build(); }; fig.appendChild(b); }
      cells.push({ def, fig, cap, svg, x, y, gField, gTrace, gPts, gTop, xl, yl, size: vw, role });
      parent.appendChild(fig);
  }

  function update() {
    for (const c of cells) c.svg.classed("armed", ctx.tool() !== "none");
    const songs = ctx.songs(), sel = ctx.sel(), hov = ctx.hover(), tr = ctx.trace(), br = ctx.brushed();
    for (const c of cells) {
      c.cap.innerHTML = ctx.title(c.def); c.xl.text(ctx.label(c.def.x)); c.yl.text(ctx.label(c.def.y));
      // P2: the model's probability field (one image per map) and its boundary contours, when the model is on
      const F = ctx.field ? ctx.field(c.def) : null;
      c.gField.selectAll("*").remove();
      if (F) {
        const [x0, x1] = c.x.range(), [y1, y0] = c.y.range(), cv = document.createElement("canvas"); cv.width = F.nx; cv.height = F.ny;
        const g = cv.getContext("2d"), img = g.createImageData(F.nx, F.ny);
        for (let j = 0; j < F.ny; j++) for (let i = 0; i < F.nx; i++) {
          const k = j * F.nx + i, rgb = d3.rgb(F.fill(k)), o = ((F.ny - 1 - j) * F.nx + i) * 4;
          img.data[o] = rgb.r; img.data[o + 1] = rgb.g; img.data[o + 2] = rgb.b; img.data[o + 3] = Math.round(255 * F.alpha(k));
        }
        g.putImageData(img, 0, 0);
        c.gField.append("image").attr("href", cv.toDataURL()).attr("x", x0).attr("y", y0).attr("width", x1 - x0).attr("height", y1 - y0).attr("preserveAspectRatio", "none").style("image-rendering", "auto");
        const dx = (x1 - x0) / F.nx, dy = (y1 - y0) / F.ny, tx = d3.geoTransform({ point(px, py) { this.stream.point(x0 + px * dx, y1 - py * dy); } });
        for (const C of F.contours || []) {
          const th = d3.contours().size([F.nx, F.ny]).thresholds([C.thr])(Array.from(C.p));
          c.gField.selectAll(null).data(th).join("path").attr("class", "bound").attr("d", d3.geoPath(tx));
        }
      }
      const pts = c.gPts.selectAll("circle").data(songs, (s) => s.id);
      pts.join((en) => en.append("circle").attr("r", 3.4)
          .on("pointerenter", (ev, s) => ctx.hoverOn() && ctx.on.hover(s.id, ev)).on("pointerleave", () => ctx.on.hover(null))
          .on("click", (ev, s) => ctx.on.click(s.id, ev)))
        .attr("cx", (s) => c.x(ctx.value(s, c.def.x))).attr("cy", (s) => c.y(ctx.value(s, c.def.y)))
        .attr("fill", (s) => ctx.colour(s))
        .attr("stroke", (s) => ctx.stroke(s) || "none").attr("stroke-width", (s) => ctx.stroke(s) ? 1.4 : 0)
        .attr("opacity", (s) => br && !br.has(s.id) && !sel.has(s.id) ? 0.14 : 0.88)
        .attr("r", (s) => sel.has(s.id) ? 5.2 : 3.4);
      // the trace: a path of songs, numbered, the same in every map
      const tp = tr.map((id) => songs.find((s) => s.id === id)).filter(Boolean).map((s) => [c.x(ctx.value(s, c.def.x)), c.y(ctx.value(s, c.def.y))]);
      c.gTrace.selectAll("*").remove();
      if (tp.length > 1) c.gTrace.append("path").attr("d", d3.line()(tp));
      c.gTrace.selectAll("text").data(tp).join("text").attr("x", (p) => p[0] + 6).attr("y", (p) => p[1] - 5).text((p, i) => i + 1);
      // selected and hovered songs on top, ringed
      c.gTop.selectAll("*").remove();
      for (const id of new Set([...sel, ...(hov != null ? [hov] : [])])) {
        const s = songs.find((q) => q.id === id); if (!s) continue;
        c.gTop.append("circle").attr("class", id === hov ? "ring hov" : "ring").attr("cx", c.x(ctx.value(s, c.def.x))).attr("cy", c.y(ctx.value(s, c.def.y))).attr("r", id === hov ? 8 : 7);
      }
    }
  }
  let rt = null; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => defs.length && root.clientWidth && build(), 150); }).observe(root);
  return { update, setDefs(d) { defs = d; build(); }, cells: () => cells };
}
