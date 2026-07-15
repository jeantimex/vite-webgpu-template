// Keeping this small shader in TypeScript avoids adding a raw-WGSL loader. For
// larger shaders, moving WGSL into standalone files is usually easier to maintain.
export const cubeShader = /* wgsl */ `
  // The CPU writes one model-view-projection matrix into this uniform buffer.
  struct Uniforms {
    mvp: mat4x4f,
  };

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3f,
  };

  @vertex
  fn vertexMain(
    @location(0) position: vec3f,
    @location(1) color: vec3f,
  ) -> VertexOutput {
    var output: VertexOutput;
    // Convert the object-space position directly to clip space.
    output.position = uniforms.mvp * vec4f(position, 1.0);
    output.color = color;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    // Vertex colors are automatically interpolated across each triangle.
    return vec4f(input.color, 1.0);
  }
`;
