// Layered portrait card: original photo + generated matte/background + live foil.
// DeviceOrientation uses intrinsic Z-X-Y angles. Relative quaternions avoid
// Euler-angle jumps when the phone passes through an upright position.
function holoOrientation({ alpha, beta, gamma }) {
  const radians = Math.PI / 360;
  const a = (Number.isFinite(alpha) ? alpha : 0) * radians;
  const b = beta * radians, g = gamma * radians;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  return [ca * sb * cg - sa * cb * sg, ca * cb * sg + sa * sb * cg,
    sa * cb * cg + ca * sb * sg, ca * cb * cg - sa * sb * sg];
}

function holoRelativeTilt(neutral, current, screenAngle) {
  const [a, b, c, d] = [-neutral[0], -neutral[1], -neutral[2], neutral[3]];
  const [e, f, g, h] = current;
  const x = d * e + a * h + b * g - c * f;
  const y = d * f - a * g + b * h + c * e;
  const z = d * g + a * f - b * e + c * h;
  const w = d * h - a * e - b * f - c * g;
  const normalZ = 1 - 2 * (x * x + y * y);
  const horizontal = Math.atan2(2 * (x * z + w * y), normalZ);
  const vertical = Math.atan2(2 * (w * x - y * z), normalZ);
  const angle = screenAngle * Math.PI / 180;
  const range = 25 * Math.PI / 180;
  const clamp = value => Math.max(-1, Math.min(1, value / range));
  return {
    x: clamp(horizontal * Math.cos(angle) + vertical * Math.sin(angle)),
    y: clamp(vertical * Math.cos(angle) - horizontal * Math.sin(angle))
  };
}

// Own the permission request and sensor lifecycle separately from pointer input.
function createHoloMotion(stage, update, onStatus) {
  let enabled = false, disposed = false, requestId = 0, timeout = 0;
  let neutral = null, lastTime = 0, visible = true;
  let filtered = { x: 0, y: 0 };
  const screenOrientation = window.screen.orientation;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (enabled) recenter();
  });
  function waitForReading() {
    clearTimeout(timeout);
    if (!visible || document.hidden) return;
    timeout = setTimeout(() => stop('unavailable'), 8000);
  }
  function recenter() {
    neutral = null;
    lastTime = 0;
    filtered = { x: 0, y: 0 };
    update(0, 0);
    if (enabled) {
      onStatus('calibrating');
      waitForReading();
    }
  }
  function orientation(event) {
    if (!enabled || !visible || document.hidden || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    const current = holoOrientation(event);
    if (!neutral) {
      neutral = current;
      clearTimeout(timeout);
      onStatus('active');
    }
    const angle = screenOrientation ? screenOrientation.angle : (window.orientation || 0);
    const target = holoRelativeTilt(neutral, current, angle);
    const now = performance.now();
    const smoothing = lastTime ? 1 - Math.exp(-Math.min(now - lastTime, 100) / 85) : 1;
    lastTime = now;
    filtered = { x: filtered.x + (target.x - filtered.x) * smoothing, y: filtered.y + (target.y - filtered.y) * smoothing };
    update(Math.abs(filtered.x) < .015 ? 0 : filtered.x, Math.abs(filtered.y) < .015 ? 0 : filtered.y);
  }
  function preferenceChanged() { if (reducedMotion.matches) stop('reduced'); }
  function stop(status = 'off') {
    requestId++;
    enabled = false;
    clearTimeout(timeout);
    observer.disconnect();
    window.removeEventListener('deviceorientation', orientation);
    window.removeEventListener('orientationchange', recenter);
    if (screenOrientation) screenOrientation.removeEventListener('change', recenter);
    document.removeEventListener('visibilitychange', recenter);
    reducedMotion.removeEventListener('change', preferenceChanged);
    recenter();
    if (!disposed) onStatus(status);
  }
  async function enable() {
    if (disposed) return;
    if (!window.isSecureContext) return onStatus('insecure');
    const sensor = window.DeviceOrientationEvent;
    if (!sensor) return onStatus('unavailable');
    if (reducedMotion.matches) return onStatus('reduced');
    const id = ++requestId;
    onStatus('requesting');
    try {
      // This call must happen directly inside the button's user gesture on iOS.
      const permission = typeof sensor.requestPermission === 'function' ? await sensor.requestPermission() : 'granted';
      if (disposed || id !== requestId) return;
      if (permission !== 'granted') return onStatus('denied');
      if (reducedMotion.matches) return onStatus('reduced');
      enabled = true;
      recenter();
      observer.observe(stage);
      window.addEventListener('deviceorientation', orientation, { passive: true });
      window.addEventListener('orientationchange', recenter);
      if (screenOrientation) screenOrientation.addEventListener('change', recenter);
      document.addEventListener('visibilitychange', recenter);
      reducedMotion.addEventListener('change', preferenceChanged);
    } catch (error) {
      if (!disposed && id === requestId) stop(error.name === 'NotAllowedError' ? 'denied' : 'unavailable');
    }
  }
  return { enable, stop, recenter, isEnabled: () => enabled, destroy() { disposed = true; stop(); } };
}

