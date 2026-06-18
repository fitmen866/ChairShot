import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = resolve(root, "dist");

if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  const stat = statSync(src);
  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src)) {
      copyRecursive(join(src, entry), join(dest, entry));
    }
    return;
  }
  mkdirSync(resolve(dest, ".."), { recursive: true });
  copyFileSync(src, dest);
}

mkdirSync(dist, { recursive: true });
copyRecursive(resolve(root, "index.html"), resolve(dist, "index.html"));
copyRecursive(resolve(root, "src"), resolve(dist, "src"));
if (existsSync(resolve(root, "assets"))) {
  copyRecursive(resolve(root, "assets"), resolve(dist, "assets"));
}

console.log(`Built static game into ${basename(dist)}/`);
