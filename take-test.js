// The test screen for a student.
//   1. The student verifies name, father's name, date of birth and mobile number.
//   2. The questions appear and the timer runs. The timer starts from a server time saved
//      once in testAttempts, so leaving and coming back cannot reset it.
//   3. If the student leaves the screen (other app, other tab, back, reload) the answers and
//      the verification are erased and they must verify again. The timer keeps running.
//   4. Submit saves the answers once. The answer key for that student can be read only after that.
// The button at the top right switches the whole page between English and Hindi.
// Questions and options are shown as the teacher typed them.
import { db } from "./Firebase.js";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml, tsMs, fmtDateTime, fmtCountdown, openState, LETTERS, attemptId, reportHTML, testIsForStudent, getLang, setLang, pickLang } from "./tests-common.js";
import { tr } from "./tests-i18n.js";
import { normalizeMobile, toISODateInput } from "./profile-utils.js";

const $ = (id) => document.getElementById(id);
const testId = new URLSearchParams(window.location.search).get("id");
const roll = localStorage.getItem("studentRoll");
const aid = testId && roll ? attemptId(testId, roll) : "";
const LEFT_KEY = "ga_test_left_" + aid;
const GRACE_MS = 2 * 60000;

let student = null, test = null, attempt = null, paper = null;
let answers = [], phase = "loading", timerId = null, submitting = false, deadline = 0;
let failCount = 0, lockedUntil = 0;

// ---------- language ----------
let lang = getLang();
const ui = (key, vars) => tr(lang, key, vars);
function fmtDur(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0)), h = Math.floor(m / 60), r = m % 60;
  if (h && r) return h + " " + ui("hr") + " " + r + " " + ui("min");
  if (h) return h + " " + ui("hr");
  return r + " " + ui("min");
}
const marksTxt = (n) => ui(n === 1 ? "marks1" : "marksN", { n });

let blockedView = null, noticeKey = "", formErr = null, fieldErr = {};

function applyStatic() {
  document.documentElement.lang = lang === "hi" ? "hi" : "en-IN";
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = ui(el.getAttribute("data-i18n")); });
  const b = $("langBtn");
  b.textContent = lang === "hi" ? "English" : "हिन्दी";
  b.setAttribute("lang", lang === "hi" ? "en" : "hi");
  document.title = ui("pageTitle") + " - GenAlpha";
}

function redraw() {
  if (phase === "blocked") renderBlocked();
  else if (phase === "verify") renderVerifyTexts();
  else if (phase === "test" && paper) { const y = window.scrollY; renderQuestions(); window.scrollTo(0, y); }
  else if (phase === "result") renderResult();
}

$("langBtn").addEventListener("click", () => {
  lang = lang === "hi" ? "en" : "hi";
  setLang(lang);
  applyStatic();
  Object.keys(fieldErr).forEach((k) => setErr(k, fieldErr[k]));
  if (formErr) setFormErr(formErr.key, formErr.vars);
  redraw();
});

// ---------- screens ----------
const norm = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

function show(which) {
  ["pageLoading", "blocked", "verifyForm", "testView", "resultView"].forEach((id) => { $(id).hidden = id !== which; });
  window.scrollTo(0, 0);
}

function renderBlocked() {
  if (!blockedView) return;
  $("blockedTitle").textContent = ui(blockedView.tk, blockedView.vars);
  $("blockedText").textContent = blockedView.xk ? " " + ui(blockedView.xk, blockedView.vars) : "";
}
function block(tk, xk, vars) {
  phase = "blocked";
  blockedView = { tk, xk, vars };
  renderBlocked();
  show("blocked");
}

// An error is kept as a message key so it can be redrawn when the language changes.
function setErr(key, msgKey) {
  fieldErr[key] = msgKey || "";
  const e = $("e_" + key), w = $("w_" + key);
  if (e) e.textContent = msgKey ? ui(msgKey) : "";
  if (w) w.classList.toggle("invalid", !!msgKey);
}
function setFormErr(key, vars) {
  formErr = key ? { key, vars } : null;
  $("e_form").textContent = key ? ui(key, vars) : "";
}

// ---------- verification ----------
function renderVerifyTexts() {
  const n = $("vNotice");
  n.hidden = !noticeKey; n.textContent = noticeKey ? ui(noticeKey) : "";
  let info = (test.subject || "Test") + " | " + fmtDur(test.durationMinutes) + " | " + marksTxt(test.totalMarks || 0);
  if (attempt) info += " | " + ui("timerRunning");
  $("vInfo").textContent = info;
}

function showVerify(notice) {
  phase = "verify";
  ["name", "father", "dob", "mobile"].forEach((k) => { $("f_" + k).value = ""; setErr(k, ""); });
  setFormErr("");
  noticeKey = notice || "";
  renderVerifyTexts();
  $("verifyBtn").disabled = false;
  show("verifyForm");
  $("f_name").focus();
}

