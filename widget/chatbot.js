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

  // ---------- styles ----------
  var css =
    ".aicb-btn{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;z-index:999998;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
    ".aicb-btn:hover{transform:scale(1.06)}" +
    ".aicb-btn svg{width:30px;height:30px;fill:#fff}" +
    ".aicb-panel{position:fixed;bottom:92px;right:20px;width:360px;max-width:calc(100vw - 40px);height:480px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.22);z-index:999999;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}" +
    ".aicb-head{padding:14px 16px;color:#fff;font-weight:600;font-size:15px;display:flex;align-items:center;gap:10px}" +
    ".aicb-dot{width:9px;height:9px;border-radius:50%;background:#4ade80;flex:none}" +
    ".aicb-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc}" +
    ".aicb-msg{max-width:82%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.45;word-wrap:break-word;white-space:pre-wrap}" +
    ".aicb-bot{align-self:flex-start;background:#fff;border:1px solid #e2e8f0;border-bottom-left-radius:4px;color:#1e293b}" +
    ".aicb-user{align-self:flex-end;color:#fff;border-bottom-right-radius:4px}" +
    ".aicb-typing{align-self:flex-start;background:#fff;border:1px solid #e2e8f0;border-radius:14px;border-bottom-left-radius:4px;padding:12px 16px;display:flex;gap:5px}" +
    ".aicb-typing span{width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:aicb-b 1.2s infinite}" +
    ".aicb-typing span:nth-child(2){animation-delay:.15s}.aicb-typing span:nth-child(3){animation-delay:.3s}" +
    "@keyframes aicb-b{0%,60%,100%{transform:none;opacity:.5}30%{transform:translateY(-5px);opacity:1}}" +
    ".aicb-form{display:flex;border-top:1px solid #e2e8f0;background:#fff}" +
    ".aicb-input{flex:1;border:none;outline:none;padding:13px 14px;font-size:14px;background:transparent}" +
    ".aicb-send{border:none;color:#fff;font-weight:600;padding:0 18px;cursor:pointer;font-size:14px}" +
    ".aicb-hidden{display:none!important}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var CHAT_SVG =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  var CLOSE_SVG =
    '<svg viewBox="0 0 24 24"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>';

  // ---------- DOM ----------
  var open = false;
  var history = [];

  var btn = el("button", "aicb-btn");
  btn.style.background = CFG.color;
  btn.innerHTML = CHAT_SVG;
  btn.setAttribute("aria-label", "Open chat");
  document.body.appendChild(btn);

  var panel = el("div", "aicb-panel aicb-hidden");
  var head = el(
    "div",
    "aicb-head",
    '<span class="aicb-dot"></span><span>' + esc(CFG.business) + "</span>"
  );
  head.style.background = CFG.color;
  var msgs = el("div", "aicb-msgs");
  var form = el("form", "aicb-form");
  var input = el("input", "aicb-input");
  input.type = "text";
  input.placeholder = "Type your message...";
  input.setAttribute("autocomplete", "off");
  var send = el("button", "aicb-send", "Send");
  send.type = "submit";
  send.style.background = CFG.color;
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
    if (who === "user") m.style.background = CFG.color;
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
