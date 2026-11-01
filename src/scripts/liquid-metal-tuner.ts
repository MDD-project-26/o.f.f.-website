// Dev-only panel for dialing in the liquid metal shaders. Every parameter updates the live
// shaders; values survive reloads (localStorage) until "Reset", and "Copy values" gives
// the code to paste into liquid-metal.ts and the data attributes in index.astro.
import { getShaderColorFromString, type LiquidMetalShape, type ShaderFit } from "@paper-design/shaders";
import {
  defaultPlacement,
  liquidMetalInstances,
  liquidMetalLook,
  lookUniforms,
  placementUniforms,
  type LiquidMetalLook,
  type LiquidMetalPlacement,
} from "./liquid-metal";

const STORAGE_KEY = "liquid-metal-tuner";

interface Saved {
  open?: boolean;
  target?: number;
  look?: Partial<LiquidMetalLook>;
  placements?: Record<string, Partial<LiquidMetalPlacement>>;
}

const load = (): Saved => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
};

const codeLook = { ...liquidMetalLook };
const codePlacements = liquidMetalInstances.map((instance) => ({ ...instance.placement }));
const saved = load();
const look: LiquidMetalLook = { ...codeLook, ...saved.look };
let frame = 0;

for (const instance of liquidMetalInstances) {
  Object.assign(instance.placement, saved.placements?.[instance.label]);
}

