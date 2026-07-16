import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import test from "node:test";

const execFileAsync = promisify(execFile);
const cli = path.resolve("bin/create-vite-webgpu-project.js");
const tsc = path.resolve("node_modules/.bin/tsc");
const vite = path.resolve("node_modules/.bin/vite");

async function assertTypeChecks(projectDirectory) {
  await symlink(path.resolve("node_modules"), path.join(projectDirectory, "node_modules"), "dir");
  await execFileAsync(tsc, ["--project", path.join(projectDirectory, "tsconfig.json")], {
    cwd: projectDirectory,
  });
}

async function assertBuilds(projectDirectory) {
  await execFileAsync(vite, ["build"], { cwd: projectDirectory });
}

test("creates a ready-to-install project", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "create-vite-webgpu-project-"));

  try {
    const { stdout } = await execFileAsync(process.execPath, [cli, "my-project"], {
      cwd: temporaryDirectory,
    });
    const projectDirectory = path.join(temporaryDirectory, "my-project");
    const packageJson = JSON.parse(await readFile(path.join(projectDirectory, "package.json"), "utf8"));

    assert.match(stdout, /Created my-project/);
    assert.equal(packageJson.name, "my-project");
    assert.equal(packageJson.private, true);
    assert.equal(packageJson.dependencies["lil-gui"], "^0.21.0");
    assert.deepEqual(await readdir(path.join(projectDirectory, "src", "renderer")), ["Renderer.ts"]);
    assert.match(await readFile(path.join(projectDirectory, ".gitignore"), "utf8"), /node_modules/);
    assert.deepEqual(
      await readFile(path.join(projectDirectory, "public", "favicon.ico")),
      await readFile(path.join("template", "assets", "webgpu.ico")),
    );
    assert.match(
      await readFile(path.join(projectDirectory, "index.html"), "utf8"),
      /<link rel="icon" href="\/favicon\.ico"/,
    );
    assert.match(
      stdout,
      /Starter: Default — centered WebGPU logo rendered on the GPU, with a lil-gui Settings panel/,
    );
    assert.deepEqual(await readdir(path.join(projectDirectory, "src", "gui")), ["SettingsGui.ts"]);
    assert.match(
      await readFile(path.join(projectDirectory, "src", "assets", "webgpu.svg"), "utf8"),
      /<svg[^>]+width="768"[^>]+height="768"/,
    );
    const renderer = await readFile(path.join(projectDirectory, "src", "renderer", "Renderer.ts"), "utf8");
    assert.match(renderer, /copyExternalImageToTexture/);
    assert.match(renderer, /new Image\(\)/);
    assert.doesNotMatch(renderer, /createImageBitmap/);
    assert.match(renderer, /GPUTextureUsage\.RENDER_ATTACHMENT/);
    assert.match(renderer, /textureSample\(logoTexture/);
    assert.match(renderer, /pass\.draw\(6\)/);
    await assertTypeChecks(projectDirectory);
    await assertBuilds(projectDirectory);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("adds specialized lil-gui controls only when selected", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "create-vite-webgpu-project-"));

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [cli, "gui-demo", "--scene", "cube", "--no-rotate", "--gui"],
      { cwd: temporaryDirectory },
    );
    const projectDirectory = path.join(temporaryDirectory, "gui-demo");
    const packageJson = JSON.parse(await readFile(path.join(projectDirectory, "package.json"), "utf8"));
    const renderer = await readFile(
      path.join(projectDirectory, "src", "renderer", "Renderer.ts"),
      "utf8",
    );
    const shape = await readFile(path.join(projectDirectory, "src", "scene", "Shape.ts"), "utf8");
    const guiSetup = await readFile(
      path.join(projectDirectory, "src", "gui", "SettingsGui.ts"),
      "utf8",
    );

    assert.match(stdout, /Starter: stationary solid cube with lil-gui controls/);
    assert.equal(packageJson.dependencies["lil-gui"], "^0.21.0");
    assert.doesNotMatch(renderer, /from 'lil-gui'/);
    assert.match(renderer, /setupGui\(this\.controls\)/);
    assert.match(renderer, /size: 1/);
    assert.match(renderer, /wireframe: false/);
    assert.match(renderer, /rotate: false/);
    assert.match(renderer, /rotationSpeed/);
    assert.match(guiSetup, /import GUI from 'lil-gui'/);
    assert.match(guiSetup, /new GUI\(\{ title: 'Settings' \}\)/);
    assert.match(guiSetup, /addColor/);
    assert.match(shape, /triangleIndices/);
    assert.match(shape, /lineIndices/);
    await assertTypeChecks(projectDirectory);
    await assertBuilds(projectDirectory);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("writes command-line rendering choices into the generated project", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "create-vite-webgpu-project-"));

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [cli, "sphere-demo", "--scene", "sphere", "--no-rotate", "--no-gui"],
      { cwd: temporaryDirectory },
    );
    const projectDirectory = path.join(temporaryDirectory, "sphere-demo");
    const renderer = await readFile(
      path.join(projectDirectory, "src", "renderer", "Renderer.ts"),
      "utf8",
    );
    const shape = await readFile(path.join(projectDirectory, "src", "scene", "Shape.ts"), "utf8");

    assert.match(stdout, /stationary solid sphere/);
    assert.match(renderer, /topology: 'triangle-list'/);
    assert.doesNotMatch(renderer, /rotationX|rotationY|DemoConfig|wireframe/);
    assert.match(shape, /class Shape extends Mesh/);
    assert.match(shape, /const topLeft/);
    assert.doesNotMatch(shape, /triangleIndices|lineIndices|indices\.push\(current/);
    await assertTypeChecks(projectDirectory);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("adds logo controls to the Default scene with lil-gui", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "create-vite-webgpu-project-"));

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [cli, "empty-demo", "--scene", "default", "--rotate", "--gui"],
      { cwd: temporaryDirectory },
    );
    const sourceDirectory = path.join(temporaryDirectory, "empty-demo", "src");
    const sourceEntries = await readdir(sourceDirectory);
    const rendererEntries = await readdir(path.join(sourceDirectory, "renderer"));
    const renderer = await readFile(path.join(sourceDirectory, "renderer", "Renderer.ts"), "utf8");
    const packageJson = JSON.parse(
      await readFile(path.join(temporaryDirectory, "empty-demo", "package.json"), "utf8"),
    );

    assert.deepEqual(sourceEntries, ["assets", "gui", "main.ts", "renderer", "style.css", "utils", "webgpu"]);
    assert.deepEqual(await readdir(path.join(sourceDirectory, "gui")), ["SettingsGui.ts"]);
    assert.deepEqual(rendererEntries, ["Renderer.ts"]);
    assert.match(
      stdout,
      /Default — centered WebGPU logo rendered on the GPU, with a lil-gui Settings panel/,
    );
    assert.match(renderer, /copyExternalImageToTexture/);
    assert.match(renderer, /textureSample\(logoTexture/);
    assert.equal(packageJson.dependencies["lil-gui"], "^0.21.0");
    const guiSetup = await readFile(path.join(sourceDirectory, "gui", "SettingsGui.ts"), "utf8");
    const main = await readFile(path.join(sourceDirectory, "main.ts"), "utf8");
    assert.match(guiSetup, /new GUI\(\{ title: 'Settings' \}\)/);
    assert.match(guiSetup, /size: 0\.5/);
    assert.match(guiSetup, /add\(settings, 'size'/);
    assert.match(guiSetup, /addColor\(settings, 'textColor'\)/);
    assert.match(main, /const settings = setupGui\(\)/);
    assert.match(main, /Renderer\.create\(canvas, gpu, settings\)/);
    assert.match(renderer, /textColor: vec4f/);
    assert.match(renderer, /smoothstep\(0\.7, 0\.98/);
    await assertTypeChecks(path.join(temporaryDirectory, "empty-demo"));
    await assertBuilds(path.join(temporaryDirectory, "empty-demo"));
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("renders nothing but an empty Settings panel for the None scene", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "create-vite-webgpu-project-"));

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [cli, "none-demo", "--scene", "none", "--gui"],
      { cwd: temporaryDirectory },
    );
    const projectDirectory = path.join(temporaryDirectory, "none-demo");
    const sourceDirectory = path.join(projectDirectory, "src");
    const packageJson = JSON.parse(await readFile(path.join(projectDirectory, "package.json"), "utf8"));
    const renderer = await readFile(path.join(sourceDirectory, "renderer", "Renderer.ts"), "utf8");
    const guiSetup = await readFile(path.join(sourceDirectory, "gui", "SettingsGui.ts"), "utf8");

    assert.match(
      stdout,
      /Starter: None — blank WebGPU canvas with no rendered content, with a lil-gui Settings panel/,
    );
    assert.equal(packageJson.dependencies["lil-gui"], "^0.21.0");
    assert.deepEqual(await readdir(sourceDirectory), [
      "gui",
      "main.ts",
      "renderer",
      "style.css",
      "utils",
      "webgpu",
    ]);
    assert.doesNotMatch(renderer, /logoTexture|textureSample|createRenderPipeline|pass\.draw/i);
    assert.match(guiSetup, /new GUI\(\{ title: 'Settings' \}\)/);
    assert.doesNotMatch(guiSetup, /gui\.add/);
    await assertTypeChecks(projectDirectory);
    await assertBuilds(projectDirectory);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("refuses to overwrite a non-empty directory", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "create-vite-webgpu-project-"));

  try {
    await writeFile(path.join(temporaryDirectory, "keep.txt"), "do not overwrite\n");
    await assert.rejects(
      execFileAsync(process.execPath, [cli, "."], { cwd: temporaryDirectory }),
      (error) => {
        assert.match(error.stderr, /is not empty/);
        return true;
      },
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
