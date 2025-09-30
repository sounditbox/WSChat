const $ = (sel) => document.querySelector(sel);

const statusEl = $("#status");
const listEl = $("#messageList");
const msgInput = $("#message");
const sendBtn = $("#send");
const userInput = $("#username");
const autoScrollEl = $("#autoScroll");
const wsUrlEl = $("#wsUrl");

const params = new URLSearchParams(location.search);
const override = params.get("ws");
const defaultHost = location.hostname || "localhost";
const defaultPort = location.port || "8000";
const WS_URL = override || `ws://${defaultHost}:${defaultPort}`;
wsUrlEl.textContent = WS_URL;

let socket;
let backoff = 500;
const backoffMax = 30000;
let manualClose = false;

function setStatus(text, variant) {
  statusEl.textContent = text;
  statusEl.className = "badge " + (variant ? `text-bg-${variant}` : "text-bg-secondary");
}

function formatTime(t) {
  try {
    const date = t ? new Date(t) : new Date();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function autoscroll() {
  if (!autoScrollEl.checked) return;
  const messages = $("#messages");
  messages.scrollTop = messages.scrollHeight;
}

function createBubble({ text, ts, outgoing = false, system = false, user = "" }) {
  const li = document.createElement("li");
  li.className = "d-flex mb-2";

  const wrapper = document.createElement("div");
  wrapper.className = [
    "p-2",
    "rounded-3",
    "shadow-sm",
    system ? "bg-secondary-subtle text-body-secondary" : (outgoing ? "bg-primary text-white" : "bg-light"),
    "ms-auto".repeat(outgoing ? 1 : 0) // right align for outgoing
  ].join(" ").trim();

  const header = document.createElement("div");
  header.className = "d-flex align-items-center gap-2 mb-1";
  if (user && !system) {
    const name = document.createElement("span");
    name.className = "badge text-bg-" + (outgoing ? "primary" : "secondary");
    name.textContent = user;
    header.appendChild(name);
  }
  const time = document.createElement("small");
  time.className = "text-body-secondary";
  time.textContent = formatTime(ts);
  header.appendChild(time);

  const body = document.createElement("div");
  body.className = "fw-normal";
  body.textContent = text;

  wrapper.appendChild(header);
  wrapper.appendChild(body);

  li.appendChild(wrapper);
  return li;
}

function addSystem(text, ts) {
  const li = createBubble({ text, ts, system: true });
  listEl.appendChild(li);
  autoscroll();
}

function addMessage({ text, ts, user = "", outgoing = false }) {
  const li = createBubble({ text, ts, user, outgoing });
  listEl.appendChild(li);
  autoscroll();
}

function parseIncoming(data) {
  // Expect JSON: { type, message, user?, t? } but also handle plain text
  try {
    const obj = JSON.parse(data);
    const type = obj.type || "message";
    const text = obj.message || "";
    const user = obj.user || "";
    const ts = obj.t || Date.now();

    if (type === "connect") return addSystem(text || "Пользователь подключился", ts);
    if (type === "disconnect") return addSystem(text || "Пользователь отключился", ts);
    return addMessage({ text, ts, user, outgoing: user && user === (userInput.value || "") });
  } catch {
    return addMessage({ text: String(data), ts: Date.now() });
  }
}

function sendMessage() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const text = msgInput.value.trim();
  if (!text) return;
  const payload = {
    type: "message",
    message: text,
    user: userInput.value.trim() || undefined,
    t: Date.now()
  };
  socket.send(JSON.stringify(payload));
  addMessage({ text, ts: payload.t, user: payload.user, outgoing: true });
  msgInput.value = "";
  msgInput.focus();
}

function connect() {
  manualClose = false;
  try {
    socket = new WebSocket(WS_URL);
  } catch (e) {
    console.error("Bad WS URL:", e);
    setStatus("Ошибка URL", "danger");
    return;
  }

  setStatus("Подключение…", "warning");

  socket.onopen = () => {
    setStatus("Онлайн", "success");
    backoff = 500;
    addSystem("Соединение установлено", Date.now());
  };

  socket.onmessage = (event) => {
    parseIncoming(event.data);
  };

  socket.onerror = (event) => {
    console.error("WS error:", event);
  };

  socket.onclose = () => {
    setStatus("Отключено", "secondary");
    if (!manualClose) {
      addSystem("Соединение потеряно. Переподключение…", Date.now());
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, backoffMax);
    } else {
      addSystem("Соединение закрыто", Date.now());
    }
  };
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Start
connect();
