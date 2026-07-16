# Vite WebGPU Project

A minimal Vite + TypeScript project that renders a centered SVG logo with WebGPU and has lil-gui installed.

## Run it

```sh
npm install
npm run dev
```

Open the local URL printed by Vite in a current browser with WebGPU support. The “Settings” panel controls the logo size and the color of the SVG’s `.cls-6` text. Add future controls in `src/gui/SettingsGui.ts`.

## Commands

- `npm run dev` starts the development server.
- `npm run build` type-checks and creates a production build in `dist/`.
- `npm run preview` serves the production build locally.
