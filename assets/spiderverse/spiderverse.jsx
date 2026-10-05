// Spider-Verse layer: the multiverse hero (six universes take turns every
// 6 s with a glitch cut) and the dimensional-rift nav link. Loaded as
// text/babel before the main app script, so top-level declarations are
// globals — same pattern as assets/holo-card/card.jsx. Pure rotation logic
// lives in multiverse.js, the canvas renderer in rift.js.

function useSvReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = React.useState(() => window.matchMedia(query).matches);
  React.useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = e => setReduced(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// ── RIFT ────────────────────────────────────────────────────────────────────
function GlitchRiftIcon({ size = 30, intensity = 1 }) {
  const canvasRef = React.useRef(null);
  const riftRef = React.useRef(null);
  React.useEffect(() => {
    if (!window.GlitchRift) return;
    riftRef.current = window.GlitchRift.mount(canvasRef.current, { intensity, size, coreScale: 0.3, specks: 4 });
    return () => riftRef.current.destroy();
  }, []);
  React.useEffect(() => {
    if (riftRef.current) riftRef.current.setIntensity(intensity);
  }, [intensity]);
  return <canvas ref={canvasRef} className="glitch-rift" style={{ width: size, height: size }} aria-hidden="true" />;
}

// Grow a rift from (x, y) until it swallows the viewport, then call `done`.
function riftWarp(x, y, done) {
  const veil = document.createElement('div');
  veil.className = 'rift-warp';
  const canvas = document.createElement('canvas');
  canvas.style.left = x + 'px';
  canvas.style.top = y + 'px';
  veil.appendChild(canvas);
  document.body.appendChild(veil);
  const rift = window.GlitchRift.mount(canvas, { intensity: 2, still: false, coreScale: 0.34, maxDpr: 1 });
  setTimeout(done, 560);
  // Coming back via the back/forward cache restores this page mid-warp.
  window.addEventListener('pageshow', function onShow(e) {
    window.removeEventListener('pageshow', onShow);
    if (e.persisted) { rift.destroy(); veil.remove(); }
  });
}

function RiftLink() {
  const [hot, setHot] = React.useState(false);
  const onClick = e => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!window.GlitchRift || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    const href = e.currentTarget.href;
    const r = e.currentTarget.getBoundingClientRect();
    riftWarp(r.left + r.width / 2, r.top + r.height / 2, () => { window.location.href = href; });
  };
  return (
    <a href="/infected.exe" className="rift-link" title="⚠ anomaly detected — enter the glitch" aria-label="Anomaly detected: enter the glitch"
      onClick={onClick} onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)}
      onFocus={() => setHot(true)} onBlur={() => setHot(false)}>
      <GlitchRiftIcon size={28} intensity={hot ? 2 : 1} />
    </a>
  );
}

// ── SCENES ──────────────────────────────────────────────────────────────────
// Each universe is its film art style — rendering technique, shape language
// and texture — never character artwork. Colours, textures and type live in
// spiderverse.css under .uv-<id> and #hero[data-uv="<id>"].

// The graffiti piece in the corner: overspray mist and speckle, a crown, a
// 3-D "TONY" tag in white over red, a hand-sprayed arrow and running drips.
// Every time the universe comes round, the piece is sprayed live: the nozzle
// writes each letter stroke by stroke (on twos), then the crown, the arrow and
// finally the drips start to run.
const MM_SWOOSH = [[22, 206], [120, 236], [236, 222], [318, 176]];

// Centre lines of the letters as a writer would spray them, measured from the
// Permanent Marker glyphs at 112px (viewBox units).
const MM_STROKES = [
  [[42, 86], [124, 80]],
  [[92, 88], [70, 150]],
  [[150, 84], [176, 125], [146, 146], [114, 142], [124, 106], [154, 82]],
  [[197, 152], [212, 79], [239, 151], [256, 75]],
  [[274, 82], [297, 118]],
  [[325, 80], [297, 118], [282, 152]],
];
const MM_SPRAY_START = 0.5, MM_SPRAY_TIME = 0.95, MM_PEN_UP = 0.035, MM_FPS = 12;

