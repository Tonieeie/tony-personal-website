// patch-premium-restyle.js — 2026 premium pass on the green hacker theme.
// Keeps the matrix-green identity but layers on: blueprint-grid + ambient-glow
// backdrop, glass pill nav with scrollspy + scroll progress, gradient hero
// type with status chip + HUD stats, glassmorphism cards with corner brackets,
// gradient timeline, shimmer buttons, and real text hierarchy (muted != white).
//
// Operates on the __bundler/template payload of index.html, repo-patch style.
const fs = require('fs');

const FILE = 'D:/Desktop/Tony_personal_website/index.html';
const OPEN = '<script type="__bundler/template">\n';
const CLOSE = '\n  </script>';

const html = fs.readFileSync(FILE, 'utf8');
const tStart = html.indexOf(OPEN);
if (tStart === -1) throw new Error('template tag not found');
const cStart = tStart + OPEN.length;
const cEnd = html.indexOf(CLOSE, cStart);
if (cEnd === -1) throw new Error('template close not found');

let tpl = JSON.parse(html.slice(cStart, cEnd));

const ops = [];
function op(name, find, replace) { ops.push({ name, find, replace }); }

// ── 1. design tokens ────────────────────────────────────────────────────────
op('root tokens',
`      --font: 'JetBrains Mono', monospace; --radius: 6px;`,
`      --font: 'JetBrains Mono', monospace; --radius: 12px;`);

// ── 2. ambient backdrop: blueprint grid + corner glows ──────────────────────
op('body backdrop',
`    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--text); font-family: var(--font); overflow-x: hidden; }`,
`    html { scroll-behavior: smooth; background: var(--bg); }
    body { background: transparent; color: var(--text); font-family: var(--font); overflow-x: hidden; counter-reset: sec; }
    body::before { content: ''; position: fixed; inset: 0; z-index: -2; pointer-events: none;
      background-image:
        linear-gradient(color-mix(in srgb, var(--accent) 4%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, var(--accent) 4%, transparent) 1px, transparent 1px);
      background-size: 54px 54px;
      -webkit-mask-image: radial-gradient(ellipse 95% 75% at 50% 8%, black 25%, transparent 80%);
      mask-image: radial-gradient(ellipse 95% 75% at 50% 8%, black 25%, transparent 80%);
    }
    body::after { content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
      background:
        radial-gradient(1000px 540px at 88% -12%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 62%),
        radial-gradient(800px 600px at -8% 108%, color-mix(in srgb, var(--accent2) 5%, transparent), transparent 60%);
    }`);

// ── 3. sections: numbered HUD titles + blur-in reveals ──────────────────────
op('section + reveal',
`    .section { padding: 100px 0; max-width: 900px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }
    .section-label { color: var(--accent); font-size: 13px; letter-spacing: 0.12em; margin-bottom: 6px; }
    .section-title { font-size: clamp(26px, 4vw, 40px); font-weight: 700; margin-bottom: 48px; }

    /* Reveal animation */
    .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.65s ease, transform 0.65s ease; }
    .reveal.visible { opacity: 1; transform: none; }`,
`    .section { padding: 110px 24px; max-width: 900px; margin: 0 auto; counter-increment: sec; position: relative; z-index: 1; }
    .section-label { color: var(--accent); font-size: 13px; letter-spacing: 0.12em; margin-bottom: 10px; text-shadow: 0 0 14px color-mix(in srgb, var(--accent) 55%, transparent); }
    .section-title { font-size: clamp(26px, 4vw, 40px); font-weight: 700; margin-bottom: 52px; display: flex; align-items: center; gap: 18px; }
    .section-title::before { content: counter(sec, decimal-leading-zero); font-size: 12px; font-weight: 500; color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); background: color-mix(in srgb, var(--accent) 7%, transparent); padding: 5px 10px; border-radius: 8px; letter-spacing: 0.08em; text-shadow: 0 0 12px color-mix(in srgb, var(--accent) 60%, transparent); flex-shrink: 0; }
    .section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 40%, transparent), transparent); }

    /* Reveal animation */
    .reveal { opacity: 0; transform: translateY(26px); filter: blur(8px); transition: opacity 0.7s ease, transform 0.7s ease, filter 0.7s ease; }
    .reveal.visible { opacity: 1; transform: none; filter: blur(0); }`);

