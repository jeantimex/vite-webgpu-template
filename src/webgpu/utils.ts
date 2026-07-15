/** The WebGPU handles shared by the renderer after initialization. */
export interface WebGPUState {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export async function initializeWebGPU(canvas: HTMLCanvasElement): Promise<WebGPUState> {
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in this browser. Try a current version of Chrome or Edge.');
  }

  // The adapter represents a physical/virtual GPU; the device is the application's
  // logical connection used to create resources and submit work.
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No compatible WebGPU adapter was found.');

  // A WebGPU canvas context supplies the current texture rendered each frame.
  const context = canvas.getContext('webgpu');
  if (!context) throw new Error('Could not create a WebGPU canvas context.');

  return {
    device: await adapter.requestDevice(),
    context,
    format: navigator.gpu.getPreferredCanvasFormat(),
  };
}

export function createBufferWithData(
  device: GPUDevice,
  label: string,
  data: ArrayBufferView<ArrayBuffer>,
  usage: GPUBufferUsageFlags,
): GPUBuffer {
  // COPY_DST is required because writeBuffer copies the initial CPU data into the
  // newly allocated GPU buffer.
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage: usage | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

export function resizeCanvasToDisplaySize(
  canvas: HTMLCanvasElement,
  maxTextureSize: number,
): boolean {
  // CSS pixels determine the displayed size, while the backing store uses physical
  // pixels for a sharp image on high-DPI screens.
  const width = Math.max(
    1,
    Math.min(Math.floor(canvas.clientWidth * window.devicePixelRatio), maxTextureSize),
  );
  const height = Math.max(
    1,
    Math.min(Math.floor(canvas.clientHeight * window.devicePixelRatio), maxTextureSize),
  );

  // Avoid reallocating render targets on frames where the size has not changed.
  if (canvas.width === width && canvas.height === height) return false;

  canvas.width = width;
  canvas.height = height;
  return true;
}