const save = () => {
  try {
    const state: Saved = {
      open: panel.open,
      target,
      look,
      placements: Object.fromEntries(liquidMetalInstances.map((i) => [i.label, i.placement])),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: tweaks still apply, they just won't survive a reload
  }
};

const applyLook = () => {
  for (const { mount } of liquidMetalInstances) {
    mount.setUniforms(lookUniforms(look));
    mount.setSpeed(look.speed);
  }
};

const applyPlacement = (instance: (typeof liquidMetalInstances)[number]) => {
  instance.mount.setUniforms(placementUniforms(instance.placement));
  instance.mount.setMinPixelRatio(instance.placement.pixelRatio);
};

// Colors are kept as hex (#rrggbb, or #rrggbbaa when translucent) so they paste straight back into code
const toHex = (color: string) => {
  const [r, g, b, a] = getShaderColorFromString(color);
  const byte = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return { rgb: `#${byte(r)}${byte(g)}${byte(b)}`, alpha: a };
};
const fromHex = (rgb: string, alpha: number) =>
  alpha >= 1 ? rgb : `${rgb}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;

const decimals = (step: number) => (String(step).split(".")[1] ?? "").length;

// UI

const panel = document.createElement("details");
panel.className = "lm-tuner";
panel.open = saved.open ?? true;
panel.innerHTML = `<summary>Liquid metal</summary><div class="lm-body"></div>`;
const body = panel.querySelector<HTMLDivElement>(".lm-body")!;
const refreshers: (() => void)[] = [];

const section = (title: string, hint?: string) => {
  const el = document.createElement("fieldset");
  el.innerHTML = `<legend>${title}</legend>${hint ? `<p class="lm-hint">${hint}</p>` : ""}`;
  body.append(el);
  return el;
};

const slider = (
  parent: HTMLElement,
  label: string,
  range: { min: number; max: number; step: number },
  get: () => number,
  set: (value: number) => void,
  hint?: string,
) => {
  const row = document.createElement("label");
  row.className = "lm-row";
  row.title = hint ?? "";
  row.innerHTML = `<span>${label}</span><input type="range"><input type="number">`;
  const [rangeInput, numberInput] = row.querySelectorAll("input");
  for (const input of [rangeInput, numberInput]) {
    input.min = String(range.min);
    input.max = String(range.max);
    input.step = String(range.step);
  }
  const refresh = () => {
    rangeInput.value = String(get());
    numberInput.value = get().toFixed(decimals(range.step));
  };
  const onInput = (input: HTMLInputElement) => () => {
    if (input.value === "" || Number.isNaN(input.valueAsNumber)) return;
    set(input.valueAsNumber);
    if (input === rangeInput) numberInput.value = input.valueAsNumber.toFixed(decimals(range.step));
    else rangeInput.value = input.value;
    save();
  };
  rangeInput.addEventListener("input", onInput(rangeInput));
  numberInput.addEventListener("input", onInput(numberInput));
  refreshers.push(refresh);
  parent.append(row);
};

const color = (parent: HTMLElement, label: string, get: () => string, set: (value: string) => void) => {
  const row = document.createElement("label");
  row.className = "lm-row";
  row.title = "Color, and its opacity on the right";
  row.innerHTML = `<span>${label}</span><input type="color"><input type="number" min="0" max="1" step="0.01">`;
  const [colorInput, alphaInput] = row.querySelectorAll("input");
  const refresh = () => {
    const { rgb, alpha } = toHex(get());
    colorInput.value = rgb;
    alphaInput.value = alpha.toFixed(2);
  };
  const onInput = () => {
    const alpha = Number.isNaN(alphaInput.valueAsNumber) ? 1 : Math.min(1, Math.max(0, alphaInput.valueAsNumber));
    set(fromHex(colorInput.value, alpha));
    save();
  };
  colorInput.addEventListener("input", onInput);
  alphaInput.addEventListener("input", onInput);
  refreshers.push(refresh);
  parent.append(row);
};

const select = <T extends string>(
  parent: HTMLElement,
  label: string,
  options: T[],
  get: () => T,
  set: (value: T) => void,
  hint?: string,
) => {
  const row = document.createElement("label");
  row.className = "lm-row";
  row.title = hint ?? "";
  row.innerHTML = `<span>${label}</span><select>${options.map((o) => `<option>${o}</option>`).join("")}</select>`;
  const input = row.querySelector("select")!;
  input.addEventListener("change", () => {
    set(input.value as T);
    save();
  });
  refreshers.push(() => (input.value = get()));
  parent.append(row);
};

// Material: shared by every shader

const material = section("Material", "Applies to every shader");
color(material, "Tint", () => look.colorTint, (v) => ((look.colorTint = v), applyLook()));
slider(material, "Repetition", { min: 1, max: 10, step: 0.01 }, () => look.repetition, (v) => ((look.repetition = v), applyLook()), "Density of the stripes");
slider(material, "Softness", { min: 0, max: 1, step: 0.01 }, () => look.softness, (v) => ((look.softness = v), applyLook()), "0 = hard stripe edges, 1 = smooth gradient");
slider(material, "Shift red", { min: -1, max: 1, step: 0.01 }, () => look.shiftRed, (v) => ((look.shiftRed = v), applyLook()), "Red channel dispersion");
slider(material, "Shift blue", { min: -1, max: 1, step: 0.01 }, () => look.shiftBlue, (v) => ((look.shiftBlue = v), applyLook()), "Blue channel dispersion");
slider(material, "Distortion", { min: 0, max: 1, step: 0.01 }, () => look.distortion, (v) => ((look.distortion = v), applyLook()), "Noise over the stripe pattern");
slider(material, "Contour", { min: 0, max: 1, step: 0.01 }, () => look.contour, (v) => ((look.contour = v), applyLook()), "Distortion strength along the shape's edges");
slider(material, "Angle", { min: 0, max: 360, step: 1 }, () => look.angle, (v) => ((look.angle = v), applyLook()), "Direction the pattern moves, in degrees");

const motion = section("Motion");
slider(motion, "Speed", { min: -3, max: 3, step: 0.01 }, () => look.speed, (v) => ((look.speed = v), applyLook()), "0 stops it; negative plays in reverse");
slider(motion, "Frame", { min: 0, max: 60000, step: 10 }, () => frame, (v) => {
  frame = v;
  for (const { mount } of liquidMetalInstances) mount.setFrame(v);
}, "Scrub the animation time in ms; set Speed to 0 to hold a frame (not saved)");

// Placement: per shader

let target = Math.min(saved.target ?? 0, liquidMetalInstances.length - 1);
const current = () => liquidMetalInstances[target];
const place = <K extends keyof LiquidMetalPlacement>(key: K) => ({
  get: () => current().placement[key],
  set: (value: LiquidMetalPlacement[K]) => {
    current().placement[key] = value;
    applyPlacement(current());
  },
});

const placement = section("Placement");
select(
  placement,
  "Shader",
  liquidMetalInstances.map((i) => i.label),
  () => current().label,
  (label) => {
    target = liquidMetalInstances.findIndex((i) => i.label === label);
    refreshers.forEach((refresh) => refresh());
  },
  "Which shader the controls below change",
);
const shapes: LiquidMetalPlacement["shape"][] = ["image", "circle", "daisy", "diamond", "metaballs"];
const shape = place("shape");
select(placement, "Mask", shapes, shape.get, shape.set, "image = the logo; the rest are Paper's built-in shapes");
const background = place("background");
color(placement, "Background", background.get, background.set);
const fit = place("fit");
select<ShaderFit>(placement, "Fit", ["contain", "cover", "none"], fit.get, fit.set);
const sliders: [keyof LiquidMetalPlacement, string, { min: number; max: number; step: number }, string][] = [
  ["scale", "Scale", { min: 0.1, max: 4, step: 0.01 }, "Zoom"],
  ["rotation", "Rotation", { min: 0, max: 360, step: 1 }, "Degrees"],
  ["offsetX", "Offset X", { min: -1, max: 1, step: 0.01 }, "Horizontal shift of the centre"],
  ["offsetY", "Offset Y", { min: -1, max: 1, step: 0.01 }, "Vertical shift of the centre"],
  ["originX", "Origin X", { min: 0, max: 1, step: 0.01 }, "Anchor for world width; only shows with world size set"],
  ["originY", "Origin Y", { min: 0, max: 1, step: 0.01 }, "Anchor for world height; only shows with world size set"],
  ["worldWidth", "World width", { min: 0, max: 2000, step: 1 }, "Virtual width before fitting; 0 = canvas size"],
  ["worldHeight", "World height", { min: 0, max: 2000, step: 1 }, "Virtual height before fitting; 0 = canvas size"],
  ["pixelRatio", "Pixel ratio", { min: 0.5, max: 4, step: 0.25 }, "Minimum render resolution; higher is sharper and slower"],
];
for (const [key, label, range, hint] of sliders) {
  const { get, set } = place(key as "scale");
  slider(placement, label, range, get, set, hint);
}

// Actions

const attribute = (key: string) => `data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

const exportValues = () => {
  const lookCode = `export const liquidMetalLook = {\n${Object.entries(look)
    .map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`)
    .join("\n")}\n};`;
  const placements = liquidMetalInstances.map(({ label, placement: p }) => {
    const attrs = Object.entries(p)
      .filter(([key, value]) => value !== defaultPlacement[key as keyof LiquidMetalPlacement])
      .map(([key, value]) => `${attribute(key)}="${value}"`)
      .join(" ");
    return `<!-- ${label} -->\n${attrs || "(all defaults)"}`;
  });
  return `// src/scripts/liquid-metal.ts\n${lookCode}\n\n<!-- index.astro data attributes -->\n${placements.join("\n")}`;
};