function checkDetails() {
  const typed = { name: norm($("f_name").value), father: norm($("f_father").value), dob: $("f_dob").value, mobile: normalizeMobile($("f_mobile").value) };
  ["name", "father", "dob", "mobile"].forEach((k) => setErr(k, ""));
  let missing = false;
  if (!typed.name) { setErr("name", "errName"); missing = true; }
  if (!typed.father) { setErr("father", "errFather"); missing = true; }
  if (!typed.dob) { setErr("dob", "errDob"); missing = true; }
  if (!typed.mobile) { setErr("mobile", "errMobile"); missing = true; }
  if (missing) return null;
  const s = student;
  const ok = typed.name === norm(s.name || s.studentName)
    && typed.father === norm(s.father)
    && typed.dob === toISODateInput(s.dob)
    && typed.mobile === normalizeMobile(s.contactNumber);
  return ok;
}

$("verifyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormErr("");
  if (Date.now() < lockedUntil) { setFormErr("tooMany", { n: Math.ceil((lockedUntil - Date.now()) / 1000) }); return; }
  const result = checkDetails();
  if (result === null) return;
  if (!result) {
    failCount++;
    if (failCount >= 5) { failCount = 0; lockedUntil = Date.now() + 60000; setFormErr("tooMany", { n: 60 }); }
    else setFormErr("noMatch");
    return;
  }
  failCount = 0;
  $("verifyBtn").disabled = true;
  await startTest();
});

// ---------- the attempt and the questions ----------
async function ensureAttempt() {
  const ref = doc(db, "testAttempts", aid);
  let snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { testId, roll, startedAt: serverTimestamp(), violations: 0 });
    snap = await getDoc(ref);
  }
  return snap.data();
}

async function flushViolation() {
  if (!attempt || !localStorage.getItem(LEFT_KEY)) return;
  localStorage.removeItem(LEFT_KEY);
  try { await updateDoc(doc(db, "testAttempts", aid), { violations: increment(1) }); attempt.violations = (attempt.violations || 0) + 1; }
  catch (e) { console.error("Could not record leaving the screen:", e); }
}

async function startTest() {
  try {
    attempt = await ensureAttempt();
    deadline = tsMs(attempt.startedAt) + (test.durationMinutes || 0) * 60000;
    if (Date.now() >= deadline) { block("endTitle", "endText"); return; }
    const pSnap = await getDoc(doc(db, "testPapers", testId));
    if (!pSnap.exists()) { showVerify("noPaper"); return; }
    paper = pSnap.data();
    await flushViolation();
    answers = new Array((paper.questions || []).length).fill(-1);
    renderQuestions();
    phase = "test"; submitting = false;
    $("submitBtn").disabled = false;
    show("testView");
    armLeaveDetection();
    startTimer();
  } catch (error) {
    console.error(error);
    showVerify("startFail");
  }
}

function renderQuestions() {
  const hiCls = lang === "hi" ? ' lang="hi"' : "";
  $("questions").innerHTML = (paper.questions || []).map((q, i) => {
    const p = pickLang(q, lang), qa = p.lang === "hi" ? ' lang="hi"' : "";   // only older tests that already carry a Hindi version
    return '<div class="tt-q" role="group" aria-labelledby="qh' + i + '" data-i="' + i + '"><h3 id="qh' + i + '"' + hiCls + ">" + escapeHtml(ui("questionOf", { i: i + 1, n: paper.questions.length })) + "</h3>" +
      "<p" + qa + ">" + escapeHtml(p.q) + "</p>" +
      p.options.map((o, k) => '<label class="tt-opt"><input type="radio" name="q' + i + '" value="' + k + '"><span' + qa + "><b>" + LETTERS[k] + ".</b> " + escapeHtml(o) + "</span></label>").join("") +
      "</div>";
  }).join("");
  // Switching language redraws the page, so tick the answers the student already gave.
  answers.forEach((a, i) => {
    if (a < 0) return;
    const r = $("questions").querySelector('input[name="q' + i + '"][value="' + a + '"]');
    if (r) r.checked = true;
  });
  updateProgress();
}

function updateProgress() {
  const done = answers.filter((a) => a !== -1).length;
  $("progress").textContent = ui("progress", { d: done, n: answers.length });
}

$("questions").addEventListener("change", (e) => {
  const input = e.target.closest("input[type=radio]");
  if (!input) return;
  answers[parseInt(input.name.slice(1), 10)] = parseInt(input.value, 10);
  updateProgress();
});

// ---------- timer ----------
function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(sec).padStart(2, "0");
}

function startTimer() {
  clearInterval(timerId);
  const tick = () => {
    const left = deadline - Date.now();
    $("timer").textContent = fmtClock(left);
    $("timer").classList.toggle("low", left < 60000);
    if (left <= 0 && phase === "test") { clearInterval(timerId); submit(true); }
  };
  tick();
  timerId = setInterval(tick, 500);
}

// ---------- leaving the screen ----------
function onVisibility() { if (document.hidden) leave(); else if (phase === "verify") flushViolation(); }
function onPageHide() { leave(); }
function blockMenu(e) { if (phase === "test") e.preventDefault(); }

