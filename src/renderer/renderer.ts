import type { Camera } from '../camera/camera';
import type { DemoConfig } from '../demoConfig';
import { identity, multiply, perspective, rotationX, rotationY } from '../math/mat4';
import { Cube } from '../scene/cube';
import { Mesh } from '../scene/mesh';
import { Sphere } from '../scene/sphere';
import { resizeCanvasToDisplaySize, type WebGPUState } from '../webgpu/utils';
import { meshShader } from './mesh_shader';

const DEPTH_FORMAT: GPUTextureFormat = 'depth24plus';

/**
 * Owns the render pipeline, frame loop, and render-target-sized resources.
 * Scene geometry remains in Mesh subclasses so objects can be introduced without
 * putting their vertex/index buffer details into the renderer.
 */
export class Renderer {
  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;
  private readonly format: GPUTextureFormat;
  private readonly shape?: Mesh;
  private readonly pipeline?: GPURenderPipeline;
  private readonly uniformBuffer?: GPUBuffer;
  private readonly bindGroup?: GPUBindGroup;
  private depthTexture?: GPUTexture;
  // Besides identifying the pending frame, this acts as the "is running" flag.
  private animationFrame?: number;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    gpu: WebGPUState,
    private readonly camera: Camera,
    private readonly config: DemoConfig,
  ) {
    this.device = gpu.device;
    this.context = gpu.context;
    this.format = gpu.format;
    if (config.shape === 'none') return;

    this.shape = config.shape === 'cube'
      ? new Cube(this.device, config.wireframe)
      : new Sphere(this.device, config.wireframe);

    // A mat4x4f occupies 16 floats (64 bytes). COPY_DST lets the CPU update this
    // matrix through queue.writeBuffer before each draw.
    this.uniformBuffer = this.device.createBuffer({
      label: 'MVP matrix',
      size: 16 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const shaderModule = this.device.createShaderModule({ code: meshShader });
    this.pipeline = this.device.createRenderPipeline({
      label: 'cube pipeline',
      // WebGPU derives the bind-group layout from the shader declarations.
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
        topology: config.wireframe ? 'line-list' : 'triangle-list',
        cullMode: config.wireframe ? 'none' : 'back',
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
    // Make start idempotent so callers cannot accidentally create two RAF loops.
    if (this.animationFrame !== undefined) return;
    this.animationFrame = requestAnimationFrame(this.render);
  }

  stop(): void {
    if (this.animationFrame === undefined) return;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
  }

  destroy(): void {
    // GPU buffers and textures should be explicitly released when the renderer is
    // no longer needed; the pipeline and bind group are garbage-collected handles.
    this.stop();
    this.depthTexture?.destroy();
    this.uniformBuffer?.destroy();
    this.shape?.destroy();
  }

  private readonly render = (time: number): void => {
    // The arrow function preserves `this` when requestAnimationFrame invokes it.
    this.resizeIfNeeded();
    this.updateUniforms(time);

    // Commands are recorded into an encoder, finalized, and then submitted to the
    // device queue. GPU execution may continue after this function returns.
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

    if (this.pipeline && this.bindGroup && this.shape) {
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      this.shape.draw(pass);
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);

    this.animationFrame = requestAnimationFrame(this.render);
  };

  private resizeIfNeeded(): void {
    const resized = resizeCanvasToDisplaySize(
      this.canvas,
      this.device.limits.maxTextureDimension2D,
    );
    // A missing depth texture forces first-frame configuration even if the canvas
    // happened to start at exactly the desired dimensions.
    if (!resized && this.depthTexture) return;

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque',
    });

    // Render attachments must match the canvas backing-store dimensions, so the
    // old depth texture cannot be reused after a resize.
    this.depthTexture?.destroy();
    this.depthTexture = this.device.createTexture({
      label: 'depth texture',
      size: [this.canvas.width, this.canvas.height],
      format: DEPTH_FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private updateUniforms(time: number): void {
    if (!this.uniformBuffer) return;

    const projection = perspective(
      Math.PI / 3,
      this.canvas.width / this.canvas.height,
      0.1,
      100,
    );
    // Camera interaction is delegated to OrbitControls; Renderer only consumes
    // the view matrix it produces.
    const view = this.camera.getViewMatrix();
    // RAF time is in milliseconds. The small factors convert it to useful angles.
    const model = this.config.rotate
      ? multiply(rotationY(time * 0.0007), rotationX(time * 0.0004))
      : identity();
    // With column vectors, transforms compose from right to left: model, view,
    // then projection.
    const mvp = multiply(projection, multiply(view, model));

    this.device.queue.writeBuffer(this.uniformBuffer, 0, mvp);
  }
}
