import { createBufferWithData } from '../webgpu/utils';

/** Vertex/index-buffer-backed geometry shared by the built-in shapes. */
export class Mesh {
  static readonly vertexBufferLayout: GPUVertexBufferLayout = {
    arrayStride: 6 * Float32Array.BYTES_PER_ELEMENT,
    attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' },
      { shaderLocation: 1, offset: 3 * Float32Array.BYTES_PER_ELEMENT, format: 'float32x3' },
    ],
  };

  private readonly vertexBuffer: GPUBuffer;
  private readonly indexBuffer: GPUBuffer;
  private readonly indexCount: number;

  constructor(
    device: GPUDevice,
    label: string,
    vertices: Float32Array<ArrayBuffer>,
    indices: Uint16Array<ArrayBuffer>,
  ) {
    this.vertexBuffer = createBufferWithData(
      device,
      `${label} vertices`,
      vertices,
      GPUBufferUsage.VERTEX,
    );
    this.indexBuffer = createBufferWithData(
      device,
      `${label} indices`,
      indices,
      GPUBufferUsage.INDEX,
    );
    this.indexCount = indices.length;
  }

  draw(pass: GPURenderPassEncoder): void {
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(this.indexBuffer, 'uint16');
    pass.drawIndexed(this.indexCount);
  }

  destroy(): void {
    this.vertexBuffer.destroy();
    this.indexBuffer.destroy();
  }
}