// ── 4. nav: glass pill + scroll progress ────────────────────────────────────
op('nav shell',
`    nav { position: fixed; top: 0; width: 100%; z-index: 1000; padding: 0; transition: background 0.3s, border-color 0.3s; }
    nav.scrolled { background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); }
    .nav-inner { max-width: 900px; margin: 0 auto; padding: 0 24px; height: 60px; display: flex; align-items: center; justify-content: space-between; }`,
`    nav { position: fixed; top: 0; width: 100%; z-index: 1000; padding: 10px 14px 0; }
    .nav-inner { max-width: 900px; margin: 0 auto; padding: 0 24px; height: 60px; display: flex; align-items: center; justify-content: space-between; border: 1px solid transparent; border-radius: 16px; transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease, height 0.35s ease; }
    nav.scrolled .nav-inner { background: color-mix(in srgb, var(--bg) 62%, transparent); backdrop-filter: blur(18px) saturate(1.5); -webkit-backdrop-filter: blur(18px) saturate(1.5); border-color: color-mix(in srgb, var(--accent) 18%, transparent); height: 52px; box-shadow: 0 12px 40px rgba(0,0,0,0.55), inset 0 0 30px color-mix(in srgb, var(--accent) 4%, transparent); }
    .scroll-progress { position: fixed; top: 0; left: 0; height: 2px; width: 0; background: linear-gradient(90deg, var(--accent), var(--accent2)); box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 70%, transparent); z-index: 1002; pointer-events: none; }`);

op('nav links',
`    .nav-links a { color: var(--muted); text-decoration: none; font-size: 12px; transition: color 0.2s; letter-spacing: 0.04em; }
    .nav-links a:hover { color: var(--accent); }`,
`    .nav-links a { color: var(--muted); text-decoration: none; font-size: 12px; transition: color 0.2s; letter-spacing: 0.04em; position: relative; padding-bottom: 3px; }
    .nav-links a::after { content: ''; position: absolute; left: 0; bottom: -2px; height: 1px; width: 0; background: var(--accent); box-shadow: 0 0 8px var(--accent); transition: width 0.25s ease; }
    .nav-links a:hover::after, .nav-links a.active::after { width: 100%; }
    .nav-links a.active { color: var(--accent); }
    .nav-links a:hover { color: var(--accent); }`);

// ── 5. hero: chip prompt, gradient name, prefixed role ──────────────────────
op('hero type',
`    .hero-prompt { color: var(--accent); font-size: 14px; margin-bottom: 20px; opacity: 0.8; }
    .hero-name { font-size: clamp(38px, 6.5vw, 76px); font-weight: 700; line-height: 1.08; margin-bottom: 18px; letter-spacing: -0.02em; }
    .hero-name .hl { color: var(--accent); }
    .hero-role { font-size: clamp(16px, 2.5vw, 24px); color: var(--muted); margin-bottom: 40px; min-height: 34px; }`,
`    .hero-prompt { display: inline-flex; align-items: center; gap: 4px; color: var(--accent); font-size: 12.5px; letter-spacing: 0.06em; margin-bottom: 26px; padding: 7px 15px; border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); background: color-mix(in srgb, var(--accent) 6%, transparent); border-radius: 999px; backdrop-filter: blur(6px); text-shadow: 0 0 12px color-mix(in srgb, var(--accent) 50%, transparent); }
    .hero-name { font-size: clamp(38px, 6.5vw, 76px); font-weight: 700; line-height: 1.06; margin-bottom: 18px; letter-spacing: -0.03em; background: linear-gradient(180deg, #ffffff 30%, color-mix(in srgb, var(--text) 55%, var(--accent)) 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 4px 30px color-mix(in srgb, var(--accent) 22%, transparent)); }
    .hero-name .hl { background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 55%, #ffffff) 0%, var(--accent) 90%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-role { font-size: clamp(16px, 2.5vw, 22px); color: var(--muted); margin-bottom: 42px; min-height: 34px; }
    .hero-role::before { content: '> '; color: var(--accent); opacity: 0.8; }`);

