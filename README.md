# Create Vite WebGPU Project

A zero-runtime-dependency initializer for creating a focused Vite + TypeScript WebGPU project. Choose a starter scene, rotation behavior, and whether to include a lil-gui Settings panel; the initializer generates only the code needed for those choices.

## Create a project

```sh
npm create vite-webgpu-project@latest my-project
cd my-project
npm install
npm run dev
```

Open the URL printed by Vite in a browser with WebGPU support.

## Interactive options

The initializer walks through these choices:

| Question | Choices | Default | When shown |
| --- | --- | --- | --- |
| Starter scene | Default, Cube, Sphere, None | Default | Always |
| Rotate the shape | Yes or No | Yes | Cube and Sphere only |
| Install lil-gui | Yes or No | Yes | Always |

### Scenes

| Scene | Initial rendering | Settings panel when lil-gui is enabled |
| --- | --- | --- |
| Default | Centers `webgpu.svg` on a GPU-textured quad | Logo size and `.cls-6` text color |
| Cube | Solid, depth-tested cube with orbit and zoom controls | Size, color, wireframe, rotation, and rotation speed |
| Sphere | Solid, depth-tested sphere with orbit and zoom controls | Size, color, wireframe, rotation, and rotation speed |
| None | Clears the WebGPU canvas without drawing content | Empty panel titled **Settings**, ready for custom controls |

Cube and Sphere always start solid. Wireframe is a live lil-gui control instead of a project-creation question.

## Command-line options

Pass options after `--` when using `npm create`:

| Option | Description | Default |
| --- | --- | --- |
| `--scene default\|cube\|sphere\|none` | Select the generated starter scene | `default` |
| `--rotate` | Start Cube or Sphere with rotation enabled | Enabled |
| `--no-rotate` | Start Cube or Sphere without rotation | — |
| `--gui` | Install lil-gui and generate `src/gui/settings_gui.ts` | Enabled |
| `--no-gui` | Omit lil-gui, its dependency, and GUI source | — |
| `-h`, `--help` | Show CLI usage | — |

Examples:

```sh
# Rotating sphere with the Settings panel
npm create vite-webgpu-project@latest sphere-demo -- --scene sphere --gui

# Stationary cube with no lil-gui dependency or GUI source
npm create vite-webgpu-project@latest cube-demo -- --scene cube --no-rotate --no-gui

# No rendered content, but an empty Settings panel for future controls
npm create vite-webgpu-project@latest blank-demo -- --scene none --gui
```

## Generated code

Generation happens at scaffold time rather than through runtime scene-selection conditions. Unselected geometry, shaders, pipelines, dependencies, and GUI code are not copied into the project.

| Output | Included source |
| --- | --- |
| Every project | `main.ts`, `style.css`, DOM/WebGPU utilities, and `public/favicon.ico` |
| Default | SVG asset plus the textured-quad renderer and shader |
| Cube or Sphere | Camera, orbit controls, matrix math, selected geometry, mesh shader, and depth renderer |
| None | Minimal canvas-clearing renderer; no geometry, texture, shader, camera, or math modules |
| Any scene with lil-gui | `src/gui/settings_gui.ts` and the `lil-gui` dependency |

A Cube or Sphere project with lil-gui has this representative structure:

```text
public/
└── favicon.ico
src/
├── main.ts
├── style.css
├── camera/camera.ts
├── gui/settings_gui.ts
├── input/orbit_control.ts
├── math/mat4.ts
├── renderer/
│   ├── renderer.ts
│   └── mesh_shader.ts
├── scene/
│   ├── mesh.ts
│   └── shape.ts
├── utils/dom.ts
└── webgpu/utils.ts
```

## Generated project commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Serve the production build locally |

## Develop the initializer

This repository is also a runnable copy of the WebGPU template:

```sh
npm install
npm run dev
```

Test the initializer and production build:

```sh
npm test
npm run build
```

Run the local, unpublished initializer directly:

```sh
node ./bin/create-vite-webgpu-project.js /tmp/webgpu-test --scene default
```

## Publish to npm

Check the package name, authenticate, run the verification suite, and inspect the package contents:

```sh
npm view create-vite-webgpu-project
npm login
npm whoami
npm test
npm run build
npm pack --dry-run
```

If `npm view` returns a 404, the name is available. Publish version `1.0.0`:

```sh
npm publish
```

Once publishing succeeds, verify the consumer flow outside this repository:

```sh
npm create vite-webgpu-project@latest my-project
```

For later releases:

```sh
npm version patch
npm publish
git push --follow-tags
```

Every published package name and version combination is permanent, so inspect `npm pack --dry-run` before publishing.
