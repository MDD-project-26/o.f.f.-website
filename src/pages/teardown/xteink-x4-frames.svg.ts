import type { APIRoute } from "astro";
import { slimFrame } from "../../lib/teardown-slim.js";

// Pre-renders the homepage teardown's explosion as a static file at build time, so visitors
// download the finished frames instead of running a hidden-line pass per frame on their device.
// One <g> per frame, played back in order by the page at 60fps.
export const prerender = true;

const DURATION = 0.6; // seconds; keep in sync with the playback in src/pages/index.astro
const FRAMES = Math.round(DURATION * 60) + 1; // 60fps, counting both the first and last pose

// cubic-bezier(.65, 0, .35, 1), matching the teardown viewer's flipbook: parts ease apart
const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

const render = async () => {
  // The teardown helpers are plain scripts that register on the global object (and the model
  // on `self`), so they load in order, after `self` exists.
  (globalThis as any).self ??= globalThis;
  await import("../../../tools/teardown/assets/sheet.js");
  await import("../../../tools/teardown/assets/geometry.js");
  await import("../../../tools/teardown/assets/projection.js");
  await import("../../../drawings/xteink-x4/model.js");
  const model = (globalThis as any).DrawingModels["xteink-x4"];

  const frames: string[] = [];
  for (let index = 0; index < FRAMES; index++) {
    // fitExplosion stays at 1 so every frame shares the exploded crop of the page's SVG
    const { markup } = model({}, { explosion: ease(index / (FRAMES - 1)), fitExplosion: 1, isolated: null, fill: false, annotate: false });
    frames.push(`<g>${slimFrame(markup)}</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg">\n${frames.join("\n")}\n</svg>\n`;
};

// Rendering takes several seconds, so the dev server renders once and reuses it
let cached: Promise<string> | undefined;

export const GET: APIRoute = async () =>
  new Response(await (cached ??= render()), { headers: { "Content-Type": "image/svg+xml" } });
