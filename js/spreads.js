/* ===== v3: 牌陣擺法、自訂牌陣、整組牌陣紀錄 ===== */
      const LAY = {
        one: [[0, 0]],
        three: [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
        four: [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ],
        choice: [
          [1, 0],
          [0, 1],
          [0, 2],
          [2, 1],
          [2, 2],
        ],
        five: [
          [1, 1],
          [0, 1],
          [1, 2],
          [2, 1],
          [1, 0],
        ],
        rel: [
          [0, 0],
          [2, 0],
          [1, 1],
          [0, 1],
          [2, 1],
          [1, 2],
        ],
        horse: [
          [0, 0],
          [0, 1],
          [1, 2],
          [2, 2],
          [3, 2],
          [4, 1],
          [4, 0],
        ],
        celtic: [
          [1, 1],
          [1, 1, 1],
          [1, 2],
          [0, 1],
          [1, 0],
          [2, 1],
          [3, 3],
          [3, 2],
          [3, 1],
          [3, 0],
        ],
        year: [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
          [3, 1],
          [3, 2],
          [3, 3],
          [2, 3],
          [1, 3],
          [0, 3],
          [0, 2],
          [0, 1],
        ],
      };
      let CS = store.get("tarot-cs", {}),
        curLay = null,
        ce = { id: null, c: [] };
      const SPS = () => ({ ...SP, ...CS }),
        layOf = (k) => {
          const s = SPS()[k];
          return (s && (s[2] || LAY[k])) || null;
        };
      $("nav").insertAdjacentHTML(
        "beforeend",
        '<button id="t-sp">自訂牌陣</button><label class="mut" style="align-self:center"><input type="checkbox" id="lay" style="padding:0"> 依傳統擺法</label>',
      );
      $("#lay").checked = store.get("tarot-lay", true);
      $("#addm").insertAdjacentHTML(
        "beforebegin",
        '<select id="msp"></select>',
      );
      $("#addm").textContent = "＋ 以此牌陣手動新增紀錄";
      $("#v-deck").insertAdjacentHTML(
        "afterend",
        '<section id="v-sp" class="hide"><p class="mut">先輸入牌陣名稱，再依序點格子放置每個位置（點的順序即抽牌順序）；點已放置的格子可移除。</p><div class="row"><input type="text" id="cn" placeholder="牌陣名稱"><input type="text" id="cp" placeholder="下一個位置的名稱（可留空）"></div><div id="cg" class="cg"></div><div class="row" style="margin-top:10px"><button class="pri" id="cs">儲存牌陣</button><button id="cc">清空／新增</button><span class="mut" id="cmsg"></span></div><h3 style="color:var(--acc)">我的牌陣</h3><div id="cl"></div></section>',
      );
      function fillSp() {
        const o = Object.entries(SPS())
            .map(
              ([k, v]) =>
                `<option value="${k}">${esc(v[0])}（${v[1].length}張）</option>`,
            )
            .join(""),
          a = $("#sp").value || "three",
          b = $("#msp").value || "three";
        $("#sp").innerHTML = o;
        $("#msp").innerHTML = o;
        $("#sp").value = SPS()[a] ? a : "three";
        $("#msp").value = SPS()[b] ? b : "three";
      }
      fillSp();
      function spreadHTML(P, lay, useLay, fn) {
        const n = P.length;
        if (!useLay || !lay || lay.length < n)
          return `<div class="flow">${P.map((p, i) => `<div class="slot"><div class="lb">${esc(p)}</div>${fn(i)}</div>`).join("")}</div>`;
        const W = Math.max(...lay.map((l) => l[0])) + 1,
          H = Math.max(...lay.map((l) => l[1])) + 1;
        return `<div class="lay" style="width:calc(${W}*(var(--cw,112px) + 14px));height:calc(${H}*(var(--ch,184px) + 40px))">${P.map(
          (p, i) => {
            const [x, y, r] = lay[i];
            return `<div class="slot${r ? " rot" : ""}" style="left:calc(${x}*(var(--cw,112px) + 14px));top:calc(${y}*(var(--ch,184px) + 40px));width:var(--cw,112px)"><div class="lb">${esc(p)}</div>${fn(i)}</div>`;
          },
        ).join("")}</div>`;
      }
      function renderDraw() {
        const n = drawn.length;
        if (!n) return;
        $("#slots").className = "slots" + (n >= 6 ? " sm" : "");
        $("#slots").innerHTML = spreadHTML(
          pos,
          curLay,
          $("#lay").checked,
          (i) => {
            const d = drawn[i];
            return d.open
              ? face(D[d.id], d.r, true)
              : `<div class="card back" data-i="${i}">✦</div>`;
          },
        );
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
          `<span class="mut">${esc(spName)}</span><button id="all">全部翻開</button><button id="ai">✨ 統整解析</button><button class="pri" id="sv">儲存整個牌陣到紀錄</button>`;
      }
      $("#acts").addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn || !$("#acts").contains(btn)) return;
        if (btn.id === "all") {
          drawn.forEach((d) => (d.open = true));
          renderDraw();
          // 全部翻開後不要留著「上一張點開」的單卡牌義
          hidePanel($("#det"));
          cur = [null, undefined];
          tipHide();
          return;
        }
        if (btn.id === "sv") {
          hist.unshift({
            id: Date.now(),
            u: Date.now(),
            t: new Date().toLocaleString("zh-TW"),
            q: $("#q").value,
            note: "",
            spread: spName,
            lay: curLay,
            ai: drawAI,
            deck: deckId,
            cards: drawn.map((d, i) => ({ i: d.id, r: d.r, p: pos[i] })),
          });
          save();
          drawn = [];
          $("#slots").innerHTML =
            '<span class="mut">已儲存整個牌陣！可到「我的紀錄」補寫筆記。</span>';
          $("#acts").innerHTML = "";
          tab("hist");
          return;
        }
        if (btn.id === "ai") {
          if (typeof analyze !== "function" || !drawn.length) return;
          drawn.forEach((d) => (d.open = true));
          renderDraw();
          const h = {
            spread: spName,
            q: $("#q").value,
            deck: deckId,
            cards: drawn.map((d, i) => ({ i: d.id, r: d.r, p: pos[i] })),
          };
          analyze(h, $("#aibox"), () => {
            drawAI = h.ai;
          });
        }
      });
      $("#go").onclick = () => {
        // 先清畫面，避免上一輪翻開的牌／牌義在新抽牌失敗或尚未重繪時殘留
        drawAI = "";
        resetDrawPanels();
        $("#slots").innerHTML = '<span class="mut">洗牌中…</span>';
        $("#acts").innerHTML = "";
        const a = [...Array(78).keys()];
        for (let i = 77; i > 0; i--) {
          const j = randInt(i);
          [a[i], a[j]] = [a[j], a[i]];
        }
        const k = $("#sp").value,
          s = SPS()[k];
        if (!s) {
          $("#slots").innerHTML =
            '<span class="mut">找不到此牌陣，請重新選擇。</span>';
          return;
        }
        spName = s[0];
        pos = s[1];
        curLay = layOf(k);
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
      const hsHTML = (h) =>
        spreadHTML(
          h.cards.map((c, k) => c.p || "第" + (k + 1) + "張"),
          h.lay,
          $("#lay").checked,
          (i) => {
            const c = h.cards[i];
            return c.i == null
              ? '<div class="card back empty"></div>'
              : face(D[c.i], c.r, true, h.deck || deckId);
          },
        );
      /** 輸入 debounce：避免每鍵整表重繪／狂打雲端 */
      const saveHistSoon = (() => {
        let t;
        return () => {
          clearTimeout(t);
          t = setTimeout(() => save(), 450);
        };
      })();
      function entryMetaText(h) {
        return `${h.t}・${esc((h.spread || "自由").split("：")[0])}（${h.cards.length} 張）${h.deck ? "・" + esc(deckName(h.deck)) : ""}`;
      }
      function entryHTML(h) {
        return `<div class="entry" data-h="${h.id}"><div class="mut meta">${entryMetaText(h)}</div>
 <input type="text" class="hq" style="width:100%;margin-top:6px" placeholder="問題" value="${esc(h.q || "")}">
 <div class="hs">${hsHTML(h)}</div>
 <details><summary class="mut" style="cursor:pointer">編輯牌面（逐個位置選牌）</summary>${h.cards.map((c, k) => `<div class="row" style="margin:6px 0 0"><span style="min-width:90px">${esc(c.p || "第" + (k + 1) + "張")}</span><select class="pc" data-k="${k}"><option value="">（未選）</option>${D.map((d) => `<option value="${d.id}"${d.id === c.i ? " selected" : ""}>${d.z}</option>`).join("")}</select><label class="mut"><input type="checkbox" class="pr" data-k="${k}" style="padding:0"${c.r ? " checked" : ""}> 逆位</label></div>`).join("")}</details>
 <textarea class="hn" placeholder="我的塔羅筆記…">${esc(h.note || "")}</textarea>
 <div class="row entry-acts" style="margin:6px 0 0"><button type="button" class="del">🗑 刪除此紀錄</button></div></div>`;
      }
      function bindEntry(el, h) {
        if (!el || !h) return;
        const rf = () => {
          const s = el.querySelector(".hs");
          if (!s) return;
          s.innerHTML = hsHTML(h);
          bindHover(s);
          bindBrokenImgs(s);
        };
        const meta = el.querySelector(".meta");
        if (meta) meta.innerHTML = entryMetaText(h);
        const hq = el.querySelector(".hq");
        if (hq) {
          hq.oninput = (e) => {
            h.q = e.target.value;
            h.u = Date.now();
            saveHistSoon();
          };
        }
        const hn = el.querySelector(".hn");
        if (hn) {
          hn.oninput = (e) => {
            h.note = e.target.value;
            h.u = Date.now();
            saveHistSoon();
          };
        }
        el.querySelectorAll(".pc").forEach((s) => {
          s.onchange = () => {
            h.cards[+s.dataset.k].i = s.value === "" ? null : +s.value;
            h.u = Date.now();
            save();
            rf();
          };
        });
        el.querySelectorAll(".pr").forEach((s) => {
          s.onchange = () => {
            h.cards[+s.dataset.k].r = s.checked;
            h.u = Date.now();
            save();
            rf();
          };
        });
        const row = el.querySelector(".entry-acts");
        const del = row && row.querySelector(".del");
        if (del) {
          del.onclick = () => {
            row.innerHTML =
              '<span>確定要刪除這筆紀錄嗎？刪除後無法復原。</span><button type="button" class="pri yes">確定刪除</button><button type="button" class="no">取消</button>';
            row.querySelector(".yes").onclick = () => {
              hist = hist.filter((x) => x !== h);
              if (typeof markHistDeleted === "function") markHistDeleted(h.id);
              save();
              removeHistEntry(el);
            };
            row.querySelector(".no").onclick = () => {
              row.innerHTML =
                '<button type="button" class="del">🗑 刪除此紀錄</button>';
              bindEntry(el, h);
              if (typeof enhanceHistEntry === "function")
                enhanceHistEntry(el, h);
            };
          };
        }
        bindHover(el);
        bindBrokenImgs(el);
        if (typeof enhanceHistEntry === "function") enhanceHistEntry(el, h);
      }
      function removeHistEntry(el) {
        const L = $("#list");
        if (el && el.parentNode) el.remove();
        if (!hist.length) {
          L.innerHTML = '<p class="mut">還沒有紀錄。</p>';
          return;
        }
        if (!L.querySelector(".entry")) renderList();
      }
      function prependHistEntry(h) {
        const L = $("#list");
        const empty = L.querySelector(":scope > .mut");
        if (empty && !L.querySelector(".entry")) L.innerHTML = "";
        L.insertAdjacentHTML("afterbegin", entryHTML(h));
        const el = L.querySelector(`.entry[data-h="${h.id}"]`);
        bindEntry(el, h);
        return el;
      }
      function renderList() {
        const L = $("#list");
        if (!hist.length) {
          L.innerHTML = '<p class="mut">還沒有紀錄。</p>';
          return;
        }
        L.innerHTML = hist.map((h) => entryHTML(h)).join("");
        L.querySelectorAll(".entry").forEach((el) => {
          const h = hist.find((x) => String(x.id) === String(el.dataset.h));
          bindEntry(el, h);
        });
      }
      $("#addm").onclick = () => {
        const k = $("#msp").value,
          s = SPS()[k];
        const h = {
          id: Date.now(),
          u: Date.now(),
          t: new Date().toLocaleString("zh-TW"),
          q: "",
          note: "",
          spread: s[0],
          lay: layOf(k),
          deck: deckId,
          cards: s[1].map((p) => ({ i: null, r: false, p })),
        };
        hist.unshift(h);
        save();
        if (!isHidden($("#v-hist"))) {
          const empty = !$("#list").querySelector(".entry");
          if (empty && hist.length === 1) renderList();
          else prependHistEntry(h);
          const d = $("#list").querySelector(
            `.entry[data-h="${h.id}"] details`,
          );
          if (d) d.open = true;
        } else renderList();
      };
      $("#lay").onchange = () => {
        store.set("tarot-lay", $("#lay").checked);
        renderDraw();
        if (!isHidden($("#v-hist"))) renderList();
      };
      function renderCG() {
        let h = "";
        for (let y = 0; y < 5; y++)
          for (let x = 0; x < 7; x++) {
            const i = ce.c.findIndex((c) => c.x == x && c.y == y);
            h += `<button data-x="${x}" data-y="${y}" class="${i >= 0 ? "on" : ""}" title="${i >= 0 ? esc(ce.c[i].p) : ""}">${i >= 0 ? i + 1 + "<br>" + esc(ce.c[i].p.slice(0, 3)) : ""}</button>`;
          }
        $("#cg").innerHTML = h;
        $("#cg")
          .querySelectorAll("button")
          .forEach(
            (b) =>
              (b.onclick = () => {
                const x = +b.dataset.x,
                  y = +b.dataset.y,
                  i = ce.c.findIndex((c) => c.x == x && c.y == y);
                if (i >= 0) ce.c.splice(i, 1);
                else {
                  ce.c.push({
                    x,
                    y,
                    p: $("#cp").value.trim() || "位置" + (ce.c.length + 1),
                  });
                  $("#cp").value = "";
                }
                renderCG();
              }),
          );
      }
      function renderCL() {
        const L = $("#cl"),
          k = Object.keys(CS);
        L.innerHTML = k.length
          ? k
              .map(
                (id) =>
                  `<div class="row"><b>${esc(CS[id][0])}</b><span class="mut">${CS[id][1].length} 張</span><button data-e="${id}">編輯</button><button data-d="${id}">刪除</button></div>`,
              )
              .join("")
          : '<p class="mut">尚無自訂牌陣。</p>';
        L.querySelectorAll("[data-e]").forEach(
          (b) =>
            (b.onclick = () => {
              const s = CS[b.dataset.e];
              ce = {
                id: b.dataset.e,
                c: s[1].map((p, i) => ({ x: s[2][i][0], y: s[2][i][1], p })),
              };
              $("#cn").value = s[0];
              renderCG();
            }),
        );
        L.querySelectorAll("[data-d]").forEach(
          (b) =>
            (b.onclick = () => {
              if (b.dataset.s) {
                delete CS[b.dataset.d];
                store.set("tarot-cs", CS);
                renderCL();
                fillSp();
              } else {
                b.dataset.s = 1;
                b.textContent = "再按一次確認";
              }
            }),
        );
      }
      $("#cs").onclick = () => {
        if (!ce.c.length) {
          $("#cmsg").textContent = "請至少放置一個位置";
          return;
        }
        const mx = Math.min(...ce.c.map((c) => c.x)),
          my = Math.min(...ce.c.map((c) => c.y));
        CS[ce.id || "c" + Date.now()] = [
          $("#cn").value.trim() || "我的牌陣",
          ce.c.map((c) => c.p),
          ce.c.map((c) => [c.x - mx, c.y - my]),
        ];
        store.set("tarot-cs", CS);
        ce = { id: null, c: [] };
        $("#cn").value = "";
        $("#cmsg").textContent = "已儲存，可在抽牌頁選用";
        renderCG();
        renderCL();
        fillSp();
      };
      $("#cc").onclick = () => {
        ce = { id: null, c: [] };
        $("#cn").value = "";
        $("#cmsg").textContent = "";
        renderCG();
      };
      function tab(t) {
        tipHide();
        ["draw", "hist", "deck", "sp"].forEach((k) => {
          setHidden($("#v-" + k), k != t);
          $("#t-" + k).classList.toggle("on", k == t);
        });
        if (t == "deck") {
          hidePanel($("#deck-det"));
          cur = [null, undefined];
        }
        if (t == "draw") {
          hidePanel($("#det"));
          cur = [null, undefined];
          editing = false;
        }
        if (t == "hist") renderList();
        if (t == "sp") {
          renderCG();
          renderCL();
        }
      }
      $("#t-sp").onclick = () => tab("sp");
