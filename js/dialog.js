/**
 * 頁內名稱輸入（取代 prompt）
 * 依賴頁面 #dlg 結構；installDialogGlobals() 掛到 window
 */
export function createPromptName(getEl) {
  const $ = getEl || ((s) => document.querySelector(s));
  let busy = null;

  function close(v) {
    const dlg = $("#dlg");
    if (dlg) {
      dlg.classList.add("hide");
      dlg.hidden = true;
      dlg.style.display = "none";
    }
    const resolve = busy;
    busy = null;
    if (resolve) resolve(v);
  }

  function promptName(opts) {
    opts = opts || {};
    const dlg = $("#dlg"),
      title = $("#dlg-title"),
      input = $("#dlg-input"),
      ok = $("#dlg-ok"),
      cancel = $("#dlg-cancel"),
      msg = $("#dlg-msg");
    if (!dlg || !input) {
      return Promise.resolve(
        window.prompt(opts.title || "請輸入", opts.value || "") || null,
      );
    }
    if (busy) close(null);
    return new Promise((resolve) => {
      busy = resolve;
      if (title) title.textContent = opts.title || "請輸入名稱";
      if (msg) {
        msg.textContent = opts.msg || "";
        msg.style.display = opts.msg ? "" : "none";
      }
      input.value = opts.value || "";
      input.placeholder = opts.placeholder || "";
      if (ok) ok.textContent = opts.okLabel || "確定";
      if (cancel) cancel.textContent = opts.cancelLabel || "取消";
      dlg.classList.remove("hide");
      dlg.hidden = false;
      dlg.style.display = "";
      setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    });
  }

  function wire() {
    const ok = $("#dlg-ok"),
      cancel = $("#dlg-cancel"),
      input = $("#dlg-input"),
      dlg = $("#dlg");
    if (ok)
      ok.onclick = () => {
        const v = (input && input.value.trim()) || "";
        if (!v) {
          if (input) input.focus();
          return;
        }
        close(v);
      };
    if (cancel) cancel.onclick = () => close(null);
    if (input)
      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          ok && ok.click();
        } else if (e.key === "Escape") {
          e.preventDefault();
          close(null);
        }
      };
    if (dlg)
      dlg.addEventListener("click", (e) => {
        if (e.target === dlg) close(null);
      });
  }

  wire();
  return promptName;
}

export function installDialogGlobals(target = globalThis) {
  const promptName = createPromptName((s) => document.querySelector(s));
  target.promptName = promptName;
  return promptName;
}