function armLeaveDetection() {
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  document.addEventListener("contextmenu", blockMenu);
  document.addEventListener("copy", blockMenu);
}
function disarmLeaveDetection() {
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("pagehide", onPageHide);
  document.removeEventListener("contextmenu", blockMenu);
  document.removeEventListener("copy", blockMenu);
}

function leave() {
  if (phase !== "test") return;
  // Erase everything the student had: the questions on screen, their answers, and the verification.
  phase = "verify";
  clearInterval(timerId);
  answers = []; paper = null;
  $("questions").innerHTML = "";
  try { localStorage.setItem(LEFT_KEY, "1"); } catch (e) { /* storage blocked */ }
  disarmLeaveDetection();
  showVerify("leftNow");
}

// ---------- submit and result ----------
async function submit(auto) {
  if (submitting || phase !== "test") return;
  if (!auto) {
    const left = answers.filter((a) => a === -1).length;
    const msg = ui("confirmSubmit") + (left ? " " + (left === 1 ? ui("unanswered1") : ui("unansweredN", { n: left })) : "") + " " + ui("noChange");
    if (!confirm(msg)) return;
  }
  submitting = true; $("submitBtn").disabled = true; clearInterval(timerId);
  try {
    const fresh = await getDoc(doc(db, "testAttempts", aid));
    await setDoc(doc(db, "testSubmissions", aid), {
      testId, roll, name: String(student.name || student.studentName || roll).slice(0, 120), class: test.class,
      answers: answers.slice(), startedAt: attempt.startedAt, submittedAt: serverTimestamp(),
      violations: fresh.exists() ? (fresh.data().violations || 0) : (attempt.violations || 0), auto: !!auto
    });
    phase = "result";
    disarmLeaveDetection();
    await showResult(auto);
  } catch (error) {
    console.error(error);
    submitting = false; $("submitBtn").disabled = false;
    alert(ui(auto ? "failAuto" : "fail"));
  }
}

$("submitBtn").addEventListener("click", () => submit(false));

let resultState = null;
function renderResult() {
  const r = resultState;
  if (!r) return;
  $("resultNote").textContent = (r.auto ? " " + ui("resAuto") : "") + (r.key ? "" : " " + ui("resWait"));
  $("resultBody").innerHTML = r.key ? reportHTML({ test, paper: r.paper, key: r.key, submission: r.sub, lang }) : "";
}

async function showResult(auto) {
  let key = null;
  try { const k = await getDoc(doc(db, "testKeys", aid)); if (k.exists()) key = k.data().answers; } catch (e) { /* key not ready */ }
  const sub = (await getDoc(doc(db, "testSubmissions", aid))).data();
  let pp = paper;
  if (key && (!pp || !pp.questions)) {
    // The paper was erased only if the student left; reload it for the report.
    try { const p = await getDoc(doc(db, "testPapers", testId)); if (p.exists()) pp = p.data(); } catch (e) { /* ignore */ }
  }
  resultState = { auto, key, sub, paper: pp || { questions: [] } };
  phase = "result";
  renderResult();
  show("resultView");
}

// ---------- start up ----------
async function init() {
  applyStatic();
  if (!roll || !testId) { window.location.replace("student-tests.html"); return; }
  try {
    const sSnap = await getDoc(doc(db, "students", roll));
    if (!sSnap.exists()) { window.location.replace("student-login.html"); return; }
    student = sSnap.data();
    const tSnap = await getDoc(doc(db, "tests", testId));
    if (!tSnap.exists() || tSnap.data().status !== "published" || !testIsForStudent(tSnap.data(), student)) { block("naTitle", "naText"); return; }
    test = tSnap.data();

    const done = await getDoc(doc(db, "testSubmissions", aid));
    if (done.exists()) { window.location.replace("test-report.html?id=" + encodeURIComponent(testId)); return; }

    const now = Date.now(), start = tsMs(test.startAt);
    if (openState(test, now) === "upcoming") {
      const update = () => {
        const left = start - Date.now();
        if (left <= 0) { clearInterval(wait); init(); return; }
        blockedView = { tk: "nsTitle", xk: "nsText", vars: { t: fmtDateTime(start), c: fmtCountdown(left) } };
        renderBlocked();
      };
      phase = "blocked"; show("blocked");
      const wait = setInterval(update, 1000); update();
      return;
    }

    const aSnap = await getDoc(doc(db, "testAttempts", aid));
    if (aSnap.exists()) {
      attempt = aSnap.data();
      if (Date.now() > tsMs(attempt.startedAt) + (test.durationMinutes || 0) * 60000 + GRACE_MS) { block("endTitle", "endText"); return; }
    } else if (openState(test, Date.now()) === "closed") {
      block("closedTitle", "closedText", { t: fmtDateTime(tsMs(test.endAt)) });
      return;
    }
    showVerify(localStorage.getItem(LEFT_KEY) ? "leftEarlier" : "");
  } catch (error) {
    console.error(error);
    block("loadTitle", "loadText");
  }
}

init();
