export type ShapeKind = 'cube' | 'sphere' | 'none';

export interface DemoConfig {
  shape: ShapeKind;
  wireframe: boolean;
  rotate: boolean;
}

// The project initializer rewrites this file from the user's answers. Keeping
// the choices in one small module makes the generated project easy to customize.
export const demoConfig = {
  shape: 'cube',
  wireframe: false,
  rotate: true,
} satisfies DemoConfig;
