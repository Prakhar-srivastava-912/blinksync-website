/**
 * Copies the MediaPipe Tasks Vision WASM runtime from node_modules into
 * public/mediapipe/wasm so the app loads it from its own origin instead of a
 * third-party CDN. The folder is git-ignored and re-created on install.
 */
import { cp, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const target = path.join(root, 'public', 'mediapipe', 'wasm');

async function main() {
  if (!existsSync(source)) {
    console.warn('[blinksync] MediaPipe wasm folder not found — run `npm install` first.');
    return;
  }
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });

  const files = (await readdir(target)).filter((name) => name.endsWith('.wasm'));
  console.log(`[blinksync] Copied ${files.length} MediaPipe wasm binaries to public/mediapipe/wasm`);
}

main().catch((error) => {
  console.warn('[blinksync] Could not copy MediaPipe wasm assets:', error.message);
});
