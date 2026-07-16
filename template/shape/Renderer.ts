import type { Camera } from '../camera/camera';
__MATH_IMPORT__
import { Shape } from '../scene/shape';
import { Mesh } from '../scene/mesh';
import { resizeCanvasToDisplaySize, type WebGPUState } from '../webgpu/utils';
import { meshShader } from './mesh_shader';

const DEPTH_FORMAT: GPUTextureFormat = 'depth24plus';

export class Renderer {
  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;
  private readonly format: GPUTextureFormat;
  private readonly shape: Shape;
  private readonly pipeline: GPURenderPipeline;
  private readonly uniformBuffer: GPUBuffer;
  private readonly bindGroup: GPUBindGroup;
  private depthTexture?: GPUTexture;
  private animationFrame?: number;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    gpu: WebGPUState,
    private readonly camera: Camera,
  ) {
    this.device = gpu.device;
    this.context = gpu.context;
    this.format = gpu.format;
    this.shape = new Shape(this.device);

    this.uniformBuffer = this.device.createBuffer({
      label: 'MVP matrix',
      size: 16 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const shaderModule = this.device.createShaderModule({ code: meshShader });
    this.pipeline = this.device.createRenderPipeline({
      label: 'shape pipeline',
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
        buffers: [Mesh.vertexBufferLayout],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: '__TOPOLOGY__',
        cullMode: '__CULL_MODE__',
      },
      depthStencil: {
        format: DEPTH_FORMAT,
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });
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

  destroy(): void {
    this.stop();
    this.depthTexture?.destroy();
    this.uniformBuffer.destroy();
    this.shape.destroy();
  }

  private readonly render = (time: number): void => {
    this.resizeIfNeeded();
    this.updateUniforms(time);

    const encoder = this.device.createCommandEncoder({ label: 'frame encoder' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.063, g: 0.075, b: 0.102, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: this.depthTexture!.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    this.shape.draw(pass);
    pass.end();
    this.device.queue.submit([encoder.finish()]);

    this.animationFrame = requestAnimationFrame(this.render);
  };

  private resizeIfNeeded(): void {
    const resized = resizeCanvasToDisplaySize(
      this.canvas,
      this.device.limits.maxTextureDimension2D,
    );
    if (!resized && this.depthTexture) return;

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque',
    });

    this.depthTexture?.destroy();
    this.depthTexture = this.device.createTexture({
      label: 'depth texture',
      size: [this.canvas.width, this.canvas.height],
      format: DEPTH_FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private updateUniforms(__TIME_PARAMETER__: number): void {
    const projection = perspective(
      Math.PI / 3,
      this.canvas.width / this.canvas.height,
      0.1,
      100,
    );
    const view = this.camera.getViewMatrix();
__MVP_CODE__
    this.device.queue.writeBuffer(this.uniformBuffer, 0, mvp);
  }
}
