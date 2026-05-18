import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");
const OUT = path.resolve(process.cwd(), "src/i18n/extracted-strings.json");
const EXT = new Set([".ts", ".tsx"]);

async function walk(dir) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...await walk(full));
    else if (EXT.has(path.extname(item.name))) files.push(full);
  }
  return files;
}

function addCandidate(map, text, file) {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value || value.length < 3) return;
  if (/^[a-z0-9_.:/-]+$/i.test(value)) return;
  if (value.includes("http://") || value.includes("https://")) return;
  const key = value;
  const existing = map.get(key) || new Set();
  existing.add(file);
  map.set(key, existing);
}

function collect(content, relative, map) {
  const attrRegex = /\b(?:placeholder|title|aria-label|label)\s*=\s*["'`]([^"'`]+)["'`]/g;
  let match = attrRegex.exec(content);
  while (match) {
    addCandidate(map, match[1], relative);
    match = attrRegex.exec(content);
  }

  const jsxTextRegex = />\s*([^<>{}\n][^<>{}]*)\s*</g;
  match = jsxTextRegex.exec(content);
  while (match) {
    addCandidate(map, match[1], relative);
    match = jsxTextRegex.exec(content);
  }
}

async function run() {
  const files = await walk(ROOT);
  const map = new Map();
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    collect(source, path.relative(ROOT, file), map);
  }

  const items = [...map.entries()]
    .map(([text, refs]) => ({ text, files: [...refs].sort() }))
    .sort((a, b) => a.text.localeCompare(b.text));

  const out = {
    generated_at: new Date().toISOString(),
    total_strings: items.length,
    items,
  };
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  process.stdout.write(`Extracted ${items.length} UI strings to ${path.relative(process.cwd(), OUT)}\n`);
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