// ── 6. buttons: shimmer + primary fill ──────────────────────────────────────
op('buttons',
`    .btn { padding: 11px 22px; border: 1px solid var(--accent); color: var(--accent); background: transparent; font-family: var(--font); font-size: 13px; cursor: pointer; text-decoration: none; transition: all 0.2s; border-radius: var(--radius); display: inline-flex; align-items: center; gap: 6px; }
    .btn:hover { background: var(--accent); color: var(--bg); box-shadow: var(--glow); }
    .btn.outline2 { border-color: var(--border); color: var(--muted); }
    .btn.outline2:hover { border-color: var(--accent2); color: var(--accent2); background: transparent; box-shadow: 0 0 16px var(--accent2); }`,
`    .btn { position: relative; overflow: hidden; padding: 12px 24px; border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent); color: var(--accent); background: color-mix(in srgb, var(--accent) 5%, transparent); font-family: var(--font); font-size: 13px; letter-spacing: 0.03em; cursor: pointer; text-decoration: none; transition: all 0.25s ease; border-radius: 10px; display: inline-flex; align-items: center; gap: 6px; }
    .btn::after { content: ''; position: absolute; top: 0; left: -70%; width: 45%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,0.22), transparent); transform: skewX(-20deg); transition: left 0.5s ease; pointer-events: none; }
    .btn:hover::after { left: 130%; }
    .btn:hover { background: var(--accent); color: #051408; box-shadow: 0 0 32px color-mix(in srgb, var(--accent) 55%, transparent); transform: translateY(-2px); }
    .btn.primary { background: var(--accent); color: #051408; font-weight: 600; box-shadow: 0 0 26px color-mix(in srgb, var(--accent) 40%, transparent); }
    .btn.primary:hover { box-shadow: 0 0 46px color-mix(in srgb, var(--accent) 65%, transparent); }
    .btn.outline2 { border-color: var(--border); color: var(--muted); background: transparent; }
    .btn.outline2:hover { border-color: var(--accent2); color: var(--accent2); background: color-mix(in srgb, var(--accent2) 8%, transparent); box-shadow: 0 0 22px color-mix(in srgb, var(--accent2) 35%, transparent); }`);

// ── 8. cards: glass + corner brackets ───────────────────────────────────────
op('project card',
`    .project-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px; transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s; cursor: default; }
    .project-card:hover { border-color: var(--accent); transform: translateY(-5px); box-shadow: 0 12px 40px rgba(0,0,0,0.4), var(--glow); }`,
`    .project-card { position: relative; background: linear-gradient(165deg, color-mix(in srgb, var(--accent) 6%, transparent), transparent 45%), var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px; transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s; cursor: default; backdrop-filter: blur(8px); height: 100%; }
    .project-card::before, .project-card::after { content: ''; position: absolute; width: 14px; height: 14px; border: 0 solid var(--accent); opacity: 0; transition: opacity 0.25s ease; pointer-events: none; }
    .project-card::before { top: 9px; left: 9px; border-top-width: 1px; border-left-width: 1px; border-top-left-radius: 4px; }
    .project-card::after { bottom: 9px; right: 9px; border-bottom-width: 1px; border-right-width: 1px; border-bottom-right-radius: 4px; }
    .project-card:hover::before, .project-card:hover::after { opacity: 0.9; }
    .project-card:hover { border-color: color-mix(in srgb, var(--accent) 60%, var(--border)); transform: translateY(-5px); box-shadow: 0 18px 48px rgba(0,0,0,0.5), 0 0 28px color-mix(in srgb, var(--accent) 18%, transparent); }`);

