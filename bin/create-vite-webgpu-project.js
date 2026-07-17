#!/usr/bin/env node

import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npm create vite-webgpu-project <project-directory>

Options:
  --scene <default|cube|sphere|none>  Choose what the starter renders
  --rotate                      Animate the selected shape
  --no-rotate                   Keep the selected shape stationary
  --gui                         Install lil-gui and add a Settings panel
  --no-gui                      Do not add runtime controls
  --install                     Install project dependencies
  --no-install                  Skip dependency installation

Example:
  npm create vite-webgpu-project my-project
  npm create vite-webgpu-project my-project -- --scene sphere --no-rotate --gui`);
  process.exit(0);
}

let argument;
let selectedShape;
let rotate;
let addGui;
let installDependencies;

for (let index = 0; index < args.length; index++) {
  const value = args[index];

  if (value === "--scene") {
    selectedShape = args[++index];
    if (!selectedShape) fail("--scene requires default, cube, sphere, or none.");
  } else if (value === "--rotate") {
    rotate = true;
  } else if (value === "--no-rotate") {
    rotate = false;
  } else if (value === "--gui") {
    addGui = true;
  } else if (value === "--no-gui") {
    addGui = false;
  } else if (value === "--install") {
    installDependencies = true;
  } else if (value === "--no-install") {
    installDependencies = false;
  } else if (value.startsWith("-")) {
    fail(`Unknown option: ${value}`);
  } else if (argument) {
    fail("Please provide only one project directory.");
  } else {
    argument = value;
  }
}

if (!argument || argument.startsWith("-")) {
  fail("Please provide a project directory.");
}

if (selectedShape && !["default", "cube", "sphere", "none"].includes(selectedShape)) {
  fail(`Unknown scene "${selectedShape}". Choose default, cube, sphere, or none.`);
}

const targetDirectory = path.resolve(process.cwd(), argument);
const directoryName = path.basename(targetDirectory);
const packageName = directoryName.toLowerCase().replace(/\s+/g, "-");

if (!/^[a-z0-9][a-z0-9._-]*$/.test(packageName) || packageName.length > 214) {
  console.error(`Cannot use "${directoryName}" as an npm package name.`);
  process.exit(1);
}

const projectPackage = {
  name: packageName,
  private: true,
  version: "0.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "tsc && vite build",
    preview: "vite preview",
  },
  devDependencies: {
    "@webgpu/types": "^0.1.64",
    typescript: "^5.8.3",
    vite: "^6.2.6",
  },
};

if (process.stdin.isTTY && process.stdout.isTTY) {
  const prompts = createInterface({ input: process.stdin, output: process.stdout });
  try {
    selectedShape ??= await promptForShape(prompts);
    if (selectedShape === "cube" || selectedShape === "sphere") {
      rotate ??= await promptForBoolean(prompts, "Rotate the shape?", true);
    }
    addGui ??= await promptForBoolean(prompts, "Install lil-gui?", true);
    installDependencies ??= await promptForBoolean(prompts, "Install dependencies now?", true);
  } finally {
    prompts.close();
  }
}

selectedShape ??= "default";
rotate = selectedShape === "cube" || selectedShape === "sphere" ? (rotate ?? true) : false;
addGui ??= true;
installDependencies ??= true;

if (addGui) {
  projectPackage.dependencies = { "lil-gui": "^0.21.0" };
}

let createdDirectory = false;
let scaffoldComplete = false;

try {
  try {
    const entries = await readdir(targetDirectory);
    if (entries.length > 0) {
      throw new Error(`Target directory "${argument}" is not empty.`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await mkdir(targetDirectory, { recursive: true });
    createdDirectory = true;
  }

  await cp(path.join(packageRoot, "src"), path.join(targetDirectory, "src"), { recursive: true });
  await customizeGeneratedSource();
  await mkdir(path.join(targetDirectory, "public"));
  await Promise.all([
    cp(path.join(packageRoot, "index.html"), path.join(targetDirectory, "index.html")),
    cp(path.join(packageRoot, "tsconfig.json"), path.join(targetDirectory, "tsconfig.json")),
    cp(
      path.join(packageRoot, "template", "assets", "webgpu.ico"),
      path.join(targetDirectory, "public", "favicon.ico"),
    ),
    cp(
      path.join(
        packageRoot,
        "template",
        getReadmeVariant(),
        "README.md",
      ),
      path.join(targetDirectory, "README.md"),
    ),
    writeFile(path.join(targetDirectory, "package.json"), `${JSON.stringify(projectPackage, null, 2)}\n`),
    writeFile(path.join(targetDirectory, ".gitignore"), "node_modules\ndist\n.DS_Store\n"),
  ]);
  scaffoldComplete = true;

  const shownDirectory = path.isAbsolute(argument)
    ? targetDirectory
    : (path.relative(process.cwd(), targetDirectory) || ".");
  console.log(`\nCreated ${packageName} in ${targetDirectory}`);
  console.log(`Starter: ${describeDemo()}\n`);
  if (installDependencies) {
    console.log("Installing dependencies...\n");
    await runNpmInstall();
    console.log("\nDependencies installed.\n");
  }
  console.log("Next steps:");
  if (shownDirectory !== ".") {
    console.log(`  cd ${shownDirectory}`);
  }
  if (!installDependencies) console.log("  npm install");
  console.log("  npm run dev\n");
} catch (error) {
  if (createdDirectory && !scaffoldComplete) {
    await rm(targetDirectory, { recursive: true, force: true });
  }
  console.error(
    scaffoldComplete
      ? `Project created, but dependency installation failed: ${error.message}`
      : `Failed to create project: ${error.message}`,
  );
  process.exit(1);
}

async function promptForShape(prompts) {
  while (true) {
    const answer = (await prompts.question(
      "What should the starter render? [1] Default  [2] Cube  [3] Sphere  [4] None (1): ",
    )).trim().toLowerCase();

    if (
      answer === "" || answer === "1" || answer === "default"
    ) return "default";
    if (answer === "2" || answer === "cube") return "cube";
    if (answer === "3" || answer === "sphere") return "sphere";
    if (answer === "4" || answer === "none" || answer === "nothing") return "none";
    console.log("Please choose 1, 2, 3, or 4.");
  }
}

async function promptForBoolean(prompts, question, defaultValue) {
  const hint = defaultValue ? "Y/n" : "y/N";
  while (true) {
    const answer = (await prompts.question(`${question} (${hint}): `)).trim().toLowerCase();
    if (answer === "") return defaultValue;
    if (answer === "y" || answer === "yes") return true;
    if (answer === "n" || answer === "no") return false;
    console.log("Please answer yes or no.");
  }
}

function describeDemo() {
  if (selectedShape === "default") {
    const description = "Default — centered WebGPU logo rendered on the GPU";
    return addGui ? `${description}, with a lil-gui Settings panel` : description;
  }
  if (selectedShape === "none") {
    const description = "None — blank WebGPU canvas with no rendered content";
    return addGui ? `${description}, with a lil-gui Settings panel` : description;
  }
  const description = `${rotate ? "rotating" : "stationary"} solid ${selectedShape}`;
  return addGui ? `${description} with lil-gui controls` : description;
}

function fail(message) {
  console.error(`${message}\n\nUsage: npm create vite-webgpu-project <project-directory> [options]`);
  process.exit(1);
}

async function runNpmInstall() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  await new Promise((resolve, reject) => {
    const child = spawn(npmCommand, ["install"], {
      cwd: targetDirectory,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(
          signal
            ? `npm install was terminated by ${signal}.`
            : `npm install exited with code ${code}.`,
        ));
      }
    });
  });
}

async function customizeGeneratedSource() {
  const sourceDirectory = path.join(targetDirectory, "src");
  await rm(path.join(sourceDirectory, "demoConfig.ts"));

  if (selectedShape === "none") {
    await customizeNoneSource(sourceDirectory);
    return;
  }

  if (selectedShape === "default") {
    await mkdir(path.join(sourceDirectory, "assets"));
    if (addGui) await mkdir(path.join(sourceDirectory, "gui"));
    const emptyProjectTasks = [
      rm(path.join(sourceDirectory, "camera"), { recursive: true }),
      rm(path.join(sourceDirectory, "input"), { recursive: true }),
      rm(path.join(sourceDirectory, "math"), { recursive: true }),
      rm(path.join(sourceDirectory, "scene"), { recursive: true }),
      rm(path.join(sourceDirectory, "renderer", "mesh_shader.ts")),
      cp(
        path.join(packageRoot, "template", addGui ? "empty-gui" : "empty", "main.ts"),
        path.join(sourceDirectory, "main.ts"),
      ),
      cp(path.join(packageRoot, "template", "empty", "style.css"), path.join(sourceDirectory, "style.css")),
      cp(
        path.join(packageRoot, "template", "assets", "webgpu.svg"),
        path.join(sourceDirectory, "assets", "webgpu.svg"),
      ),
      cp(
        path.join(packageRoot, "template", "empty", "Renderer.ts"),
        path.join(sourceDirectory, "renderer", "renderer.ts"),
      ),
    ];
    if (addGui) {
      emptyProjectTasks.push(
        cp(
          path.join(packageRoot, "template", "empty-gui", "SettingsGui.ts"),
          path.join(sourceDirectory, "gui", "settings_gui.ts"),
        ),
      );
    }
    await Promise.all(emptyProjectTasks);
    return;
  }

  await Promise.all([
    rm(path.join(sourceDirectory, "scene", "cube.ts")),
    rm(path.join(sourceDirectory, "scene", "sphere.ts")),
    cp(path.join(packageRoot, "template", "shape", "main.ts"), path.join(sourceDirectory, "main.ts")),
  ]);

  if (addGui) {
    await customizeGuiSource(sourceDirectory);
    return;
  }

  const rendererTemplate = await readFile(
    path.join(packageRoot, "template", "shape", "Renderer.ts"),
    "utf8",
  );
  const mathImport = rotate
    ? "import { multiply, perspective, rotationX, rotationY } from '../math/mat4';"
    : "import { multiply, perspective } from '../math/mat4';";
  const mvpCode = rotate
    ? `    const model = multiply(rotationY(time * 0.0007), rotationX(time * 0.0004));
    const mvp = multiply(projection, multiply(view, model));`
    : "    const mvp = multiply(projection, view);";
  const rendererSource = rendererTemplate
    .replace("__MATH_IMPORT__", mathImport)
    .replace("__TOPOLOGY__", "triangle-list")
    .replace("__CULL_MODE__", "back")
    .replace("__TIME_PARAMETER__", rotate ? "time" : "_time")
    .replace("__MVP_CODE__", mvpCode);

  let shapeSource = await readFile(
    path.join(packageRoot, "template", "shape", selectedShape === "cube" ? "Cube.ts" : "Sphere.ts"),
    "utf8",
  );

  if (selectedShape === "cube") {
    const solidIndices = `  0, 1, 2, 0, 2, 3,
  1, 5, 6, 1, 6, 2,
  5, 4, 7, 5, 7, 6,
  4, 0, 3, 4, 3, 7,
  3, 2, 6, 3, 6, 7,
  4, 5, 1, 4, 1, 0,`;
    shapeSource = shapeSource.replace("__INDICES__", solidIndices);
  } else {
    const triangleIndexCode = `  for (let latitude = 0; latitude < LATITUDE_SEGMENTS; latitude++) {
    for (let longitude = 0; longitude < LONGITUDE_SEGMENTS; longitude++) {
      const topLeft = latitude * rowSize + longitude;
      const bottomLeft = topLeft + rowSize;
      indices.push(topLeft, bottomLeft, topLeft + 1, topLeft + 1, bottomLeft, bottomLeft + 1);
    }
  }