// Timing for each stroke (seconds from mount), shared by the reveal mask and
// the nozzle so the paint appears right under it.
const MM_SCHEDULE = (() => {
  const lens = MM_STROKES.map(pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0));
  const total = lens.reduce((a, b) => a + b, 0);
  const draw = MM_SPRAY_TIME - MM_PEN_UP * (MM_STROKES.length - 1);
  let t = MM_SPRAY_START;
  return lens.map((len, i) => {
    const dur = (draw * len) / total, item = { pts: MM_STROKES[i], len, delay: t, dur };
    t += dur + MM_PEN_UP;
    return item;
  });
})();

function bezierPoint(t) {
  const [p0, p1, p2, p3] = MM_SWOOSH, u = 1 - t;
  const at = i => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i];
  return [at(0), at(1)];
}

// The bright overspray puff that rides the paint front while the letters go on.
function useMilesNozzle(ref) {
  const reduced = useSvReducedMotion();
  React.useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !el.animate) return;
    const end = MM_SCHEDULE[MM_SCHEDULE.length - 1];
    const total = end.delay + end.dur + 0.12;
    const at = (t, [x, y], opacity) => ({ offset: t / total, transform: `translate(${x}px, ${y}px)`, opacity });
    const frames = [at(0, MM_SCHEDULE[0].pts[0], 0)];
    for (const s of MM_SCHEDULE) {
      let run = 0;
      frames.push(at(s.delay, s.pts[0], 1));
      s.pts.slice(1).forEach((p, i) => {
        run += Math.hypot(p[0] - s.pts[i][0], p[1] - s.pts[i][1]);
        frames.push(at(s.delay + (s.dur * run) / s.len, p, 1));
      });
    }
    const last = end.pts[end.pts.length - 1];
    frames.push(at(total, last, 0));
    const anim = el.animate(frames, { duration: total * 1000, easing: `steps(${Math.round(total * MM_FPS)}, end)`, fill: 'both' });
    return () => anim.cancel();
  }, [reduced]);
}

// Where the piece is painted: a quad on the brick wall, measured on the
// 1764 x 1176 video frame (top-left, top-right, bottom-right, bottom-left).
const MM_WALL = [[1330, 459], [1700, 323], [1700, 731], [1330, 756]];

