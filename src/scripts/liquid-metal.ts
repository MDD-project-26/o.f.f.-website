import { animate } from "motion";
import {
  ShaderMount,
  ShaderFitOptions,
  LiquidMetalShapes,
  defaultObjectSizing,
  getShaderColorFromString,
  liquidMetalFragmentShader,
  toProcessedLiquidMetal,
  type LiquidMetalShape,
  type ShaderFit,
} from "@paper-design/shaders";

// The metal itself, shared by every [data-liquid-metal] element. Dial these in with the
// tuner panel in dev (bottom-right corner), then paste its "Copy values" output here.
export const liquidMetalLook = {
  colorTint: "#dedede",
  repetition: 1.31,
  softness: 0.1,
  shiftRed: 0.3,
  shiftBlue: 0.3,
  distortion: 0.55,
  contour: 1,
  angle: 54,
  speed: 0.6,
};

export type LiquidMetalLook = typeof liquidMetalLook;

// Placement on each element, read from its data attributes; anything left out uses Paper's defaults
export interface LiquidMetalPlacement {
  shape: "image" | LiquidMetalShape;
  background: string;
  pixelRatio: number;
  fit: ShaderFit;
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  originX: number;
  originY: number;
  worldWidth: number;
  worldHeight: number;
}

export const defaultPlacement: LiquidMetalPlacement = {
  ...defaultObjectSizing,
  shape: "image",
  background: "#ffffff",
  pixelRatio: 2,
};

export interface LiquidMetalInstance {
  label: string;
  container: HTMLElement;
  mount: ShaderMount;
  placement: LiquidMetalPlacement;
}

// Mounted shaders, so the dev tuner can update them live
export const liquidMetalInstances: LiquidMetalInstance[] = [];

const readPlacement = (dataset: DOMStringMap): LiquidMetalPlacement => {
  const number = (value: string | undefined, fallback: number) => (value === undefined ? fallback : Number(value));
  return {
    shape: (dataset.shape as LiquidMetalPlacement["shape"]) ?? defaultPlacement.shape,
    background: dataset.background ?? defaultPlacement.background,
    pixelRatio: number(dataset.pixelRatio, defaultPlacement.pixelRatio),
    fit: (dataset.fit as ShaderFit) ?? defaultPlacement.fit,
    scale: number(dataset.scale, defaultPlacement.scale),
    rotation: number(dataset.rotation, defaultPlacement.rotation),
    offsetX: number(dataset.offsetX, defaultPlacement.offsetX),
    offsetY: number(dataset.offsetY, defaultPlacement.offsetY),
    originX: number(dataset.originX, defaultPlacement.originX),
    originY: number(dataset.originY, defaultPlacement.originY),
    worldWidth: number(dataset.worldWidth, defaultPlacement.worldWidth),
    worldHeight: number(dataset.worldHeight, defaultPlacement.worldHeight),
  };
};

export const lookUniforms = (look: LiquidMetalLook) => ({
  u_colorTint: getShaderColorFromString(look.colorTint),
  u_repetition: look.repetition,
  u_softness: look.softness,
  u_shiftRed: look.shiftRed,
  u_shiftBlue: look.shiftBlue,
  u_distortion: look.distortion,
  u_contour: look.contour,
  u_angle: look.angle,
});

export const placementUniforms = (placement: LiquidMetalPlacement) => ({
  u_isImage: placement.shape === "image",
  u_shape: placement.shape === "image" ? LiquidMetalShapes.none : LiquidMetalShapes[placement.shape],
  u_colorBack: getShaderColorFromString(placement.background),
  u_fit: ShaderFitOptions[placement.fit],
  u_scale: placement.scale,
  u_rotation: placement.rotation,
  u_offsetX: placement.offsetX,
  u_offsetY: placement.offsetY,
  u_originX: placement.originX,
  u_originY: placement.originY,
  u_worldWidth: placement.worldWidth,
  u_worldHeight: placement.worldHeight,
});

// Paper's Liquid Metal shader on a [data-liquid-metal] element, masked by its data-mask image.
// If WebGL or image processing fails, a [data-liquid-metal-fallback] sibling is shown instead.
// Either way the container then gets data-ready and a "liquid-metal-ready" event, so the intro can wait for this
// main-thread work to be done before it starts animating.
export const mountLiquidMetal = async (container: HTMLElement, reduceMotion: boolean) => {
  try {
    await mount(container, reduceMotion);
  } finally {
    container.dataset.ready = "";
    container.dispatchEvent(new Event("liquid-metal-ready"));
  }
};

const mount = async (container: HTMLElement, reduceMotion: boolean) => {
  const maskUrl = container.dataset.mask;
  if (!maskUrl) return;
  const placement = readPlacement(container.dataset);

  try {
    const { pngBlob } = await toProcessedLiquidMetal(maskUrl);
    const mask = new Image();
    mask.src = URL.createObjectURL(pngBlob);
    await mask.decode();

    const mount = new ShaderMount(
      container,
      liquidMetalFragmentShader,
      { u_image: mask, ...lookUniforms(liquidMetalLook), ...placementUniforms(placement) },
      undefined,
      reduceMotion ? 0 : liquidMetalLook.speed,
      0,
      placement.pixelRatio,
      undefined,
      ["u_image"],
    );

    liquidMetalInstances.push({
      label: container.dataset.liquidMetal || `Shader ${liquidMetalInstances.length + 1}`,
      container,
      mount,
      placement,
    });

    // Fades in over the flat fallback (or the empty hero) once the first frame is drawn
    requestAnimationFrame(() => animate(container, { opacity: 1 }, { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }));
  } catch (error) {
    console.warn("Liquid metal shader unavailable, showing flat logo.", error);
    container.parentElement?.querySelector("[data-liquid-metal-fallback]")?.removeAttribute("hidden");
  }
};
