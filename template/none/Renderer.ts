import { resizeCanvasToDisplaySize, type WebGPUState } from '../webgpu/utils';

export class Renderer {
  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;
  private readonly format: GPUTextureFormat;
  private configured = false;
  private animationFrame?: number;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    gpu: WebGPUState,
  ) {
    this.device = gpu.device;
    this.context = gpu.context;
    this.format = gpu.format;
  }

  start(): void {
    if (this.animationFrame !== undefined) return;
    this.animationFrame = requestAnimationFrame(this.render);
  }

  stop(): void {
    if (this.animationFrame === undefined) return;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
  }

  private readonly render = (): void => {
    const resized = resizeCanvasToDisplaySize(this.canvas, this.device.limits.maxTextureDimension2D);
    if (resized || !this.configured) {
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'opaque',
      });
      this.configured = true;
    }

    const encoder = this.device.createCommandEncoder({ label: 'frame encoder' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.063, g: 0.075, b: 0.102, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    pass.end();
    this.device.queue.submit([encoder.finish()]);

    this.animationFrame = requestAnimationFrame(this.render);
  };
}
