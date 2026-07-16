import GUI from 'lil-gui';
import type { LogoSettings } from '../renderer/Renderer';

/** Creates the starter settings panel and returns its live values. */
export function setupGui(): LogoSettings {
  const settings: LogoSettings = {
    size: 0.5,
    textColor: '#ffffff',
  };
  const gui = new GUI({ title: 'Settings' });
  gui.add(settings, 'size', 0.2, 0.9, 0.01).name('Logo size');
  gui.addColor(settings, 'textColor').name('Text color');
  return settings;
}
