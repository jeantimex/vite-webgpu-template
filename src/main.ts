import './style.css';
import { OrbitControls } from './input/OrbitControls';
import { Renderer } from './renderer/Renderer';
import { requiredElement } from './utils/dom';
import { initializeWebGPU } from './webgpu/utils';

// Keep the entry point focused on wiring the page to the rendering system. GPU
// resource creation and frame rendering belong to Renderer and the scene objects.
const canvas = requiredElement<HTMLCanvasElement>('#webgpu-canvas');
const message = requiredElement<HTMLDivElement>('#message');

// Startup failures are shown in the page because WebGPU may legitimately be
// unavailable even when the JavaScript bundle loaded successfully.
function showError(error: unknown): void {
  console.error(error);
  message.textContent = error instanceof Error ? error.message : 'Unable to start the WebGPU demo.';
  message.classList.add('visible');
}

async function main(): Promise<void> {
  // WebGPU initialization is asynchronous because the browser must choose an
  // adapter before it can create a logical device.
  const gpu = await initializeWebGPU(canvas);
  // Input and rendering are separate modules; main composes them around the same
  // canvas instead of either module constructing the other.
  const controls = new OrbitControls(canvas);
  const renderer = new Renderer(canvas, gpu, controls);
  renderer.start();
}

main().catch(showError);
