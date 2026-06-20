import { buildCardAtlas, CardAtlas, CardTheme } from './card-atlas';
import { CardId } from '../game/card';
import { CARD_SHADER } from './wgsl';

/** One card to draw this frame, in CSS-pixel space (origin top-left, +y down). */
export interface CardSprite {
  readonly key: CardId | 'BACK';
  /** Centre of the card. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Rotation in radians, clockwise. */
  readonly rot: number;
  /** RGB multiplier — <1 darkens (shadow / inactive), >1 brightens. Default 1. */
  readonly shade?: number;
}

/** Produces the cards to draw, given the current canvas size and elapsed time. */
export type LayoutFn = (width: number, height: number, timeSec: number) => readonly CardSprite[];

const FLOATS_PER_INSTANCE = 10; // center(2) half(2) rot(1) uvOffset(2) uvScale(2) shade(1)

/**
 * Minimal but complete WebGPU sprite renderer for the card table. Owns the
 * device, the (themed) atlas texture, one pipeline and an instance buffer, and
 * drives a requestAnimationFrame loop that re-lays-out and redraws every frame.
 * The whole deck is one texture + one instanced draw call.
 *
 * Construct via {@link CardRenderer.create}, which returns null when WebGPU is
 * unavailable so the caller can show a fallback instead of throwing. Colours
 * come from {@link CardTheme}; call {@link applyTheme} when the theme changes.
 */
export class CardRenderer {
  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;
  private readonly canvas: HTMLCanvasElement;

  private readonly pipeline: GPURenderPipeline;
  private readonly sampler: GPUSampler;
  private readonly uniformBuffer: GPUBuffer;
  private readonly quadBuffer: GPUBuffer;
  private instanceBuffer: GPUBuffer;
  private instanceCapacity: number;
  private instanceData: Float32Array;

  private atlas!: CardAtlas;
  private texture: GPUTexture | null = null;
  private bindGroup!: GPUBindGroup;
  private clearColor: GPUColor = { r: 0, g: 0, b: 0, a: 1 };

  private readonly resizeObserver: ResizeObserver;
  private layout: LayoutFn = () => [];
  private rafHandle = 0;
  private startTime = 0;
  private cssWidth = 0;
  private cssHeight = 0;
  private disposed = false;

