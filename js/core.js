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
      function show(id, rev) {
        if (editing) return;
        if (id == null || id === undefined || !D[id]) return;
        cur = [id, rev];
        const c = D[id],
          u = getCU(id),
          im = getImg(id),
          has = u.u || u.r || u.n,
          box = detBox();
        revealPanel(box);
        box.innerHTML = `<div class="det">${im ? `<img src="${im}" class="${rev === true ? "rev" : ""}" alt="">` : ""}<div class="dbody"><h3>${c.sym} ${c.z} <small class="dim">${c.e}・${c.sub}・${esc(deckName(deckId))}</small></h3><p class="${rev !== true ? "hl" : "dim"}"><b>正位：</b>${c.u}</p><p class="${rev === true ? "hl" : "dim"}"><b>逆位：</b>${c.r}</p>${has ? `<div class="pm"><b>🌙 我的牌義</b>${u.u ? `<p><b>正位：</b>${esc(u.u)}</p>` : ""}${u.r ? `<p><b>逆位：</b>${esc(u.r)}</p>` : ""}${u.n ? `<p><b>心得：</b>${esc(u.n)}</p>` : ""}</div>` : ""}<div class="row" style="margin:8px 0 0"><button id="ed">✎ ${has ? "編輯" : "新增"}我的牌義</button><button id="ci">${im ? "更換" : "上傳"}牌面圖</button>${im ? `<button id="cd">刪除卡面</button>` : ""}</div></div></div>`;
        $("#ed").onclick = edit;
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
              refreshView(id, rev);
            } else {
              this.dataset.s = 1;
              this.textContent = "再按一次確認刪除";
            }
          };
      }
      function edit() {
        editing = true;
        const id = cur[0],
          c = D[id],
          u = getCU(id),
          box = detBox();
        box.innerHTML = `<h3>✎ ${c.z}（${esc(deckName(deckId))}）：我的牌義</h3><label class="mut">個人正位牌義</label><textarea id="eu">${esc(u.u || "")}</textarea><label class="mut">個人逆位牌義</label><textarea id="er">${esc(u.r || "")}</textarea><label class="mut">心得／聯想／相關經驗</label><textarea id="en">${esc(u.n || "")}</textarea><div class="row"><button class="pri" id="es">儲存</button><button id="ec">取消</button></div>`;
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
          show(...cur);
        };
        $("#ec").onclick = () => {
          editing = false;
          show(...cur);
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
              const card = img.closest(".card");
              if (!card) return;
              const id = +card.dataset.id;
              const key = ik(id);
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
            if (img.complete && img.naturalWidth === 0) fix();
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
      function renderDraw() {
        const n = drawn.length;
        if (!n) return;
        $("#slots").className = "slots" + (n >= 6 ? " sm" : "");
        $("#slots").innerHTML = drawn
          .map(
            (d, i) =>
              `<div class="slot">${pos[i]}<br>${d.open ? face(D[d.id], d.r, true) : `<div class="card back" data-i="${i}">✦</div>`}</div>`,
          )
          .join("");
        $("#slots")
          .querySelectorAll(".card.back")
          .forEach(
            (el) =>
              (el.onclick = () => {
                const d = drawn[+el.dataset.i];
                d.open = true;
                renderDraw();
                show(d.id, d.r);
              }),
          );
        bindHover($("#slots"));
        bindBrokenImgs($("#slots"));
        $("#acts").innerHTML =
          `<button id="all">全部翻開</button>${drawn.every((d) => d.open) ? '<button class="pri" id="sv">儲存到紀錄</button>' : ""}`;
        $("#all").onclick = () => {
          drawn.forEach((d) => (d.open = true));
          renderDraw();
        };
        if ($("#sv"))
          $("#sv").onclick = () => {
            hist.unshift({
              id: Date.now(),
              t: new Date().toLocaleString("zh-TW"),
              q: $("#q").value,
              note: "",
              spread: spName + "：" + pos.join("/"),
              cards: drawn.map((d, i) => ({ i: d.id, r: d.r, p: pos[i] })),
            });
            save();
            drawn = [];
            $("#slots").innerHTML =
              '<span class="mut">已儲存！可到「我的紀錄」補寫筆記。</span>';
            $("#acts").innerHTML = "";
            tab("hist");
          };
      }
      $("#go").onclick = () => {
        resetDrawPanels();
        $("#slots").innerHTML = '<span class="mut">洗牌中…</span>';
        $("#acts").innerHTML = "";
        const a = [...Array(78).keys()];
        for (let i = 77; i > 0; i--) {
          const j = randInt(i);
          [a[i], a[j]] = [a[j], a[i]];
        }
        const s = SP[$("#sp").value];
        if (!s) return;
        spName = s[0];
        pos = s[1];
        drawn = a
          .slice(0, pos.length)
          .map((id) => ({
            id,
            r: $("#rv").checked && rand() < 0.5,
            open: false,
          }));
        renderDraw();
        clearDrawPanels();
      };
      const esc = (s) =>
        String(s).replace(
          /[&<>"]/g,
          (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m],
        );
      function renderList() {
        const L = $("#list");
        if (!hist.length) {
          L.innerHTML = '<p class="mut">還沒有紀錄。</p>';
          return;
        }
        L.innerHTML = hist
          .map(
            (
              h,
            ) => `<div class="entry" data-h="${h.id}"><div class="mut">${h.t}・${esc(h.spread || "自訂")}</div>
 <input type="text" class="hq" style="width:100%;margin-top:6px" placeholder="問題" value="${esc(h.q)}">
 <div class="chips">${h.cards.map((c, k) => `<span class="chip" data-id="${c.i}" data-rev="${c.r ? 1 : 0}">${c.p ? c.p + "：" : ""}${D[c.i].z}${c.r ? "（逆）" : ""} <b class="x" data-k="${k}">×</b></span>`).join("")}</div>
 <div class="row"><select class="ac">${D.map((c) => `<option value="${c.id}">${c.z}</option>`).join("")}</select><label class="mut"><input type="checkbox" class="ar" style="padding:0"> 逆位</label><button class="ab">加入此牌</button></div>
 <textarea class="hn" placeholder="我的塔羅筆記…">${esc(h.note)}</textarea>
 <div class="row" style="margin:6px 0 0"><button class="del">刪除此紀錄</button></div></div>`,
          )
          .join("");
        L.querySelectorAll(".entry").forEach((el) => {
          const h = hist.find((x) => x.id == el.dataset.h);
          el.querySelector(".hq").oninput = (e) => {
            h.q = e.target.value;
            save();
          };
          el.querySelector(".hn").oninput = (e) => {
            h.note = e.target.value;
            save();
          };
          el.querySelector(".ab").onclick = () => {
            h.cards.push({
              i: +el.querySelector(".ac").value,
              r: el.querySelector(".ar").checked,
              p: "",
            });
            save();
            renderList();
          };
          {
            const b = el.querySelector(".del");
            b.onclick = () => {
              if (b.dataset.s) {
                hist = hist.filter((x) => x !== h);
                save();
                renderList();
              } else {
                b.dataset.s = 1;
                b.textContent = "再按一次確認刪除";
              }
            };
          }
          el.querySelectorAll(".chip").forEach((c) => {
            c.onclick = (e) => {
              if (e.target.classList.contains("x")) {
                h.cards.splice(+e.target.dataset.k, 1);
                save();
                renderList();
              } else {
                // 紀錄頁點牌：切到抽牌頁再顯示詳情
                tipHide();
                tab("draw");
                show(+c.dataset.id, c.dataset.rev == "1");
              }
            };
          });
        });
      }
      $("#addm").onclick = () => {
        hist.unshift({
          id: Date.now(),
          t: new Date().toLocaleString("zh-TW"),
          q: "",
          note: "",
          spread: "",
          cards: [],
        });
        save();
        renderList();
      };
      $("#deck").innerHTML = D.map((c) => face(c, false, false)).join("");
      bindDeck();
      function tab(t) {
        ["draw", "hist", "deck"].forEach((k) => {
          $("#v-" + k).classList.toggle("hide", k != t);
          $("#t-" + k).classList.toggle("on", k == t);
        });
        if (t == "hist") renderList();
      }
      ["draw", "hist", "deck"].forEach(
        (k) => ($("#t-" + k).onclick = () => tab(k)),
      );
      $("#sp").innerHTML = Object.entries(SP)
        .map(
          ([k, v]) =>
            `<option value="${k}"${k == "three" ? " selected" : ""}>${v[0]}（${v[1].length}張）</option>`,
        )
        .join("");
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
        idbOp((s) => s.put(d, key));
        return { key, dataUrl: d };
      }
      async function remImg(id) {
        const key = ik(id);
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
        for (const f of e.target.files) {
          const id = idOf(f.name);
          if (id == null) continue;
          try {
            const packed = await addImg(id, f);
            if (packed) await pushImgCloud(packed.key, packed.dataUrl);
          } catch (x) {
            console.error("批次上傳失敗", f.name, x);
          }
        }
        e.target.value = "";
        redraw();
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
        // 先用本機 data URL 更新畫面（避免上傳後又被遠端網址重繪而閃爍）
        refreshView(id, rev);
        if (packed) {
          try {
            await pushImgCloud(packed.key, packed.dataUrl);
          } catch (x) {}
        }
      };
      idbOp((s) => ({ k: s.getAllKeys(), v: s.getAll() })).then((r) => {
        if (r && r.k.result) {
          r.k.result.forEach((k, i) => {
            const v = r.v.result[i];
            if (typeof k === "number" || /^\d+$/.test(String(k))) {
              const key = "rws:" + k;
              IMG[key] = v;
              idbOp((s) => {
                s.delete(k);
                s.put(v, key);
              });
            } else IMG[k] = v;
          });
          redraw();
        }
      });
