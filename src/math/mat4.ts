/** A column-major 4x4 matrix, matching WGSL's mat4x4f memory layout. */
export type Mat4 = Float32Array<ArrayBuffer>;

export function identity(): Mat4 {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

/** Multiplies two matrices in application order: the result transforms by b, then a. */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);

  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      out[column * 4 + row] =
        a[row] * b[column * 4] +
        a[4 + row] * b[column * 4 + 1] +
        a[8 + row] * b[column * 4 + 2] +
        a[12 + row] * b[column * 4 + 3];
    }
  }

  return out;
}

export function perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovY / 2);

  // This projection maps depth to WebGPU's 0..1 clip-space range. It is not the
  // OpenGL variant, whose clip-space depth range is -1..1.
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, far / (near - far), -1,
    0, 0, (near * far) / (near - far), 0,
  ]);
}

export function translation(x: number, y: number, z: number): Mat4 {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ]);
}

export function scaling(x: number, y: number, z: number): Mat4 {
  return new Float32Array([
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1,
  ]);
}

/** Builds a right-handed view matrix for a camera looking toward a target. */
export function lookAt(
  eye: readonly [number, number, number],
  target: readonly [number, number, number],
  up: readonly [number, number, number] = [0, 1, 0],
): Mat4 {
  // z points backward from the target to the camera in a right-handed view.
  const z = normalize([
    eye[0] - target[0],
    eye[1] - target[1],
    eye[2] - target[2],
  ]);
  const x = normalize(cross(up, z));
  const y = cross(z, x);

  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
  ]);
}

export function rotationX(angle: number): Mat4 {
  // All public angle arguments are in radians.
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ]);
}

export function rotationY(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ]);
}

type Vec3 = [number, number, number];

function dot(a: readonly number[], b: readonly number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: readonly number[], b: readonly number[]): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(vector: readonly number[]): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length === 0) throw new Error('Cannot normalize a zero-length vector.');
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}