  static async create(canvas: HTMLCanvasElement, theme: CardTheme): Promise<CardRenderer | null> {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      return null;
    }
    let adapter: GPUAdapter | null = null;
    try {
      adapter = await navigator.gpu.requestAdapter();
    } catch {
      return null;
    }
    if (!adapter) {
      return null;
    }
    let device: GPUDevice;
    try {
      device = await adapter.requestDevice();
    } catch {
      return null;
    }
    const context = canvas.getContext('webgpu');
    if (!context) {
      device.destroy();
      return null;
    }
    return new CardRenderer(canvas, device, context, theme);
  }

  private constructor(
    canvas: HTMLCanvasElement,
    device: GPUDevice,
    context: GPUCanvasContext,
    theme: CardTheme,
  ) {
    this.canvas = canvas;
    this.device = device;
    this.context = context;

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });

    // Unit quad: corners in [-1,1] paired with [0,1] UVs (top-left origin).
    const quad = new Float32Array([
      -1, -1, 0, 0,
      1, -1, 1, 0,
      1, 1, 1, 1,
      -1, -1, 0, 0,
      1, 1, 1, 1,
      -1, 1, 0, 1,
    ]);
    this.quadBuffer = device.createBuffer({
      size: quad.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.quadBuffer, 0, quad);

    this.instanceCapacity = 64;
    this.instanceData = new Float32Array(this.instanceCapacity * FLOATS_PER_INSTANCE);
    this.instanceBuffer = device.createBuffer({
      size: this.instanceData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.uniformBuffer = device.createBuffer({
      size: 16, // vec2 resolution + f32 time + f32 pad
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const module = device.createShaderModule({ code: CARD_SHADER });
    this.pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module,
        entryPoint: 'vs',
        buffers: [
          {
            arrayStride: 16,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x2' },
              { shaderLocation: 1, offset: 8, format: 'float32x2' },
            ],
          },
          {
            arrayStride: FLOATS_PER_INSTANCE * 4,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 2, offset: 0, format: 'float32x2' },
              { shaderLocation: 3, offset: 8, format: 'float32x2' },
              { shaderLocation: 4, offset: 16, format: 'float32' },
              { shaderLocation: 5, offset: 20, format: 'float32x2' },
              { shaderLocation: 6, offset: 28, format: 'float32x2' },
              { shaderLocation: 7, offset: 36, format: 'float32' },
            ],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: 'fs',
        targets: [
          {
            format,
            blend: {
              color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });

    this.setTheme(theme);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  /** Width/height of the drawable area in CSS pixels (for laying out cards). */
  get size(): { width: number; height: number } {
    return { width: this.cssWidth, height: this.cssHeight };
  }

  setLayout(fn: LayoutFn): void {
    this.layout = fn;
  }

  /** Rebuild the atlas + clear colour for a new theme (e.g. light/dark toggle). */
  applyTheme(theme: CardTheme): void {
    if (this.disposed) {
      return;
    }
    this.setTheme(theme);
  }

  private setTheme(theme: CardTheme): void {
    this.atlas = buildCardAtlas(theme);
    this.clearColor = cssColorToGpu(theme.bg);

    this.texture?.destroy();
    this.texture = this.device.createTexture({
      size: [this.atlas.width, this.atlas.height],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture(
      { source: this.atlas.source },
      { texture: this.texture },
      [this.atlas.width, this.atlas.height],
    );

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: this.texture.createView() },
      ],
    });
  }

  start(): void {
    if (this.rafHandle || this.disposed) {
      return;
    }
    this.startTime = performance.now();
    const frame = () => {
      if (this.disposed) {
        return;
      }
      // Never let a transient draw error (a zero-size canvas during a resize, a
      // momentary context hiccup) kill the loop — that would freeze the table
      // permanently and resizing back wouldn't recover it.
      try {
        this.draw((performance.now() - this.startTime) / 1000);
      } catch (err) {
        console.error('President render frame failed', err);
      }
      this.rafHandle = requestAnimationFrame(frame);
    };
    this.rafHandle = requestAnimationFrame(frame);
  }

  dispose(): void {
    this.disposed = true;
    if (this.rafHandle) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = 0;
    }
    this.resizeObserver.disconnect();
    this.device.destroy();
  }

  private resize(): void {
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const cssW = this.canvas.clientWidth || 1;
    const cssH = this.canvas.clientHeight || 1;
    this.cssWidth = cssW;
    this.cssHeight = cssH;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private ensureCapacity(count: number): void {
    if (count <= this.instanceCapacity) {
      return;
    }
    this.instanceCapacity = Math.ceil(count * 1.5);
    this.instanceData = new Float32Array(this.instanceCapacity * FLOATS_PER_INSTANCE);
    this.instanceBuffer.destroy();
    this.instanceBuffer = this.device.createBuffer({
      size: this.instanceData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  private draw(timeSec: number): void {
    const sprites = this.layout(this.cssWidth, this.cssHeight, timeSec);
    const count = sprites.length;
    this.ensureCapacity(count);

    const data = this.instanceData;
    for (let i = 0; i < count; i++) {
      const s = sprites[i];
      const rect = this.atlas.rects.get(s.key) ?? this.atlas.rects.get('BACK')!;
      const o = i * FLOATS_PER_INSTANCE;
      data[o] = s.x;
      data[o + 1] = s.y;
      data[o + 2] = s.w / 2;
      data[o + 3] = s.h / 2;
      data[o + 4] = s.rot;
      data[o + 5] = rect.u;
      data[o + 6] = rect.v;
      data[o + 7] = rect.w;
      data[o + 8] = rect.h;
      data[o + 9] = s.shade ?? 1;
    }
    if (count > 0) {
      this.device.queue.writeBuffer(this.instanceBuffer, 0, data, 0, count * FLOATS_PER_INSTANCE);
    }

    // Cards are laid out in CSS pixels, so resolution is CSS pixels too. Clip
    // space is normalized, so the DPR-scaled backing store (set in resize())
    // doesn't enter this conversion.
    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      new Float32Array([this.cssWidth, this.cssHeight, timeSec, 0]),
    );

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: this.clearColor,
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.quadBuffer);
    pass.setVertexBuffer(1, this.instanceBuffer);
    if (count > 0) {
      pass.draw(6, count);
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}

/**
 * Converts any CSS colour string (hex, rgb(), oklch(), token value…) to a
 * normalized GPU clear colour by letting a 1×1 2D canvas do the parsing.
 */
let probeCtx: CanvasRenderingContext2D | null = null;
function cssColorToGpu(color: string): GPUColor {
  if (!probeCtx) {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    probeCtx = c.getContext('2d', { willReadFrequently: true });
  }
  if (!probeCtx) {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  probeCtx.clearRect(0, 0, 1, 1);
  probeCtx.fillStyle = color || '#000';
  probeCtx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probeCtx.getImageData(0, 0, 1, 1).data;
  return { r: r / 255, g: g / 255, b: b / 255, a: a / 255 };
}
