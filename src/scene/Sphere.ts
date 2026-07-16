import { Mesh } from './Mesh';

const LATITUDE_SEGMENTS = 24;
const LONGITUDE_SEGMENTS = 32;

export class Sphere extends Mesh {
  constructor(device: GPUDevice, wireframe: boolean) {
    const geometry = createSphereGeometry();
    super(
      device,
      'sphere',
      geometry.vertices,
      wireframe ? geometry.lineIndices : geometry.triangleIndices,
    );
  }
}

function createSphereGeometry(): {
  vertices: Float32Array<ArrayBuffer>;
  triangleIndices: Uint16Array<ArrayBuffer>;
  lineIndices: Uint16Array<ArrayBuffer>;
} {
  const vertices: number[] = [];
  const triangles: number[] = [];
  const lines: number[] = [];
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

      const current = latitude * rowSize + longitude;
      if (longitude < LONGITUDE_SEGMENTS) lines.push(current, current + 1);
      if (latitude < LATITUDE_SEGMENTS) lines.push(current, current + rowSize);
    }
  }

  for (let latitude = 0; latitude < LATITUDE_SEGMENTS; latitude++) {
    for (let longitude = 0; longitude < LONGITUDE_SEGMENTS; longitude++) {
      const topLeft = latitude * rowSize + longitude;
      const bottomLeft = topLeft + rowSize;
      triangles.push(topLeft, bottomLeft, topLeft + 1, topLeft + 1, bottomLeft, bottomLeft + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    triangleIndices: new Uint16Array(triangles),
    lineIndices: new Uint16Array(lines),
  };
}
