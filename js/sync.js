/* ===== v6: Firebase 雲端同步 ===== */
      const FIREBASE_CONFIG = window.TAROT_FIREBASE_CONFIG;
      const FIREBASE_AUTH = window.TAROT_FIREBASE_AUTH;
      const sset = store.set.bind(store),
        jstr = (h) => JSON.stringify({ ...h, u: 0 }),
        fbErr = (e) => e && (e.code || e.message || String(e));
      function tnow() {
        return "";
      }
      // 同步狀態不顯示在畫面上（仍可在 console 看錯誤）
      function say(msg) {
        if (msg && /失敗|錯誤|拒絕|逾時/.test(msg)) console.warn(msg);
      }
      let fbAuth = null,
        fbDb = null,
        fbSt = null,
        fbUser = null,
        lastS = {},
        tm = {},
        cfgU = store.get("tarot-cfgu", 0),
        syncing = false;
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
      async function noteImgCloud(key, present, ts) {
        const root = userCol();
        if (!root) return;
        try {
          const stamp = present
            ? typeof ts === "number"
              ? ts
              : Date.now()
            : firebase.firestore.FieldValue.delete();
          await root
            .collection("meta")
            .doc("imgs")
            .set({ [key]: stamp }, { merge: true });
          if (present && typeof stamp === "number")
            imgMetaApplied[key] = Math.max(imgMetaApplied[key] || 0, stamp);
        } catch (e) {
          console.error("寫入圖片索引失敗", key, e);
        }
      }
      /** 上次看到的 imgs meta（即時同步用，只拉有變的 key） */
      let lastImgMeta = {};
      async function pushImgCloud(key, dataUrl) {
        if (!fbUser || !fbSt) {
          console.warn("尚未登入雲端，牌面只存在本機", key);
          return;
        }
        const p = imgPath(key);
        if (!p) return;
        const ref = fbSt.ref(`users/${fbUser.uid}/${p.did}/${p.cid}.jpg`);
        await ref.putString(dataUrl, "data_url", {
          contentType: "image/jpeg",
        });
        const ts = Date.now();
        await noteImgCloud(key, true, ts);
        lastImgMeta[key] = ts;
      }
      async function deleteImgCloud(key) {
        if (!fbUser || !fbSt) return;
        const p = imgPath(key);
        if (!p) return;
        try {
          await fbSt
            .ref(`users/${fbUser.uid}/${p.did}/${p.cid}.jpg`)
            .delete();
        } catch (e) {
          if (e && e.code !== "storage/object-not-found") throw e;
        }
        await noteImgCloud(key, false);
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
      async function fetchImgToCache(key, itemRef, metaTs) {
        metaTs = typeof metaTs === "number" ? metaTs : 0;
        try {
          const cur = IMG[key];
          const applied = imgMetaApplied[key] || 0;
          // 雲端時間戳更新＝他機更換過：強制改抓，可蓋掉本機 data URL／pin
          const forceCloud = !!(metaTs && metaTs > applied);
          if (!forceCloud) {
            if (
              (typeof pinnedImgs !== "undefined" && pinnedImgs.has(key)) ||
              (typeof cur === "string" && cur.indexOf("data:") === 0)
            )
              return { changed: false, key };
            if (metaTs && applied >= metaTs) return { changed: false, key };
          } else if (typeof pinnedImgs !== "undefined") {
            pinnedImgs.delete(key);
          }
          const url = await itemRef.getDownloadURL();
          if (!url) {
            if (
              !forceCloud &&
              typeof pinnedImgs !== "undefined" &&
              pinnedImgs.has(key)
            )
              return { changed: false, key };
            await dropLocalImg(key);
            return { changed: true, key, removed: true };
          }
          const displayUrl = metaTs
            ? url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + metaTs
            : url;
          if (!forceCloud) {
            if (IMG[key] === displayUrl || IMG[key] === url)
              return { changed: false, key };
            if (
              !metaTs &&
              typeof IMG[key] === "string" &&
              IMG[key].indexOf(url) === 0
            )
              return { changed: false, key };
          }
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
          metaTimes[k] = typeof v === "number" ? v : 0;
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
            return fetchImgToCache(
              key,
              fbSt.ref(`users/${fbUser.uid}/${p.did}/${p.cid}.jpg`),
              metaTimes[key] || 0,
            );
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
              const cid = item.name.replace(/\.jpe?g$/i, "");
              keys.add(did + ":" + cid);
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
            items.push({ id, did: p.did });
          },
        );
        for (const { id, did } of items) {
          // 只刷新目前正在看的牌組，避免錯牌組的圖蓋到畫面上
          if (did !== deckId) continue;
          const rev = cur[0] === id ? cur[1] : undefined;
          if (typeof softRefreshView === "function")
            await softRefreshView(id, rev);
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
            seen.add(String(h.id));
            const c = jstr(h);
            if (lastS[h.id] !== c) {
              h.u = Date.now();
              await col.doc("h" + h.id).set({ j: JSON.stringify(h), u: h.u });
              lastS[h.id] = c;
            }
          }
          for (const id of Object.keys(lastS))
            if (!seen.has(id)) {
              await col.doc("h" + id).delete();
              delete lastS[id];
            }
          sset("tarot-hist", hist);
          sset("tarot-known", Object.keys(lastS));
          say(tnow());
        } catch (e) {
          say("同步失敗：" + fbErr(e));
        }
      }
      let cfgQuietUntil = 0;
      /** 套用雲端設定（牌義／牌陣／牌組類別）；回傳是否有更新 */
      function applyCloudCfg(cfg) {
        if (!cfg || (cfg.u || 0) <= cfgU) return false;
        try {
          const raw = JSON.parse(cfg.cu || "{}");
          const keys = Object.keys(raw || {});
          CU =
            keys.length && keys.every((k) => /^\d+$/.test(k))
              ? { rws: raw }
              : raw || {};
          CS = JSON.parse(cfg.cs || "{}");
          if (cfg.decks) {
            try {
              const ds = JSON.parse(cfg.decks);
              if (Array.isArray(ds) && ds.length) DECKS = ds;
            } catch (e) {}
          }
          if (cfg.deckId && DECKS.some((d) => d.id === cfg.deckId))
            deckId = cfg.deckId;
          else if (!DECKS.some((d) => d.id === deckId))
            deckId = DECKS[0].id;
          if (!CU[deckId]) CU[deckId] = {};
          cfgU = cfg.u;
          sset("tarot-custom", CU);
          sset("tarot-cs", CS);
          sset("tarot-decks", DECKS);
          sset("tarot-deck-id", deckId);
          sset("tarot-cfgu", cfgU);
          return true;
        } catch (e) {
          console.error("套用雲端設定失敗", e);
          return false;
        }
      }
      function refreshCfgUi() {
        fillSp();
        fillDeckSel();
        redraw();
        refreshView(cur[0], cur[1]);
        if (!$("#v-hist").classList.contains("hide")) renderList();
      }
      async function pullCfgLive() {
        const root = userCol();
        if (!root || syncing) return;
        if (Date.now() < cfgQuietUntil) return;
        try {
          const snap = await root.collection("meta").doc("cfg").get();
          if (!snap.exists) return;
          if (applyCloudCfg(snap.data())) refreshCfgUi();
        } catch (e) {
          console.error("拉取設定失敗", e);
        }
      }
      async function pushCfg() {
        const root = userCol();
        if (!root) return;
        if (syncing) {
          pendingCfg = true;
          return;
        }
        try {
          cfgQuietUntil = Date.now() + 3000;
          await root.collection("meta").doc("cfg").set({
            cu: JSON.stringify(CU),
            cs: JSON.stringify(CS),
            decks: JSON.stringify(DECKS),
            deckId,
            u: cfgU,
          });
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
      }
      const later = (k, f) => {
        clearTimeout(tm[k]);
        tm[k] = setTimeout(f, 400);
      };
      // 本機一儲存就排程上雲（紀錄／牌義／牌陣／牌組）
      store.set = (k, v) => {
        sset(k, v);
        if (!fbUser) return;
        if (k == "tarot-hist") later("h", pushHist);
        else if (
          k == "tarot-custom" ||
          k == "tarot-cs" ||
          k == "tarot-decks" ||
          k == "tarot-deck-id"
        ) {
          cfgU = Date.now();
          sset("tarot-cfgu", cfgU);
          later("c", pushCfg);
        }
      };
      async function syncAll() {
        const root = userCol();
        if (!root) return;
        if (syncing) return;
        say("同步紀錄中…");
        syncing = true;
        try {
          const cloud = {};
          const snap = await withTimeout(
            root.collection("hist").get(),
            20000,
            "Firestore",
          );
          snap.forEach((d) => {
            const x = d.data();
            if (!x || !x.j) return;
            try {
              const h = JSON.parse(x.j);
              if (h && h.id && Array.isArray(h.cards)) cloud[h.id] = h;
            } catch (e) {}
          });
          hist = hist.filter((h) => h && h.id && Array.isArray(h.cards));
          const known = store.get("tarot-known", []).map(String),
            out = [];
          new Set([
            ...Object.keys(cloud),
            ...hist.map((h) => String(h.id)),
          ]).forEach((id) => {
            const c = cloud[id],
              l = hist.find((x) => String(x.id) == id);
            if (c && l) out.push((l.u || 0) > (c.u || 0) ? l : c);
            else if (c) out.push(c);
            else if (!known.includes(id)) out.push(l);
          });
          out.sort((a, b) => b.id - a.id);
          hist = out;
          lastS = {};
          Object.entries(cloud).forEach(([id, c]) => (lastS[id] = jstr(c)));
          let cfg = null;
          try {
            const cfgSnap = await withTimeout(
              root.collection("meta").doc("cfg").get(),
              15000,
              "設定",
            );
            if (cfgSnap.exists) cfg = cfgSnap.data();
          } catch (e) {}
          if (cfg && (cfg.u || 0) > cfgU) {
            applyCloudCfg(cfg);
          } else if (!cfg || cfgU > (cfg.u || 0)) {
            say("上傳設定中…");
            syncing = false;
            await pushCfg();
            syncing = true;
          }
          say("上傳紀錄中…");
          syncing = false;
          await pushHist();
          syncing = true;
          say("同步圖片中…");
          await pullImages();
          refreshCfgUi();
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
        if (!fbConfigured()) return;
        if (typeof firebase === "undefined") {
          say("Firebase SDK 載入失敗");
          return;
        }
        try {
          if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
          fbAuth = firebase.auth();
          fbDb = firebase.firestore();
          try {
            fbDb.settings({
              ignoreUndefinedProperties: true,
              experimentalForceLongPolling: true,
            });
          } catch (e) {}
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
                  if (syncing || Date.now() < cfgQuietUntil) return;
                  if (!snap.exists) return;
                  if (applyCloudCfg(snap.data())) refreshCfgUi();
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
            pullCfgLive();
            refreshImgsLive();
          });
          window.addEventListener("focus", () => {
            if (!fbUser || !fbSt || syncing) return;
            pullCfgLive();
            refreshImgsLive();
          });
          // 頁面開著時定期補拉（即時監聽漏掉時的後備）
          liveTimer = setInterval(() => {
            if (document.hidden || !fbUser || !fbSt || syncing) return;
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
