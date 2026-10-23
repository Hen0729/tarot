/* ===== 備份：JSON 匯出／匯入，匯入後同步雲端 ===== */
(function () {
  const VERSION = 1;

  function localImgs() {
    const out = {};
    Object.keys(IMG || {}).forEach((k) => {
      const v = IMG[k];
      if (typeof v === "string" && v.indexOf("data:") === 0) out[k] = v;
    });
    return out;
  }

  function buildBackup() {
    return {
      app: "tarot-web",
      version: VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        hist: hist || [],
        custom: CU || {},
        spreads: typeof CS !== "undefined" ? CS : {},
        decks: DECKS || [],
        deckId: deckId,
        lay: store.get("tarot-lay", true),
        imgs: localImgs(),
      },
    };
  }

  function downloadJson(obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = URL.createObjectURL(blob);
    a.download = "tarot-backup-" + stamp + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function restoreImgs(imgs) {
    if (!imgs || typeof imgs !== "object") return 0;
    let n = 0;
    for (const key of Object.keys(imgs)) {
      const v = imgs[key];
      if (typeof v !== "string" || v.indexOf("data:") !== 0) continue;
      if (!key.includes(":")) continue;
      IMG[key] = v;
      try {
        await idbOp((s) => s.put(v, key));
      } catch (e) {}
      if (typeof pushImgCloud === "function") {
        try {
          await pushImgCloud(key, v);
        } catch (e) {
          console.warn("牌面上傳雲端失敗", key, e);
        }
      }
      n++;
    }
    return n;
  }

  async function applyBackup(payload) {
    const d = payload && payload.data;
    if (!d || !Array.isArray(d.hist)) throw new Error("備份格式不正確");

    hist = d.hist.filter((h) => h && h.id && Array.isArray(h.cards));
    CU =
      d.custom && typeof d.custom === "object"
        ? d.custom
        : { [deckId || "rws"]: {} };
    if (typeof CS !== "undefined")
      CS = d.spreads && typeof d.spreads === "object" ? d.spreads : {};
    if (Array.isArray(d.decks) && d.decks.length) DECKS = d.decks;
    if (d.deckId && DECKS.some((x) => x.id === d.deckId)) deckId = d.deckId;
    else deckId = DECKS[0].id;
    if (!CU[deckId]) CU[deckId] = {};

    store.set("tarot-hist", hist);
    store.set("tarot-custom", CU);
    store.set("tarot-cs", typeof CS !== "undefined" ? CS : {});
    store.set("tarot-decks", DECKS);
    store.set("tarot-deck-id", deckId);
    if (typeof d.lay === "boolean") {
      store.set("tarot-lay", d.lay);
      if ($("#lay")) $("#lay").checked = d.lay;
    }

    const imgN = await restoreImgs(d.imgs);

    if (typeof fillSp === "function") fillSp();
    if (typeof fillDeckSel === "function") fillDeckSel();
    if (typeof redraw === "function") redraw();
    if (typeof renderList === "function") renderList();

    if (typeof say === "function") say("匯入完成，正在同步雲端…");
    if (typeof syncAll === "function" && typeof fbUser !== "undefined" && fbUser) {
      try {
        await syncAll();
      } catch (e) {
        if (typeof say === "function")
          say("本機已匯入，雲端同步失敗：" + (e.message || e));
        return imgN;
      }
    } else if (typeof say === "function") {
      say("本機已匯入" + (imgN ? "（含 " + imgN + " 張牌面）" : "") + "；登入後會再同步雲端");
    }
    return imgN;
  }

  function wire() {
    if (!$("#bexp") || !$("#bimp") || !$("#bf")) return;
    $("#bexp").onclick = () => {
      try {
        downloadJson(buildBackup());
        if (typeof say === "function") say("已下載備份檔");
      } catch (e) {
        alert("匯出失敗：" + (e.message || e));
      }
    };
    $("#bimp").onclick = () => $("#bf").click();
    $("#bf").onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!f) return;
      if (
        !confirm(
          "匯入會覆寫本機的紀錄、牌義、牌陣與牌組設定，並盡量同步到雲端。確定繼續？",
        )
      )
        return;
      try {
        const text = await f.text();
        const payload = JSON.parse(text);
        if (payload.app && payload.app !== "tarot-web")
          throw new Error("不是本應用的備份檔");
        await applyBackup(payload);
      } catch (err) {
        alert("匯入失敗：" + (err.message || err));
        if (typeof say === "function") say("匯入失敗：" + (err.message || err));
      }
    };
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
