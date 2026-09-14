// Layered portrait card: original photo + generated matte/background + live foil.
function HolographicPortrait() {
  const stageRef = React.useRef(null);
  const frameRef = React.useRef(0);
  const targetRef = React.useRef({ x: 0, y: 0 });
  const [flipped, setFlipped] = React.useState(false);

  React.useEffect(() => {
    const stage = stageRef.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      frameRef.current = 0;
      const { x, y } = targetRef.current;
      stage.style.setProperty('--rx', `${motion.matches ? 0 : -y * 10}deg`);
      stage.style.setProperty('--ry', `${motion.matches ? 0 : x * 13}deg`);
      stage.style.setProperty('--mx', `${50 + x * 38}%`);
      stage.style.setProperty('--my', `${50 + y * 38}%`);
      stage.style.setProperty('--foil-x', `${50 + x * 35}%`);
      stage.style.setProperty('--foil-angle', `${125 + x * 25 - y * 15}deg`);
      stage.style.setProperty('--px', `${motion.matches ? 0 : x * 9}px`);
      stage.style.setProperty('--py', `${motion.matches ? 0 : y * 7}px`);
    };
    const update = (x, y) => {
      targetRef.current = { x, y };
      if (!frameRef.current) frameRef.current = requestAnimationFrame(apply);
    };
    const move = event => {
      const rect = stage.getBoundingClientRect();
      update(
        Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)),
        Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1))
      );
    };
    const reset = () => update(0, 0);
    const keydown = event => {
      const offsets = { ArrowLeft: [-0.3, 0], ArrowRight: [0.3, 0], ArrowUp: [0, -0.3], ArrowDown: [0, 0.3] };
      if (offsets[event.key]) {
        event.preventDefault();
        const [dx, dy] = offsets[event.key];
        update(Math.max(-1, Math.min(1, targetRef.current.x + dx)), Math.max(-1, Math.min(1, targetRef.current.y + dy)));
      } else if (event.key === 'Escape') {
        reset();
        setFlipped(false);
      }
    };
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerleave', reset);
    stage.addEventListener('pointercancel', reset);
    stage.addEventListener('pointerup', eventEnd);
    stage.addEventListener('blur', reset, true);
    stage.addEventListener('keydown', keydown);
    motion.addEventListener('change', apply);
    function eventEnd(event) { if (event.pointerType !== 'mouse') reset(); }
    return () => {
      cancelAnimationFrame(frameRef.current);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerleave', reset);
      stage.removeEventListener('pointercancel', reset);
      stage.removeEventListener('pointerup', eventEnd);
      stage.removeEventListener('blur', reset, true);
      stage.removeEventListener('keydown', keydown);
      motion.removeEventListener('change', apply);
    };
  }, []);

  return (
    <div className="holo-profile">
      <div className="holo-stage" ref={stageRef}>
        <button className="holo-card" type="button" onClick={() => setFlipped(value => !value)}
          aria-label={flipped ? 'Show Tony Teng portrait. Arrow keys tilt; Escape resets.' : 'Turn Tony Teng holographic card over. Arrow keys tilt; Escape resets.'}
          aria-pressed={flipped} aria-describedby="holo-hint">
          <span className={`holo-turn${flipped ? ' is-flipped' : ''}`}>
            <span className="holo-front" aria-hidden={flipped}>
              <span className="holo-base holo-plane" />
              <span className="holo-background holo-plane" />
              <span className="holo-grid holo-plane" />
              <span className="holo-orbit holo-plane"><i /><i /><i /></span>
              <span className="holo-watermark holo-plane">T / T</span>
              <span className="holo-person holo-plane">
                <img src="./assets/holo-card/subject.webp" alt="Bingsen (Tony) Teng" width="1024" height="1024" loading="lazy" decoding="async" draggable="false" />
              </span>
              <span className="holo-shade holo-plane" />
              <span className="holo-foil holo-plane" />
              <span className="holo-sparks holo-plane"><i>✦</i><i>✧</i><i>✦</i><i>+</i></span>
              <span className="holo-print holo-plane">
                <span className="holo-topline"><span><b className="holo-status" /> PERSONAL ARCHIVE</span><span>NO. 001</span></span>
                <span className="holo-edition">PRISM EDITION</span>
                <span className="holo-sidecode">CYBERSECURITY / AI / ENGINEERING</span>
                <span className="holo-identity">
                  <span className="holo-overline">DEVELOPER · BUILDER · EXPLORER</span>
                  <span className="holo-name">TONY <em>TENG</em><span className="holo-seal">✳</span></span>
                  <span className="holo-fullname">BINGSEN TENG <span>滕炳森</span></span>
                  <span className="holo-tagline">Stay curious. Build what matters.</span>
                  <span className="holo-bottomline"><span>MELBOURNE, AU</span><span>01 / 01 <b>◆</b></span></span>
                </span>
              </span>
              <span className="holo-glare holo-plane" />
              <span className="holo-border holo-plane" />
            </span>
            <span className="holo-back" aria-hidden={!flipped}>
              <span className="holo-topline"><span>THE PERSON BEHIND THE CODE</span><span>001</span></span>
              <span className="holo-back-symbol">T<span>/</span>T</span>
              <span className="holo-back-title">Curiosity, engineered.</span>
              <span className="holo-back-description">Exploring the intersection of secure systems, artificial intelligence, and products that make a difference.</span>
              <span className="holo-back-fields"><span>01 <b>CYBERSECURITY</b></span><span>02 <b>AI SYSTEMS</b></span><span>03 <b>PRODUCT ENGINEERING</b></span></span>
              <span className="holo-back-footer"><span>BINGSEN (TONY) TENG</span><span>MELBOURNE, AU</span></span>
            </span>
          </span>
        </button>
      </div>
      <div className="holo-caption" id="holo-hint"><span className="holo-hint-desktop">MOVE TO EXPLORE</span><span className="holo-hint-touch">TOUCH TO EXPLORE</span><span>·</span><span>CLICK TO FLIP</span></div>
      <a className="holo-contact" href="mailto:bingsen.teng777@gmail.com">Let's build something <span aria-hidden="true">↗</span></a>
    </div>
  );
}
