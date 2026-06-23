/**
 * WGSL for the textured-quad card pipeline. One draw call renders every card as
 * an instanced unit quad: per-vertex data is the quad corner + base UV, and
 * per-instance data positions/rotates the card in pixel space and selects its
 * face from the atlas via a UV offset + scale.
 *
 * Screen-space convention: pixels, origin top-left, +y down. The vertex stage
 * converts to clip space using the canvas resolution uniform.
 */
export const CARD_SHADER = /* wgsl */ `
struct Uniforms {
  resolution : vec2<f32>,
  time       : f32,
  _pad       : f32,
};

@group(0) @binding(0) var<uniform> u : Uniforms;
@group(0) @binding(1) var atlasSampler : sampler;
@group(0) @binding(2) var atlasTexture : texture_2d<f32>;

struct VSOut {
  @builtin(position) pos   : vec4<f32>,
  @location(0)       uv    : vec2<f32>,
  @location(1)       shade : f32,
};

@vertex
fn vs(
  @location(0) quadPos   : vec2<f32>,
  @location(1) quadUV    : vec2<f32>,
  @location(2) iCenter   : vec2<f32>,
  @location(3) iHalf     : vec2<f32>,
  @location(4) iRot      : f32,
  @location(5) iUvOffset : vec2<f32>,
  @location(6) iUvScale  : vec2<f32>,
  @location(7) iShade    : f32,
) -> VSOut {
  let c = cos(iRot);
  let s = sin(iRot);
  let p = quadPos * iHalf;
  let rp = vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
  let world = iCenter + rp;

  let clipX = world.x / u.resolution.x * 2.0 - 1.0;
  let clipY = -(world.y / u.resolution.y * 2.0 - 1.0);

  var out : VSOut;
  out.pos = vec4<f32>(clipX, clipY, 0.0, 1.0);
  out.uv = iUvOffset + quadUV * iUvScale;
  out.shade = iShade;
  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4<f32> {
  let tex = textureSample(atlasTexture, atlasSampler, in.uv);
  return vec4<f32>(tex.rgb * in.shade, tex.a);
}
`;
