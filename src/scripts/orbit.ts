// Orbit of tiles around the centre of a stage: they turn slowly forever, and scrolling pushes each one further out
// or pulls it closer (by its own depth), then lets it settle back to the orbit. Inspired by madewithgsap's
// "orbit" effect. Only transforms are written, so every frame stays on the compositor.

type Tile = {
  el: HTMLElement;
  // Resting angle on the orbit (radians)
  angle: number;
  // How this tile reacts to scroll: positive is pushed out, negative is pulled in; magnitude is how far
  depth: number;
  // How quickly this tile follows the push and settles back (per second); varied so they don't move in lockstep
  stiffness: number;
  // Current radial offset, as a fraction of the orbit's radius
  offset: number;
};

const TURN_SECONDS = 60; // one full revolution at rest
const MAX_PUSH = 0.3; // the furthest a tile moves off the orbit, as a fraction of its radius
const VELOCITY_FOR_FULL_PUSH = 1500; // scroll speed (px/s) that gives the full push
const SCROLL_SPIN = 5.4; // extra turn speed (rad/s) at full scroll intensity, in the scroll's direction
const SPIN_EASE = 5; // how quickly the extra spin builds and coasts back down (per second); lower coasts longer

// Small deterministic variation, so the layout is the same on every load
const wobble = (i: number, seed: number) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function mountOrbit(stage: HTMLElement, reduceMotion: boolean) {
  const elements = [...stage.querySelectorAll<HTMLElement>("[data-orbit-tile]")];
  const count = elements.length;
  const tiles: Tile[] = elements.map((el, i) => ({
    el,
    // Evenly spaced, nudged a little so it reads as a loose ring rather than a clock face
    angle: (i / count) * Math.PI * 2 + (wobble(i, 1) - 0.5) * 0.18,
    depth: wobble(i, 2) * 2 - 0.6, // mostly outward, a few inward
    stiffness: 2.5 + wobble(i, 3) * 2.5,
    offset: 0,
  }));

  let width = 0;
  let height = 0;
  let tileSize = 0;
  const measure = () => {
    width = stage.clientWidth;
    height = stage.clientHeight;
    tileSize = elements[0]?.offsetWidth ?? 0;
  };

  let spin = -Math.PI / 2; // start with the first tile at the top
  const place = () => {
    const cx = width / 2;
    const cy = height / 2;
    // Radii from the design: the ring spans 85% of the stage's width and 80% of its height
    const rx = (width / 2) * 0.85;
    const ry = (height / 2) * 0.8;
    for (const tile of tiles) {
      const a = tile.angle + spin;
      const r = 1 + tile.offset;
      const x = cx + Math.cos(a) * rx * r - tileSize / 2;
      const y = cy + Math.sin(a) * ry * r - tileSize / 2;
      // Pushed out reads as nearer (a touch larger), pulled in as further away
      const scale = 1 + tile.offset * 0.6;
      tile.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    }
  };

  measure();
  place();
  stage.classList.add("is-ready");
  new ResizeObserver(() => {
    measure();
    place();
  }).observe(stage);

  if (reduceMotion) return;

  let lastScroll = window.scrollY;
  let velocity = 0; // smoothed scroll speed, px/s
  let extraSpin = 0; // scroll-driven turn speed on top of the resting one, rad/s
  // Which way the resting spin goes: 1 is clockwise (after scrolling down), -1 anticlockwise (after scrolling up).
  // Eased, so a change of direction swings round instead of flipping.
  let restDirection = 1;
  let targetDirection = 1;
  let last = 0;
  let frame = 0;

  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
    last = now;

    if (dt > 0) {
      const raw = (window.scrollY - lastScroll) / dt;
      lastScroll = window.scrollY;
      velocity += (raw - velocity) * (1 - Math.exp(-dt * 10));

      // Signed intensity, -1..1; the push uses its size, the extra spin its direction too
      const intensity = Math.max(-1, Math.min(1, velocity / VELOCITY_FOR_FULL_PUSH));
      // The extra spin follows the scroll with some momentum, so the ring whips round and then coasts to rest
      extraSpin += (intensity * SCROLL_SPIN - extraSpin) * (1 - Math.exp(-dt * SPIN_EASE));
      // The ring keeps turning the way it was last scrolled; tiny jitters don't flip it
      if (Math.abs(intensity) > 0.05) targetDirection = Math.sign(intensity);
      restDirection += (targetDirection - restDirection) * (1 - Math.exp(-dt * SPIN_EASE));
      spin += dt * (restDirection * ((Math.PI * 2) / TURN_SECONDS) + extraSpin);

      const push = Math.abs(intensity) * MAX_PUSH;
      for (const tile of tiles) {
        // Exponential approach: follows the push while scrolling, eases home once it stops
        tile.offset += (tile.depth * push - tile.offset) * (1 - Math.exp(-dt * tile.stiffness));
      }
    }

    place();
    frame = requestAnimationFrame(tick);
  };

  // Only run while the stage is on screen
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !frame) {
      last = 0;
      lastScroll = window.scrollY;
      frame = requestAnimationFrame(tick);
    } else if (!entry.isIntersecting && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }).observe(stage);
}