`;
    shapeSource = shapeSource
      .replace("__LINE_INDEX_CODE__", "")
      .replace("__TRIANGLE_INDEX_CODE__", triangleIndexCode);
  }

  await Promise.all([
    writeFile(path.join(sourceDirectory, "renderer", "renderer.ts"), rendererSource),
    writeFile(path.join(sourceDirectory, "scene", "shape.ts"), shapeSource),
  ]);
}

function getReadmeVariant() {
  if (selectedShape === "default") return addGui ? "empty-gui" : "empty";
  if (selectedShape === "none") return addGui ? "none-gui" : "none";
  return addGui ? "gui" : "shape";
}

async function customizeNoneSource(sourceDirectory) {
  if (addGui) await mkdir(path.join(sourceDirectory, "gui"));
  const tasks = [
    rm(path.join(sourceDirectory, "camera"), { recursive: true }),
    rm(path.join(sourceDirectory, "input"), { recursive: true }),
    rm(path.join(sourceDirectory, "math"), { recursive: true }),
    rm(path.join(sourceDirectory, "scene"), { recursive: true }),
    rm(path.join(sourceDirectory, "renderer", "mesh_shader.ts")),
    cp(
      path.join(packageRoot, "template", addGui ? "none-gui" : "none", "main.ts"),
      path.join(sourceDirectory, "main.ts"),
    ),
    cp(path.join(packageRoot, "template", "empty", "style.css"), path.join(sourceDirectory, "style.css")),
    cp(
      path.join(packageRoot, "template", "none", "Renderer.ts"),
      path.join(sourceDirectory, "renderer", "renderer.ts"),
    ),
  ];
  if (addGui) {
    tasks.push(
      cp(
        path.join(packageRoot, "template", "none-gui", "SettingsGui.ts"),
        path.join(sourceDirectory, "gui", "settings_gui.ts"),
      ),
    );
  }
  await Promise.all(tasks);
}

async function customizeGuiSource(sourceDirectory) {
  const guiTemplateDirectory = path.join(packageRoot, "template", "gui");
  await mkdir(path.join(sourceDirectory, "gui"));
  const rendererTemplate = await readFile(path.join(guiTemplateDirectory, "Renderer.ts"), "utf8");
  const rendererSource = rendererTemplate
    .replace("__INITIAL_WIREFRAME__", "false")
    .replace("__INITIAL_ROTATE__", String(rotate));

  await Promise.all([
    cp(path.join(guiTemplateDirectory, "Mesh.ts"), path.join(sourceDirectory, "scene", "mesh.ts")),
    cp(path.join(guiTemplateDirectory, "SettingsGui.ts"), path.join(sourceDirectory, "gui", "settings_gui.ts")),
    cp(
      path.join(guiTemplateDirectory, selectedShape === "cube" ? "Cube.ts" : "Sphere.ts"),
      path.join(sourceDirectory, "scene", "shape.ts"),
    ),
    cp(path.join(guiTemplateDirectory, "meshShader.ts"), path.join(sourceDirectory, "renderer", "mesh_shader.ts")),
    writeFile(path.join(sourceDirectory, "renderer", "renderer.ts"), rendererSource),
  ]);
}
