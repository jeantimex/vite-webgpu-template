import type { Mat4 } from '../math/mat4';

/** Anything that can provide a camera view matrix for the renderer. */
export interface Camera {
  getViewMatrix(): Mat4;
}
