import { CACHE_VERSION } from "./version.js";
import { installDataGlobals } from "./data.js";
import { installDialogGlobals } from "./dialog.js";

function loadScript(src) {
  return new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => ok();
    s.onerror = () => no(new Error("載入失敗：" + src));
    document.head.appendChild(s);
  });
}

function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  const swUrl = new URL("../sw.js", import.meta.url);
  swUrl.searchParams.set("v", CACHE_VERSION);
  navigator.serviceWorker.register(swUrl.href).catch((e) => {
    console.warn("SW 註冊失敗（檔案協定或非 HTTPS 時可忽略）", e);
  });
}

async function boot() {
  installDataGlobals(window);
  installDialogGlobals(window);

  const v = CACHE_VERSION;
  const base = new URL("./", import.meta.url); // …/js/
  // Firebase compat SDK 已在 index 以一般 script 載入
  const files = ["config.js", "core.js", "spreads.js", "ai.js", "sync.js"];
  for (const f of files) {
    const url = new URL(f, base);
    url.searchParams.set("v", v);
    await loadScript(url.href);
  }

  registerSW();
}

boot().catch((e) => {
  console.error(e);
  const el = document.getElementById("sync-status");
  if (el) {
    el.textContent = "腳本載入失敗：" + (e && e.message ? e.message : e);
    el.dataset.kind = "err";
  }
});
