import { Mesh } from './mesh';

const LATITUDE_SEGMENTS = 24;
const LONGITUDE_SEGMENTS = 32;

export class Shape extends Mesh {
  constructor(device: GPUDevice) {
    const geometry = createSphereGeometry();
    super(device, 'sphere', geometry.vertices, geometry.indices);
  }
}

function createSphereGeometry(): {
  vertices: Float32Array<ArrayBuffer>;
  indices: Uint16Array<ArrayBuffer>;
} {
  const vertices: number[] = [];
  const indices: number[] = [];
  const rowSize = LONGITUDE_SEGMENTS + 1;

  for (let latitude = 0; latitude <= LATITUDE_SEGMENTS; latitude++) {
    const polar = latitude * Math.PI / LATITUDE_SEGMENTS;
    const y = Math.cos(polar);
    const ringRadius = Math.sin(polar);

    for (let longitude = 0; longitude <= LONGITUDE_SEGMENTS; longitude++) {
      const azimuth = longitude * Math.PI * 2 / LONGITUDE_SEGMENTS;
      const x = ringRadius * Math.sin(azimuth);
      const z = ringRadius * Math.cos(azimuth);
      vertices.push(x, y, z, x * 0.5 + 0.5, y * 0.5 + 0.5, z * 0.5 + 0.5);
__LINE_INDEX_CODE__
    }
  }

__TRIANGLE_INDEX_CODE__
  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
}
