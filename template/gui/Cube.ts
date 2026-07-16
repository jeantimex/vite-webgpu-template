import { Mesh } from './mesh';

const vertices = new Float32Array([
  -1, -1,  1,
   1, -1,  1,
   1,  1,  1,
  -1,  1,  1,
  -1, -1, -1,
   1, -1, -1,
   1,  1, -1,
  -1,  1, -1,
]);

const triangleIndices = new Uint16Array([
  0, 1, 2, 0, 2, 3,
  1, 5, 6, 1, 6, 2,
  5, 4, 7, 5, 7, 6,
  4, 0, 3, 4, 3, 7,
  3, 2, 6, 3, 6, 7,
  4, 5, 1, 4, 1, 0,
]);

const lineIndices = new Uint16Array([
  0, 1, 1, 2, 2, 3, 3, 0,
  4, 5, 5, 6, 6, 7, 7, 4,
  0, 4, 1, 5, 2, 6, 3, 7,
]);

export class Shape extends Mesh {
  constructor(device: GPUDevice) {
    super(device, 'cube', vertices, triangleIndices, lineIndices);
  }
}