op('edu card',
`    .edu-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; display: flex; gap: 20px; margin-bottom: 16px; transition: border-color 0.2s; }
    .edu-card:hover { border-color: var(--accent); }`,
`    .edu-card { background: linear-gradient(165deg, color-mix(in srgb, var(--accent) 5%, transparent), transparent 50%), var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; display: flex; gap: 20px; margin-bottom: 16px; transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s; backdrop-filter: blur(8px); }
    .edu-card:hover { border-color: color-mix(in srgb, var(--accent) 55%, var(--border)); transform: translateY(-3px); box-shadow: 0 14px 40px rgba(0,0,0,0.45), 0 0 24px color-mix(in srgb, var(--accent) 14%, transparent); }`);

op('web card',
`    .web-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; text-decoration: none; color: inherit; display: block; transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s; }
    .web-card:hover { border-color: var(--accent); transform: translateY(-5px); box-shadow: 0 12px 40px rgba(0,0,0,0.4), var(--glow); }`,
`    .web-card { background: linear-gradient(165deg, color-mix(in srgb, var(--accent) 5%, transparent), transparent 50%), var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; text-decoration: none; color: inherit; display: block; transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s; backdrop-filter: blur(8px); height: 100%; }
    .web-card:hover { border-color: color-mix(in srgb, var(--accent) 60%, var(--border)); transform: translateY(-5px); box-shadow: 0 18px 48px rgba(0,0,0,0.5), 0 0 28px color-mix(in srgb, var(--accent) 18%, transparent); }`);

op('code editor',
`    .code-editor { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }`,
`    .code-editor { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; backdrop-filter: blur(8px); box-shadow: 0 24px 70px rgba(0,0,0,0.45); }`);

op('editor statusbar',
`    .editor-statusbar { background: var(--accent); color: var(--bg); font-size: 11px; padding: 3px 16px; display: flex; justify-content: space-between; }`,
`    .editor-statusbar { background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 55%, var(--accent2))); color: #04140a; font-weight: 600; font-size: 11px; padding: 3px 16px; display: flex; justify-content: space-between; }`);

op('contact terminal',
`    .contact-terminal { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }`,
`    .contact-terminal { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; backdrop-filter: blur(8px); box-shadow: 0 18px 50px rgba(0,0,0,0.4); }`);

op('contact card',
`    .contact-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; display: flex; flex-direction: column; gap: 16px; }`,
`    .contact-card { background: linear-gradient(165deg, color-mix(in srgb, var(--accent) 5%, transparent), transparent 50%), var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; display: flex; flex-direction: column; gap: 16px; backdrop-filter: blur(8px); }`);

// ── 9. timeline: gradient spine + pulsing nodes ─────────────────────────────
op('timeline spine',
`    .timeline::before { content: ''; position: absolute; left: 4px; top: 8px; bottom: 8px; width: 1px; background: var(--border); }`,
`    .timeline::before { content: ''; position: absolute; left: 4px; top: 8px; bottom: 8px; width: 1px; background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 8%, transparent)); }`);

op('timeline dot',
`    .timeline-dot { position: absolute; left: -28px; top: 6px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg); box-shadow: 0 0 10px var(--accent); }`,
`    .timeline-dot { position: absolute; left: -28px; top: 6px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg); box-shadow: 0 0 10px var(--accent); animation: pulse 2.4s ease infinite; }`);

// ── 10. tags ────────────────────────────────────────────────────────────────
op('tags',
`    .tag { padding: 4px 11px; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; font-size: 11px; color: var(--muted); }`,
`    .tag { padding: 4px 11px; background: color-mix(in srgb, var(--accent) 5%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent); border-radius: 20px; font-size: 11px; color: var(--muted); transition: border-color 0.25s, color 0.25s, box-shadow 0.25s; }
    .tag:hover { border-color: color-mix(in srgb, var(--accent) 50%, transparent); color: var(--text); box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 18%, transparent); }`);

