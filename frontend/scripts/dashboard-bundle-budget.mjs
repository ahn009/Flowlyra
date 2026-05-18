import { gzipSync } from "node:zlib";
import { promises as fs } from "node:fs";
import path from "node:path";

const distAssets = path.resolve(process.cwd(), "dist/assets");
const maxEntryGzipBytes = 330 * 1024;
const minJsChunks = 8;

async function run() {
  const files = await fs.readdir(distAssets);
  const jsFiles = files.filter((name) => name.endsWith(".js")).sort();
  if (!jsFiles.length) throw new Error("No JS assets found. Run npm run build first.");

  let biggest = { name: "", gzip: 0, raw: 0 };
  for (const file of jsFiles) {
    const full = path.join(distAssets, file);
    const content = await fs.readFile(full);
    const gz = gzipSync(content).byteLength;
    if (gz > biggest.gzip) biggest = { name: file, gzip: gz, raw: content.byteLength };
  }

  const passedSize = biggest.gzip <= maxEntryGzipBytes;
  const passedChunks = jsFiles.length >= minJsChunks;

  process.stdout.write(`JS chunks: ${jsFiles.length}\n`);
  process.stdout.write(`Largest chunk: ${biggest.name} raw=${biggest.raw}B gzip=${biggest.gzip}B\n`);
  process.stdout.write(`Budget: gzip <= ${maxEntryGzipBytes}B, chunks >= ${minJsChunks}\n`);

  if (!passedSize || !passedChunks) {
    process.stderr.write("Dashboard performance budget failed.\n");
    process.exit(1);
  }
  process.stdout.write("Dashboard performance budget passed.\n");
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
