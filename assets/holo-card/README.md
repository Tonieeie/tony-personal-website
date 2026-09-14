# Tony Teng — Prism Edition

Interactive portrait in the portfolio's About Me section. Run `npm run dev`,
then open `http://localhost:4000/?nointro#about`.

Move the pointer to tilt and change the foil reflection. Click or press Enter /
Space to turn the card over. Arrow keys tilt; Escape returns to the front and
centres the card. Touch movement also changes the reflection; vertical page
scrolling stays available. Reduced-motion preferences disable tilt, parallax,
and animated transitions. There is no perpetual animation loop.

On phones, choose **Enable motion**, then grant the browser's motion permission
if asked. The first valid reading calibrates the comfortable holding position;
tilting drives the existing card, parallax and foil. **Recenter** calibrates again;
**Disable motion** restores pointer/touch control. HTTPS and a browser exposing
DeviceOrientation are required. No permission is requested automatically, and
sensor data stays in the page. Denied permission or missing sensor readings
leave touch controls available. Reduced-motion preferences prevent enabling
the sensor effect. Sensor updates pause offscreen and in background tabs, and
returning to the card or changing screen orientation recalibrates. The controller
uses relative quaternion rotation, bounded angles and a low-pass filter to
avoid angle wraparound and hand jitter. Keyboard arrows switch back to manual
control; Escape recentres motion and returns to the front.

Run `node --test tests/holo-motion.test.cjs` from the project root for the nine
controller tests (permission outcomes, tilt maths, calibration, filtering,
timeouts, visibility, reduced motion and cleanup). Browser QA checks the mobile
controls and the denied-permission fallback. Physical iPhone/Android sensor
behaviour and the native permission sheet still require an HTTPS real-device
check after deployment; the automated tests simulate sensor readings.

## Implementation and assets

- `card.jsx`: React component, pointer and keyboard interaction, cleanup.
- `card.css`: independently positioned background, orbit, portrait, effects,
  typography, glare and frame; responsive front and back.
- `subject.webp`: web foreground with genuine alpha. Its RGB pixels come from
  the original `../../profile.jpg`, with an imagegen-created silhouette matte.
- `background.webp`: compressed web version of the generated environment.
- `subject.png`, `subject-mask.png`, `background.png`: editable source assets.
- `asset-validation.json`: alpha validation from `node prepare-holo-assets.js`.

Web image payload totals approximately 143 KiB. Source PNGs and preparation
files are excluded from Cloudflare asset uploads in `.assetsignore`.

The existing JSON-encoded HTML bundle is updated with `../../patch-holo-card.js`.
It changes the portrait markup and adds the external CSS and JSX references;
the rest of the current template and embedded manifest are preserved. Run it
only when reapplying the feature to an older static-portrait template.

## Design reference

Adapted the separate artwork planes, genuine-alpha foreground, angle-dependent
foil, legible typography and bidirectional visual verification principles from
[RuiC-card-skill](https://github.com/HRuiCcc/RuiC-card-skill/blob/main/SKILL.md).
This is a CSS-3D/React adaptation for the existing portfolio, not the skill's
Blender/Three.js pipeline. No `.blend` or `.glb` model is produced or required.

UI/UX Pro Max informed the restrained background, visible focus, mobile sizing,
and reduced-motion handling. Colours and typography complement the site's
existing dark green developer theme.

## Image generation provenance

Both retained generated assets used the built-in imagegen tool. The original
photograph is the identity reference and the final portrait's RGB source.
An initial attempted transparent extraction returned painted checkerboard
pixels and was rejected. The skill's checkerboard detector did not recognize
that irregular pattern; that output is not used in the website. A separate
silhouette matte was generated instead and applied to the original photograph.

Background prompt:

> Use case: stylized-concept. Asset type: opaque background plate for an interactive holographic portrait collectible card on a cybersecurity developer's website. Portrait 2:3 canvas, 1024x1536. Create a cinematic dark emerald and deep midnight-teal sci-fi architectural void: a beautiful large thin luminous mint-green circular portal behind the upper middle of an eventual human portrait, receding concentric engineered arcs, delicate cyan refractive glass shards near the far edges, restrained technical etched lines, moody volumetric light and polished obsidian. Strong depth, expensive collectible print aesthetic, crisp intricate edge details, subtle pale cool light. Center must be quiet very dark teal so a real human cutout can be placed on top; top 15 percent and bottom 22 percent also dark and quiet for HTML typography. Background occupies full canvas, no alpha. No people, faces, silhouettes, words, letters, logos, borders, card mockup, rainbow sheen, glitter, or star field; holographic shine will be added interactively with code. Make this visually captivating but restrained enough to support a real photographic portrait.

Subject matte prompt (reference: `profile.jpg`):

> Edit task: produce ONLY a black-and-white foreground segmentation MASK for the exact supplied portrait, pixel-aligned with this input. Same square framing and composition, exact same silhouette and proportions, no repositioning. All pixels of the PERSON (hair including loose hairs, face, ears, neck, white shirt, both shoulders) must become solid pure WHITE (#ffffff) without internal details or texture. All pixels of the gray wall and cast shadows must become solid pure BLACK (#000000). Smooth accurate silhouette edges with antialiasing. This is a technical alpha matte to apply to the ORIGINAL PHOTO, not an illustration or new portrait. The person starts around y=245 of the original 1200x1200 image; preserve the large empty area above hair and both bottom shoulders exactly. Do NOT add checkerboard or transparency. Return a flat RGB square image containing only the precise white silhouette on black. No text, no border.

All card lettering is live HTML text, not generated lettering baked into images.