// ── 11. about portrait ──────────────────────────────────────────────────────
op('about portrait',
`.about-portrait { width: 100%; max-width: 340px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }`,
`.about-portrait { width: 100%; max-width: 340px; margin: 0 auto; background: linear-gradient(165deg, color-mix(in srgb, var(--accent) 6%, transparent), transparent 50%), var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; backdrop-filter: blur(8px); transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s; }
.about-portrait:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); box-shadow: 0 22px 60px rgba(0,0,0,0.55), 0 0 30px color-mix(in srgb, var(--accent) 15%, transparent); transform: translateY(-4px); }`);

// ── 11b. mobile nav: scrollable links instead of overflowing the logo ───────
op('mobile nav',
`    @media (max-width: 640px) {
      .about-grid { grid-template-columns: 1fr; }
      .about-avatar { display: none; }
      .contact-grid { grid-template-columns: 1fr; }
      .web-grid { grid-template-columns: 1fr; }
    }`,
`    @media (max-width: 640px) {
      .about-grid { grid-template-columns: 1fr; }
      .about-avatar { display: none; }
      .contact-grid { grid-template-columns: 1fr; }
      .web-grid { grid-template-columns: 1fr; }
      .nav-inner { padding: 0 14px; gap: 12px; }
      .nav-links { gap: 14px; overflow-x: auto; scrollbar-width: none; }
      .nav-links::-webkit-scrollbar { display: none; }
      .nav-links a { font-size: 11px; white-space: nowrap; }
    }`);

// ── 12. footer ──────────────────────────────────────────────────────────────
op('footer css',
`    footer { text-align: center; padding: 48px 24px 32px; color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); }`,
`    footer { text-align: center; padding: 56px 24px 36px; color: var(--muted); font-size: 12px; border-top: 1px solid; border-image: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 35%, transparent), transparent) 1; position: relative; z-index: 1; }
    .footer-exit { margin-top: 14px; font-size: 11px; opacity: 0.6; }
    .footer-exit .fx-prompt { color: var(--accent); }`);

// ── 13. Nav component: scrollspy + scroll progress ──────────────────────────
op('nav component',
`function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h, {passive:true});
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <div className="nav-inner">`,
`function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState('');
  useEffect(() => {
    const h = () => {
      setScrolled(window.scrollY > 50);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    window.addEventListener('scroll', h, {passive:true});
    h();
    return () => window.removeEventListener('scroll', h);
  }, []);
  useEffect(() => {
    const ids = ['about','education','skills','projects','experience','web','contact'];
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-35% 0px -55% 0px' });
    ids.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <div className="scroll-progress" style={{width: progress + '%'}} />
      <div className="nav-inner">`);

op('nav active links',
`          {['about','education','skills','projects','experience','web','contact'].map(s =>
            <li key={s}><a href={\`#\${s}\`}>{s}</a></li>
          )}`,
`          {['about','education','skills','projects','experience','web','contact'].map(s =>
            <li key={s}><a href={\`#\${s}\`} className={active === s ? 'active' : ''}>{s}</a></li>
          )}`);

