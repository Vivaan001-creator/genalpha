// GenAlpha notifications (shared by Admin, Teacher, Parent and Student dashboards).
// Reads the public "notices" collection in real time. Each device keeps its own
// "last seen" time in localStorage, so the red dot and highlight are per device.
import { db } from "./Firebase.js";
import {
  collection, query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const K_SEEN = "ga_notif_seen";            // ms time the user last opened the bell
const K_ASKED = "ga_notif_perm_asked";     // permission popup answered (yes/no)
const K_FEAT = "ga_notif_feature_shown";   // feature notice ids already highlighted
const K_PUSHED = "ga_notif_pushed";        // ids already shown as system notification

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } };
const ms = (n) => (n.createdAt && n.createdAt.toMillis) ? n.createdAt.toMillis()
  : (n.date && n.date.toMillis) ? n.date.toMillis() : 0;

const css = `
.ga-bell{position:relative}
.ga-dot{position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:50%;background:#e5584a;border:2px solid #0e1326;display:none;animation:gaBlink 1s infinite}
.ga-dot.on{display:block}
@keyframes gaBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(1.25)}}
.ga-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;display:none}
.ga-ov.on{display:block}
.ga-panel{position:fixed;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top,0px));max-width:420px;margin:0 auto;max-height:75vh;overflow:auto;background:var(--surface-card,#fff);color:var(--ink,#241f14);border:1px solid var(--surface-card-border,#ddd);border-radius:18px;box-shadow:0 18px 40px rgba(0,0,0,.3);z-index:9999;display:none;padding:14px}
.ga-panel.on{display:block}
.ga-panel h3{font-size:16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}
.ga-panel h3 button{background:none;border:0;font-size:22px;color:inherit;cursor:pointer}
.ga-item{padding:10px 12px;border-radius:12px;background:var(--paper,#f7f2e4);margin-bottom:8px;font-size:13px}
.ga-item.new{border-left:4px solid #e5584a}
.ga-item.feat{animation:gaGlow 1.2s ease 3;border-left:4px solid #ffb347}
.ga-item b{display:block;font-size:13.5px;margin-bottom:3px}
.ga-item small{opacity:.65}
.ga-badge{background:#ffb347;color:#1c1c1c;border-radius:6px;padding:1px 6px;font-size:10px;font-weight:700;margin-right:6px}
@keyframes gaGlow{0%,100%{box-shadow:none}50%{box-shadow:0 0 0 4px rgba(255,179,71,.55)}}
.ga-ask{position:fixed;left:14px;right:14px;bottom:calc(16px + env(safe-area-inset-bottom,0px));max-width:420px;margin:0 auto;background:#161d3a;color:#fff;border-radius:18px;padding:16px;z-index:10000;box-shadow:0 18px 40px rgba(0,0,0,.4);font-size:13.5px}
.ga-ask div{display:flex;gap:10px;margin-top:12px}
.ga-ask button{flex:1;padding:10px;border-radius:12px;border:0;font-weight:700;cursor:pointer}
.ga-ask .y{background:#ffc72c;color:#1c1c1c}.ga-ask .n{background:rgba(255,255,255,.14);color:#fff}
`;

let items = [];
let firstLoad = true;

function mount() {
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const host = document.querySelector(".header-actions");
  const btn = document.createElement("button");
  btn.className = "header-icon-btn ga-bell"; btn.type = "button";
  btn.setAttribute("aria-label", "Notifications");
  btn.innerHTML = '<i class="fa-regular fa-bell"></i><span class="ga-dot" id="gaDot"></span>';
  if (host) host.insertBefore(btn, host.firstChild);
  else { btn.style.cssText = "position:fixed;top:12px;right:12px;z-index:9000;background:#161d3a"; document.body.appendChild(btn); }

  const ov = document.createElement("div"); ov.className = "ga-ov";
  const panel = document.createElement("div"); panel.className = "ga-panel";
  document.body.append(ov, panel);

  const close = () => { ov.classList.remove("on"); panel.classList.remove("on"); };
  ov.addEventListener("click", close);
  btn.addEventListener("click", () => {
    render(true);
    ov.classList.add("on"); panel.classList.add("on");
    localStorage.setItem(K_SEEN, String(Date.now()));   // red dot goes away
    setDot(false);
  });
  panel.addEventListener("click", (e) => { if (e.target.closest("[data-x]")) close(); });
}

function setDot(on) { const d = document.getElementById("gaDot"); if (d) d.classList.toggle("on", on); }

function render() {
  const panel = document.querySelector(".ga-panel"); if (!panel) return;
  const seen = Number(localStorage.getItem(K_SEEN) || 0);
  const shown = readJson(K_FEAT);
  const body = items.length ? items.map((n) => {
    const isNew = ms(n) > seen;
    const feat = n.type === "feature";
    const hl = feat && !shown.includes(n.id);               // highlight only once per device
    const d = ms(n) ? new Date(ms(n)).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "";
    return `<div class="ga-item${isNew ? " new" : ""}${hl ? " feat" : ""}"><b>${feat ? '<span class="ga-badge">NEW</span>' : ""}${esc(n.title)}</b>${esc(n.description)}<br><small>${d}</small></div>`;
  }).join("") : "<p style='font-size:13px;opacity:.7'>Abhi koi notification nahi hai.</p>";
  panel.innerHTML = `<h3>Notifications <button data-x aria-label="Close">&times;</button></h3>${body}`;
  // after the panel was shown once, never highlight those feature items again
  const ids = items.filter((n) => n.type === "feature").map((n) => n.id);
  localStorage.setItem(K_FEAT, JSON.stringify([...new Set([...shown, ...ids])].slice(-100)));
}

function systemNotify(n) {
  const pushed = readJson(K_PUSHED);
  if (pushed.includes(n.id)) return;
  localStorage.setItem(K_PUSHED, JSON.stringify([...pushed, n.id].slice(-100)));
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try { new Notification(n.type === "feature" ? "New feature: " + n.title : n.title, { body: n.description || "", icon: "icon.png" }); } catch (e) {}
}

function askPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "default" || localStorage.getItem(K_ASKED)) return;
  const box = document.createElement("div"); box.className = "ga-ask";
  box.innerHTML = 'Naye notice aur updates ka notification chahiye?<div><button class="n">No</button><button class="y">Yes</button></div>';
  document.body.appendChild(box);
  box.querySelector(".y").onclick = () => { localStorage.setItem(K_ASKED, "yes"); box.remove(); try { Notification.requestPermission(); } catch (e) {} };
  box.querySelector(".n").onclick = () => { localStorage.setItem(K_ASKED, "no"); box.remove(); };
}

function listen() {
  const q = query(collection(db, "notices"), orderBy("date", "desc"), limit(30));
  onSnapshot(q, (snap) => {
    items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!localStorage.getItem(K_SEEN)) localStorage.setItem(K_SEEN, String(Date.now())); // first install: no flood
    const seen = Number(localStorage.getItem(K_SEEN));
    const fresh = items.filter((n) => ms(n) > seen);
    setDot(fresh.length > 0);
    if (!firstLoad) snap.docChanges().forEach((c) => { if (c.type === "added") systemNotify({ id: c.doc.id, ...c.doc.data() }); });
    else fresh.forEach(systemNotify);
    firstLoad = false;
  }, () => {});
}

function start() { mount(); listen(); setTimeout(askPermission, 1500); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
