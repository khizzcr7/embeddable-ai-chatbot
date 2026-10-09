/* Embeddable AI Chatbot widget - vanilla JS, zero dependencies.
 *
 * Embed with one script tag:
 *   <script src="https://YOUR-BACKEND/widget.js"
 *           data-business="BrightSmile Dental"
 *           data-welcome="Hi! Ask me about our services, hours or booking."
 *           data-color="#0ea5e9"></script>
 *
 * For a longer knowledge base, set window.AIChatbotConfig before the script:
 *   <script>
 *     window.AIChatbotConfig = {
 *       business: "BrightSmile Dental",
 *       welcome: "Hi there! ...",
 *       color: "#0ea5e9",
 *       apiUrl: "https://YOUR-BACKEND/api/chat",
 *       knowledge: "Our hours are Mon-Fri 9am-6pm. ..."
 *     };
 *   </script>
 *   <script src="https://YOUR-BACKEND/widget.js"></script>
 */
(function () {
  "use strict";

  var scriptTag = document.currentScript;
  var pre = window.AIChatbotConfig || {};

  function attr(name, fallback) {
    if (pre[name] !== undefined && pre[name] !== null) return String(pre[name]);
    if (scriptTag && scriptTag.getAttribute("data-" + name)) {
      return scriptTag.getAttribute("data-" + name);
    }
    return fallback;
  }

  var scriptSrc = (scriptTag && scriptTag.src) || "";
  var defaultApi = scriptSrc
    ? scriptSrc.replace(/\/widget\.js.*$/, "/api/chat")
    : "/api/chat";

  var CFG = {
    business: attr("business", "our business"),
    welcome: attr("welcome", "Hi! How can I help you today?"),
    color: attr("color", "#0ea5e9"),
    apiUrl: attr("apiUrl", defaultApi),
    knowledge: attr("knowledge", ""),
  };

  // ---------- helpers ----------
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  // Visual-only helpers: derive darker shade / alpha from the brand color.
  function normHex(hex) {
    var n = String(hex).replace("#", "");
    if (/^[0-9a-fA-F]{3}$/.test(n)) {
      n = n[0] + n[0] + n[1] + n[1] + n[2] + n[2];
    }
    return /^[0-9a-fA-F]{6}$/.test(n) ? n : null;
  }
  function shade(hex, pct) {
    var n = normHex(hex);
    if (!n) return hex;
    var v = parseInt(n, 16);
    var r = (v >> 16) & 255,
      g = (v >> 8) & 255,
      b = v & 255;
    var t = pct < 0 ? 0 : 255,
      p = Math.abs(pct) / 100;
    r = Math.round((t - r) * p + r);
    g = Math.round((t - g) * p + g);
    b = Math.round((t - b) * p + b);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function hexA(hex, a) {
    var n = normHex(hex);
    if (!n) return hex;
    var v = parseInt(n, 16);
    return (
      "rgba(" +
      ((v >> 16) & 255) +
      "," +
      ((v >> 8) & 255) +
      "," +
      (v & 255) +
      "," +
      a +
      ")"
    );
  }

  // ---------- styles ----------
  var css =
    ".aicb-btn{position:fixed;bottom:22px;right:22px;width:64px;height:64px;border-radius:50%;border:none;cursor:pointer;z-index:999998;display:flex;align-items:center;justify-content:center;transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s}" +
    ".aicb-btn:hover{transform:scale(1.08) translateY(-2px)}" +
    ".aicb-btn:active{transform:scale(.94)}" +
    ".aicb-btn::after{content:'';position:absolute;inset:0;border-radius:50%;border:2px solid var(--aicb-c,#0ea5e9);opacity:.55;animation:aicb-pulse 2.4s ease-out infinite;pointer-events:none}" +
    ".aicb-btn svg{width:30px;height:30px;fill:#fff;animation:aicb-pop .28s cubic-bezier(.34,1.56,.64,1)}" +
    "@keyframes aicb-pop{0%{transform:scale(.4) rotate(-40deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}" +
    "@keyframes aicb-pulse{0%{transform:scale(1);opacity:.55}70%{transform:scale(1.55);opacity:0}100%{transform:scale(1.55);opacity:0}}" +
    ".aicb-panel{position:fixed;bottom:100px;right:22px;width:384px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100dvh - 140px);background:rgba(255,255,255,.94);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.65);border-radius:22px;box-shadow:0 30px 70px rgba(2,32,71,.28);z-index:999999;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;transform-origin:bottom right;transition:opacity .28s ease,transform .28s cubic-bezier(.32,.72,.35,1),visibility .28s}" +
    ".aicb-hidden{opacity:0!important;transform:scale(.92) translateY(18px)!important;visibility:hidden!important;pointer-events:none!important}" +
    ".aicb-head{padding:16px 16px 16px 18px;color:#fff;display:flex;align-items:center;gap:13px;position:relative;overflow:hidden;flex:none}" +
    ".aicb-head::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--aicb-c,#0ea5e9),var(--aicb-cd,#0284c7))}" +
    ".aicb-head::after{content:'';position:absolute;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.12);top:-90px;right:-40px;pointer-events:none}" +
    ".aicb-avatar{position:relative;z-index:1;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.22);border:1.5px solid rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:19px;color:#fff;flex:none}" +
    ".aicb-headmeta{position:relative;z-index:1;display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}" +
    ".aicb-name{font-weight:700;font-size:15.5px;letter-spacing:.1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".aicb-status{display:flex;align-items:center;gap:7px;font-size:12.5px;color:rgba(255,255,255,.9);font-weight:500}" +
    ".aicb-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;flex:none;box-shadow:0 0 0 3px rgba(74,222,128,.28);animation:aicb-blink 2s infinite}" +
    "@keyframes aicb-blink{0%,100%{opacity:1}50%{opacity:.5}}" +
    ".aicb-close{position:relative;z-index:1;flex:none;background:rgba(255,255,255,.16);border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s,transform .25s;padding:0}" +
    ".aicb-close:hover{background:rgba(255,255,255,.32);transform:rotate(90deg)}" +
    ".aicb-close svg{width:14px;height:14px;fill:#fff}" +
    ".aicb-msgs{flex:1;overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:10px;background:linear-gradient(180deg,#f8fafc,#f1f5f9);scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent}" +
    ".aicb-msgs::-webkit-scrollbar{width:6px}" +
    ".aicb-msgs::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}" +
    ".aicb-msgs::-webkit-scrollbar-track{background:transparent}" +
    ".aicb-msg{max-width:82%;padding:11px 15px;border-radius:18px;font-size:14px;line-height:1.55;word-wrap:break-word;white-space:pre-wrap;animation:aicb-in .3s cubic-bezier(.21,.9,.35,1)}" +
    "@keyframes aicb-in{0%{opacity:0;transform:translateY(10px) scale(.97)}100%{opacity:1;transform:none}}" +
    ".aicb-bot{align-self:flex-start;background:#fff;border:1px solid #e6edf5;border-bottom-left-radius:6px;color:#1e293b;box-shadow:0 2px 8px rgba(15,40,70,.06)}" +
    ".aicb-user{align-self:flex-end;background:linear-gradient(135deg,var(--aicb-c,#0ea5e9),var(--aicb-cd,#0284c7));color:#fff;border-bottom-right-radius:6px;box-shadow:0 4px 14px rgba(2,32,71,.16)}" +
    ".aicb-typing{align-self:flex-start;background:#fff;border:1px solid #e6edf5;border-radius:18px;border-bottom-left-radius:6px;padding:14px 18px;display:flex;gap:6px;box-shadow:0 2px 8px rgba(15,40,70,.06);animation:aicb-in .25s ease}" +
    ".aicb-typing span{width:8px;height:8px;border-radius:50%;background:#94a3b8;animation:aicb-b 1.3s infinite}" +
    ".aicb-typing span:nth-child(2){animation-delay:.18s}" +
    ".aicb-typing span:nth-child(3){animation-delay:.36s}" +
    "@keyframes aicb-b{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-6px);opacity:1}}" +
    ".aicb-form{display:flex;gap:10px;padding:14px 14px calc(14px + env(safe-area-inset-bottom));background:rgba(255,255,255,.88);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid #e8eef5;align-items:center;flex:none}" +
    ".aicb-input{flex:1;border:1.5px solid #e2e8f0;outline:none;padding:12px 18px;font-size:14px;background:#f1f5f9;border-radius:999px;font-family:inherit;transition:border-color .2s,box-shadow .2s,background .2s;min-width:0;color:#0f172a}" +
    ".aicb-input:focus{border-color:var(--aicb-c,#0ea5e9);background:#fff;box-shadow:0 0 0 4px rgba(14,165,233,.13)}" +
    ".aicb-input::placeholder{color:#94a3b8}" +
    ".aicb-send{flex:none;width:46px;height:46px;border-radius:50%;border:none;background:linear-gradient(135deg,var(--aicb-c,#0ea5e9),var(--aicb-cd,#0284c7));cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(2,32,71,.22);transition:transform .18s,box-shadow .18s;padding:0}" +
    ".aicb-send:hover{transform:scale(1.08) rotate(-8deg)}" +
    ".aicb-send:active{transform:scale(.94)}" +
    ".aicb-send svg{width:20px;height:20px;fill:#fff}" +
    "@media (max-width:480px){.aicb-panel{right:12px;left:12px;width:auto;bottom:96px;height:calc(100dvh - 210px);max-height:none}.aicb-btn{bottom:18px;right:18px}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var CHAT_SVG =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  var CLOSE_SVG =
    '<svg viewBox="0 0 24 24"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>';
  var SEND_SVG =
    '<svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>';
  var X_SVG =
    '<svg viewBox="0 0 24 24"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>';

  var brandDark = shade(CFG.color, -28);
  var grad = "linear-gradient(135deg," + CFG.color + " 0%," + brandDark + " 100%)";

  // ---------- DOM ----------
  var open = false;
  var history = [];

  var btn = el("button", "aicb-btn");
  btn.style.setProperty("--aicb-c", CFG.color);
  btn.style.background = grad;
  btn.style.boxShadow =
    "0 10px 30px rgba(2,32,71,.35), 0 0 26px " + hexA(CFG.color, 0.4);
  btn.innerHTML = CHAT_SVG;
  btn.setAttribute("aria-label", "Open chat");
  document.body.appendChild(btn);

  var panel = el("div", "aicb-panel aicb-hidden");
  panel.style.setProperty("--aicb-c", CFG.color);
  panel.style.setProperty("--aicb-cd", brandDark);
  var initial = esc(
    (CFG.business || "A").trim().charAt(0).toUpperCase() || "A"
  );
  var head = el(
    "div",
    "aicb-head",
    '<span class="aicb-avatar">' +
      initial +
      "</span>" +
      '<span class="aicb-headmeta"><span class="aicb-name">' +
      esc(CFG.business) +
      '</span><span class="aicb-status"><span class="aicb-dot"></span>Online &middot; replies instantly</span></span>' +
      '<button class="aicb-close" aria-label="Close chat">' +
      X_SVG +
      "</button>"
  );
  head
    .querySelector(".aicb-close")
    .addEventListener("click", function (e) {
      e.stopPropagation();
      if (open) toggle();
    });
  var msgs = el("div", "aicb-msgs");
  var form = el("form", "aicb-form");
  var input = el("input", "aicb-input");
  input.type = "text";
  input.placeholder = "Type your message...";
  input.setAttribute("autocomplete", "off");
  var send = el("button", "aicb-send", SEND_SVG);
  send.type = "submit";
  send.setAttribute("aria-label", "Send message");
  form.appendChild(input);
  form.appendChild(send);
  panel.appendChild(head);
  panel.appendChild(msgs);
  panel.appendChild(form);
  document.body.appendChild(panel);

  function toggle() {
    open = !open;
    panel.classList.toggle("aicb-hidden", !open);
    btn.innerHTML = open ? CLOSE_SVG : CHAT_SVG;
    if (open) input.focus();
  }
  btn.addEventListener("click", toggle);

  function addMsg(text, who) {
    var m = el("div", "aicb-msg aicb-" + who, esc(text));
    msgs.appendChild(m);
    msgs.scrollTop = msgs.scrollHeight;
    return m;
  }

  function addTyping() {
    var t = el(
      "div",
      "aicb-typing",
      "<span></span><span></span><span></span>"
    );
    msgs.appendChild(t);
    msgs.scrollTop = msgs.scrollHeight;
    return t;
  }

  // welcome message on first open
  var welcomed = false;
  var origToggle = toggle;
  btn.addEventListener(
    "click",
    function () {
      if (!welcomed && open) {
        welcomed = true;
        setTimeout(function () {
          addMsg(CFG.welcome, "bot");
        }, 350);
      }
    },
    true
  );

  function sendMsg(text) {
    text = text.trim();
    if (!text) return;
    addMsg(text, "user");
    history.push({ role: "user", content: text });
    if (history.length > 12) history = history.slice(-12);
    var typing = addTyping();

    fetch(CFG.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        business_name: CFG.business,
        knowledge: CFG.knowledge,
        history: history.slice(0, -1),
      }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        typing.remove();
        var reply = (data && data.reply) || "Sorry, I could not get a response.";
        addMsg(reply, "bot");
        history.push({ role: "assistant", content: reply });
        if (history.length > 12) history = history.slice(-12);
      })
      .catch(function () {
        typing.remove();
        addMsg(
          "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
          "bot"
        );
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    sendMsg(input.value);
    input.value = "";
  });
})();