// ── 14. hero JSX: chip + primary CTA ────────────────────────────────────────
op('hero jsx',
`        <p className="hero-prompt">$ whoami</p>
        <h1 className="hero-name">Bingsen <span className="hl">(Tony)</span> Teng</h1>
        <p className="hero-role">{role}<span className="cursor" /></p>
        <div className="hero-cta">
          <a href="#projects" className="btn">View Projects</a>
          <a href="mailto:bingsen.teng777@gmail.com" className="btn">Contact Me</a>
          <a href="https://github.com/Tonieeie" target="_blank" rel="noopener" className="btn outline2">GitHub ↗</a>
        </div>`,
`        <p className="hero-prompt"><span className="status-dot" /> tony@portfolio:~$ whoami</p>
        <h1 className="hero-name">Bingsen <span className="hl">(Tony)</span> Teng</h1>
        <p className="hero-role">{role}<span className="cursor" /></p>
        <div className="hero-cta">
          <a href="#projects" className="btn primary">View Projects</a>
          <a href="mailto:bingsen.teng777@gmail.com" className="btn">Contact Me</a>
          <a href="https://github.com/Tonieeie" target="_blank" rel="noopener" className="btn outline2">GitHub ↗</a>
        </div>`);

// ── 15. footer JSX ──────────────────────────────────────────────────────────
op('footer jsx',
`        <p style={{marginBottom:'6px'}}>Built with <span style={{color:'var(--accent)'}}>{'</>'}</span> by Bingsen (Tony) Teng · 2026</p>
        <p style={{opacity:0.5}}>Melbourne, Australia</p>
      </footer>`,
`        <p style={{marginBottom:'6px'}}>Built with <span style={{color:'var(--accent)'}}>{'</>'}</span> by Bingsen (Tony) Teng · 2026</p>
        <p style={{opacity:0.5}}>Melbourne, Australia</p>
        <p className="footer-exit"><span className="fx-prompt">tony@portfolio:~$</span> exit · [connection closed]</p>
      </footer>`);

// ── 16. active theme: glass surfaces, cyan pair, real hierarchy ─────────────
op('cyber theme vars',
`  cyber: {
    label: 'Cyber Purple',
    vars: { '--bg':'#000000','--surface':'#08081e','--border':'#1a0838','--accent':'#00ff41','--accent2':'#ffffff','--accent3':'#ff0080','--text':'#ffffff','--muted':'#ffffff','--glow':'0 0 24px #00ff41' },
    matrix: '#00ff41',
    matrixOpacity: 0.45,
    matrixFade: 0.03,
    dot1: '#ff0080', dot2: '#00ff41', dot3: '#ffffff',
  },`,
`  cyber: {
    label: 'Matrix Black',
    vars: { '--bg':'#010503','--surface':'rgba(10,20,13,0.72)','--border':'rgba(0,255,65,0.13)','--accent':'#00ff41','--accent2':'#22d3ee','--accent3':'#ff0080','--text':'#e9f6ee','--muted':'#a9c0b4','--glow':'0 0 24px rgba(0,255,65,0.45)' },
    matrix: '#00ff41',
    matrixOpacity: 0.38,
    matrixFade: 0.03,
    dot1: '#ff5f57', dot2: '#febc2e', dot3: '#28c840',
  },`);

// ── apply ───────────────────────────────────────────────────────────────────
let failed = 0;
for (const { name, find, replace } of ops) {
  const idx = tpl.indexOf(find);
  if (idx === -1) { console.error('MISS:', name); failed++; continue; }
  if (tpl.indexOf(find, idx + 1) !== -1) { console.error('AMBIGUOUS:', name); failed++; continue; }
  tpl = tpl.slice(0, idx) + replace + tpl.slice(idx + find.length);
  console.log('ok:', name);
}

// BorderGlow wrappers: match the new card radius
const bgCount = tpl.split('borderRadius={6}').length - 1;
tpl = tpl.split('borderRadius={6}').join('borderRadius={12}');
console.log('ok: borderRadius 6 -> 12 (' + bgCount + ' occurrences)');

if (failed > 0) { console.error(failed + ' ops failed — aborting, file NOT written'); process.exit(1); }

// Escape closing script tags so the embedded JSON can't terminate the
// <script type="__bundler/template"> element during HTML parsing.
const encoded = JSON.stringify(tpl).replace(/<\//g, '<\\/');
fs.writeFileSync(FILE, html.slice(0, cStart) + encoded + html.slice(cEnd));
console.log('written:', FILE);
