import type { Camera } from '../camera/camera';
import { lookAt, type Mat4 } from '../math/mat4';

export interface OrbitControlsOptions {
  target?: [number, number, number];
  distance?: number;
  minDistance?: number;
  maxDistance?: number;
  rotateSpeed?: number;
  zoomSpeed?: number;
}

/**
 * Converts pointer drags and wheel input into a camera view matrix.
 * The controls orbit a fixed target using spherical yaw, pitch, and distance;
 * they do not know anything about WebGPU or the renderer.
 */
export class OrbitControls implements Camera {
  private readonly target: [number, number, number];
  private readonly minDistance: number;
  private readonly maxDistance: number;
  private readonly rotateSpeed: number;
  private readonly zoomSpeed: number;
  private distance: number;
  private yaw = 0;
  private pitch = 0;
  private activePointer?: number;
  private previousX = 0;
  private previousY = 0;

  constructor(
    private readonly element: HTMLElement,
    options: OrbitControlsOptions = {},
  ) {
    this.target = options.target ?? [0, 0, 0];
    this.distance = options.distance ?? 5;
    this.minDistance = options.minDistance ?? 2.5;
    this.maxDistance = options.maxDistance ?? 15;
    this.rotateSpeed = options.rotateSpeed ?? 0.005;
    this.zoomSpeed = options.zoomSpeed ?? 0.001;

    this.distance = clamp(this.distance, this.minDistance, this.maxDistance);

    // Pointer events cover mouse, pen, and single-touch input with one code path.
    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('pointermove', this.onPointerMove);
    this.element.addEventListener('pointerup', this.onPointerUp);
    this.element.addEventListener('pointercancel', this.onPointerUp);
    this.element.addEventListener('wheel', this.onWheel, { passive: false });
  }

  /** Returns the current camera transform for use as the frame's view matrix. */
  getViewMatrix(): Mat4 {
    const cosPitch = Math.cos(this.pitch);
    const eye: [number, number, number] = [
      this.target[0] + this.distance * cosPitch * Math.sin(this.yaw),
      this.target[1] + this.distance * Math.sin(this.pitch),
      this.target[2] + this.distance * cosPitch * Math.cos(this.yaw),
    ];

    return lookAt(eye, this.target);
  }

  /** Removes listeners when the controls are no longer used. */
  destroy(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.element.removeEventListener('wheel', this.onWheel);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    // Only the primary pointer and primary mouse button rotate the camera.
    if (!event.isPrimary || event.button !== 0 || this.activePointer !== undefined) return;

    this.activePointer = event.pointerId;
    this.previousX = event.clientX;
    this.previousY = event.clientY;
    this.element.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointer) return;

    const deltaX = event.clientX - this.previousX;
    const deltaY = event.clientY - this.previousY;
    this.previousX = event.clientX;
    this.previousY = event.clientY;

    this.yaw -= deltaX * this.rotateSpeed;
    // Clamping just short of the poles prevents the view's forward and up axes
    // from becoming parallel, where a look-at matrix is undefined.
    const pitchLimit = Math.PI / 2 - 0.01;
    this.pitch = clamp(this.pitch + deltaY * this.rotateSpeed, -pitchLimit, pitchLimit);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointer) return;

    if (this.element.hasPointerCapture(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId);
    }
    this.activePointer = undefined;
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    // Exponential scaling makes zoom speed proportional to the current distance.
    this.distance = clamp(
      this.distance * Math.exp(event.deltaY * this.zoomSpeed),
      this.minDistance,
      this.maxDistance,
    );
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
