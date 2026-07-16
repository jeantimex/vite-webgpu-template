import { createBufferWithData } from '../webgpu/utils';

export class Mesh {
  static readonly vertexBufferLayout: GPUVertexBufferLayout = {
    arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
    attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
  };

  private readonly vertexBuffer: GPUBuffer;
  private readonly triangleIndexBuffer: GPUBuffer;
  private readonly lineIndexBuffer: GPUBuffer;
  private readonly triangleIndexCount: number;
  private readonly lineIndexCount: number;

  constructor(
    device: GPUDevice,
    label: string,
    vertices: Float32Array<ArrayBuffer>,
    triangleIndices: Uint16Array<ArrayBuffer>,
    lineIndices: Uint16Array<ArrayBuffer>,
  ) {
    this.vertexBuffer = createBufferWithData(
      device,
      `${label} vertices`,
      vertices,
      GPUBufferUsage.VERTEX,
    );
    this.triangleIndexBuffer = createBufferWithData(
      device,
      `${label} triangle indices`,
      triangleIndices,
      GPUBufferUsage.INDEX,
    );
    this.lineIndexBuffer = createBufferWithData(
      device,
      `${label} line indices`,
      lineIndices,
      GPUBufferUsage.INDEX,
    );
    this.triangleIndexCount = triangleIndices.length;
    this.lineIndexCount = lineIndices.length;
  }

  draw(pass: GPURenderPassEncoder, wireframe: boolean): void {
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(wireframe ? this.lineIndexBuffer : this.triangleIndexBuffer, 'uint16');
    pass.drawIndexed(wireframe ? this.lineIndexCount : this.triangleIndexCount);
  }

  destroy(): void {
    this.vertexBuffer.destroy();
    this.triangleIndexBuffer.destroy();
    this.lineIndexBuffer.destroy();
  }
}
