import { resizeCanvasToDisplaySize, type WebGPUState } from '../webgpu/utils';

const logoShader = /* wgsl */ `
  struct Display {
    scale: vec2f,
    textColor: vec4f,
  };

  @group(0) @binding(0) var logoSampler: sampler;
  @group(0) @binding(1) var logoTexture: texture_2d<f32>;
  @group(0) @binding(2) var<uniform> display: Display;

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  };

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    let positions = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1),
    );
    let uvs = array<vec2f, 6>(
      vec2f(0, 1), vec2f(1, 1), vec2f(0, 0),
      vec2f(0, 0), vec2f(1, 1), vec2f(1, 0),
    );

    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex] * display.scale, 0, 1);
    output.uv = uvs[vertexIndex];
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let sampled = textureSample(logoTexture, logoSampler, input.uv);
    // The SVG's .cls-6 text is white. Replace those pixels while preserving the
    // blue logo geometry and the texture's antialiased alpha.
    let isText = smoothstep(0.7, 0.98, min(sampled.r, min(sampled.g, sampled.b)));
    return vec4f(mix(sampled.rgb, display.textColor.rgb, isText), sampled.a);
  }
`;

export interface LogoSettings {
  size: number;
  textColor: string;
}

export class Renderer {
  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;
  private readonly format: GPUTextureFormat;
  private readonly logoTexture: GPUTexture;
  private readonly displayBuffer: GPUBuffer;
  private readonly pipeline: GPURenderPipeline;
  private readonly bindGroup: GPUBindGroup;
  private configured = false;
  private animationFrame?: number;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    gpu: WebGPUState,
    logo: HTMLImageElement,
    private readonly settings: LogoSettings,
  ) {
    this.device = gpu.device;
    this.context = gpu.context;
    this.format = gpu.format;

    this.logoTexture = this.device.createTexture({
      label: 'WebGPU logo',
      size: [logo.naturalWidth, logo.naturalHeight],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture(
      { source: logo },
      { texture: this.logoTexture },
      [logo.naturalWidth, logo.naturalHeight],
    );

    this.displayBuffer = this.device.createBuffer({
      label: 'logo display size',
      size: 8 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const shaderModule = this.device.createShaderModule({ code: logoShader });
    this.pipeline = this.device.createRenderPipeline({
      label: 'logo pipeline',
      layout: 'auto',
      vertex: { module: shaderModule, entryPoint: 'vertexMain' },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.device.createSampler({ minFilter: 'linear', magFilter: 'linear' }) },
        { binding: 1, resource: this.logoTexture.createView() },
        { binding: 2, resource: { buffer: this.displayBuffer } },
      ],
    });
  }

  static async create(
    canvas: HTMLCanvasElement,
    gpu: WebGPUState,
    settings: LogoSettings = { size: 0.5, textColor: '#ffffff' },
  ): Promise<Renderer> {
    const logoUrl = new URL('../assets/webgpu.svg', import.meta.url);
    const logo = new Image();
    logo.src = logoUrl.href;
    await logo.decode();
    return new Renderer(canvas, gpu, logo, settings);
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
    this.logoTexture.destroy();
    this.displayBuffer.destroy();
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

    const logoSize = Math.min(this.canvas.width, this.canvas.height) * this.settings.size;
    const textColor = hexToColor(this.settings.textColor);
    this.device.queue.writeBuffer(
      this.displayBuffer,
      0,
      new Float32Array([
        logoSize / this.canvas.width,
        logoSize / this.canvas.height,
        0,
        0,
        textColor[0],
        textColor[1],
        textColor[2],
        1,
      ]),
    );

    const encoder = this.device.createCommandEncoder({ label: 'frame encoder' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.063, g: 0.075, b: 0.102, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6);
    pass.end();
    this.device.queue.submit([encoder.finish()]);

    this.animationFrame = requestAnimationFrame(this.render);
  };
}

function hexToColor(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
  ];
}
