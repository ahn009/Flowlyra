import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");
const OUT = path.resolve(process.cwd(), "src/i18n/extracted-keys.json");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

async function walk(dir) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...await walk(full));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(path.extname(item.name))) files.push(full);
  }
  return files;
}

function collectKeys(source) {
  const keys = [];
  const regex = /\bt\(\s*["'`]([^"'`]+)["'`]/g;
  let match = regex.exec(source);
  while (match) {
    keys.push(match[1]);
    match = regex.exec(source);
  }
  return keys;
}

async function run() {
  const files = await walk(ROOT);
  const keyMap = new Map();

  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    for (const key of collectKeys(source)) {
      const current = keyMap.get(key) || [];
      current.push(path.relative(ROOT, file));
      keyMap.set(key, current);
    }
  }

  const sortedKeys = [...keyMap.keys()].sort((a, b) => a.localeCompare(b));
  const output = {
    generated_at: new Date().toISOString(),
    total_keys: sortedKeys.length,
    keys: sortedKeys.map((key) => ({
      key,
      files: [...new Set(keyMap.get(key))].sort(),
    })),
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  process.stdout.write(`Extracted ${sortedKeys.length} i18n keys to ${path.relative(process.cwd(), OUT)}\n`);
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
