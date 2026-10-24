/* ===== v6: Firebase 雲端同步 ===== */
      const FIREBASE_CONFIG = window.TAROT_FIREBASE_CONFIG;
      const FIREBASE_AUTH = window.TAROT_FIREBASE_AUTH;
      const sset = store.set.bind(store),
        jstr = (h) => JSON.stringify({ ...h, u: 0 }),
        fbErr = (e) => e && (e.code || e.message || String(e));
      function tnow() {
        return "";
      }
      /** 同步狀態列：busy / ok / err / idle / offline */
      let netOnline =
          typeof navigator === "undefined" ? true : navigator.onLine !== false,
        persistenceOn = false;
      function setSyncStatus(text, kind) {
        const el = document.getElementById("sync-status");
        if (!el) return;
        el.textContent = text || "";
        el.dataset.kind = kind || "idle";
      }
      function offlineStatusText() {
        return persistenceOn ? "離線・使用本機快取" : "離線・僅本機";
      }
      function showIdleSyncStatus() {
        if (!fbConfigured()) {
          setSyncStatus("僅本機（未設定雲端）", "idle");
          return;
        }
        if (!netOnline) {
          setSyncStatus(offlineStatusText(), "offline");
          return;
        }
        if (fbUser) setSyncStatus("已同步", "ok");
        else setSyncStatus("僅本機", "idle");
      }
      function say(msg) {
        if (!msg) {
          showIdleSyncStatus();
          return;
        }
        if (/失敗|錯誤|拒絕|逾時/.test(msg)) {
          console.warn(msg);
          setSyncStatus(msg + " · 點此重試", "err");
          return;
        }
        if (!netOnline && fbConfigured()) {
          // 斷網時忙線訊息改標成離線，避免以為還在上傳成功
          if (/中…|中\.\.\.|上傳|同步|檢查|登入/.test(msg)) {
            setSyncStatus(offlineStatusText() + "（變更會暫存在本機）", "offline");
            return;
          }
        }
        if (/中…|中\.\.\.|上傳|同步|檢查|登入/.test(msg)) {
          setSyncStatus(msg, "busy");
          return;
        }
        setSyncStatus(msg, "ok");
      }
      let fbAuth = null,
        fbDb = null,
        fbSt = null,
        fbUser = null,
        lastS = {},
        lastDelS = {},
        tm = {},
        cfgU = store.get("tarot-cfgu", 0),
        syncing = false,
        deletedHist = store.get("tarot-hist-del", {}) || {};
      if (typeof deletedHist !== "object" || Array.isArray(deletedHist))
        deletedHist = {};
      function markHistDeleted(id) {
        if (id == null) return;
        deletedHist[String(id)] = Date.now();
        sset("tarot-hist-del", deletedHist);
      }
      function clearHistDeleted(id) {
        if (id == null) return;
        delete deletedHist[String(id)];
        delete lastDelS[String(id)];
      }
      function persistHistDeleted() {
        sset("tarot-hist-del", deletedHist);
      }
      function fbConfigured() {
        return !!(
          FIREBASE_CONFIG &&
          FIREBASE_CONFIG.apiKey &&
          !String(FIREBASE_CONFIG.apiKey).startsWith("YOUR_") &&
          FIREBASE_AUTH &&
          FIREBASE_AUTH.email &&
          !String(FIREBASE_AUTH.email).startsWith("YOUR_") &&
          FIREBASE_AUTH.password &&
          !String(FIREBASE_AUTH.password).startsWith("YOUR_")
        );
      }
      function imgPath(key) {
        const i = String(key).indexOf(":");
        if (i < 0) return null;
        return {
          did: key.slice(0, i),
          cid: key.slice(i + 1),
        };
      }
      /** 各牌面上次套用的雲端時間戳（更換圖時 URL 常不變，要靠這個判斷） */
      const imgMetaApplied = {};
      /** Firestore Timestamp / number → millis */
      function fbTime(v) {
        if (v == null) return 0;
        if (typeof v === "number" && isFinite(v)) return v;
        if (typeof v.toMillis === "function") return v.toMillis();
        if (typeof v.seconds === "number")
          return v.seconds * 1000 + (v.nanoseconds || 0) / 1e6;
        return 0;
      }
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      /** 上傳失敗待重試：key → dataUrl */
      const pendingImgRetry = new Map();
      const toastedImgFail = new Set();
      function notifyImgFail(key, msg) {
        console.warn(msg, key);
        if (toastedImgFail.has(key)) return;
        toastedImgFail.add(key);
        if (typeof toast === "function") toast(msg);
      }
      async function noteImgCloud(key, present) {
        const root = userCol();
        if (!root) return;
        try {
          const stamp = present
            ? firebase.firestore.FieldValue.serverTimestamp()
            : firebase.firestore.FieldValue.delete();
          await root
            .collection("meta")
            .doc("imgs")
            .set({ [key]: stamp }, { merge: true });
          if (present) {
            const now = Date.now();
            imgMetaApplied[key] = Math.max(imgMetaApplied[key] || 0, now);
            lastImgMeta[key] = now;
          } else {
            delete imgMetaApplied[key];
            delete lastImgMeta[key];
          }
        } catch (e) {
          console.error("寫入圖片索引失敗", key, e);
          throw e;
        }
      }
      /** 上次看到的 imgs meta（即時同步用，只拉有變的 key） */
      let lastImgMeta = {};
      function imgStorageRefs(did, cid) {
        const base = `users/${fbUser.uid}/${did}/${cid}`;
        return {
          webp: fbSt.ref(base + ".webp"),
          jpg: fbSt.ref(base + ".jpg"),
        };
      }
      function dataUrlContentType(dataUrl) {
        if (String(dataUrl).indexOf("data:image/webp") === 0)
          return "image/webp";
        return "image/jpeg";
      }
      /** 優先 WebP，找不到再試舊版 JPEG */
      async function getImgDownloadUrl(did, cid) {
        const refs = imgStorageRefs(did, cid);
        try {
          return await refs.webp.getDownloadURL();
        } catch (e) {
          if (e && e.code !== "storage/object-not-found") throw e;
        }
        try {
          return await refs.jpg.getDownloadURL();
        } catch (e) {
          if (e && e.code !== "storage/object-not-found") throw e;
        }
        return null;
      }
      async function deleteImgStorageFiles(did, cid) {
        const refs = imgStorageRefs(did, cid);
        for (const ref of [refs.webp, refs.jpg]) {
          try {
            await ref.delete();
          } catch (e) {
            if (e && e.code !== "storage/object-not-found") throw e;
          }
        }
      }
      async function pushImgCloud(key, dataUrl, attempt) {
        attempt = attempt || 0;
        if (!fbUser || !fbSt) {
          pendingImgRetry.set(key, dataUrl);
          console.warn("尚未登入雲端，牌面稍後重試上傳", key);
          return;
        }
        const p = imgPath(key);
        if (!p) return;
        try {
          const type = dataUrlContentType(dataUrl);
          const refs = imgStorageRefs(p.did, p.cid);
          const primary = type === "image/webp" ? refs.webp : refs.jpg;
          await primary.putString(dataUrl, "data_url", {
            contentType: type,
          });
          // 新格式上傳後清掉另一副檔名，避免重複占空間
          const other = primary === refs.webp ? refs.jpg : refs.webp;
          try {
            await other.delete();
          } catch (e) {
            if (e && e.code !== "storage/object-not-found")
              console.warn("清除舊牌面檔失敗", key, e);
          }
          await noteImgCloud(key, true);
          pendingImgRetry.delete(key);
          toastedImgFail.delete(key);
        } catch (e) {
          if (attempt < 3) {
            await sleep(400 * (attempt + 1));
            return pushImgCloud(key, dataUrl, attempt + 1);
          }
          pendingImgRetry.set(key, dataUrl);
          notifyImgFail(key, "牌面上傳雲端失敗，已排入重試");
          throw e;
        }
      }
      async function deleteImgCloud(key, attempt) {
        attempt = attempt || 0;
        if (!fbUser || !fbSt) return;
        const p = imgPath(key);
        if (!p) return;
        try {
          await deleteImgStorageFiles(p.did, p.cid);
          await noteImgCloud(key, false);
        } catch (e) {
          if (attempt < 3) {
            await sleep(400 * (attempt + 1));
            return deleteImgCloud(key, attempt + 1);
          }
          notifyImgFail(key, "牌面雲端刪除失敗，稍後會再試");
          throw e;
        }
      }
      /** 刪牌組時一併清 meta/imgs 對應 key，避免他機以為還有圖 */
      async function clearDeckImgMeta(did) {
        const root = userCol();
        if (!root || !did) return;
        const prefix = did + ":";
        const updates = {};
        new Set([
          ...Object.keys(lastImgMeta || {}),
          ...Object.keys(IMG || {}),
          ...Object.keys(imgMetaApplied || {}),
        ]).forEach((k) => {
          if (!k.startsWith(prefix)) return;
          updates[k] = firebase.firestore.FieldValue.delete();
          delete lastImgMeta[k];
          delete imgMetaApplied[k];
        });
        if (!Object.keys(updates).length) return;
        await root.collection("meta").doc("imgs").set(updates, { merge: true });
      }
      async function deleteDeckCloud(did) {
        if (!fbUser || !fbSt) return;
        try {
          const list = await fbSt.ref(`users/${fbUser.uid}/${did}`).listAll();
          await Promise.all(list.items.map((it) => it.delete()));
        } catch (e) {
          if (e && e.code !== "storage/object-not-found")
            say("牌組圖刪除失敗：" + fbErr(e));
        }
        try {
          await clearDeckImgMeta(did);
        } catch (e) {
          say("牌組圖索引清除失敗：" + fbErr(e));
        }
      }
      async function flushPendingImgRetry() {
        if (!fbUser || !fbSt || !pendingImgRetry.size) return;
        const entries = [...pendingImgRetry.entries()];
        for (const [key, dataUrl] of entries) {
          try {
            await pushImgCloud(key, dataUrl, 0);
          } catch (e) {
            console.warn("重試上傳仍失敗", key, e);
          }
        }
      }
      function withTimeout(promise, ms, label) {
        return Promise.race([
          promise,
          new Promise((_, no) =>
            setTimeout(
              () => no(new Error(label + "逾時（請確認已建立 Firestore／Storage）")),
              ms,
            ),
          ),
        ]);
      }
      async function dropLocalImg(key) {
        delete IMG[key];
        delete imgMetaApplied[key];
        idbOp((s) => s.delete(key));
      }
      function stripImgBust(u) {
        return String(u || "")
          .replace(/[?&]v=\d+/g, "")
          .replace(/\?&/, "?")
          .replace(/[?&]$/, "");
      }
      function bustImgUrl(url, metaTs) {
        if (!metaTs) return url;
        return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + metaTs;
      }
      async function fetchImgToCache(key, itemRef, metaTs) {
        metaTs = typeof metaTs === "number" ? metaTs : 0;
        try {
          const cur = IMG[key];
          const applied = imgMetaApplied[key] || 0;
          // 雲端時間戳比本機新＝他機真的換過圖
          const remoteNewer = !!(metaTs && metaTs > applied);
          if (!remoteNewer) {
            if (
              (typeof pinnedImgs !== "undefined" && pinnedImgs.has(key)) ||
              (typeof cur === "string" && cur.indexOf("data:") === 0)
            )
              return { changed: false, key };
            if (metaTs && applied >= metaTs) return { changed: false, key };
          } else if (typeof pinnedImgs !== "undefined") {
            pinnedImgs.delete(key);
          }
          let url = null;
          if (itemRef) {
            try {
              url = await itemRef.getDownloadURL();
            } catch (e) {
              if (e && e.code !== "storage/object-not-found") throw e;
            }
          }
          if (!url) {
            const p = imgPath(key);
            if (p) url = await getImgDownloadUrl(p.did, p.cid);
          }
          if (!url) {
            if (
              !remoteNewer &&
              typeof pinnedImgs !== "undefined" &&
              pinnedImgs.has(key)
            )
              return { changed: false, key };
            await dropLocalImg(key);
            return { changed: true, key, removed: true };
          }
          const displayUrl = bustImgUrl(url, metaTs);
          // 已是同一張（含僅差 cache bust）：只補時間戳，不改 src，避免進頁閃爍
          const sameSrc =
            cur === displayUrl ||
            cur === url ||
            (cur && stripImgBust(cur) === stripImgBust(url));
          if (sameSrc && !remoteNewer) {
            if (metaTs) imgMetaApplied[key] = Math.max(applied, metaTs);
            return { changed: false, key };
          }
          // 首次進頁：本機已有圖、只是還沒記下 meta → 靜默對齊，不要重載
          if (sameSrc && remoteNewer && applied === 0) {
            const ver = imgVer(cur);
            if (!ver || ver >= metaTs) {
              imgMetaApplied[key] = metaTs;
              if (cur !== displayUrl) idbOp((s) => s.put(displayUrl, key));
              return { changed: false, key };
            }
            // ver < metaTs：本機快取確實偏舊，繼續換新
          }
          if (!remoteNewer && cur === displayUrl) return { changed: false, key };
          IMG[key] = displayUrl;
          imgMetaApplied[key] = metaTs || Date.now();
          idbOp((s) => s.put(displayUrl, key));
          return { changed: true, key };
        } catch (e) {
          console.error("下載牌面失敗", key, e);
          if (typeof pinnedImgs !== "undefined" && pinnedImgs.has(key))
            return { changed: false, key };
          // 暫時下載失敗不要清掉本機圖，避免整排變空白
          return { changed: false, key };
        }
      }
      function ensureDeckForImgKey(key) {
        const p = imgPath(key);
        if (!p) return false;
        if (DECKS.some((d) => d.id === p.did)) return false;
        DECKS.push({
          id: p.did,
          name: p.did === "rws" ? "偉特塔羅" : "雲端牌組",
        });
        if (!CU[p.did]) CU[p.did] = {};
        return true;
      }
      function parseImgMeta(data) {
        const metaTimes = {};
        const keys = new Set();
        Object.entries(data || {}).forEach(([k, v]) => {
          if (!k || k.indexOf(":") < 0) return;
          keys.add(k);
          metaTimes[k] = fbTime(v);
        });
        return { keys, metaTimes };
      }
      async function fetchKeysToCache(keyList, metaTimes) {
        const changedKeys = [];
        const removedKeys = [];
        const results = await Promise.all(
          keyList.map((key) => {
            const p = imgPath(key);
            if (!p) return Promise.resolve({ changed: false, key });
            // itemRef 傳 null：內部會依序試 .webp → .jpg
            return fetchImgToCache(key, null, metaTimes[key] || 0);
          }),
        );
        results.forEach((r) => {
          if (!r || !r.changed) return;
          if (r.removed) removedKeys.push(r.key);
          else changedKeys.push(r.key);
        });
        return { changedKeys, removedKeys };
      }
      /** 即時同步：只處理 meta 有變／新增／刪除的 key，不 listAll 整庫 */
      async function pullImagesFromMeta(metaData) {
        const empty = {
          changed: false,
          changedKeys: [],
          removedKeys: [],
          decksChanged: false,
        };
        if (!fbUser || !fbSt) return empty;
        const { keys: cloudKeys, metaTimes } = parseImgMeta(metaData);
        const removedKeys = [];
        Object.keys(lastImgMeta).forEach((k) => {
          if (cloudKeys.has(k)) return;
          if (typeof pinnedImgs !== "undefined" && pinnedImgs.has(k)) return;
          dropLocalImg(k);
          removedKeys.push(k);
        });
        const toFetch = [...cloudKeys].filter((k) => {
          const ts = metaTimes[k] || 0;
          const applied = imgMetaApplied[k] || 0;
          if (ts > applied) return true;
          if (!IMG[k]) return true;
          return false;
        });
        let decksChanged = false;
        toFetch.forEach((key) => {
          if (ensureDeckForImgKey(key)) decksChanged = true;
        });
        if (decksChanged) {
          sset("tarot-decks", DECKS);
          sset("tarot-custom", CU);
          fillDeckSel();
        }
        const { changedKeys, removedKeys: rem2 } = await fetchKeysToCache(
          toFetch,
          metaTimes,
        );
        rem2.forEach((k) => removedKeys.push(k));
        lastImgMeta = { ...(metaData || {}) };
        return {
          changed: !!(changedKeys.length || removedKeys.length || decksChanged),
          changedKeys,
          removedKeys,
          decksChanged,
        };
      }
      async function pullImages() {
        const empty = {
          changed: false,
          changedKeys: [],
          removedKeys: [],
          decksChanged: false,
        };
        if (!fbUser || !fbSt) return empty;
        const keys = new Set();
        const metaTimes = {};
        let cloudOk = false;
        try {
          const root = userCol();
          if (root) {
            const snap = await root.collection("meta").doc("imgs").get();
            cloudOk = true;
            if (snap.exists) {
              const parsed = parseImgMeta(snap.data());
              parsed.keys.forEach((k) => keys.add(k));
              Object.assign(metaTimes, parsed.metaTimes);
              lastImgMeta = { ...(snap.data() || {}) };
            } else lastImgMeta = {};
          }
        } catch (e) {
          console.error("讀取圖片索引失敗", e);
        }
        try {
          const listed = await withTimeout(
            fbSt.ref(`users/${fbUser.uid}`).listAll(),
            20000,
            "圖片列表",
          );
          cloudOk = true;
          for (const pref of listed.prefixes) {
            const did = pref.name;
            const files = await pref.listAll();
            for (const item of files.items) {
              const cid = item.name.replace(/\.(jpe?g|webp)$/i, "");
              if (cid && cid !== item.name) keys.add(did + ":" + cid);
            }
          }
        } catch (e) {
          console.error("列出 Storage 圖片失敗", e);
        }
        const removedKeys = [];
        if (cloudOk) {
          Object.keys(IMG).forEach((k) => {
            if (!keys.has(k)) {
              if (typeof pinnedImgs !== "undefined" && pinnedImgs.has(k))
                return;
              dropLocalImg(k);
              removedKeys.push(k);
            }
          });
        }
        let decksChanged = false;
        keys.forEach((key) => {
          if (ensureDeckForImgKey(key)) decksChanged = true;
        });
        if (decksChanged) {
          sset("tarot-decks", DECKS);
          sset("tarot-custom", CU);
          fillDeckSel();
        }
        const { changedKeys, removedKeys: rem2 } = await fetchKeysToCache(
          [...keys],
          metaTimes,
        );
        rem2.forEach((k) => removedKeys.push(k));
        return {
          changed: !!(changedKeys.length || removedKeys.length || decksChanged),
          changedKeys,
          removedKeys,
          decksChanged,
        };
      }
      /** 遠端圖有變時只更新那幾張，避免整副牌庫 redraw 讓其他牌也閃 */
      async function applyImgPullResult(result) {
        if (!result || !result.changed) return;
        const items = [];
        [...(result.changedKeys || []), ...(result.removedKeys || [])].forEach(
          (key) => {
            const p = imgPath(key);
            if (!p) return;
            const id = +p.cid;
            if (Number.isNaN(id)) return;
            items.push({ id, did: p.did, key });
          },
        );
        for (const { id, did, key } of items) {
          // 只刷新目前正在看的牌組，避免錯牌組的圖蓋到畫面上
          if (did !== deckId) continue;
          const rev = cur[0] === id ? cur[1] : undefined;
          const gen =
            typeof bumpImgGen === "function" ? bumpImgGen(key) : undefined;
          if (typeof softRefreshView === "function")
            await softRefreshView(id, rev, false, gen);
        }
      }
      function userCol() {
        return fbUser && fbDb
          ? fbDb.collection("users").doc(fbUser.uid)
          : null;
      }
      let pendingHist = false,
        pendingCfg = false;
      async function pushHist() {
        const root = userCol();
        if (!root) return;
        if (syncing) {
          pendingHist = true;
          return;
        }
        try {
          const col = root.collection("hist");
          const seen = new Set();
          for (const h of hist) {
            const id = String(h.id);
            seen.add(id);
            clearHistDeleted(h.id);
            const c = jstr(h);
            if (lastS[h.id] !== c && lastS[id] !== c) {
              h.u = Date.now();
              await col.doc("h" + h.id).set({
                j: JSON.stringify(h),
                id: h.id,
                del: false,
                u: firebase.firestore.FieldValue.serverTimestamp(),
              });
              lastS[h.id] = c;
              lastS[id] = c;
            }
          }
          // 刪除改寫 tombstone，避免他機舊副本把紀錄「復活」
          const delIds = new Set([
            ...Object.keys(deletedHist || {}),
            ...Object.keys(lastS).filter((id) => !seen.has(String(id))),
          ]);
          for (const id of delIds) {
            if (seen.has(String(id))) continue;
            const mark = deletedHist[String(id)] || Date.now();
            deletedHist[String(id)] = mark;
            if (lastDelS[String(id)] === mark) {
              delete lastS[id];
              continue;
            }
            await col.doc("h" + id).set({
              id: isNaN(+id) ? id : +id,
              del: true,
              u: firebase.firestore.FieldValue.serverTimestamp(),
            });
            lastDelS[String(id)] = mark;
            delete lastS[id];
          }
          sset("tarot-hist", hist);
          sset("tarot-hist-del", deletedHist);
          sset("tarot-known", Object.keys(lastS));
          say(tnow());
        } catch (e) {
          say("同步失敗：" + fbErr(e));
        }
      }
      let cfgQuietUntil = 0;
      /** 待上傳的 cfg 欄位（欄位級 merge，避免整包互蓋） */
      const pendingCfgFields = new Set();
      /** 套用雲端設定；回傳 false 或 { cu, cs, decks } */
      function applyCloudCfg(cfg) {
        if (!cfg) return false;
        const remoteU = fbTime(cfg.u);
        if (remoteU && remoteU <= cfgU) return false;
        try {
          const prevCu = JSON.stringify(CU),
            prevCs = JSON.stringify(CS),
            prevDecks = JSON.stringify(DECKS),
            prevDeckId = deckId;
          if (cfg.cu != null) {
            const raw = JSON.parse(cfg.cu || "{}");
            const keys = Object.keys(raw || {});
            CU =
              keys.length && keys.every((k) => /^\d+$/.test(k))
                ? { rws: raw }
                : raw || {};
          }
          if (cfg.cs != null) CS = JSON.parse(cfg.cs || "{}");
          if (cfg.decks) {
            try {
              const ds = JSON.parse(cfg.decks);
              if (Array.isArray(ds) && ds.length) DECKS = ds;
            } catch (e) {
              console.warn("雲端牌組列表解析失敗，保留本機", e);
            }
          }
          if (cfg.deckId && DECKS.some((d) => d.id === cfg.deckId))
            deckId = cfg.deckId;
          else if (!DECKS.some((d) => d.id === deckId))
            deckId = DECKS[0].id;
          if (!CU[deckId]) CU[deckId] = {};
          cfgU = Math.max(cfgU, remoteU || Date.now());
          sset("tarot-custom", CU);
          sset("tarot-cs", CS);
          sset("tarot-decks", DECKS);
          sset("tarot-deck-id", deckId);
          sset("tarot-cfgu", cfgU);
          return {
            cu: JSON.stringify(CU) !== prevCu,
            cs: JSON.stringify(CS) !== prevCs,
            decks:
              JSON.stringify(DECKS) !== prevDecks || deckId !== prevDeckId,
          };
        } catch (e) {
          console.error("套用雲端設定失敗", e);
          return false;
        }
      }
      /** changes: true=整頁刷新；或 { cu, cs, decks } 只動需要的部分（牌義不重繪卡面） */
      function refreshCfgUi(changes) {
        if (changes && changes !== true) {
          if (changes.cs) fillSp();
          if (changes.decks) {
            fillDeckSel();
            redraw();
          }
          if ((changes.cu || changes.decks) && cur[0] != null && !editing)
            show(cur[0], cur[1], { keepImg: true });
          if (changes.cs && !isHidden($("#v-hist"))) renderList();
          return;
        }
        fillSp();
        fillDeckSel();
        redraw();
        refreshView(cur[0], cur[1]);
        if (!isHidden($("#v-hist"))) renderList();
      }
      async function pullCfgLive() {
        const root = userCol();
        if (!root || syncing) return;
        try {
          const snap = await root.collection("meta").doc("cfg").get();
          if (!snap.exists) return;
          if (Date.now() < cfgQuietUntil) {
            cfgU = Math.max(cfgU, fbTime(snap.data().u));
            sset("tarot-cfgu", cfgU);
            return;
          }
          const ch = applyCloudCfg(snap.data());
          if (ch) refreshCfgUi(ch);
        } catch (e) {
          console.error("拉取設定失敗", e);
        }
      }
      /**
       * 上傳設定。預設只寫 pendingCfgFields（欄位 merge）；
       * opts.all 則寫入全部欄位（進頁對齊用）。
       */
      async function pushCfg(opts) {
        const root = userCol();
        if (!root) return;
        if (syncing) {
          pendingCfg = true;
          return;
        }
        const all = !!(opts && opts.all);
        if (!all && !pendingCfgFields.size) return;
        try {
          const toWrite = {
            u: firebase.firestore.FieldValue.serverTimestamp(),
          };
          if (all || pendingCfgFields.has("cu"))
            toWrite.cu = JSON.stringify(CU);
          if (all || pendingCfgFields.has("cs"))
            toWrite.cs = JSON.stringify(CS);
          if (all || pendingCfgFields.has("decks"))
            toWrite.decks = JSON.stringify(DECKS);
          if (all || pendingCfgFields.has("deckId")) toWrite.deckId = deckId;
          pendingCfgFields.clear();
          const localMark = Date.now();
          cfgU = Math.max(cfgU, localMark);
          sset("tarot-cfgu", cfgU);
          cfgQuietUntil = Date.now() + 4000;
          await root.collection("meta").doc("cfg").set(toWrite, { merge: true });
          say(tnow());
        } catch (e) {
          say("同步失敗：" + fbErr(e));
        }
      }
      async function flushPendingCloud() {
        if (pendingCfg) {
          pendingCfg = false;
          await pushCfg();
        }
        if (pendingHist) {
          pendingHist = false;
          await pushHist();
        }
        await flushPendingImgRetry();
      }
      const later = (k, f) => {
        clearTimeout(tm[k]);
        tm[k] = setTimeout(f, 400);
      };
      // 本機一儲存就排程上雲（紀錄／牌義／牌陣／牌組；cfg 只標變更欄位）
      store.set = (k, v) => {
        sset(k, v);
        if (!fbUser) return;
        if (k == "tarot-hist") later("h", pushHist);
        else if (k == "tarot-custom") {
          pendingCfgFields.add("cu");
          later("c", () => pushCfg());
        } else if (k == "tarot-cs") {
          pendingCfgFields.add("cs");
          later("c", () => pushCfg());
        } else if (k == "tarot-decks") {
          pendingCfgFields.add("decks");
          later("c", () => pushCfg());
        } else if (k == "tarot-deck-id") {
          pendingCfgFields.add("deckId");
          later("c", () => pushCfg());
        }
      };
      async function syncAll() {
        const root = userCol();
        if (!root) return;
        if (syncing) return;
        say("同步紀錄中…");
        syncing = true;
        try {
          const cloud = {},
            cloudDel = {};
          const snap = await withTimeout(
            root.collection("hist").get(),
            20000,
            "Firestore",
          );
          snap.forEach((d) => {
            const x = d.data();
            if (!x) return;
            const idRaw =
              x.id != null
                ? x.id
                : String(d.id || "").replace(/^h/, "");
            const id = String(idRaw);
            const u = fbTime(x.u);
            if (x.del) {
              cloudDel[id] = u || 1;
              return;
            }
            if (!x.j) return;
            try {
              const h = JSON.parse(x.j);
              if (h && h.id != null && Array.isArray(h.cards)) {
                h.u = Math.max(h.u || 0, u);
                cloud[String(h.id)] = h;
              }
            } catch (e) {
              console.warn("略過損毀的雲端紀錄", id, e);
            }
          });
          hist = hist.filter((h) => h && h.id != null && Array.isArray(h.cards));
          const out = [];
          const allIds = new Set([
            ...Object.keys(cloud),
            ...Object.keys(cloudDel),
            ...hist.map((h) => String(h.id)),
            ...Object.keys(deletedHist || {}),
          ]);
          allIds.forEach((id) => {
            const c = cloud[id],
              cDelU = cloudDel[id] || 0,
              l = hist.find((x) => String(x.id) == id),
              lDelU = deletedHist[id] || 0,
              lU = (l && l.u) || 0,
              cU = (c && c.u) || 0;
            // 雲端 tombstone：除非本機內容明顯更新，否則維持刪除
            if (cDelU) {
              if (l && lU > cDelU) {
                out.push(l);
                clearHistDeleted(id);
              } else {
                if (l) markHistDeleted(id);
                deletedHist[id] = Math.max(lDelU, cDelU);
              }
              return;
            }
            // 本機已刪且刪除時間 ≥ 雲端內容時間 → 不復活
            if (lDelU && (!c || lDelU >= cU)) {
              return;
            }
            if (c && l) {
              const win = lU > cU ? l : c;
              out.push(win);
              clearHistDeleted(id);
            } else if (c) {
              out.push(c);
              clearHistDeleted(id);
            } else if (l) {
              out.push(l);
            }
          });
          out.sort((a, b) => b.id - a.id);
          hist = out;
          persistHistDeleted();
          lastS = {};
          Object.entries(cloud).forEach(([id, c]) => {
            if (deletedHist[id]) return;
            lastS[id] = jstr(c);
          });
          lastDelS = {};
          Object.keys(deletedHist).forEach((id) => {
            lastDelS[id] = deletedHist[id];
          });
          let cfg = null;
          try {
            const cfgSnap = await withTimeout(
              root.collection("meta").doc("cfg").get(),
              15000,
              "設定",
            );
            if (cfgSnap.exists) cfg = cfgSnap.data();
          } catch (e) {
            console.warn("讀取雲端設定失敗，稍後再試", e);
          }
          let cfgCh = false;
          if (cfg && fbTime(cfg.u) > cfgU) {
            cfgCh = applyCloudCfg(cfg);
          } else if (!cfg || cfgU > fbTime(cfg.u)) {
            say("上傳設定中…");
            syncing = false;
            await pushCfg({ all: true });
            syncing = true;
          }
          say("上傳紀錄中…");
          syncing = false;
          await pushHist();
          syncing = true;
          say("同步圖片中…");
          await flushPendingImgRetry();
          const imgResult = await pullImages();
          // 進頁時若本機已畫過牌面，勿整頁 redraw（會載完再閃一次）
          if (cfgCh) refreshCfgUi(cfgCh);
          else if (imgResult && imgResult.changed)
            await applyImgPullResult(imgResult);
          sset("tarot-hist", hist);
          if (typeof renderList === "function" && !isHidden($("#v-hist")))
            renderList();
          say(tnow());
        } catch (e) {
          say("同步失敗：" + fbErr(e));
        } finally {
          syncing = false;
          flushPendingCloud();
        }
      }
      hist = hist.filter((h) => h && h.id && Array.isArray(h.cards));
      sset("tarot-hist", hist);
      (async () => {
        const statusEl = document.getElementById("sync-status");
        if (statusEl) {
          statusEl.addEventListener("click", () => {
            if (statusEl.dataset.kind !== "err") return;
            if (!fbUser) {
              say("尚未登入雲端");
              return;
            }
            syncAll();
          });
        }
        if (!fbConfigured()) {
          setSyncStatus("僅本機（未設定雲端）", "idle");
          return;
        }
        if (typeof firebase === "undefined") {
          say("Firebase SDK 載入失敗");
          return;
        }
        window.addEventListener("offline", () => {
          netOnline = false;
          showIdleSyncStatus();
        });
        window.addEventListener("online", () => {
          netOnline = true;
          setSyncStatus("網路已恢復，同步中…", "busy");
          if (fbUser) {
            flushPendingCloud()
              .then(() => syncAll())
              .catch((e) => console.warn("恢復連線同步失敗", e));
          } else showIdleSyncStatus();
        });
        if (!netOnline) showIdleSyncStatus();
        else setSyncStatus("連線雲端中…", "busy");
        try {
          if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
          fbAuth = firebase.auth();
          fbDb = firebase.firestore();
          try {
            fbDb.settings({
              ignoreUndefinedProperties: true,
              experimentalForceLongPolling: true,
            });
          } catch (e) {
            // 重複 init／已設定時可能丟錯，可繼續
            console.debug("Firestore settings 略過", e);
          }
          try {
            await fbDb.enablePersistence({ synchronizeTabs: true });
            persistenceOn = true;
          } catch (e) {
            persistenceOn = false;
            if (e && e.code === "failed-precondition") {
              console.warn("多個分頁開啟，此分頁未啟用 Firestore 離線快取");
            } else if (e && e.code === "unimplemented") {
              console.warn("此瀏覽器不支援 Firestore persistence");
            } else {
              console.warn("啟用 Firestore persistence 失敗", e);
            }
          }
          if (!netOnline) showIdleSyncStatus();
          fbSt = firebase.storage();
          async function assertFirestore(u) {
            const token = await u.getIdToken();
            const url =
              "https://firestore.googleapis.com/v1/projects/" +
              FIREBASE_CONFIG.projectId +
              "/databases/(default)/documents/users/" +
              u.uid +
              "/hist";
            const r = await fetch(url, {
              headers: { Authorization: "Bearer " + token },
            });
            const t = await r.text();
            if (r.status === 403) {
              if (/has not been used|is disabled/i.test(t))
                throw new Error(
                  "請先啟用 Cloud Firestore API（Google Cloud 主控台）",
                );
              if (/insufficient permissions|PERMISSION_DENIED/i.test(t))
                throw new Error(
                  "Firestore 規則拒絕存取：請到「規則」分頁允許已登入使用者讀寫",
                );
            }
            if (r.status === 404 && /database/i.test(t))
              throw new Error("請先在 Firebase 建立 Firestore 資料庫");
          }
          let unsubImgs = null,
            unsubCfg = null,
            liveSkip = true,
            cfgLiveSkip = true,
            liveTimer = null;
          async function refreshImgsLive(metaData) {
            if (!fbUser || !fbSt || syncing) return;
            // 有 meta 快照就只拉變更；否則完整拉（切回分頁／定期補拉）
            const result =
              metaData && typeof metaData === "object"
                ? await pullImagesFromMeta(metaData)
                : await pullImages();
            if (!result.changed) return;
            // 不要 redraw() 整頁：其他已有圖的牌會一起閃
            await applyImgPullResult(result);
          }
          // 供本機 idb 還原後補拉（定義在此閉包內，掛到 window）
          window.refreshImgsLive = refreshImgsLive;
          function watchCloudImgs() {
            const root = userCol();
            if (!root) return;
            if (unsubImgs) {
              unsubImgs();
              unsubImgs = null;
            }
            liveSkip = true;
            unsubImgs = root
              .collection("meta")
              .doc("imgs")
              .onSnapshot(
                (snap) => {
                  const data = snap.exists ? snap.data() || {} : {};
                  // 第一次是訂閱當下狀態，syncAll 已拉過，只記 meta
                  if (liveSkip) {
                    liveSkip = false;
                    lastImgMeta = { ...data };
                    return;
                  }
                  refreshImgsLive(data);
                },
                (e) => console.error("圖片即時同步失敗", e),
              );
          }
          function watchCloudCfg() {
            const root = userCol();
            if (!root) return;
            if (unsubCfg) {
              unsubCfg();
              unsubCfg = null;
            }
            cfgLiveSkip = true;
              unsubCfg = root
              .collection("meta")
              .doc("cfg")
              .onSnapshot(
                (snap) => {
                  if (cfgLiveSkip) {
                    cfgLiveSkip = false;
                    return;
                  }
                  if (!snap.exists) return;
                  if (syncing || Date.now() < cfgQuietUntil) {
                    cfgU = Math.max(cfgU, fbTime(snap.data().u));
                    sset("tarot-cfgu", cfgU);
                    return;
                  }
                  const ch = applyCloudCfg(snap.data());
                  if (ch) refreshCfgUi(ch);
                },
                (e) => console.error("設定即時同步失敗", e),
              );
          }
          fbAuth.onAuthStateChanged(async (u) => {
            fbUser = u;
            if (u) {
              say("已登入，檢查雲端…");
              try {
                await assertFirestore(u);
              } catch (e) {
                say("同步失敗：" + fbErr(e));
                return;
              }
              if (
                !cfgU &&
                (Object.keys(CU).length || Object.keys(CS).length)
              ) {
                cfgU = Date.now();
                sset("tarot-cfgu", cfgU);
              }
              await syncAll();
              watchCloudImgs();
              watchCloudCfg();
            } else {
              if (unsubImgs) {
                unsubImgs();
                unsubImgs = null;
              }
              if (unsubCfg) {
                unsubCfg();
                unsubCfg = null;
              }
            }
          });
          // 切回分頁／視窗時再同步（不必整頁刷新）
          document.addEventListener("visibilitychange", () => {
            if (document.hidden || !fbUser || !fbSt || syncing) return;
            flushPendingImgRetry();
            pullCfgLive();
            refreshImgsLive();
          });
          window.addEventListener("focus", () => {
            if (!fbUser || !fbSt || syncing) return;
            flushPendingImgRetry();
            pullCfgLive();
            refreshImgsLive();
          });
          // 頁面開著時定期補拉（即時監聽漏掉時的後備）
          liveTimer = setInterval(() => {
            if (document.hidden || !fbUser || !fbSt || syncing) return;
            flushPendingImgRetry();
            pullCfgLive();
            refreshImgsLive();
          }, 8000);
          try {
            await fbAuth.signInWithEmailAndPassword(
              FIREBASE_AUTH.email,
              FIREBASE_AUTH.password,
            );
          } catch (e) {
            if (e && e.code === "auth/user-not-found") {
              await fbAuth.createUserWithEmailAndPassword(
                FIREBASE_AUTH.email,
                FIREBASE_AUTH.password,
              );
            } else if (e && e.code === "auth/invalid-credential") {
              try {
                await fbAuth.createUserWithEmailAndPassword(
                  FIREBASE_AUTH.email,
                  FIREBASE_AUTH.password,
                );
              } catch (e2) {
                say("雲端登入失敗：" + fbErr(e));
              }
            } else {
              say("雲端登入失敗：" + fbErr(e));
            }
          }
        } catch (e) {
          say("雲端初始化失敗：" + fbErr(e));
        }
      })();
      renderList();
