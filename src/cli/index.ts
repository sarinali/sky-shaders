import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Registry lives next to the built CLI in the published package
const REGISTRY_ROOT = path.resolve(__dirname, "..", "src", "registry");

interface RegistryEntry {
  name: string;
  description: string;
  files: string[];
  dependencies: string[];
}

interface Registry {
  components: Record<string, RegistryEntry>;
}

function loadRegistry(): Registry {
  const registryPath = path.join(REGISTRY_ROOT, "index.json");
  if (!fs.existsSync(registryPath)) {
    console.error("Could not find component registry.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(registryPath, "utf-8"));
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function detectTargetDir(): string {
  // Check common component directory conventions
  const candidates = [
    "src/components/ui",
    "src/components",
    "components/ui",
    "components",
    "app/components",
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.resolve(process.cwd(), dir))) {
      return dir;
    }
  }

  return "src/components/ui";
}

async function addCommand(componentName: string) {
  const registry = loadRegistry();
  const entry = registry.components[componentName];

  if (!entry) {
    const available = Object.keys(registry.components).join(", ");
    console.error(`Unknown component: "${componentName}"`);
    console.error(`Available components: ${available}`);
    process.exit(1);
  }

  // Determine output directory
  const detected = detectTargetDir();
  const answer = await prompt(
    `Install to ./${detected}? (Y/n, or type a path): `
  );

  let targetDir: string;
  if (!answer || answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
    targetDir = detected;
  } else if (answer.toLowerCase() === "n" || answer.toLowerCase() === "no") {
    const custom = await prompt("Enter target directory: ");
    targetDir = custom;
  } else {
    targetDir = answer;
  }

  const absTarget = path.resolve(process.cwd(), targetDir);

  // Create directory if needed
  if (!fs.existsSync(absTarget)) {
    fs.mkdirSync(absTarget, { recursive: true });
    console.log(`Created ${targetDir}/`);
  }

  // Copy each file
  for (const file of entry.files) {
    const src = path.join(REGISTRY_ROOT, "components", file);
    const dest = path.join(absTarget, file);

    if (fs.existsSync(dest)) {
      const overwrite = await prompt(`${file} already exists. Overwrite? (y/N): `);
      if (overwrite.toLowerCase() !== "y" && overwrite.toLowerCase() !== "yes") {
        console.log(`Skipped ${file}`);
        continue;
      }
    }

    fs.copyFileSync(src, dest);
    console.log(`Added ${path.join(targetDir, file)}`);
  }

  console.log();
  console.log(`Done! You can now import and use <${entry.name} /> in your project.`);
  console.log(`The source is yours — edit it however you like.`);
}

function listCommand() {
  const registry = loadRegistry();
  console.log("Available components:\n");
  for (const [name, entry] of Object.entries(registry.components)) {
    console.log(`  ${name}`);
    console.log(`    ${entry.description}\n`);
  }
}

function helpText() {
  return `
sky-shaders — Drop-in sky shader components for React.

Usage:
  npx @sarinali/sky-shaders add <ComponentName>   Copy a component into your project
  npx @sarinali/sky-shaders list                  List available components
  npx @sarinali/sky-shaders help                  Show this help message

Examples:
  npx @sarinali/sky-shaders add SkyShader
  npx @sarinali/sky-shaders list
`.trim();
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(helpText());
    process.exit(0);
  }

  if (command === "list" || command === "ls") {
    listCommand();
    process.exit(0);
  }

  if (command === "add") {
    const name = args[1];
    if (!name) {
      console.error("Please specify a component name: npx @sarinali/sky-shaders add <ComponentName>");
      process.exit(1);
    }
    await addCommand(name);
    process.exit(0);
  }

  console.error(`Unknown command: "${command}". Run "npx @sarinali/sky-shaders help" for usage.`);
  process.exit(1);
}

main();
