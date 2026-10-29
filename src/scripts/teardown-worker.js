// Renders explosion frames for the homepage teardown off the main thread.
// The teardown helpers register themselves on globalThis, so load order matters.
import "../../tools/teardown/assets/sheet.js";
import "../../tools/teardown/assets/geometry.js";
import "../../tools/teardown/assets/projection.js";
import "../../drawings/xteink-x4/model.js";

// cubic-bezier(.65, 0, .35, 1), matching the teardown viewer's flipbook: parts ease apart
const ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

self.onmessage = ({ data: { id, frames } }) => {
  const model = self.DrawingModels[id];
  for (let index = 0; index < frames; index++) {
    // fitExplosion stays at 1 so every frame shares the exploded crop of the page's SVG
    const { markup } = model({}, { explosion: ease(index / (frames - 1)), fitExplosion: 1, isolated: null, fill: false, annotate: false });
    self.postMessage({ index, markup });
  }
};
