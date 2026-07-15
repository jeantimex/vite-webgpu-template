# Create Vite WebGPU Project

A zero-dependency initializer for a minimal Vite + TypeScript project that renders a rotating, depth-tested WebGPU cube.

## Create a project

After this package is published, run:

```sh
npm create vite-webgpu-project@latest my-project
cd my-project
npm install
npm run dev
```

`npm create vite-webgpu-project` is npm shorthand for downloading and running the `create-vite-webgpu-project` package.

## Develop the template

This repository is both the npm initializer and a runnable copy of the template:

```sh
npm install
npm run dev
```

Run `npm test` to test project creation and `npm run build` to type-check and build the template.

## Publish to npm

The unscoped package name must be available in npm's global namespace. Check it, authenticate, and inspect exactly what will be uploaded:

```sh
npm view create-vite-webgpu-project
npm login
npm whoami
npm test
npm run build
npm pack --dry-run
```

If `npm view` returns a 404, the name is available. Publish version `0.1.0`:

```sh
npm publish
```

npm requires two-factor authentication for interactive publishing. Once publishing succeeds, verify the real consumer flow in a directory outside this repository:

```sh
npm create vite-webgpu-project@latest my-project
```

For later releases, commit your work, choose the appropriate semantic-version bump, then publish the new version:

```sh
npm version patch
npm publish
git push --follow-tags
```

Every published `name` + `version` combination is permanent, so always inspect `npm pack --dry-run` before publishing.

## Generated project structure

```text
src/
├── main.ts
├── camera/Camera.ts
├── input/OrbitControls.ts
├── math/mat4.ts
├── renderer/
│   ├── Renderer.ts
│   └── cubeShader.ts
├── scene/Cube.ts
├── utils/dom.ts
└── webgpu/utils.ts
```
