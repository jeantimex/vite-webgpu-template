import './style.css';
import { OrbitControls } from './input/orbit_control';
import { Renderer } from './renderer/renderer';
import { requiredElement } from './utils/dom';
import { initializeWebGPU } from './webgpu/utils';

const canvas = requiredElement<HTMLCanvasElement>('#webgpu-canvas');
const message = requiredElement<HTMLDivElement>('#message');

function showError(error: unknown): void {
  console.error(error);
  message.textContent = error instanceof Error ? error.message : 'Unable to start the WebGPU demo.';
  message.classList.add('visible');
}

async function main(): Promise<void> {
  const gpu = await initializeWebGPU(canvas);
  const controls = new OrbitControls(canvas);
  const renderer = new Renderer(canvas, gpu, controls);
  renderer.start();
}

main().catch(showError);
