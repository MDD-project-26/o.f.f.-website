// Renders a teardown drawing for the website, cropped to its exploded extent:
// exploded with part labels, exploded without, and assembled without labels.
// The assembled render shares the unlabelled exploded crop, so frames rendered in
// the browser between the two (fitExplosion 1) line up with it.
// Usage: node drawings/render-site.cjs drawings/xteink-x4 src/assets
const fs = require('node:fs');
const path = require('node:path');
const [drawingDir, outDir] = process.argv.slice(2).map((p) => path.resolve(p));
const tools = path.join(__dirname, '../tools/teardown/assets');
globalThis.self = globalThis;
globalThis.TechnicalGeometry = require(path.join(tools, 'geometry.js'));
globalThis.TechnicalProjection = require(path.join(tools, 'projection.js'));
const SHEET = require(path.join(tools, 'sheet.js'));
const configFile = JSON.parse(fs.readFileSync(path.join(drawingDir, 'drawing.json'), 'utf8'));
configFile.modelScripts.forEach((script) => require(path.join(drawingDir, script)));

const config = configFile.drawings[0];
const parameters = Object.fromEntries(config.parameters.map((p) => [p.key, p.default]));
const render = (explosion, annotate) =>
  self.DrawingModels[config.id](parameters, {explosion, fitExplosion: 1, isolated: null, fill: false, annotate}).markup;

// Bounds from path coordinates and label anchors, padded by 3 mm
const bounds = (markup) => {
  const xs = [], ys = [];
  for (const d of markup.matchAll(/ d="([^"]+)"/g)) {
    const n = d[1].match(/-?\d+(\.\d+)?/g).map(Number);
    for (let i = 0; i + 1 < n.length; i += 2) { xs.push(n[i]); ys.push(n[i + 1]); }
  }
  for (const t of markup.matchAll(/<text[^>]*\sx="([\d.-]+)"[^>]*\sy="([\d.-]+)"[^>]*>([^<]*)</g)) {
    const [x, y, label] = [Number(t[1]), Number(t[2]), t[3]];
    const anchorEnd = /text-anchor="end"/.test(t[0]);
    const width = label.length * 2.4;
    xs.push(anchorEnd ? x - width : x, anchorEnd ? x : x + width);
    ys.push(y - 3, y + 1);
  }
  const pad = 3;
  const [x0, y0] = [Math.min(...xs) - pad, Math.min(...ys) - pad];
  return [x0, y0, Math.max(...xs) + pad - x0, Math.max(...ys) + pad - y0];
};

// Scoped to the drawing, since an inline SVG's <style> applies to the whole page
const scope = (css) => css.replace(/(^|})([^{}]+)\{/g, (_, close, selector) => `${close}.device-teardown ${selector}{`);
const style = scope(`path{fill:none;stroke:currentColor;stroke-linejoin:round}[data-ink-fill]{fill:currentColor;stroke:none}${SHEET.css('technical')}`);
const partList = config.parts.map((p) => p.name.toLowerCase()).join(', ');

const write = (variant, markup, box, title) => {
  const [x0, y0, w, h] = box;
  const svg = `<svg class="device-teardown device-teardown--${variant}" xmlns="http://www.w3.org/2000/svg" viewBox="${x0.toFixed(2)} ${y0.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}" role="img" aria-labelledby="device-teardown-title-${variant}">`
    + `<title id="device-teardown-title-${variant}">${title}</title>`
    + `<style>${style}</style><g class="teardown-frame">${markup.replace(/ id="/g, ` id="${variant}-`)}</g></svg>`; // keep ids unique if variants share a page
  const file = path.join(outDir, `${config.id}-${variant}.svg`);
  fs.writeFileSync(file, svg);
  console.log(`Wrote ${file} (${w.toFixed(1)} × ${h.toFixed(1)} mm, ${(svg.length / 1024).toFixed(0)} KB)`);
};

const labelled = render(1, true);
const plain = render(1, false);
const plainBox = bounds(plain);
write('labelled', labelled, bounds(labelled), `${config.title}: exploded view showing the ${partList}`);
write('plain', plain, plainBox, `${config.title}: exploded view showing the ${partList}`);
write('assembled', render(0, false), plainBox, `${config.title}, assembled; its parts are the ${partList}`);
