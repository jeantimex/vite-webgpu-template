import type { Camera } from '../camera/camera';
import { setupGui, type Settings } from '../gui/settings_gui';
import { multiply, perspective, rotationX, rotationY, scaling } from '../math/mat4';
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
  private readonly solidPipeline: GPURenderPipeline;
  private readonly wireframePipeline: GPURenderPipeline;
  private readonly matrixBuffer: GPUBuffer;
  private readonly colorBuffer: GPUBuffer;
  private readonly bindGroup: GPUBindGroup;
  private readonly destroyGui: () => void;
  private readonly controls: Settings = {
    size: 1,
    color: '#4f8cff',
    wireframe: __INITIAL_WIREFRAME__,
    rotate: __INITIAL_ROTATE__,
    rotationSpeed: 1,
  };
  private depthTexture?: GPUTexture;
  private animationFrame?: number;
  private previousTime?: number;
  private rotationAngle = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    gpu: WebGPUState,
    private readonly camera: Camera,
  ) {
    this.device = gpu.device;
    this.context = gpu.context;
    this.format = gpu.format;
    this.shape = new Shape(this.device);

    this.matrixBuffer = this.device.createBuffer({
      label: 'MVP matrix',
      size: 16 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.colorBuffer = this.device.createBuffer({
      label: 'shape color',
      size: 4 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });
    const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
    const shaderModule = this.device.createShaderModule({ code: meshShader });
    this.solidPipeline = this.createPipeline(shaderModule, pipelineLayout, 'triangle-list');
    this.wireframePipeline = this.createPipeline(shaderModule, pipelineLayout, 'line-list');
    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.matrixBuffer } },
        { binding: 1, resource: { buffer: this.colorBuffer } },
      ],
    });

    this.destroyGui = setupGui(this.controls);
  }

  start(): void {
    if (this.animationFrame !== undefined) return;
    this.animationFrame = requestAnimationFrame(this.render);
  }

  stop(): void {
    if (this.animationFrame === undefined) return;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
    this.previousTime = undefined;
  }

  destroy(): void {
    this.stop();
    this.destroyGui();
    this.depthTexture?.destroy();
    this.matrixBuffer.destroy();
    this.colorBuffer.destroy();
    this.shape.destroy();
  }

  private createPipeline(
    shaderModule: GPUShaderModule,
    layout: GPUPipelineLayout,
    topology: GPUPrimitiveTopology,
  ): GPURenderPipeline {
    return this.device.createRenderPipeline({
      label: `${topology} shape pipeline`,
      layout,
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
        topology,
        cullMode: topology === 'triangle-list' ? 'back' : 'none',
      },
      depthStencil: {
        format: DEPTH_FORMAT,
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    });
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

    pass.setPipeline(this.controls.wireframe ? this.wireframePipeline : this.solidPipeline);
    pass.setBindGroup(0, this.bindGroup);
    this.shape.draw(pass, this.controls.wireframe);
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

  private updateUniforms(time: number): void {
    if (this.previousTime !== undefined && this.controls.rotate) {
      const deltaSeconds = Math.min((time - this.previousTime) / 1000, 0.1);
      this.rotationAngle += deltaSeconds * this.controls.rotationSpeed;
    }
    this.previousTime = time;

    const projection = perspective(
      Math.PI / 3,
      this.canvas.width / this.canvas.height,
      0.1,
      100,
    );
    const view = this.camera.getViewMatrix();
    const scale = scaling(this.controls.size, this.controls.size, this.controls.size);
    const rotation = multiply(
      rotationY(this.rotationAngle),
      rotationX(this.rotationAngle * 0.57),
    );
    const model = multiply(rotation, scale);
    const mvp = multiply(projection, multiply(view, model));

    this.device.queue.writeBuffer(this.matrixBuffer, 0, mvp);
    this.device.queue.writeBuffer(this.colorBuffer, 0, hexToColor(this.controls.color));
  }
}

function hexToColor(hex: string): Float32Array<ArrayBuffer> {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return new Float32Array([
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    1,
  ]);
}
