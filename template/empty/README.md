# Vite WebGPU Project

A minimal Vite + TypeScript project that uploads an SVG logo to a GPU texture and renders it on a centered quad.

## Run it

```sh
npm install
npm run dev
```

Open the local URL printed by Vite in a current browser with WebGPU support, then extend the rendering code in `src/renderer/renderer.ts`.

## Commands

- `npm run dev` starts the development server.
- `npm run build` type-checks and creates a production build in `dist/`.
- `npm run preview` serves the production build locally.
