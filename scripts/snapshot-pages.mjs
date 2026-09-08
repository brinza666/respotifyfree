#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const pub = join(root, ".output/public");
const site = join(root, "site");
const shellPath = join(pub, "_shell.html");
const raw = await readFile(shellPath);
const html = raw.filter((b) => b !== 0);
if (!html.includes(Buffer.from("Respotify"))) {
  throw new Error("SPA shell is missing Respotify markup");
}

await mkdir(join(site, "callback"), { recursive: true });
await writeFile(join(site, "index.html"), html);
await writeFile(join(site, "404.html"), html);
await writeFile(join(site, "callback/index.html"), html);
await writeFile(join(site, ".nojekyll"), "");
await cp(join(pub, "assets"), join(site, "assets"), { recursive: true });
await cp(join(pub, "favicon.svg"), join(site, "favicon.svg"));
await cp(join(pub, "manifest.webmanifest"), join(site, "manifest.webmanifest"));
await writeFile(
  join(site, "README.md"),
  await readFile(join(root, "docs/pages-readme.md")),
);
console.log("Wrote static GitHub Pages site to site/");
