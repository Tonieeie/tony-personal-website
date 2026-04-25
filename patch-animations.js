const fs = require('fs');

const TARGETS = [
  'D:/Desktop/Tony_personal_website/Tony-Website-Cyber.html',
  'D:/Desktop/Tony_personal_website/index.html',
];

const htmlSafe = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

for (const path of TARGETS) {
  const html = fs.readFileSync(path, 'utf8');

  const mOpen = '<script type="__bundler/manifest">\n';
  const tOpen = '<script type="__bundler/template">\n';
  const close  = '\n  </script>';

  const mStart        = html.indexOf(mOpen);
  const mContentStart = mStart + mOpen.length;
  const mEnd          = html.indexOf(close, mContentStart);
  const tStart        = html.indexOf(tOpen, mEnd);
  const tContentStart = tStart + tOpen.length;
  const tEnd          = html.indexOf(close, tContentStart);

  const manifest = JSON.parse(html.slice(mContentStart, mEnd));
  let template   = JSON.parse(html.slice(tContentStart, tEnd));

  function replace(old, neu) {
    const count = template.split(old).length - 1;
    if (count !== 1) throw new Error(`Anchor not found exactly once (found ${count}x): ${old.substring(0, 80)}`);
    template = template.split(old).join(neu);
  }

  // ── 1. CSS: glitch + directional reveals + code-line typing ────────────────
  const CSS_ANCHOR = '    @media (max-width: 640px) {';
  const CSS_NEW =
    '    /* Glitch effect on section titles */\n' +
    '    @keyframes glitch {\n' +
    '      0%,90% { text-shadow: none; }\n' +
    '      91% { text-shadow: 2px 0 var(--accent2), -2px 0 var(--accent3); }\n' +
    '      92% { text-shadow: -2px 0 var(--accent2), 2px 0 var(--accent3); }\n' +
    '      93%,100% { text-shadow: none; }\n' +
    '    }\n' +
    '    .section-title { animation: glitch 6s 1.2s infinite; }\n\n' +
    '    /* Directional reveal variants */\n' +
    '    .reveal[data-dir="left"] { transform: translateX(-32px); }\n' +
    '    .reveal[data-dir="right"] { transform: translateX(32px); }\n' +
    '    .reveal[data-dir="left"].visible, .reveal[data-dir="right"].visible { transform: none; }\n\n' +
    '    /* Code editor line-by-line typing */\n' +
    '    .code-line { opacity: 0; transform: translateX(-6px); transition: opacity 0.15s ease, transform 0.15s ease; }\n' +
    '    .code-line.typed { opacity: 1; transform: none; }\n\n' +
    CSS_ANCHOR;
  replace(CSS_ANCHOR, CSS_NEW);

  // ── 2. About: split reveal into left/right columns ──────────────────────────
  replace(
    '      <div className="about-grid reveal">',
    '      <div className="about-grid">'
  );
  replace(
    '        <div>\n          <div className="about-text">',
    '        <div className="reveal" data-dir="left">\n          <div className="about-text">'
  );
  replace(
    '        <div className="about-avatar" style={{padding:0,overflow:\'hidden\'}}>',
    '        <div className="about-avatar reveal" data-dir="right" style={{padding:0,overflow:\'hidden\'}}>'
  );

  // ── 3. Experience: stagger each timeline item from the left ─────────────────
  replace(
    '      <div className="timeline reveal">\n        {EXPERIENCE.map((e, i) => (\n          <div key={i} className="timeline-item">',
    '      <div className="timeline">\n        {EXPERIENCE.map((e, i) => (\n          <div key={i} className="timeline-item reveal" data-dir="left" style={{transitionDelay:`${i*110}ms`}}>'
  );

  // ── 4. Skills: add typing animation ─────────────────────────────────────────
  const OLD_SKILLS = `function Skills({ theme }) {
  const lines = CODE_LINES;
  return (
    <section id="skills" className="section">
      <p className="section-label reveal">$ python skills.py</p>
      <h2 className="section-title reveal">Technical Skills</h2>
      <div className="code-editor reveal">
        <div className="editor-chrome">
          <div className="editor-dot" style={{background:theme.dot1}} />
          <div className="editor-dot" style={{background:theme.dot2}} />
          <div className="editor-dot" style={{background:theme.dot3}} />
          <div className="editor-tabs">
            <div className="editor-tab active">skills.py</div>
            <div className="editor-tab">__init__.py</div>
          </div>
        </div>
        <div className="editor-body">
          <div className="line-nums">
            {lines.map((_,i) => <div key={i}>{i+1}</div>)}
          </div>
          <div className="code-content">
            {lines.map((line, i) => {
              if (line.t === 'blank') return <div key={i}>{' '}</div>;
              if (line.t === 'cm') return <div key={i}><span className="cm">{line.v}</span></div>;
              if (line.t === 'kw') return (
                <div key={i}>
                  <span className="kw">{line.v}</span>
                  {line.rest.map((r,j) => <span key={j} className={r.c}>{r.v}</span>)}
                </div>
              );
              if (line.t === 'prop') return (
                <div key={i}>
                  <span className="prop">{line.label}</span>
                  <span className="punc"> = [</span>
                  {line.vals.map((v,j) => (
                    <span key={j}><span className="str">{v}</span>{j < line.vals.length-1 && <span className="punc">, </span>}</span>
                  ))}
                  <span className="punc">]</span>
                </div>
              );
              return <div key={i}>{line.v}</div>;
            })}
          </div>
        </div>
        <div className="editor-statusbar">
          <span>Python 3.12 · UTF-8</span>
          <span>Ln {lines.length}, Col 1</span>
          <span>skills.py</span>
        </div>
      </div>
    </section>
  );
}`;

  const NEW_SKILLS = `function Skills({ theme }) {
  const allLines = CODE_LINES;
  const [typedCount, setTypedCount] = useState(0);
  const playedRef = useRef(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !playedRef.current) {
        playedRef.current = true;
        io.disconnect();
        let i = 0;
        const tick = () => { i++; setTypedCount(i); if (i < allLines.length) setTimeout(tick, 48); };
        setTimeout(tick, 300);
      }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const renderLine = (line, i) => {
    const cls = \`code-line\${i < typedCount ? ' typed' : ''}\`;
    if (line.t === 'blank') return <div key={i} className={cls}>{' '}</div>;
    if (line.t === 'cm') return <div key={i} className={cls}><span className="cm">{line.v}</span></div>;
    if (line.t === 'kw') return (
      <div key={i} className={cls}>
        <span className="kw">{line.v}</span>
        {line.rest.map((r,j) => <span key={j} className={r.c}>{r.v}</span>)}
      </div>
    );
    if (line.t === 'prop') return (
      <div key={i} className={cls}>
        <span className="prop">{line.label}</span>
        <span className="punc"> = [</span>
        {line.vals.map((v,j) => (
          <span key={j}><span className="str">{v}</span>{j < line.vals.length-1 && <span className="punc">, </span>}</span>
        ))}
        <span className="punc">]</span>
      </div>
    );
    return <div key={i} className={cls}>{line.v}</div>;
  };

  return (
    <section id="skills" className="section" ref={sectionRef}>
      <p className="section-label reveal">$ python skills.py</p>
      <h2 className="section-title reveal">Technical Skills</h2>
      <div className="code-editor reveal">
        <div className="editor-chrome">
          <div className="editor-dot" style={{background:theme.dot1}} />
          <div className="editor-dot" style={{background:theme.dot2}} />
          <div className="editor-dot" style={{background:theme.dot3}} />
          <div className="editor-tabs">
            <div className="editor-tab active">skills.py</div>
            <div className="editor-tab">__init__.py</div>
          </div>
        </div>
        <div className="editor-body">
          <div className="line-nums">
            {allLines.map((_,i) => <div key={i} className={\`code-line\${i < typedCount ? ' typed' : ''}\`}>{i+1}</div>)}
          </div>
          <div className="code-content">
            {allLines.map((line, i) => renderLine(line, i))}
          </div>
        </div>
        <div className="editor-statusbar">
          <span>Python 3.12 · UTF-8</span>
          <span>Ln {allLines.length}, Col 1</span>
          <span>skills.py</span>
        </div>
      </div>
    </section>
  );
}`;

  replace(OLD_SKILLS, NEW_SKILLS);

  // ── Write output ────────────────────────────────────────────────────────────
  const out = html.slice(0, mContentStart) + htmlSafe(manifest) + html.slice(mEnd, tContentStart) + htmlSafe(template) + html.slice(tEnd);
  fs.writeFileSync(path, out);
  console.log('patched', path);
}
