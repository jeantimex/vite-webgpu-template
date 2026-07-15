#!/usr/bin/env node

import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = process.argv[2];

if (argument === "--help" || argument === "-h") {
  console.log(`Usage: npm create vite-webgpu-project <project-directory>

Example:
  npm create vite-webgpu-project my-project`);
  process.exit(0);
}

if (!argument || argument.startsWith("-")) {
  console.error("Please provide a project directory.\n\nUsage: npm create vite-webgpu-project <project-directory>");
  process.exit(1);
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

let createdDirectory = false;

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

  await Promise.all([
    cp(path.join(packageRoot, "src"), path.join(targetDirectory, "src"), { recursive: true }),
    cp(path.join(packageRoot, "index.html"), path.join(targetDirectory, "index.html")),
    cp(path.join(packageRoot, "tsconfig.json"), path.join(targetDirectory, "tsconfig.json")),
    cp(path.join(packageRoot, "template", "README.md"), path.join(targetDirectory, "README.md")),
    writeFile(path.join(targetDirectory, "package.json"), `${JSON.stringify(projectPackage, null, 2)}\n`),
    writeFile(path.join(targetDirectory, ".gitignore"), "node_modules\ndist\n.DS_Store\n"),
  ]);

  const shownDirectory = path.relative(process.cwd(), targetDirectory) || ".";
  console.log(`\nCreated ${packageName} in ${targetDirectory}\n`);
  console.log("Next steps:");
  if (shownDirectory !== ".") {
    console.log(`  cd ${shownDirectory}`);
  }
  console.log("  npm install");
  console.log("  npm run dev\n");
} catch (error) {
  if (createdDirectory) {
    await rm(targetDirectory, { recursive: true, force: true });
  }
  console.error(`Failed to create project: ${error.message}`);
  process.exit(1);
}
