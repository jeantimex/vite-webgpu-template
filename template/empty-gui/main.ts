import './style.css';
import { setupGui } from './gui/SettingsGui';
import { Renderer } from './renderer/Renderer';
import { requiredElement } from './utils/dom';
import { initializeWebGPU } from './webgpu/utils';

const canvas = requiredElement<HTMLCanvasElement>('#webgpu-canvas');
const message = requiredElement<HTMLDivElement>('#message');

function showError(error: unknown): void {
  console.error(error);
  message.textContent = error instanceof Error ? error.message : 'Unable to start WebGPU.';
  message.classList.add('visible');
}

async function main(): Promise<void> {
  const gpu = await initializeWebGPU(canvas);
  const settings = setupGui();
  const renderer = await Renderer.create(canvas, gpu, settings);
  renderer.start();
}

main().catch(showError);
