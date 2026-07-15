import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import test from "node:test";

const execFileAsync = promisify(execFile);
const cli = path.resolve("bin/create-vite-webgpu-project.js");

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
    assert.deepEqual(await readdir(path.join(projectDirectory, "src", "renderer")), [
      "Renderer.ts",
      "cubeShader.ts",
    ]);
    assert.match(await readFile(path.join(projectDirectory, ".gitignore"), "utf8"), /node_modules/);
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
