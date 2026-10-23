const MA =
        "愚者|The Fool|新開始、自由、冒險|魯莽、猶豫、天真過頭;魔術師|The Magician|創造力、行動力、善用資源|操弄、欺瞞、才能浪費;女祭司|The High Priestess|直覺、潛意識、神祕|忽視直覺、隱藏動機;皇后|The Empress|豐盛、滋養、感官享受|過度依賴、停滯、過度保護;皇帝|The Emperor|權威、秩序、穩定|專制、僵化、失控;教皇|The Hierophant|傳統、信仰、指引|打破常規、盲從;戀人|The Lovers|愛、選擇、和諧|失衡、錯誤抉擇;戰車|The Chariot|意志、勝利、前進|失控、方向不明;力量|Strength|勇氣、耐心、柔韌|自我懷疑、軟弱;隱者|The Hermit|內省、獨處、智慧|孤立、逃避;命運之輪|Wheel of Fortune|轉機、循環、命運|厄運、抗拒改變;正義|Justice|公正、因果、真相|不公、逃避責任;倒吊人|The Hanged Man|犧牲、換位思考、暫停|拖延、無謂犧牲;死神|Death|結束、轉化、重生|抗拒改變、停滯;節制|Temperance|平衡、調和、耐心|失衡、過度;惡魔|The Devil|束縛、慾望、執著|解脫、覺醒;高塔|The Tower|突變、崩解、覺醒|逃過一劫、延遲的災難;星星|The Star|希望、療癒、靈感|失望、失去信心;月亮|The Moon|不安、幻象、潛意識|迷霧散去、釐清恐懼;太陽|The Sun|喜悅、成功、活力|過度樂觀、短暫陰霾;審判|Judgement|覺醒、召喚、重生|自我懷疑、拒絕反省;世界|The World|圓滿、完成、整合|未竟、遲滯".split(
          ";",
        );
      const SU = [
        ["權杖", "Wands", "🔥", "事業、熱情與行動"],
        ["聖杯", "Cups", "💧", "情感與人際關係"],
        ["寶劍", "Swords", "🌬️", "思想、溝通與衝突"],
        ["錢幣", "Pentacles", "🌍", "金錢、工作與物質"],
      ];
      const RK =
        "王牌|Ace|新的起點、潛能萌芽|延遲、錯失時機;二|Two|抉擇、平衡、合作|猶豫、失衡;三|Three|成長、合作、初步成果|受阻、意見分歧;四|Four|穩定、休憩、鞏固|停滯、不安;五|Five|衝突、挑戰、損失|緩和、走出低谷;六|Six|和諧、過渡、獲得支援|停滯、難以前進;七|Seven|堅持、評估、考驗|動搖、白費力氣;八|Eight|行動、進展、專注|受阻、分心;九|Nine|接近完成、韌性、累積|疲憊、過度防備;十|Ten|圓滿、終點、承擔|重擔、結束後的失落;侍者|Page|好奇、消息、學習|不成熟、壞消息;騎士|Knight|追求、行動、衝勁|躁進、半途而廢;王后|Queen|成熟、關懷、內在掌握|情緒化、失衡;國王|King|掌控、責任、領導|濫權、專橫".split(
          ";",
        );
      const D = [];
      MA.forEach((s, i) => {
        const [z, e, u, r] = s.split("|");
        D.push({ id: i, z, e, sym: "✦", n: i, u, r, sub: "大阿爾卡納" });
      });
      SU.forEach((su, si) =>
        RK.forEach((s, ri) => {
          const [z, e, u, r] = s.split("|");
          D.push({
            id: 22 + si * 14 + ri,
            z: su[0] + z,
            e: (ri < 10 && ri > 0 ? e : e) + " of " + su[1],
            sym: su[2],
            n:
              ri < 10
                ? ri == 0
                  ? "A"
                  : ri + 1
                : ["P", "Kn", "Q", "K"][ri - 10],
            u: su[3] + "面向：" + u,
            r: su[3] + "面向：" + r,
            sub: "小阿爾卡納・" + su[0],
          });
        }),
      );
      const $ = (s) => document.querySelector(s),
        mem = {};
      /** 密碼學安全亂數：回傳 [0, 1) */
      function rand() {
        const a = new Uint32Array(1);
        crypto.getRandomValues(a);
        return a[0] / 4294967296;
      }
      /** 整數 [0, max]（含） */
      function randInt(max) {
        return Math.floor(rand() * (max + 1));
      }
      const store = {
        get(k, d) {
          try {
            const v = localStorage.getItem(k);
            return v ? JSON.parse(v) : d;
          } catch (e) {
            return mem[k] ?? d;
          }
        },
        set(k, v) {
          try {
            localStorage.setItem(k, JSON.stringify(v));
          } catch (e) {
            mem[k] = v;
          }
        },
      };
      let hist = store.get("tarot-hist", []),
        drawn = [],
        pinned = null;
      const save = () => store.set("tarot-hist", hist);
      let _cuRaw = store.get("tarot-custom", {}),
        editing = false,
        cur = [null, undefined];
      let DECKS = store.get("tarot-decks", [{ id: "rws", name: "偉特塔羅" }]);
      if (!Array.isArray(DECKS) || !DECKS.length)
        DECKS = [{ id: "rws", name: "偉特塔羅" }];
      let deckId = store.get("tarot-deck-id", DECKS[0].id);
      if (!DECKS.some((d) => d.id === deckId)) deckId = DECKS[0].id;
      let CU = (function (raw) {
        const keys = Object.keys(raw || {});
        if (!keys.length) return { [deckId]: {} };
        if (keys.every((k) => /^\d+$/.test(k))) return { rws: raw };
        return raw;
      })(_cuRaw);
      if (!CU[deckId]) CU[deckId] = {};
      let IMG = {};
      const saveDecks = () => {
        store.set("tarot-decks", DECKS);
        store.set("tarot-deck-id", deckId);
      };
      const deckName = (id) =>
        (DECKS.find((d) => d.id === id) || {}).name || id;
      function ik(id, did) {
        return (did || deckId) + ":" + id;
      }
      function getImg(id, did) {
        return IMG[ik(id, did)];
      }
      /** 本機剛上傳的圖：本 session 不被雲端網址蓋掉 */
      const pinnedImgs = new Set();
      function pinImg(key) {
        if (key) pinnedImgs.add(key);
      }
      function getCU(id) {
        if (!CU[deckId]) CU[deckId] = {};
        return CU[deckId][id] || {};
      }
      const detBox = () =>
        !$("#v-deck").classList.contains("hide") && $("#deck-det")
          ? $("#deck-det")
          : $("#det");
      function revealPanel(el) {
        if (!el) return;
        el.hidden = false;
        el.style.display = "";
        el.classList.remove("hide");
      }
      function bindDetActions(id, rev) {
        if ($("#ed")) $("#ed").onclick = edit;
        if ($("#ci"))
          $("#ci").onclick = () => {
            imgTarget = id;
            $("#f1").click();
          };
        if ($("#cd"))
          $("#cd").onclick = async function () {
            if (this.dataset.s) {
              try {
                await remImg(id);
              } catch (e) {}
              softRefreshView(id, rev);
            } else {
              this.dataset.s = 1;
              this.textContent = "再按一次確認刪除";
            }
          };
      }
      function dbodyHtml(c, u, has, im, rev) {
        return `<div class="dbody"><h3>${c.sym} ${c.z} <small class="dim">${c.e}・${c.sub}・${esc(deckName(deckId))}</small></h3><p class="${rev !== true ? "hl" : "dim"}"><b>正位：</b>${c.u}</p><p class="${rev === true ? "hl" : "dim"}"><b>逆位：</b>${c.r}</p>${has ? `<div class="pm"><b>🌙 我的牌義</b>${u.u ? `<p><b>正位：</b>${esc(u.u)}</p>` : ""}${u.r ? `<p><b>逆位：</b>${esc(u.r)}</p>` : ""}${u.n ? `<p><b>心得：</b>${esc(u.n)}</p>` : ""}</div>` : ""}<div class="row" style="margin:8px 0 0"><button id="ed">✎ ${has ? "編輯" : "新增"}我的牌義</button><button id="ci">${im ? "更換" : "上傳"}牌面圖</button>${im ? `<button id="cd">刪除卡面</button>` : ""}</div></div>`;
      }
      function show(id, rev, opts) {
        if (editing) return;
        if (id == null || id === undefined || !D[id]) return;
        opts = opts || {};
        cur = [id, rev];
        const c = D[id],
          u = getCU(id),
          im = getImg(id),
          has = !!(u.u || u.r || u.n),
          box = detBox();
        revealPanel(box);
        const keepImg = !!opts.keepImg;
        const det = box.querySelector(".det");
        const oldImg = det && det.querySelector("img");
        const sameImg =
          keepImg &&
          im &&
          oldImg &&
          oldImg.getAttribute("src") === im;
        if (sameImg && det) {
          // 只換文字區，保留已解碼的牌面，避免儲存牌義時整張圖重載閃爍
          oldImg.classList.toggle("rev", rev === true);
          const db = det.querySelector(".dbody");
          const html = dbodyHtml(c, u, has, im, rev);
          if (db) db.outerHTML = html;
          else det.insertAdjacentHTML("beforeend", html);
          if (!im && oldImg) oldImg.remove();
        } else {
          box.innerHTML = `<div class="det">${im ? `<img src="${im}" class="${rev === true ? "rev" : ""}" alt="">` : ""}${dbodyHtml(c, u, has, im, rev)}</div>`;
        }
        bindDetActions(id, rev);
      }
      function edit() {
        editing = true;
        const id = cur[0],
          rev = cur[1],
          c = D[id],
          u = getCU(id),
          im = getImg(id),
          box = detBox();
        const form = `<div class="dbody edit-mean"><h3>✎ ${c.z}（${esc(deckName(deckId))}）：我的牌義</h3><label class="mut">個人正位牌義</label><textarea id="eu">${esc(u.u || "")}</textarea><label class="mut">個人逆位牌義</label><textarea id="er">${esc(u.r || "")}</textarea><label class="mut">心得／聯想／相關經驗</label><textarea id="en">${esc(u.n || "")}</textarea><div class="row"><button class="pri" id="es">儲存</button><button id="ec">取消</button></div></div>`;
        const det = box.querySelector(".det");
        const oldImg = det && det.querySelector("img");
        if (det && oldImg && im && oldImg.getAttribute("src") === im) {
          // 編輯時保留牌面，只換右側／下方文字表單
          const db = det.querySelector(".dbody");
          if (db) db.outerHTML = form;
          else det.insertAdjacentHTML("beforeend", form);
        } else {
          box.innerHTML = `<div class="det">${im ? `<img src="${im}" class="${rev === true ? "rev" : ""}" alt="">` : ""}${form}</div>`;
        }
        $("#es").onclick = () => {
          const v = {
            u: $("#eu").value.trim(),
            r: $("#er").value.trim(),
            n: $("#en").value.trim(),
          };
          if (!CU[deckId]) CU[deckId] = {};
          if (v.u || v.r || v.n) CU[deckId][id] = v;
          else delete CU[deckId][id];
          store.set("tarot-custom", CU);
          editing = false;
          show(cur[0], cur[1], { keepImg: true });
        };
        $("#ec").onclick = () => {
          editing = false;
          show(cur[0], cur[1], { keepImg: true });
        };
      }
      function face(c, rev, tag, did) {
        const im = getImg(c.id, did);
        return `<div class="card ${rev ? "rev" : ""}${im ? " im" : ""}" data-id="${c.id}" data-rev="${rev ? 1 : 0}"><span class="n">${c.n}</span>${im ? `<img src="${im}" alt="" loading="lazy">` : `<span class="sym">${c.sym}</span>`}<span class="z">${c.z}</span><span class="e">${c.e}</span>${tag ? `<span class="tag">${rev ? "逆位" : "正位"}</span>` : ""}</div>`;
      }
      function bindBrokenImgs(root) {
        (root || document)
          .querySelectorAll(".card.im img")
          .forEach((img) => {
            const fix = () => {
              if (img.dataset.hold === "1") return;
              const card = img.closest(".card");
              if (!card) return;
              const id = +card.dataset.id;
              const key = ik(id);
              if (pinnedImgs.has(key)) return;
              const src = img.getAttribute("src") || "";
              if (src.indexOf("data:") === 0) return;
              delete IMG[key];
              idbOp((s) => s.delete(key));
              card.classList.remove("im");
              img.replaceWith(
                Object.assign(document.createElement("span"), {
                  className: "sym",
                  textContent: (D[id] && D[id].sym) || "✦",
                }),
              );
              if (cur[0] === id) show(id, cur[1]);
            };
            // 載入中不要當壞圖清掉（會造成偶發閃爍）
            if (
              img.complete &&
              img.naturalWidth === 0 &&
              img.getAttribute("src") &&
              img.dataset.hold !== "1"
            )
              fix();
            else img.onerror = fix;
          });
      }
      function bindHover(root) {
        root.querySelectorAll(".card:not(.back)").forEach((el) => {
          const id = +el.dataset.id;
          const rev =
            el.dataset.rev == "1"
              ? true
              : el.dataset.rev == "0" && el.closest("#slots,#list")
                ? false
                : undefined;
          // 滑過只顯示提示，點擊才打開詳情（避免進頁／滑過就自動選牌）
          el.onmouseenter = () => tipAt(el, id);
          el.onmouseleave = tipHide;
          el.onclick = () => {
            tipHide();
            show(id, rev);
          };
        });
      }
      function tipHTML(id) {
        const c = D[id],
          u = getCU(id),
          im = getImg(id),
          has = u.u || u.r || u.n;
        return `${im ? `<img src="${im}" alt="">` : ""}<h3>${c.sym} ${esc(c.z)}</h3><p class="dim">${esc(c.e)}・${esc(c.sub)}・${esc(deckName(deckId))}</p><p><b>正位：</b>${esc(c.u)}</p><p><b>逆位：</b>${esc(c.r)}</p>${has ? `<div class="pm"><b>🌙 我的牌義</b>${u.u ? `<p><b>正位：</b>${esc(u.u)}</p>` : ""}${u.r ? `<p><b>逆位：</b>${esc(u.r)}</p>` : ""}${u.n ? `<p><b>心得：</b>${esc(u.n)}</p>` : ""}</div>` : ""}`;
      }
      function tipAt(el, id) {
        const tip = $("#tip");
        tip.innerHTML = tipHTML(id);
        revealPanel(tip);
        tip.classList.remove("hide");
        tip.hidden = false;
        const r = el.getBoundingClientRect(),
          tw = tip.offsetWidth,
          th = tip.offsetHeight;
        let left = r.right + 12,
          top = r.top;
        if (left + tw > innerWidth - 8) left = r.left - tw - 12;
        if (left < 8) left = 8;
        if (top + th > innerHeight - 8) top = Math.max(8, innerHeight - th - 8);
        if (top < 8) top = 8;
        tip.style.left = left + "px";
        tip.style.top = top + "px";
      }
      const tipHide = () => {
        const tip = $("#tip");
        if (!tip) return;
        tip.classList.add("hide");
        tip.hidden = true;
        tip.style.display = "none";
        tip.innerHTML = "";
      };
      let drawEpoch = 0;
      function hidePanel(el) {
        if (!el) return;
        el.classList.add("hide");
        el.hidden = true;
        el.style.display = "none";
        el.innerHTML = "";
      }
      function clearDrawPanels() {
        editing = false;
        cur = [null, undefined];
        tipHide();
        ["det", "deck-det", "aibox"].forEach((id) => {
          hidePanel(document.getElementById(id));
        });
      }
      function resetDrawPanels() {
        drawEpoch++;
        clearDrawPanels();
      }
      function bindDeck() {
        $("#deck")
          .querySelectorAll(".card")
          .forEach((el) => {
            el.onmouseenter = () => tipAt(el, +el.dataset.id);
            el.onmouseleave = tipHide;
            el.onclick = () => {
              tipHide();
              show(+el.dataset.id);
            };
          });
      }
      let imgTarget = null,
        pos = [],
        spName = "";
      const SP = {
        one: ["單張", ["指引"]],
        three: ["三張：過去／現在／未來", ["過去", "現在", "未來"]],
        four: ["四元素", ["火・行動", "水・情感", "風・思想", "土・現實"]],
        choice: [
          "二選一",
          ["現況", "選項A過程", "選項A結果", "選項B過程", "選項B結果"],
        ],
        five: ["五張牌陣", ["現況", "挑戰", "根源", "建議", "結果"]],
        rel: [
          "關係牌陣",
          ["我", "對方", "關係現況", "我的期待", "對方的期待", "關係走向"],
        ],
        horse: [
          "馬蹄牌陣",
          ["過去", "現在", "隱藏影響", "自己", "他人", "建議", "結果"],
        ],
        celtic: [
          "凱爾特十字",
          [
            "現況",
            "挑戰",
            "潛意識根基",
            "過去",
            "顯意識目標",
            "近期未來",
            "自我態度",
            "外在環境",
            "希望與恐懼",
            "最終結果",
          ],
        ],
        year: [
          "年度十二個月",
          [
            "一月",
            "二月",
            "三月",
            "四月",
            "五月",
            "六月",
            "七月",
            "八月",
            "九月",
            "十月",
            "十一月",
            "十二月",
          ],
        ],
      };
      // 抽牌／紀錄列表／分頁 tab、#go、#addm 由 spreads.js 提供（勿在此重複定義）
      const esc = (s) =>
        String(s).replace(
          /[&<>"]/g,
          (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m],
        );
      $("#deck").innerHTML = D.map((c) => face(c, false, false)).join("");
      bindDeck();
      ["draw", "hist", "deck"].forEach(
        (k) => ($("#t-" + k).onclick = () => tab(k)),
      );
      const idb = new Promise((r) => {
        try {
          const q = indexedDB.open("tarot", 1);
          q.onupgradeneeded = () => q.result.createObjectStore("img");
          q.onsuccess = () => r(q.result);
          q.onerror = () => r(null);
        } catch (e) {
          r(null);
        }
      });
      const idbOp = async (f) => {
        const db = await idb;
        if (!db) return;
        try {
          return await new Promise((r) => {
            const t = db.transaction("img", "readwrite"),
              x = f(t.objectStore("img"));
            t.oncomplete = () => r(x);
            t.onerror = () => r();
          });
        } catch (e) {}
      };
      function redraw() {
        $("#deck").innerHTML = D.map((c) => face(c, false, false)).join("");
        bindDeck();
        bindBrokenImgs($("#deck"));
        if (drawn.length) renderDraw();
        if (!$("#v-hist").classList.contains("hide")) renderList();
      }
      function preloadSrc(src) {
        return new Promise((ok, no) => {
          if (!src) return no();
          const i = new Image();
          i.onload = () => ok(i);
          i.onerror = no;
          i.src = src;
        });
      }
      /** 換圖：先解碼到新節點再一次置換，避免改 src 時舊畫面被清掉閃一下 */
      async function swapImgSrc(img, src) {
        if (!img || !src) return img;
        if (img.getAttribute("src") === src) return img;
        img.dataset.hold = "1";
        try {
          const next = document.createElement("img");
          next.alt = img.alt || "";
          next.className = img.className;
          if (img.classList.contains("rev")) next.classList.add("rev");
          next.dataset.hold = "1";
          await new Promise((ok, no) => {
            next.onload = ok;
            next.onerror = no;
            next.src = src;
          });
          if (next.decode)
            try {
              await next.decode();
            } catch (e) {}
          img.replaceWith(next);
          next.dataset.hold = "0";
          return next;
        } catch (e) {
          img.dataset.hold = "0";
          return img;
        }
      }
      /** 就地換／插入牌面圖：圖先解碼好再進 DOM；eager 用於本機 data URL 立刻顯示 */
      async function paintCardImg(el, src, eager) {
        if (!el || !src) return;
        const isData = src.indexOf("data:") === 0;
        if (!eager || !isData) {
          try {
            await preloadSrc(src);
          } catch (e) {
            return;
          }
        }
        el.classList.add("im");
        let img = el.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          img.alt = "";
          img.src = src;
          img.dataset.hold = "0";
          const sym = el.querySelector(".sym");
          if (sym) sym.replaceWith(img);
          else {
            const z = el.querySelector(".z");
            if (z) el.insertBefore(img, z);
            else el.appendChild(img);
          }
        } else if (eager && isData) {
          // 本機 data URL：直接換，避免多餘等待
          img.src = src;
        } else {
          img = await swapImgSrc(img, src);
        }
        if (!img) return;
        img.onerror = () => {
          if (img.dataset.hold === "1") return;
          const card = img.closest(".card");
          if (!card) return;
          const id = +card.dataset.id;
          const key = ik(id);
          if (pinnedImgs.has(key)) return;
          delete IMG[key];
          idbOp((s) => s.delete(key));
          card.classList.remove("im");
          img.replaceWith(
            Object.assign(document.createElement("span"), {
              className: "sym",
              textContent: (D[id] && D[id].sym) || "✦",
            }),
          );
        };
      }
      function clearCardImg(el) {
        if (!el) return;
        const img = el.querySelector("img");
        const id = +el.dataset.id;
        el.classList.remove("im");
        if (img)
          img.replaceWith(
            Object.assign(document.createElement("span"), {
              className: "sym",
              textContent: (D[id] && D[id].sym) || "✦",
            }),
          );
      }
      async function softRefreshView(id, rev, eager) {
        if (id == null || id === undefined || editing) return;
        const im = getImg(id);
        const useEager = !!eager && im && im.indexOf("data:") === 0;
        if (im && !useEager) {
          try {
            await preloadSrc(im);
          } catch (e) {}
        }
        // 縮圖：只動 img，不整卡重繪
        const cards = [...document.querySelectorAll(`.card[data-id="${id}"]`)];
        if (im)
          await Promise.all(cards.map((el) => paintCardImg(el, im, useEager)));
        else cards.forEach((el) => clearCardImg(el));
        const box = detBox();
        const open =
          box &&
          !box.classList.contains("hide") &&
          !box.hidden &&
          box.style.display !== "none" &&
          cur[0] === id;
        if (!open) return;
        if (!im) {
          show(id, rev);
          return;
        }
        const det = box.querySelector(".det");
        if (!det) {
          show(id, rev);
          return;
        }
        let img = det.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          img.alt = "";
          img.src = im;
          if (rev === true) img.classList.add("rev");
          det.insertBefore(img, det.firstChild);
        } else if (useEager) {
          img.classList.toggle("rev", rev === true);
          img.src = im;
        } else {
          img.classList.toggle("rev", rev === true);
          img = await swapImgSrc(img, im);
        }
        if (img) img.classList.toggle("rev", rev === true);
        const ci = box.querySelector("#ci");
        if (ci) ci.textContent = "更換牌面圖";
        if (!box.querySelector("#cd")) {
          const row = box.querySelector(".dbody .row");
          if (!row) {
            show(id, rev);
            return;
          }
          const cd = document.createElement("button");
          cd.id = "cd";
          cd.textContent = "刪除卡面";
          cd.onclick = async function () {
            if (this.dataset.s) {
              try {
                await remImg(id);
              } catch (e) {}
              softRefreshView(id, rev);
            } else {
              this.dataset.s = 1;
              this.textContent = "再按一次確認刪除";
            }
          };
          row.appendChild(cd);
        }
      }
      function refreshView(id, rev) {
        redraw();
        // 只有詳情已打開時才更新，避免進牌庫／雲端同步後自動選中一張牌
        if (id == null || id === undefined || editing) return;
        const box = detBox();
        if (
          box &&
          !box.classList.contains("hide") &&
          !box.hidden &&
          box.style.display !== "none"
        )
          show(id, rev);
      }
      const shrink = (f) =>
        new Promise((ok, no) => {
          const u = URL.createObjectURL(f),
            i = new Image();
          i.onload = () => {
            const k = Math.min(1, 460 / i.height),
              cv = document.createElement("canvas");
            cv.width = i.width * k;
            cv.height = i.height * k;
            cv.getContext("2d").drawImage(i, 0, 0, cv.width, cv.height);
            URL.revokeObjectURL(u);
            ok(cv.toDataURL("image/jpeg", 0.85));
          };
          i.onerror = no;
          i.src = u;
        });
      function idOf(n) {
        n = n.toLowerCase();
        let m = n.match(
          /(wands?|cups?|swords?|pent\w*|coins?)[\s_-]*(\d{1,2})/,
        );
        if (m) {
          const s = /^w/.test(m[1])
              ? 0
              : /^cu/.test(m[1])
                ? 1
                : /^s/.test(m[1])
                  ? 2
                  : 3,
            r = +m[2];
          return r >= 1 && r <= 14 ? 22 + s * 14 + r - 1 : null;
        }
        m = n.match(
          /(?:rws[\s_-]*tarot[\s_-]*|^m|^major[\s_-]*|^)(\d{1,2})(?!\d)/,
        );
        return m && +m[1] <= 21 ? +m[1] : null;
      }
      async function addImg(id, f) {
        const d = await shrink(f),
          key = ik(id);
        IMG[key] = d;
        pinImg(key);
        const now = Date.now();
        // 標記本機剛上傳，避免同步瞬間用舊雲端圖蓋回來
        if (typeof imgMetaApplied !== "undefined") imgMetaApplied[key] = now;
        idbOp((s) => s.put(d, key));
        return { key, dataUrl: d };
      }
      async function remImg(id) {
        const key = ik(id);
        pinnedImgs.delete(key);
        delete IMG[key];
        idbOp((s) => s.delete(key));
        await deleteImgCloud(key);
      }
      async function remDeckImgs(did) {
        Object.keys(IMG)
          .filter((k) => k.startsWith(did + ":"))
          .forEach((k) => {
            delete IMG[k];
            idbOp((s) => s.delete(k));
          });
        await deleteDeckCloud(did);
      }
      function fillDeckSel() {
        const o = DECKS.map(
          (d) =>
            `<option value="${esc(d.id)}">${esc(d.name)}</option>`,
        ).join("");
        ["#dsel", "#duse"].forEach((sel) => {
          const el = $(sel);
          if (!el) return;
          const cur = el.value || deckId;
          el.innerHTML = o;
          el.value = DECKS.some((d) => d.id === cur) ? cur : deckId;
        });
        if ($("#dsel")) $("#dsel").value = deckId;
        if ($("#duse")) $("#duse").value = deckId;
      }
      function setDeck(id) {
        if (!DECKS.some((d) => d.id === id)) return;
        editing = false;
        tipHide();
        deckId = id;
        if (!CU[deckId]) CU[deckId] = {};
        saveDecks();
        fillDeckSel();
        const db = $("#ddel");
        if (db) {
          db.dataset.s = "";
          db.textContent = "刪除類別";
        }
        $("#deck-det").classList.add("hide");
        $("#deck-det").innerHTML = "";
        redraw();
      }
      fillDeckSel();
      $("#dsel").onchange = () => setDeck($("#dsel").value);
      $("#duse").onchange = () => setDeck($("#duse").value);
      $("#dadd").onclick = () => {
        const name = (prompt("新牌組名稱", "我的牌組") || "").trim();
        if (!name) return;
        const id = "d" + Date.now();
        DECKS.push({ id, name });
        CU[id] = {};
        store.set("tarot-custom", CU);
        saveDecks();
        setDeck(id);
      };
      $("#dren").onclick = () => {
        const d = DECKS.find((x) => x.id === deckId);
        if (!d) return;
        const name = (prompt("重新命名牌組", d.name) || "").trim();
        if (!name || name === d.name) return;
        d.name = name;
        saveDecks();
        fillDeckSel();
        if (!$("#deck-det").classList.contains("hide")) show(...cur);
      };
      $("#ddel").onclick = function () {
        if (DECKS.length <= 1) {
          alert("至少保留一個牌組類別");
          return;
        }
        if (!this.dataset.s) {
          this.dataset.s = 1;
          this.textContent = "再按一次確認刪除類別";
          return;
        }
        this.dataset.s = "";
        this.textContent = "刪除類別";
        const gone = deckId;
        remDeckImgs(gone).then(() => {
          delete CU[gone];
          store.set("tarot-custom", CU);
          DECKS = DECKS.filter((d) => d.id !== gone);
          saveDecks();
          setDeck(DECKS[0].id);
        });
      };
      $("#fi").onchange = async (e) => {
        const packedList = [];
        for (const f of e.target.files) {
          const id = idOf(f.name);
          if (id == null) continue;
          try {
            const packed = await addImg(id, f);
            if (packed) packedList.push(packed);
          } catch (x) {
            console.error("批次上傳失敗", f.name, x);
          }
        }
        e.target.value = "";
        redraw();
        // 畫面先更新完，再背景上傳雲端（避免大圖 putString 卡住介面）
        for (const packed of packedList) {
          try {
            await pushImgCloud(packed.key, packed.dataUrl);
          } catch (x) {}
        }
      };
      $("#f1").onchange = async (e) => {
        const f = e.target.files[0],
          id = imgTarget,
          rev = cur[0] === id ? cur[1] : undefined;
        e.target.value = "";
        if (!f || id == null) return;
        let packed;
        try {
          packed = await addImg(id, f);
        } catch (x) {
          return;
        }
        // 先完成本機顯示，再背景上傳（上傳大圖時不要擋住出圖）
        await softRefreshView(id, rev, true);
        if (packed) {
          pushImgCloud(packed.key, packed.dataUrl).catch((err) => {
            console.error("牌面雲端上傳失敗", packed.key, err);
          });
        }
      };
      function imgVer(src) {
        const m = String(src || "").match(/[?&]v=(\d+)/);
        return m ? +m[1] : 0;
      }
      /** 還原本機快取；回傳是否有寫入 IMG（沒變就不要 redraw，避免閃爍） */
      function acceptIdbImg(key, v) {
        if (!key || v == null) return false;
        const cur = IMG[key];
        if (
          typeof imgMetaApplied !== "undefined" &&
          imgMetaApplied[key] &&
          imgVer(v) < imgMetaApplied[key]
        )
          return false;
        if (cur) {
          const curHttp = String(cur).indexOf("http") === 0;
          const vData = String(v).indexOf("data:") === 0;
          // 雲端 https 已被套用時，不要被舊的 data URL／較舊 v= 蓋掉
          if (curHttp && vData) return false;
          if (curHttp && imgVer(cur) > imgVer(v)) return false;
          if (
            typeof imgMetaApplied !== "undefined" &&
            imgMetaApplied[key] &&
            curHttp
          )
            return false;
          if (cur === v) {
            const ver = imgVer(v);
            if (ver && typeof imgMetaApplied !== "undefined")
              imgMetaApplied[key] = Math.max(imgMetaApplied[key] || 0, ver);
            return false;
          }
        }
        IMG[key] = v;
        const ver = imgVer(v);
        if (ver && typeof imgMetaApplied !== "undefined")
          imgMetaApplied[key] = Math.max(imgMetaApplied[key] || 0, ver);
        return true;
      }
      idbOp((s) => ({ k: s.getAllKeys(), v: s.getAll() })).then((r) => {
        if (r && r.k.result) {
          let changed = false;
          r.k.result.forEach((k, i) => {
            const v = r.v.result[i];
            if (typeof k === "number" || /^\d+$/.test(String(k))) {
              const key = "rws:" + k;
              if (acceptIdbImg(key, v)) changed = true;
              idbOp((s) => {
                s.delete(k);
                s.put(v, key);
              });
            } else if (acceptIdbImg(k, v)) changed = true;
          });
          if (changed) redraw();
          // idb 較慢時可能晚於首次雲端同步；靜默補拉（無變更不會重繪）
          if (typeof window.refreshImgsLive === "function")
            window.refreshImgsLive();
        }
      });
