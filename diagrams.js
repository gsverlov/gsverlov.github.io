// Animated diagrams for the project pages.
// Each one loops: boxes light up in order while a dot travels along the arrows,
// and the caption under the diagram explains the current step.

(function () {
  const NS = "http://www.w3.org/2000/svg";
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (v) => (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2);
  const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  function loop(duration, draw, restAt) {
    draw(restAt); // complete picture before the first frame
    let start = null;
    function frame(now) {
      if (start === null) start = now;
      draw(((now - start) / 1000) % duration);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function captionSetter(cap, caps) {
    let idx = -1;
    return (t, fade) => {
      let i = 0;
      caps.forEach(([s], k) => { if (t >= s) i = k; });
      if (i !== idx) { idx = i; cap.textContent = caps[i][1]; }
      cap.style.opacity = fade;
    };
  }

  function travelDot(parent, path) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("r", 4); c.setAttribute("class", "dot"); c.setAttribute("opacity", 0);
    parent.appendChild(c);
    return { c, p: path, len: path.getTotalLength() };
  }

  function moveDot(d, t, s, e) {
    const p = (t - s) / (e - s);
    if (p < 0 || p > 1) { d.c.setAttribute("opacity", 0); return; }
    const pt = d.p.getPointAtLength(d.len * ease(p));
    d.c.setAttribute("cx", pt.x); d.c.setAttribute("cy", pt.y); d.c.setAttribute("opacity", 1);
  }

  // ---------------------------------------------------------------- generic flow
  window.flowDiagram = function (prefix, spec) {
    const svg = document.getElementById(prefix + "-svg");
    const cap = document.getElementById(prefix + "-cap");
    if (!svg) return;
    const all = document.createElementNS(NS, "g");
    svg.appendChild(all);
    (spec.labels || []).forEach((l) => {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", l.x); t.setAttribute("y", l.y);
      t.setAttribute("class", "muted"); t.setAttribute("font-size", "11");
      t.textContent = l.text;
      all.appendChild(t);
    });
    const gEdges = document.createElementNS(NS, "g");
    const gNodes = document.createElementNS(NS, "g");
    const gDots = document.createElementNS(NS, "g");
    all.append(gEdges, gNodes, gDots);

    const byId = {};
    spec.nodes.forEach((n) => {
      n.w = n.w || 150; n.h = n.h || 60;
      const g = document.createElementNS(NS, "g");
      let html = `<rect class="box" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8"/>`;
      if (n.lines) {
        let y = n.y + 24;
        n.lines.forEach((ln) => {
          html += `<text x="${n.x + 16}" y="${y}" font-size="${ln.size || 11}"${ln.weight ? ` font-weight="${ln.weight}"` : ""}${ln.cls ? ` class="${ln.cls}"` : ""}${ln.accent ? ` style="fill:var(--accent)"` : ""}>${esc(ln.text)}</text>`;
          y += ln.gap || 20;
        });
      } else {
        html += `<text x="${n.x + 14}" y="${n.y + n.h / 2 - 3}" font-size="13" font-weight="500">${esc(n.t)}</text>` +
                `<text x="${n.x + 14}" y="${n.y + n.h / 2 + 15}" class="muted" font-size="10.5">${esc(n.s)}</text>`;
      }
      g.innerHTML = html;
      gNodes.appendChild(g);
      byId[n.id] = { n, g };
    });

    const edges = spec.edges.map((e) => {
      const a = byId[e.from].n, b = byId[e.to].n;
      let d;
      if (e.down) d = `M${a.x + a.w / 2} ${a.y + a.h} L${b.x + b.w / 2} ${b.y}`;
      else if (b.x > a.x) {
        const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2, m = (x1 + x2) / 2;
        d = `M${x1} ${y1} C${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`;
      } else {
        const x1 = a.x, y1 = a.y + a.h / 2, x2 = b.x + b.w, y2 = b.y + b.h / 2, m = (x1 + x2) / 2;
        d = `M${x1} ${y1} C${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`;
      }
      const p = document.createElementNS(NS, "path");
      p.setAttribute("class", "edge"); p.setAttribute("d", d);
      gEdges.appendChild(p);
      return { dot: travelDot(gDots, p), s: e.s, e: e.e };
    });

    const setCap = captionSetter(cap, spec.caps);
    function draw(t) {
      spec.nodes.forEach((n) => {
        const g = byId[n.id].g;
        const off = n.off == null ? spec.loop : n.off;
        const on = t >= n.on && t < off;
        g.classList.toggle("on", on);
        g.classList.toggle("done", t >= off);
      });
      edges.forEach((ed) => moveDot(ed.dot, t, ed.s, ed.e));
      const fade = 1 - clamp((t - (spec.loop - 0.6)) / 0.5);
      all.setAttribute("opacity", fade);
      setCap(t, fade);
    }
    if (reduceMotion()) { draw(spec.loop - 0.8); cap.textContent = spec.still; return; }
    loop(spec.loop, draw, spec.loop - 0.8);
  };

  // ---------------------------------------------------------------- App Factory
  window.appFactoryDiagram = function () {
    const svg = document.getElementById("af-svg");
    const cap = document.getElementById("af-cap");
    if (!svg) return;
    svg.innerHTML = `
      <g id="af-all">
        <path class="edge" id="af-e-pa" d="M170 149 L220 149"/>
        <path class="edge" id="af-e-a0" d="M380 149 C410 149, 410 47, 440 47"/>
        <path class="edge" id="af-e-a1" d="M380 149 C410 149, 410 115, 440 115"/>
        <path class="edge" id="af-e-a2" d="M380 149 C410 149, 410 183, 440 183"/>
        <path class="edge" id="af-e-a3" d="M380 149 C410 149, 410 251, 440 251"/>
        <path class="edge" id="af-e-r0" d="M620 47 C650 47, 650 118, 680 118"/>
        <path class="edge" id="af-e-r1" d="M620 115 C650 115, 650 118, 680 118"/>
        <path class="edge" id="af-e-r2" d="M620 183 C650 183, 650 118, 680 118"/>
        <path class="edge" id="af-e-r3" d="M620 251 C650 251, 650 118, 680 118"/>
        <path class="edge" id="af-e-rs" d="M745 140 L745 166"/>
        <path class="edge" id="af-e-sp" d="M810 188 L855 188"/>
        <g id="af-prompt">
          <rect class="box" x="20" y="119" width="150" height="60" rx="8"/>
          <text x="34" y="142" class="muted" font-size="11">Prompt</text>
          <text x="34" y="163" font-size="13" id="af-typed"></text>
        </g>
        <g id="af-arch">
          <rect class="box" x="220" y="111" width="160" height="76" rx="8"/>
          <text x="236" y="144" font-size="14" font-weight="500">Architect agent</text>
          <text x="236" y="164" class="muted" font-size="11">splits the work</text>
        </g>
        <g id="af-agents"></g>
        <g id="af-review">
          <rect class="box" x="680" y="96" width="130" height="44" rx="8"/>
          <text x="694" y="123" font-size="12">Code review</text>
          <path class="check" id="af-ck-review" d="M788 117 l5 5 l9 -10" opacity="0"/>
        </g>
        <g id="af-sec">
          <rect class="box" x="680" y="166" width="130" height="44" rx="8"/>
          <text x="694" y="193" font-size="12">Security check</text>
          <path class="check" id="af-ck-sec" d="M788 187 l5 5 l9 -10" opacity="0"/>
        </g>
        <g id="af-app" opacity="0">
          <rect class="box" x="855" y="140" width="110" height="96" rx="8"/>
          <line x1="855" y1="158" x2="965" y2="158" class="edge"/>
          <circle cx="866" cy="149" r="2.5" class="app-fill"/>
          <circle cx="875" cy="149" r="2.5" class="app-fill"/>
          <circle cx="884" cy="149" r="2.5" class="app-fill"/>
          <text x="865" y="176" font-size="11">GymIQ</text>
          <rect class="row app-fill" x="865" y="186" width="80" height="8" rx="2"/>
          <rect class="row app-fill" x="865" y="200" width="60" height="8" rx="2"/>
          <rect class="row app-fill" x="865" y="214" width="70" height="8" rx="2"/>
          <text x="855" y="130" class="muted" font-size="11">Working app</text>
        </g>
        <g id="af-dots"></g>
      </g>`;
    const $ = (id) => document.getElementById(id);
    const PROMPT = "fitness quiz app";
    const AGENT_Y = [24, 92, 160, 228];
    const AGENT_END = [5.4, 6.1, 5.8, 6.5];
    const agents = AGENT_Y.map((y, i) => {
      const g = document.createElementNS(NS, "g");
      g.innerHTML =
        `<rect class="box" x="440" y="${y}" width="180" height="46" rx="8"/>` +
        `<text x="452" y="${y + 19}" font-size="12">Dev agent ${i + 1}</text>` +
        `<rect class="bar-bg" x="452" y="${y + 29}" width="96" height="4" rx="2"/>` +
        `<rect class="bar" x="452" y="${y + 29}" width="0" height="4" rx="2"/>` +
        `<g class="chipg" opacity="0"><rect class="chip" x="560" y="${y + 13}" width="50" height="18" rx="4"/>` +
        `<text class="chip-t" x="567" y="${y + 26}">skill.md</text></g>`;
      $("af-agents").appendChild(g);
      return { g, bar: g.querySelector(".bar"), chip: g.querySelector(".chipg") };
    });
    const travels = [["af-e-pa", 1.2, 1.9]]
      .concat([0, 1, 2, 3].map((i) => ["af-e-a" + i, 3.0, 3.7]))
      .concat([0, 1, 2, 3].map((i) => ["af-e-r" + i, 6.6, 7.3]))
      .concat([["af-e-rs", 8.1, 8.5], ["af-e-sp", 9.3, 9.8]]);
    const dots = travels.map(([id, s, e]) => ({ dot: travelDot($("af-dots"), $(id)), s, e }));
    const setCap = captionSetter(cap, [
      [0, "A prompt comes in as a Linear issue."],
      [1.9, "The architect agent decides how many dev agents to run, up to 6, and what each one builds."],
      [3.6, "Each dev agent gets a skill file written for its task, and they build their parts in parallel."],
      [6.6, "The combined code goes through a code review stage and a security stage."],
      [9.6, "The finished app comes out the other end."],
    ]);
    const setState = (el, on, done) => { el.classList.toggle("on", on); el.classList.toggle("done", !!done && !on); };
    function draw(t) {
      $("af-typed").textContent = PROMPT.slice(0, Math.floor(clamp((t - 0.2) / 0.9) * PROMPT.length));
      setState($("af-prompt"), t < 1.9, t >= 1.9);
      setState($("af-arch"), t >= 1.9 && t < 3.7, t >= 3.7);
      agents.forEach((a, i) => {
        a.bar.setAttribute("width", (96 * ease(clamp((t - 3.8) / (AGENT_END[i] - 3.8)))).toFixed(1));
        a.chip.setAttribute("opacity", clamp((t - 3.6) / 0.3));
        setState(a.g, t >= 3.7 && t < AGENT_END[i] + 0.2, t >= AGENT_END[i] + 0.2);
      });
      setState($("af-review"), t >= 7.3 && t < 8.1, t >= 8.1);
      $("af-ck-review").setAttribute("opacity", clamp((t - 7.7) / 0.2));
      setState($("af-sec"), t >= 8.5 && t < 9.3, t >= 9.3);
      $("af-ck-sec").setAttribute("opacity", clamp((t - 8.9) / 0.2));
      $("af-app").setAttribute("opacity", clamp((t - 9.8) / 0.4));
      document.querySelectorAll("#af-app .row").forEach((r, i) => r.setAttribute("opacity", clamp((t - 10.1 - i * 0.2) / 0.25)));
      dots.forEach((d) => moveDot(d.dot, t, d.s, d.e));
      const fade = 1 - clamp((t - 11.4) / 0.5);
      $("af-all").setAttribute("opacity", fade);
      setCap(t, fade);
    }
    if (reduceMotion()) {
      draw(11);
      cap.textContent = "A prompt goes to the architect agent, which splits it across parallel dev agents, each with its own skill file. Their combined code passes code review and a security check and comes out as a working app.";
      return;
    }
    loop(12, draw, 11);
  };
})();
