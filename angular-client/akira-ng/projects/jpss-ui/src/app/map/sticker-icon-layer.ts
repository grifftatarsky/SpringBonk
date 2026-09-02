import { Layer, picking, project32 } from '@deck.gl/core';
import type {
  Accessor,
  Color,
  DefaultProps,
  LayerProps,
  Position,
  UpdateParameters,
} from '@deck.gl/core';
import { Geometry, Model } from '@luma.gl/engine';
import type { Texture } from '@luma.gl/core';

/**
 * A billboarded, texture-mapped mark — deck.gl's IconLayer, minus the part that
 * does not work on a globe.
 *
 * deck's own IconLayer draws nothing under `_GlobeView` when `billboard` is on.
 * That is reproducible with deck 9.3.11 in isolation, with no Angular, no
 * federation and no bundler involved: the same three-point dataset renders three
 * icons under `MapView` and zero under `_GlobeView`, while a ScatterplotLayer
 * beside it — whose billboard branch reads almost identically — draws all three.
 *
 * So this layer is built on the vertex path that demonstrably survives the globe:
 * ScatterplotLayer's. A unit quad, positioned by
 * `project_position_to_clipspace` and then offset in clip space by
 * `project_pixel_size_to_clipspace`, exactly as the scatterplot does it. The
 * only thing changed is what the fragment shader puts inside the quad — one tile
 * of a shared atlas, tinted by the instance colour.
 *
 * It stays a single instanced draw call, so cost is one call per layer no matter
 * how many stickers there are. That is the whole reason for drawing them here
 * rather than as markers.
 */

const uniformBlock = `\
layout(std140) uniform stickerUniforms {
  vec4 frame;
  vec2 atlasDim;
  float sizeScale;
} sticker;
`;

/** The tile this layer draws: [x, y, width, height] in atlas pixels. */
export type StickerFrame = [number, number, number, number];

interface StickerUniformProps {
  frame: StickerFrame;
  atlasDim: [number, number];
  sizeScale: number;
}

const stickerUniforms = {
  name: 'sticker',
  vs: uniformBlock,
  fs: uniformBlock,
  uniformTypes: {
    frame: 'vec4<f32>',
    atlasDim: 'vec2<f32>',
    sizeScale: 'f32',
  },
} as const;

const vs = `\
#version 300 es
#define SHADER_NAME sticker-icon-layer-vertex-shader

in vec3 positions;
in vec3 instancePositions;
in vec3 instancePositions64Low;
in float instanceSizes;
in vec4 instanceColors;
// deck 9.4 stopped generating instancePickingColors. Picking colour is derived
// in the shader now, from the row index when the layer is drawing a subset and
// from the instance id otherwise. Copied verbatim from ScatterplotLayer, which
// is where the rest of this billboard path came from.
#ifdef USE_ROW_INDEXES
in float rowIndexes;
#endif

out vec2 vTexCoord;
out vec4 vColor;

void main(void) {
  geometry.worldPosition = instancePositions;
  geometry.uv = positions.xy;
#ifdef USE_ROW_INDEXES
  geometry.pickingColor = picking_getPickingColorFromIndex(rowIndexes);
#else
  geometry.pickingColor = picking_getPickingColorFromInstanceID();
#endif

  // positions.xy is the unit quad in [-1, 1]. y is flipped on the way into
  // texture space, where v runs downward — otherwise the artwork lands upside
  // down.
  vec2 unit = vec2(positions.x, -positions.y) * 0.5 + 0.5;
  vTexCoord = (sticker.frame.xy + unit * sticker.frame.zw) / sticker.atlasDim;

  float sizePixels = instanceSizes * sticker.sizeScale;

  // Anchor first, then offset in clip space by a pixel amount. This is the
  // billboard path ScatterplotLayer uses, and the reason the mark stays square
  // and upright wherever it sits on the sphere.
  gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, vec3(0.0), geometry.position);
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

  vec3 offset = positions * sizePixels * 0.5;
  DECKGL_FILTER_SIZE(offset, geometry);
  gl_Position.xy += project_pixel_size_to_clipspace(offset.xy);

  vColor = vec4(instanceColors.rgb, instanceColors.a * layer.opacity);
  DECKGL_FILTER_COLOR(vColor, geometry);
}
`;

