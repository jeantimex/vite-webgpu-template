import { createBufferWithData } from '../webgpu/utils';

// Each vertex interleaves three position floats with three color floats. The
// layout below tells WebGPU how to unpack these values for shader locations 0/1.
const vertices = new Float32Array([
  // position           color
  -1, -1,  1,           1, 0, 0,
   1, -1,  1,           0, 1, 0,
   1,  1,  1,           0, 0, 1,
  -1,  1,  1,           1, 1, 0,
  -1, -1, -1,           1, 0, 1,
   1, -1, -1,           0, 1, 1,
   1,  1, -1,           1, 1, 1,
  -1,  1, -1,           0.2, 0.4, 1,
]);

const indices = new Uint16Array([
  // Counter-clockwise winding marks outward-facing triangles as front faces.
  0, 1, 2, 0, 2, 3, // front
  1, 5, 6, 1, 6, 2, // right
  5, 4, 7, 5, 7, 6, // back
  4, 0, 3, 4, 3, 7, // left
  3, 2, 6, 3, 6, 7, // top
  4, 5, 1, 4, 1, 0, // bottom
]);

export class Cube {
  // The renderer needs this description while building its pipeline, before any
  // Cube instance records draw commands.
  static readonly vertexBufferLayout: GPUVertexBufferLayout = {
    arrayStride: 6 * Float32Array.BYTES_PER_ELEMENT,
    attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' },
      { shaderLocation: 1, offset: 3 * Float32Array.BYTES_PER_ELEMENT, format: 'float32x3' },
    ],
  };

  readonly indexCount = indices.length;
  private readonly vertexBuffer: GPUBuffer;
  private readonly indexBuffer: GPUBuffer;

  constructor(device: GPUDevice) {
    // Geometry is uploaded once and reused for every frame.
    this.vertexBuffer = createBufferWithData(
      device,
      'cube vertices',
      vertices,
      GPUBufferUsage.VERTEX,
    );
    this.indexBuffer = createBufferWithData(
      device,
      'cube indices',
      indices,
      GPUBufferUsage.INDEX,
    );
  }

  draw(pass: GPURenderPassEncoder): void {
    // Cube owns the binding details, leaving Renderer responsible only for when
    // the object should be drawn.
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(this.indexBuffer, 'uint16');
    pass.drawIndexed(this.indexCount);
  }

  destroy(): void {
    this.vertexBuffer.destroy();
    this.indexBuffer.destroy();
  }
}
