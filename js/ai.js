/* ===== v4: 統整解析 ===== */
      let SM = null,
        drawAI = "";
      (async () => {
        try {
          if (window.claude && claude.use) SM = await claude.use("sample");
        } catch (e) {}
      })();
      if (!$("#aibox")) {
        $("#acts").insertAdjacentHTML("afterend", '<div class="detail hide" id="aibox"></div>');
      }
const cardsOf = (a) =>
          a
            .filter((c) => c.i != null)
            .map((c) => ({ d: D[c.i], r: c.r, p: c.p || "" })),
        ELE = { 權杖: "火", 聖杯: "水", 寶劍: "風", 錢幣: "土" };
      function stat(cs) {
        const n = cs.length,
          maj = cs.filter((x) => x.d.id < 22).length,
          rv = cs.filter((x) => x.r).length,
          su = {},
          nm = {};
        cs.forEach((x) => {
          if (x.d.id >= 22) {
            const s = SU[Math.floor((x.d.id - 22) / 14)][0],
              r = (x.d.id - 22) % 14;
            su[s] = (su[s] || 0) + 1;
            (nm[r] = nm[r] || []).push(x.d.z);
          }
        });
        const sp =
            Object.entries(su)
              .map(([k, v]) => `${k}（${ELE[k]}）×${v}`)
              .join("、") || "無",
          rep = Object.values(nm)
            .filter((a) => a.length > 1)
            .map((a) => a.join("、"));
        return [
          `共 ${n} 張：大阿爾卡那 ${maj}、小阿爾卡那 ${n - maj}（${maj * 2 >= n ? "大牌偏多，帶有較強的命運或人生課題色彩" : "小牌為主，偏向日常層面的具體處境"}）`,
          `正位 ${n - rv}、逆位 ${rv}（${rv * 2 > n ? "逆位偏多，能量多為內化、受阻或需要調整" : "正位為主，能量較為順暢外顯"}）`,
          `花色／元素：${sp}`,
          rep.length ? `重複的數字或宮廷牌：${rep.join("；")}` : null,
        ].filter(Boolean);
      }
      const pm = (x, did) => {
        const bag = CU[did || deckId] || {},
          u = bag[x.d.id];
        return u && (u.u || u.r || u.n)
          ? `；我的牌義：${x.r ? u.r || u.u || "" : u.u || u.r || ""}${u.n ? "；心得：" + u.n : ""}`
          : "";
      };
      const view = (cs, t) =>
        `<p><b>牌陣統計</b></p><ul>${stat(cs)
          .map((s) => `<li>${esc(s)}</li>`)
          .join(
            "",
          )}</ul>${t ? `<p><b>✨ 統整解析</b></p><div class="ai">${esc(t)}</div>` : ""}`;
      function promptOf(h, cs) {
        const did = h.deck || deckId;
        return `你是經驗豐富的偉特塔羅解讀者。請用繁體中文，針對以下一次抽牌做「整體統整解析」。\n牌組：${deckName(did)}\n牌陣：${h.spread}\n問題：${h.q || "（未提供，請做一般性解讀）"}\n\n各位置的牌與牌義：\n${cs.map((x) => `- ${x.p}：${x.d.z}（${x.r ? "逆位" : "正位"}）；通用牌義：${x.r ? x.d.r : x.d.u}${pm(x, did)}`).join("\n")}\n\n統計觀察：\n${stat(cs).join("\n")}\n\n請依序輸出（使用簡短標題，不要使用 # 或 ** 等 markdown 符號）：\n一、整體主題（2-3 句，說明這次牌陣的核心訊息）\n二、逐位置串連解讀（依牌陣位置，說明每張牌在該位置的意義，並與前後位置互相呼應，不要只是重複牌義）\n三、牌與牌之間的互動（大小牌、元素、正逆位、重複數字帶來的線索，以及張力或矛盾處）\n四、建議與可行動方向（3 點以內，具體）\n若有「我的牌義」，請優先參考使用者的個人詮釋。語氣溫和，把結果當作反思參考，不做絕對預言。`;
      }
      async function analyze(h, box, after) {
        const epoch = drawEpoch;
        const cs = cardsOf(h.cards);
        const stillCurrent = () => epoch === drawEpoch && box;
        if (!cs.length) {
          if (!stillCurrent()) return;
          box.classList.remove("hide");
          box.innerHTML = '<p class="mut">尚未選牌。</p>';
          return;
        }
        if (!SM) {
          if (!stillCurrent()) return;
          box.classList.remove("hide");
          box.innerHTML =
            view(cs) +
            "<p><b>逐位置牌義彙整</b></p>" +
            cs
              .map(
                (x) =>
                  `<p><b>${esc(x.p)}</b>｜${x.d.z}（${x.r ? "逆位" : "正位"}）：${x.r ? x.d.r : x.d.u}${esc(pm(x, h.deck))}</p>`,
              )
              .join("") +
            '<p class="mut">目前環境無法使用 AI 串連解析，以上為本機彙整。</p>';
          return;
        }
        if (!stillCurrent()) return;
        box.classList.remove("hide");
        box.innerHTML = view(cs) + '<p class="mut">AI 解析中…</p>';
        try {
          const r = await SM(promptOf(h, cs), {
            cache: false,
            onText: ({ text }) => {
              if (!stillCurrent()) return;
              box.classList.remove("hide");
              box.innerHTML = view(cs, text);
            },
          });
          if (!stillCurrent()) return;
          h.ai = r.text;
          box.classList.remove("hide");
          box.innerHTML = view(cs, r.text);
          after && after();
        } catch (e) {
          if (!stillCurrent()) return;
          box.classList.remove("hide");
          box.innerHTML =
            view(cs) +
            '<p class="mut">AI 解析失敗（' +
            esc(e.code || e.message || "error") +
            "），可稍後再試。</p>";
        }
      }
      document.addEventListener("click", (e) => {
        if (e.target.id != "ai" || !drawn.length) return;
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
      });
      const rl0 = renderList;
      renderList = function () {
        rl0();
        document.querySelectorAll("#list .entry").forEach((el) => {
          const h = hist.find((x) => x.id == el.dataset.h),
            row = el.querySelector(".entry-acts") || el.querySelector(".del")?.parentNode;
          if (!row) return;
          row.insertAdjacentHTML(
            "afterbegin",
            `<button class="aib">✨ ${h.ai ? "重新" : ""}統整解析</button>`,
          );
          row.insertAdjacentHTML(
            "afterend",
            `<div class="detail aibx${h.ai ? "" : " hide"}">${h.ai ? view(cardsOf(h.cards), h.ai) : ""}</div>`,
          );
          el.querySelector(".aib").onclick = () =>
            analyze(h, el.querySelector(".aibx"), save);
        });
      };
      /* ===== v5: 花色圖示 ===== */
      SU[2][2] = "💨";
      SU[3][2] = "🪨";
      D.forEach((c) => {
        if (c.id >= 22) c.sym = SU[Math.floor((c.id - 22) / 14)][2];
      });
      redraw();