const fs = `\
#version 300 es
#define SHADER_NAME sticker-icon-layer-fragment-shader

precision highp float;

uniform sampler2D stickerAtlas;

in vec2 vTexCoord;
in vec4 vColor;

out vec4 fragColor;

void main(void) {
  // The atlas is line art on transparency, so only coverage is read from it;
  // the colour is entirely the instance's. One piece of artwork therefore
  // serves every state and both light and dark basemaps.
  float coverage = texture(stickerAtlas, vTexCoord).a;
  if (coverage < 0.02) {
    discard;
  }
  fragColor = vec4(vColor.rgb, coverage * vColor.a);
  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;

export interface StickerIconLayerProps<DataT = unknown> extends LayerProps {
  data?: readonly DataT[];
  /** The shared atlas. Any browser image source; deck uploads it once. */
  atlas?: Texture | HTMLCanvasElement | null;
  /** Which tile of the atlas to draw. */
  frame?: StickerFrame;
  /** Multiplier on every instance's size. */
  sizeScale?: number;
  getPosition?: Accessor<DataT, Position>;
  /** Height of the mark in screen pixels. */
  getSize?: Accessor<DataT, number>;
  getColor?: Accessor<DataT, Color>;
}

const defaultProps: DefaultProps<StickerIconLayerProps> = {
  atlas: { type: 'image', value: null, async: true },
  frame: { type: 'array', value: [0, 0, 1, 1], compare: true },
  sizeScale: { type: 'number', value: 1, min: 0 },
  getPosition: { type: 'accessor', value: (d: unknown) => (d as { position: Position }).position },
  getSize: { type: 'accessor', value: 24 },
  getColor: { type: 'accessor', value: [255, 255, 255, 255] },
};

export class StickerIconLayer<DataT = unknown> extends Layer<
  Required<StickerIconLayerProps<DataT>>
> {
  static override layerName = 'StickerIconLayer';
  static override defaultProps = defaultProps as never;

  override getShaders() {
    return super.getShaders({ vs, fs, modules: [project32, picking, stickerUniforms] });
  }

  override initializeState(): void {
    this.getAttributeManager()!.addInstanced({
      instancePositions: {
        size: 3,
        type: 'float64',
        fp64: this.use64bitPositions(),
        transition: true,
        accessor: 'getPosition',
      },
      instanceSizes: {
        size: 1,
        transition: true,
        accessor: 'getSize',
        defaultValue: 1,
      },
      instanceColors: {
        size: 4,
        type: 'unorm8',
        transition: true,
        accessor: 'getColor',
        defaultValue: [255, 255, 255, 255],
      },
    });
  }

  override updateState(params: UpdateParameters<this>): void {
    super.updateState(params);
    if (params.changeFlags.extensionsChanged) {
      this.model?.destroy();
      this.state['model'] = this._getModel();
      this.getAttributeManager()!.invalidateAll();
    }
  }

  /** deck types `Layer.state` as an open record; this keeps the cast in one place. */
  private get model(): Model | undefined {
    return this.state['model'] as Model | undefined;
  }

  override draw(): void {
    const model = this.model;
    const atlas = this.props.atlas as Texture | null;
    // The atlas is an async image prop; there is one frame before it resolves.
    if (!model || !atlas) {
      return;
    }
    model.shaderInputs.setProps({
      sticker: {
        stickerAtlas: atlas,
        frame: this.props.frame,
        atlasDim: [atlas.width, atlas.height],
        sizeScale: this.props.sizeScale,
      } satisfies StickerUniformProps & { stickerAtlas: Texture },
    });
    model.draw(this.context.renderPass);
  }

  private _getModel(): Model {
    // A unit quad as a triangle strip, 3-component like ScatterplotLayer's —
    // the vertex shader multiplies it straight into a vec3 offset.
    const positions = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0];
    return new Model(this.context.device, {
      ...this.getShaders(),
      id: this.props.id,
      bufferLayout: this.getAttributeManager()!.getBufferLayouts(),
      geometry: new Geometry({
        topology: 'triangle-strip',
        attributes: { positions: { size: 3, value: new Float32Array(positions) } },
      }),
      isInstanced: true,
    });
  }
}
