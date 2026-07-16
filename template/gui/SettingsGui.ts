import GUI from 'lil-gui';

export interface Settings {
  size: number;
  color: string;
  wireframe: boolean;
  rotate: boolean;
  rotationSpeed: number;
}

/** Creates the settings panel and returns its cleanup callback. */
export function setupGui(settings: Settings): () => void {
  const gui = new GUI({ title: 'Settings' });
  gui.add(settings, 'size', 0.25, 2, 0.01).name('Size');
  gui.addColor(settings, 'color').name('Color');
  gui.add(settings, 'wireframe').name('Wireframe');
  gui.add(settings, 'rotate').name('Rotate');
  gui.add(settings, 'rotationSpeed', 0, 3, 0.01).name('Rotation speed');
  return () => gui.destroy();
}