// Keep the piece on the wall (a perspective matrix3d) as the video stage resizes.
function useWallTransform(ref) {
  React.useLayoutEffect(() => {
    const el = ref.current, stage = el && el.parentElement;
    if (!stage) return;
    const fit = () => {
      const s = stage.clientWidth / 1764;
      if (s) el.style.transform = `matrix3d(${window.Multiverse.quadMatrix(360, 250, MM_WALL.map(([x, y]) => [x * s, y * s])).join(',')})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);
}

function MilesTag() {
  const nozzleRef = React.useRef(null);
  const svgRef = React.useRef(null);
  useMilesNozzle(nozzleRef);
  useWallTransform(svgRef);
  const specks = React.useMemo(() => {
    const rng = window.GlitchRift.mulberry32(1610);
    return Array.from({ length: 80 }, () => {
      const a = rng() * Math.PI * 2, d = 0.55 + rng() * 0.6;
      return [180 + Math.cos(a) * 170 * d, 128 + Math.sin(a) * 92 * d, 0.6 + rng() * 2.2, rng() < 0.4];
    });
  }, []);
  // Overspray scattered along both sides of the arrow, thicker near the line.
  const spray = React.useMemo(() => {
    const rng = window.GlitchRift.mulberry32(206);
    return Array.from({ length: 70 }, () => {
      const t = rng(), [x, y] = bezierPoint(t), [x2, y2] = bezierPoint(Math.min(1, t + 0.01));
      const len = Math.hypot(x2 - x, y2 - y) || 1, off = (rng() - 0.5) * 2 * (5 + rng() * 14);
      return [x - ((y2 - y) / len) * off, y + ((x2 - x) / len) * off, 0.5 + rng() * 1.6];
    });
  }, []);
  const swoosh = `M${MM_SWOOSH[0]} C ${MM_SWOOSH.slice(1).join(' ')}`;
  const steps = dur => Math.max(2, Math.round(dur * MM_FPS));
  return (
    <svg ref={svgRef} className="mm-piece" viewBox="0 0 360 250">
      <defs>
        <radialGradient id="mm-mist">
          <stop offset="0" stopColor="#ff1f3d" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#ff1f3d" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ff1f3d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mm-puff">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.25" stopColor="#ff8a9a" stopOpacity="0.7" />
          <stop offset="0.6" stopColor="#ff1f3d" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ff1f3d" stopOpacity="0" />
        </radialGradient>
        <filter id="mm-soft" x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        {/* Paint only exists where the nozzle has passed; the full rect at the
            end fills any corner the strokes missed. Offset to cover the extrude. */}
        <mask id="mm-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="250">
          <g className="mm-reveal-strokes" filter="url(#mm-soft)" transform="translate(5 5)">
            {MM_SCHEDULE.map((s, i) => (
              <path key={i} pathLength="1" d={'M' + s.pts.join(' L ')}
                style={{ animationDelay: s.delay + 's', animationDuration: s.dur + 's', animationTimingFunction: `steps(${steps(s.dur)}, end)` }} />
            ))}
          </g>
          <rect className="mm-reveal-all" width="360" height="250" />
        </mask>
        <filter id="mm-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3" />
        </filter>
        <filter id="mm-can" x="-15%" y="-30%" width="130%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6" />
        </filter>
        <filter id="mm-haze" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>
      <ellipse className="mist" cx="180" cy="128" rx="178" ry="104" fill="url(#mm-mist)" />
      <g className="mm-specks">
        {specks.map(([x, y, r, white], i) => <circle key={i} cx={x} cy={y} r={r} className={white ? 'w' : 'r'} />)}
      </g>
      <g filter="url(#mm-rough)">
        <path className="crown" pathLength="1" d="M126 50 L 136 20 L 151 44 L 166 12 L 181 44 L 196 20 L 206 50 Z" />
        <g className="mm-tips">
          <circle className="tip" cx="136" cy="16" r="4" /><circle className="tip" cx="166" cy="8" r="4" /><circle className="tip" cx="196" cy="16" r="4" />
        </g>
        <g mask="url(#mm-reveal)">
          <text x="190" y="166" className="ext2">TONY</text>
          <text x="186" y="162" className="ext">TONY</text>
          <text x="180" y="156" className="face">TONY</text>
        </g>
      </g>
      <g className="mm-arrow">
        <path className="haze" pathLength="1" d={swoosh + ' M300 158 L 326 173 L 306 197'} filter="url(#mm-haze)" />
        <g className="mm-arrow-dots">
          {spray.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
        </g>
        <g filter="url(#mm-can)">
          <path className="core" pathLength="1" d={swoosh} />
          <path className="core thin" pathLength="1" d="M26 210 C 124 238 238 225 316 180" />
          <path className="core head" pathLength="1" d="M300 158 L 326 173 L 306 197" />
        </g>
        <g className="mm-drips">
          <rect x="112" y="222" width="4" height="22" rx="2" />
          <rect x="150" y="224" width="3" height="14" rx="1.5" />
        </g>
      </g>
      <g className="mm-drips">
        <rect x="58" y="150" width="5" height="52" rx="2.5" />
        <rect x="132" y="154" width="4" height="34" rx="2" />
        <rect x="196" y="150" width="5" height="62" rx="2.5" />
        <rect x="262" y="156" width="4" height="40" rx="2" />
        <rect x="288" y="150" width="3" height="24" rx="1.5" />
      </g>
      <g ref={nozzleRef} className="mm-nozzle" opacity="0">
        <circle r="17" fill="url(#mm-puff)" />
      </g>
    </svg>
  );
}

// Earth-1610: Brooklyn at 2 a.m. in comic print (video loop: a train on the
// el, the red neon flickering twice, steam off a manhole) with the TONY piece
// sprayed live onto the brick wall and a splash of red on the lens.
function MilesDecor() {
  return (
    <>
      <div className="sv-stage sv-px">
        <LoopVideo name="miles-street" className="sv-video" />
        <MilesTag />
      </div>
      <i className="mm-wash" />
      <svg className="mm-spray sv-px" viewBox="0 0 400 300">
        <defs>
          <filter id="mm-spray" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="16" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="12" />
          </filter>
        </defs>
        <g filter="url(#mm-spray)">
          <circle cx="330" cy="56" r="26" />
          <circle cx="362" cy="96" r="7" />
          <circle cx="300" cy="22" r="5" />
          <circle cx="250" cy="250" r="9" className="w" />
        </g>
      </svg>
    </>
  );
}

// A muted background loop that only plays while on screen; reduced-motion
// visitors get the poster frame instead.
function LoopVideo({ name, className }) {
  const reduced = useSvReducedMotion();
  const ref = React.useRef(null);
  const base = './assets/spiderverse/' + name;
  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !document.hidden) video.play().catch(() => {});
      else video.pause();
    });
    io.observe(video);
    return () => io.disconnect();
  }, [reduced]);
  if (reduced) return <img className={className} src={base + '.webp'} alt="" />;
  return (
    <video ref={ref} className={className} poster={base + '.webp'} autoPlay muted loop playsInline preload="auto">
      <source src={base + '.webm'} type="video/webm" />
      <source src={base + '.mp4'} type="video/mp4" />
    </video>
  );
}

// Earth-65: Gwen's drum solo — a drum kit in thick oil-paint strokes whose
// beats burst out as rings of paint, while the colour drifts with her mood
// from pink to lavender and mint and back (a forward-and-back video loop).
// Depth is built in three planes over the painting: a plum shadow that grounds
// the kit, stage-light beams and paint flecks drifting up through them at three
// distances (far = small and sharp, near = big and out of focus), and wet brush
// strokes right in front of the lens. Each plane has its own parallax depth.
const GW_MOTES = (() => {
  const rng = window.GlitchRift.mulberry32(65);
  const colours = ['#e0217a', '#8a3fd6', '#2aa892', '#ff5fa2', '#ffffff'];
  const plane = (depth, count, size, blur, dur, reach) => Array.from({ length: count }, () => ({
    depth,
    left: reach[0] + rng() * (reach[1] - reach[0]),
    top: 62 + rng() * 40,
    size: size * (0.7 + rng() * 0.6),
    blur,
    dur: dur * (0.8 + rng() * 0.4),
    delay: -rng() * dur,
    sway: (rng() - 0.5) * 9,
    colour: colours[Math.floor(rng() * colours.length)],
  }));
  return [...plane('far', 10, 6, 0, 16, [48, 96]), ...plane('mid', 7, 11, 0.8, 12, [40, 98]), ...plane('near', 4, 30, 5, 9, [34, 100])];
})();

// Out-of-focus stage lights: [left %, top %, size px, colour, delay s].
const GW_BOKEH = [
  [70, 6, 120, '255, 120, 190', 0], [88, 30, 84, '150, 110, 240', -2.2], [57, 64, 70, '70, 190, 165', -1.1],
  [93, 70, 150, '224, 33, 122', -3.4], [79, 52, 46, '255, 255, 255', -0.6],
];

function GwenMotes({ depth }) {
  return (
    <div className={`gw-motes gw-motes--${depth} sv-px`}>
      {GW_MOTES.filter(m => m.depth === depth).map((m, i) => (
        <span key={i} className="gw-mote" style={{
          left: m.left + '%', top: m.top + '%', width: m.size, height: m.size, background: m.colour,
          filter: m.blur ? `blur(${m.blur}px)` : undefined, '--sway': m.sway + 'vw',
          animationDuration: m.dur + 's', animationDelay: m.delay + 's',
        }} />
      ))}
    </div>
  );
}

function GwenDecor() {
  return (
    <>
      <LoopVideo name="gwen-drums" className="gw-video sv-px" />
      <i className="gw-shade" />
      <i className="gw-beams sv-px" />
      <GwenMotes depth="far" />
      <GwenMotes depth="mid" />
      <i className="gw-wash" />
      <GwenMotes depth="near" />
      <div className="gw-bokeh sv-px">
        {GW_BOKEH.map(([x, y, size, colour, delay], i) => (
          <span key={i} style={{ left: x + '%', top: y + '%', width: size, height: size, '--c': colour, animationDelay: delay + 's' }} />
        ))}
      </div>
      <svg className="gw-front gw-front--low sv-px" viewBox="0 0 800 500" preserveAspectRatio="xMaxYMax slice">
        <defs>
          <linearGradient id="gw-plum" x1="1" y1="0.6" x2="0" y2="1">
            <stop offset="0" stopColor="#3a0d36" />
            <stop offset="0.45" stopColor="#8e1a63" />
            <stop offset="1" stopColor="#e0408f" stopOpacity="0.2" />
          </linearGradient>
          <filter id="gw-dof-l" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9" /></filter>
          <filter id="gw-dof-m" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
        <g className="gw-stroke gw-stroke--plum" filter="url(#gw-dof-l)">
          <path fill="url(#gw-plum)" d="M420 560 C 540 450 660 360 840 270 L 850 470 C 720 500 610 545 540 590 Z" />
          <path className="bristle" d="M470 560 C 590 455 700 380 845 315 M520 572 C 630 488 735 425 850 380 M580 580 C 680 515 760 470 850 440" />
        </g>
        <g className="gw-stroke gw-stroke--pink" filter="url(#gw-dof-m)">
          <path d="M215 520 C 280 478 380 466 470 486 L 462 532 Z" />
        </g>
      </svg>
      <svg className="gw-front gw-front--high sv-px" viewBox="0 0 800 500" preserveAspectRatio="xMaxYMin slice">
        <defs>
          <linearGradient id="gw-mint" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3fb8a0" />
            <stop offset="0.6" stopColor="#7fd9c4" />
            <stop offset="1" stopColor="#8f78e8" />
          </linearGradient>
        </defs>
        <g className="gw-stroke gw-stroke--mint" filter="url(#gw-dof-l)">
          <path fill="url(#gw-mint)" d="M590 -50 C 660 22 730 60 835 84 L 845 -16 C 770 -26 705 -52 655 -86 Z" />
        </g>
      </svg>
      <i className="gw-paper" />
    </>
  );
}

// Punk collage: a punk gig made of hand-cut paper. Each cut-out (the guitarist,
// the stars, the flyers, the torn scrap) is its own layer and moves on its own
// beat over the stage; the amps stay in the background plate. Positions are in
// pixels of the 1536 x 1024 painting.
const PK_PIECES = [
  { id: 'guitarist', x: 726, y: 110, w: 742 },
  { id: 'paper', x: 1023, y: 0, w: 169 },
  { id: 'flyers', x: 760, y: 228, w: 219 },
  { id: 'star', x: 813, y: 49, w: 173 },
  { id: 'star-sm', x: 877, y: 429, w: 82 },
];

function PunkDecor() {
  return (
    <>
      <div className="sv-stage pk-stage">
        <img className="pk-plate sv-px" src="./assets/spiderverse/punk-plate.webp" alt="" />
        {PK_PIECES.map(p => (
          <img key={p.id} className={'pk-piece sv-px pk-piece--' + p.id} src={`./assets/spiderverse/punk-${p.id}.webp`} alt=""
            style={{ left: p.x / 15.36 + '%', top: p.y / 10.24 + '%', width: p.w / 15.36 + '%' }} />
        ))}
      </div>
      <i className="pk-wash" />
      <i className="pk-grain" />
    </>
  );
}

const PN_PETALS = [
  [8, 0, 9], [22, -3, 11], [36, -6, 8.5], [48, -1.5, 12], [60, -8, 10], [72, -4, 9.5], [84, -2, 11.5], [94, -6.5, 8], [56, -10, 13], [30, -11, 10.5],
];

// Earth-14512: an anime golden-hour rooftop (video loop: petal storm,
// drifting clouds, a passing train, a mecha in the haze) with manga effects
// inked over it on the 6-second beat — focus lines, katakana sound effects
// (ゴゴゴ rumbles beside the mecha), sparkles and foreground petals.
function PeniDecor() {
  return (
    <>
      <div className="sv-stage sv-px">
        <LoopVideo name="peni-rooftop" className="sv-video" />
        <span className="pn-sfx sv-px pn-sfx--dodo">ドドド</span>
        <span className="pn-sfx sv-px pn-sfx--gogo">ゴゴゴ</span>
        <span className="pn-sfx sv-px pn-sfx--kira">キラッ</span>
        <svg className="pn-sparks sv-px pn-sparks--a" viewBox="0 0 100 100"><path d="M50 4 Q 54 44 96 50 Q 54 56 50 96 Q 46 56 4 50 Q 46 44 50 4 Z" /></svg>
        <svg className="pn-sparks sv-px pn-sparks--b" viewBox="0 0 100 100"><path d="M50 4 Q 54 44 96 50 Q 54 56 50 96 Q 46 56 4 50 Q 46 44 50 4 Z" /></svg>
      </div>
      <i className="pn-focus" />
      <i className="pn-wash" />
      <div className="pn-petals sv-px">
        {PN_PETALS.map(([x, delay, dur], i) => (
          <span key={i} className="pn-petal" style={{ left: x + '%', animationDelay: delay + 's', animationDuration: dur + 's' }} />
        ))}
      </div>
    </>
  );
}

// Dunhuang mural: a heavenly sky (video loop: ribbons flutter, clouds drift)
// with a wheel of celestial beings set into its open circle of clouds. The
// wheel is one painting split into rings: the Buddha holds still, the cloud
// ring turns, and the two rings of figures sway in opposite directions.
function DunhuangDecor() {
  return (
    <>
      <div className="sv-stage sv-px">
        <LoopVideo name="dunhuang-sky" className="sv-video" />
        <div className="dh-wheel sv-px">
          <i className="dh-ring dh-ring--outer" />
          <i className="dh-ring dh-ring--clouds" />
          <i className="dh-ring dh-ring--inner" />
          <i className="dh-ring dh-ring--core" />
        </div>
      </div>
      <i className="dh-wash" />
      <i className="dh-border" />
    </>
  );
}

// The rubber-hose cartoon: a 1930s black-and-white street where everything
// dances to one jazz beat (video loop). Over it, the projector: the scene opens
// on an iris, the picture weaves in the gate, the lamp flickers, and fresh
// scratches and dust flash across the film.
function ToonDecor() {
  return (
    <>
      <div className="sv-stage sv-px">
        <LoopVideo name="toon-street" className="sv-video" />
      </div>
      <i className="tn-wash" />
      <i className="tn-scratches" />
      <i className="tn-dust" />
      <i className="tn-flicker" />
      <i className="tn-iris" />
    </>
  );
}

const UV_DECOR = { miles: MilesDecor, gwen: GwenDecor, punk: PunkDecor, peni: PeniDecor, dunhuang: DunhuangDecor, toon: ToonDecor };

function UniverseScene({ id, entering }) {
  const Decor = UV_DECOR[id];
  return (
    <div className={`uv-scene uv-${id}${entering ? ' is-entering' : ''}`}>
      <Decor />
    </div>
  );
}

function UniverseName() {
  return <h1 className="hero-name">Bingsen <span className="hl">(Tony)</span> Teng</h1>;
}

// Big previous / next targets on the hero's left and right edges.
function UniverseArrows({ onPrev, onNext }) {
  return (
    <>
      <button type="button" className="uv-arrow uv-arrow--prev" aria-label="Previous universe" onClick={onPrev}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3 L 6 12 L 15 21" /></svg>
      </button>
      <button type="button" className="uv-arrow uv-arrow--next" aria-label="Next universe" onClick={onNext}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3 L 18 12 L 9 21" /></svg>
      </button>
    </>
  );
}

function UniverseSwitcher({ index, paused, onGo, onToggle }) {
  const { UNIVERSES } = window.Multiverse;
  return (
    <div className="uv-switcher">
      <div className="uv-dots" role="group" aria-label="Jump to a universe">
        {UNIVERSES.map((x, i) => (
          <button key={x.id} type="button" className="uv-dot" aria-pressed={i === index}
            aria-label={x.label} onClick={() => onGo(i)} />
        ))}
      </div>
      <button type="button" className="uv-pause" aria-pressed={paused}
        aria-label={paused ? 'Resume universe rotation' : 'Pause universe rotation'} onClick={onToggle}>
        {paused ? '▶' : '❚❚'}
      </button>
    </div>
  );
}

// ── HERO ────────────────────────────────────────────────────────────────────
function MultiverseHero({ role }) {
  const { UNIVERSES, HOLD_MS, GLITCH_MS, initCycle, cycleReducer } = window.Multiverse;
  const [cycle, dispatch] = React.useReducer(cycleReducer, window.location.search, initCycle);
  const reduced = useSvReducedMotion();
  const heroRef = React.useRef(null);
  const flashRef = React.useRef(null);
  const [onScreen, setOnScreen] = React.useState(true);
  const [pageVisible, setPageVisible] = React.useState(!document.hidden);
  const u = UNIVERSES[cycle.index];
  const awake = onScreen && pageVisible;

  React.useEffect(() => {
    ['miles-street', 'gwen-drums', 'punk-plate', ...PK_PIECES.map(p => 'punk-' + p.id), 'peni-rooftop', 'dunhuang-sky', 'dunhuang-wheel', 'toon-street'].forEach(name => { new Image().src = `./assets/spiderverse/${name}.webp`; });
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.1 });
    io.observe(heroRef.current);
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  // Parallax: the pointer's place over the hero, eased, as --px/--py in -1..1.
  // Layers marked .sv-px shift against it by their depth. Mouse/trackpad only,
  // and it settles back to centre once the pointer leaves or the hero scrolls away.
  React.useEffect(() => {
    const hero = heroRef.current;
    if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const step = () => {
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      if (Math.abs(tx - x) < 0.002 && Math.abs(ty - y) < 0.002) { x = tx; y = ty; raf = 0; }
      else raf = requestAnimationFrame(step);
      hero.style.setProperty('--px', x.toFixed(3));
      hero.style.setProperty('--py', y.toFixed(3));
    };
    const aim = (nx, ny) => { tx = nx; ty = ny; if (!raf) raf = requestAnimationFrame(step); };
    const onMove = e => {
      const r = hero.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (e.clientY > r.bottom || e.clientY < r.top) return aim(0, 0);
      const clamp = v => Math.max(-1, Math.min(1, v));
      aim(clamp(((e.clientX - r.left) / r.width) * 2 - 1), clamp(((e.clientY - r.top) / r.height) * 2 - 1));
    };
    const onOut = e => { if (!e.relatedTarget) aim(0, 0); };
    const onBlur = () => aim(0, 0);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseout', onOut);
    window.addEventListener('blur', onBlur);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onOut);
      window.removeEventListener('blur', onBlur);
      hero.style.removeProperty('--px');
      hero.style.removeProperty('--py');
    };
  }, [reduced]);

  // Restarting on every index change also resets the timer after a manual jump.
  React.useEffect(() => {
    if (cycle.paused || reduced || !awake) return;
    const timer = setTimeout(() => dispatch({ type: 'tick' }), HOLD_MS);
    return () => clearTimeout(timer);
  }, [cycle.index, cycle.paused, reduced, awake]);

  React.useEffect(() => {
    if (!cycle.glitching) return;
    // The cut tears slices out of the world being left and the one arriving.
    const tiles = [cycle.prev, cycle.index].filter(i => i >= 0);
    const cancel = !reduced && window.GlitchRift ? window.GlitchRift.flash(flashRef.current, { duration: GLITCH_MS, tiles }) : null;
    const timer = setTimeout(() => dispatch({ type: 'settle' }), reduced ? 0 : GLITCH_MS);
    return () => { clearTimeout(timer); if (cancel) cancel(); };
  }, [cycle.glitching, cycle.index]);

  // The nav floats over the hero until scrolled; light worlds need dark nav ink.
  React.useEffect(() => {
    document.documentElement.dataset.heroTone = u.tone;
    return () => { delete document.documentElement.dataset.heroTone; };
  }, [u.tone]);

  const prev = cycle.prev >= 0 ? UNIVERSES[cycle.prev] : null;
  const goBy = step => dispatch({ type: 'go', index: (cycle.index + step + UNIVERSES.length) % UNIVERSES.length });
  return (
    <section id="hero" ref={heroRef} data-uv={u.id} data-tone={u.tone} data-asleep={awake ? undefined : ''}
      className={cycle.glitching && !reduced ? 'uv-glitching' : undefined}>
      <div className="uv-stage" aria-hidden="true">
        {prev && <UniverseScene key={prev.id} id={prev.id} />}
        <UniverseScene key={u.id} id={u.id} entering={cycle.glitching && !reduced} />
      </div>
      <div className="hero-vignette" />
      <div className="hero-content">
        <p className="hero-prompt"><span className="status-dot" /> tony@portfolio:~$ whoami</p>
        <UniverseName />
        <p className="hero-role">{role}<span className="cursor" /></p>
        <div className="hero-cta">
          <a href="#projects" className="btn primary">View Projects</a>
          <a href="mailto:bingsen.teng777@gmail.com" className="btn">Contact Me</a>
          <a href="https://github.com/Tonieeie" target="_blank" rel="noopener" className="btn outline2">GitHub ↗</a>
        </div>
      </div>
      <canvas ref={flashRef} className="uv-flash" aria-hidden="true" />
      <UniverseArrows onPrev={() => goBy(-1)} onNext={() => goBy(1)} />
      <UniverseSwitcher index={cycle.index} paused={cycle.paused}
        onGo={i => dispatch({ type: 'go', index: i })} onToggle={() => dispatch({ type: 'toggle' })} />
      <div className="scroll-hint">scroll</div>
    </section>
  );
}
