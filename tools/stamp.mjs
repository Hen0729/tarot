/**
 * 依 js/css 內容產生短 hash，寫入 js/version.js 與 sw.js。
 * 用法：node tools/stamp.mjs
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|css|html)$/.test(name) && !p.endsWith("version.js"))
      files.push(p);
  }
}

walk(join(root, "js"));
walk(join(root, "css"));
files.push(join(root, "index.html"));
files.push(join(root, "sw.js"));

const h = createHash("sha256");
for (const f of files.sort()) {
  if (f.endsWith("sw.js")) continue; // sw 內含版本字串，避免循環
  h.update(readFileSync(f));
  h.update(f);
}
const ver = h.digest("hex").slice(0, 8);

writeFileSync(
  join(root, "js", "version.js"),
  `/** 唯一快取版本：改程式後執行 node tools/stamp.mjs */\nexport const CACHE_VERSION = "${ver}";\n`,
);

const swPath = join(root, "sw.js");
let sw = readFileSync(swPath, "utf8");
sw = sw.replace(
  /const CACHE_VERSION = "[^"]*";/,
  `const CACHE_VERSION = "${ver}";`,
);
writeFileSync(swPath, sw);

console.log("CACHE_VERSION =", ver);