const actions = document.createElement("div");
actions.className = "lm-actions";
actions.innerHTML = `<button type="button" data-action="copy">Copy values</button><button type="button" data-action="reset">Reset to code</button>`;
body.append(actions);

actions.addEventListener("click", async (event) => {
  const button = (event.target as HTMLElement).closest("button");
  if (!button) return;
  if (button.dataset.action === "copy") {
    const text = exportValues();
    console.log(text);
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Logged to console";
    }
    setTimeout(() => (button.textContent = "Copy values"), 1500);
  } else {
    Object.assign(look, codeLook);
    liquidMetalInstances.forEach((instance, index) => {
      Object.assign(instance.placement, codePlacements[index]);
      applyPlacement(instance);
    });
    applyLook();
    refreshers.forEach((refresh) => refresh());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
});

panel.addEventListener("toggle", save);

const style = document.createElement("style");
style.textContent = `
  .lm-tuner {
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 1000;
    width: min(320px, calc(100vw - 24px));
    max-height: calc(100svh - 24px);
    overflow: auto;
    border-radius: 12px;
    corner-shape: squircle;
    background: rgb(20 20 20 / 0.92);
    color: #eee;
    font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    box-shadow: 0 8px 32px rgb(0 0 0 / 0.3);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .lm-tuner summary {
    padding: 10px 12px;
    cursor: pointer;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .lm-body { padding: 0 12px 12px; }
  .lm-tuner fieldset { margin: 0 0 10px; padding: 0; border: 0; }
  .lm-tuner legend { padding: 0; margin-bottom: 4px; color: #999; text-transform: uppercase; }
  .lm-hint { margin: -2px 0 6px; color: #777; }
  .lm-row {
    display: grid;
    grid-template-columns: 84px 1fr 56px;
    align-items: center;
    gap: 8px;
    min-height: 24px;
  }
  .lm-row:has(select) { grid-template-columns: 84px 1fr; }
  .lm-tuner input[type="range"] { width: 100%; margin: 0; accent-color: #fff; }
  .lm-tuner input[type="number"], .lm-tuner select {
    box-sizing: border-box;
    width: 100%;
    padding: 2px 4px;
    border: 1px solid #444;
    border-radius: 4px;
    corner-shape: squircle;
    background: #111;
    color: inherit;
    font: inherit;
  }
  .lm-tuner input[type="color"] {
    width: 100%;
    height: 20px;
    padding: 0;
    border: 1px solid #444;
    border-radius: 4px;
    corner-shape: squircle;
    background: none;
  }
  .lm-actions { display: flex; gap: 8px; }
  .lm-actions button {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #555;
    border-radius: 6px;
    corner-shape: squircle;
    background: #2a2a2a;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .lm-actions button:hover { background: #3a3a3a; }
`;

document.head.append(style);
document.body.append(panel);
refreshers.forEach((refresh) => refresh());
applyLook();
liquidMetalInstances.forEach(applyPlacement);
