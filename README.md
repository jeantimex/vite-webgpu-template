# Vite WebGPU Template

A minimal Vite + TypeScript project that renders a rotating, depth-tested cube with WebGPU.

Drag the canvas with a mouse, pen, or one finger to orbit the camera. Use the
mouse wheel or trackpad to zoom.

## Run it

```sh
npm install
npm run dev
```

Open the local URL printed by Vite in a current browser with WebGPU support.

## Structure

```text
src/
├── main.ts                 # DOM setup and application bootstrap
├── camera/Camera.ts        # Renderer-facing camera interface
├── input/OrbitControls.ts  # Pointer orbiting and wheel zoom
├── math/mat4.ts            # Small matrix math helpers
├── renderer/
│   ├── Renderer.ts         # Pipeline, resize handling, and RAF loop
│   └── cubeShader.ts       # WGSL vertex and fragment shaders
├── scene/Cube.ts           # Cube geometry, GPU buffers, and draw call
├── utils/dom.ts            # DOM lookup helper
└── webgpu/utils.ts         # WebGPU initialization and buffer/canvas helpers
```

## Commands

- `npm run dev` starts the development server.
- `npm run build` type-checks and creates a production build in `dist/`.
- `npm run preview` serves the production build locally.