function HolographicPortrait() {
  const stageRef = React.useRef(null);
  const frameRef = React.useRef(0);
  const targetRef = React.useRef({ x: 0, y: 0 });
  const motionRef = React.useRef(null);
  const [flipped, setFlipped] = React.useState(false);
  const [motionStatus, setMotionStatus] = React.useState('off');
  const motionEnabled = motionStatus === 'active' || motionStatus === 'calibrating';
  const motionMessages = {
    off: 'Tilt your phone to explore the card.',
    requesting: 'Allow motion access in your browser.',
    calibrating: 'Hold your phone comfortably. Waiting for motion…',
    active: 'Motion is on. Tilt gently, or recenter your view.',
    denied: 'Motion access was denied. Touch controls still work.',
    unavailable: 'Motion is unavailable here. Try your phone’s Safari or Chrome, or use touch.',
    insecure: 'Open this page over HTTPS to enable motion.',
    reduced: 'Reduced motion is enabled on your device. Touch controls still work.'
  };

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
      if (motionRef.current.isEnabled()) return;
      const rect = stage.getBoundingClientRect();
      update(
        Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)),
        Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1))
      );
    };
    const reset = () => update(0, 0);
    const pointerReset = () => { if (!motionRef.current.isEnabled()) reset(); };
    const keydown = event => {
      const offsets = { ArrowLeft: [-0.3, 0], ArrowRight: [0.3, 0], ArrowUp: [0, -0.3], ArrowDown: [0, 0.3] };
      if (offsets[event.key]) {
        event.preventDefault();
        if (motionRef.current.isEnabled()) motionRef.current.stop();
        const [dx, dy] = offsets[event.key];
        update(Math.max(-1, Math.min(1, targetRef.current.x + dx)), Math.max(-1, Math.min(1, targetRef.current.y + dy)));
      } else if (event.key === 'Escape') {
        motionRef.current.recenter();
        setFlipped(false);
      }
    };
    motionRef.current = createHoloMotion(stage, update, setMotionStatus);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerleave', pointerReset);
    stage.addEventListener('pointercancel', pointerReset);
    stage.addEventListener('pointerup', eventEnd);
    stage.addEventListener('blur', pointerReset, true);
    stage.addEventListener('keydown', keydown);
    motion.addEventListener('change', apply);
    function eventEnd(event) { if (event.pointerType !== 'mouse') pointerReset(); }
    return () => {
      motionRef.current.destroy();
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerleave', pointerReset);
      stage.removeEventListener('pointercancel', pointerReset);
      stage.removeEventListener('pointerup', eventEnd);
      stage.removeEventListener('blur', pointerReset, true);
      stage.removeEventListener('keydown', keydown);
      motion.removeEventListener('change', apply);
    };
  }, []);

  return (
    <div className="holo-profile" data-motion={motionEnabled ? 'on' : 'off'}>
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
      <div className="holo-motion">
        <div className="holo-motion-actions">
          <button type="button" className="holo-motion-toggle" aria-pressed={motionEnabled}
            disabled={motionStatus === 'requesting'} aria-describedby="holo-motion-status"
            onClick={() => motionEnabled ? motionRef.current.stop() : motionRef.current.enable()}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2" transform="rotate(12 12 12)" /><path d="M3 8 1 12l3 3M21 16l2-4-3-3M11 17h2" /></svg>
            {motionStatus === 'requesting' ? 'Requesting access…' : motionEnabled ? 'Disable motion' : 'Enable motion'}
          </button>
          {motionEnabled && <button type="button" className="holo-motion-recenter" onClick={() => motionRef.current.recenter()}>Recenter</button>}
        </div>
        <p id="holo-motion-status" className="holo-motion-status" role="status">{motionMessages[motionStatus]}</p>
      </div>
      <a className="holo-contact" href="mailto:bingsen.teng777@gmail.com">Let's build something <span aria-hidden="true">↗</span></a>
    </div>
  );
}
