import { Mesh } from './Mesh';

const vertices = new Float32Array([
  -1, -1,  1,  1, 0, 0,
   1, -1,  1,  0, 1, 0,
   1,  1,  1,  0, 0, 1,
  -1,  1,  1,  1, 1, 0,
  -1, -1, -1,  1, 0, 1,
   1, -1, -1,  0, 1, 1,
   1,  1, -1,  1, 1, 1,
  -1,  1, -1,  0.2, 0.4, 1,
]);

const indices = new Uint16Array([
__INDICES__
]);

export class Shape extends Mesh {
  constructor(device: GPUDevice) {
    super(device, 'cube', vertices, indices);
  }
}
