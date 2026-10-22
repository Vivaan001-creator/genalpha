// Shared by every online test page: formatting, the test card, and the report view.
import { escapeHtml } from "./profile-utils.js";
import { tr } from "./tests-i18n.js";
export { escapeHtml };

export const tsMs = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : (v && typeof v.toDate === "function" ? v.toDate().getTime() : (typeof v === "number" ? v : 0)));
export const LETTERS = ["A", "B", "C", "D"];
export const attemptId = (testId, roll) => testId + "_" + roll;

// ---------- Section ----------
// A test belongs to one class AND one section. Older tests have no section and stay visible to the whole class.
export const sameSection = (a, b) => String(a || "").trim().toUpperCase() === String(b || "").trim().toUpperCase();
export const testIsForStudent = (test, student) => !!test && !!student && test.class === student.class && (!test.section || sameSection(test.section, student.section));
export const classLabel = (t) => "Class " + (t.class || "-") + (t.section ? " \u00b7 Section " + t.section : "");

// ---------- English / Hindi ----------
// A question is stored in English (q, options). The Hindi version, when the teacher adds one, is q.hi = { q, options }.
// The right answer is the same position in both, so the answer key does not change.
const LANG_KEY = "ga_test_lang";
export function getLang() { try { return localStorage.getItem(LANG_KEY) === "hi" ? "hi" : "en"; } catch (e) { return "en"; } }
export function setLang(l) { try { localStorage.setItem(LANG_KEY, l === "hi" ? "hi" : "en"); } catch (e) { /* storage blocked */ } }
export const hasHindi = (q) => !!(q && q.hi && q.hi.q && Array.isArray(q.hi.options) && q.hi.options.length === (q.options || []).length);
export const paperHasHindi = (paper) => ((paper && paper.questions) || []).some(hasHindi);
export function pickLang(q, lang) {
  if (lang === "hi" && hasHindi(q)) return { q: q.hi.q, options: q.hi.options, lang: "hi" };
  return { q: q.q, options: q.options || [], lang: "en" };
}
// Draws the English | Hindi switch into host. Call once per page.
export function mountLangToggle(host, current, onChange) {
  host.innerHTML = '<div class="lang-sw" role="group" aria-label="Question language"><button type="button" data-lang="en">English</button><button type="button" data-lang="hi" lang="hi">\u0939\u093f\u0928\u094d\u0926\u0940</button></div>';
  const sync = (l) => host.querySelectorAll("button").forEach((b) => { const on = b.getAttribute("data-lang") === l; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
  sync(current);
  host.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-lang]");
    if (!b) return;
    const l = b.getAttribute("data-lang");
    setLang(l); sync(l); onChange(l);
  });
}

export function fmtDuration(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(m / 60), r = m % 60;
  if (h && r) return h + " hr " + r + " min";
  if (h) return h + (h === 1 ? " hr" : " hr");
  return r + " min";
}

export function fmtDateTime(ms) {
  if (!ms) return "-";
  return new Date(ms).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

export function fmtDay(ms) {
  return ms ? new Date(ms).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}

export function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) return d + "d " + h + "h";
  if (h) return h + "h " + String(m).padStart(2, "0") + "m";
  return m + "m " + String(sec).padStart(2, "0") + "s";
}

export const marksText = (test) => (test.totalMarks || 0) + (test.totalMarks === 1 ? " mark" : " marks");

// Score is worked out from the student's answers and the key, so it never needs to be stored.
export function gradeAnswers(answers, key, marksPerQuestion) {
  let correct = 0, wrong = 0, skipped = 0;
  (key || []).forEach((right, i) => {
    const a = answers && answers[i] !== undefined ? answers[i] : -1;
    if (a === -1 || a === null) skipped++;
    else if (a === right) correct++;
    else wrong++;
  });
  return { correct, wrong, skipped, score: correct * (marksPerQuestion || 0) };
}

// open: 'upcoming' | 'live' | 'closed'
export function openState(test, now) {
  const start = tsMs(test.startAt), end = tsMs(test.endAt);
  if (now < start) return "upcoming";
  if (now > end) return "closed";
  return "live";
}

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

// One test card. Subject in bold, then time and marks in small text, an arrow on the right.
// info = { href, canGo, statusText, statusClass }
export function testCardHTML(test, info) {
  const go = info.canGo
    ? '<a class="t-go" href="' + escapeHtml(info.href) + '" aria-label="' + escapeHtml(info.label) + '">' + ARROW + "</a>"
    : '<span class="t-go off" role="img" aria-label="' + escapeHtml(info.label) + ' (not available yet)">' + ARROW + "</span>";
  return '<article class="t-card ' + escapeHtml(info.statusClass || "") + '" data-test="' + escapeHtml(info.id) + '">' +
    '<div class="t-main"><h3 class="t-subject">' + escapeHtml(test.subject || "Test") + "</h3>" +
    '<p class="t-meta">' + escapeHtml(fmtDuration(test.durationMinutes)) + " &middot; " + escapeHtml(marksText(test)) + (test.bilingual ? ' &middot; English / <span lang="hi">\u0939\u093f\u0928\u094d\u0926\u0940</span>' : "") + "</p>" +
    (test.title ? '<p class="t-title">' + escapeHtml(test.title) + "</p>" : "") +
    '<p class="t-start">Starts ' + escapeHtml(fmtDateTime(tsMs(test.startAt))) + "</p>" +
    '<p class="t-status" data-status>' + escapeHtml(info.statusText || "") + "</p></div>" + go + "</article>";
}

// Result view used by the student, the parent and the teacher.
export function reportHTML({ test, paper, key, submission, lang }) {
  const questions = (paper && paper.questions) || [];
  const answers = (submission && submission.answers) || [];
  const mpq = test.marksPerQuestion || 0;
  const g = gradeAnswers(answers, key, mpq);
  const total = test.totalMarks || questions.length * mpq;
  const pct = total ? Math.round((g.score / total) * 100) : 0;
  const L = lang === "hi" ? "hi" : "en";
  let html = '<section class="t-summary" aria-label="' + escapeHtml(tr(L, "scoreSummary")) + '"><p class="t-score"' + (L === "hi" ? ' lang="hi"' : "") + '>' + tr(L, "outOf", { s: "<span>" + g.score + "</span>", t: total }) + '</p>' +
    '<p class="t-pct">' + pct + '%</p>' +
    '<ul class="t-counts"' + (L === "hi" ? ' lang="hi"' : "") + '><li><strong>' + g.correct + '</strong> ' + tr(L, "correct") + '</li><li><strong>' + g.wrong + '</strong> ' + tr(L, "wrong") + '</li><li><strong>' + g.skipped + '</strong> ' + tr(L, "notAnswered") + '</li></ul></section>';
  questions.forEach((q, i) => {
    const right = key ? key[i] : -1, mine = answers[i] !== undefined ? answers[i] : -1;
    const verdict = mine === -1 ? "skipped" : (mine === right ? "right" : "wrong");
    const pq = pickLang(q, lang || "en"), hiAttr = pq.lang === "hi" ? ' lang="hi"' : "";
    const verdictText = tr(L, verdict === "right" ? "vCorrect" : (verdict === "wrong" ? "vWrong" : "vSkipped"));
    html += '<article class="t-q ' + verdict + '"><header><h3' + (L === "hi" ? ' lang="hi"' : "") + '>' + tr(L, "question", { i: i + 1 }) + '</h3><span class="t-verdict ' + verdict + '"' + (L === "hi" ? ' lang="hi"' : "") + '>' + verdictText + (verdict === "right" ? " +" + mpq : "") + "</span></header>" +
      '<p class="t-qtext"' + hiAttr + '>' + escapeHtml(pq.q) + "</p><ul class=\"t-options\">";
    pq.options.forEach((opt, k) => {
      const isRight = k === right, isMine = k === mine;
      const tag = isRight ? '<em class="tag ok"' + (L === "hi" ? ' lang="hi"' : "") + '>' + tr(L, "tagRight") + '</em>' : (isMine ? '<em class="tag bad"' + (L === "hi" ? ' lang="hi"' : "") + '>' + tr(L, "tagMine") + '</em>' : "");
      const extra = isRight && isMine ? '<em class="tag mine"' + (L === "hi" ? ' lang="hi"' : "") + '>' + tr(L, "tagMine") + '</em>' : "";
      html += '<li class="' + (isRight ? "is-right" : (isMine ? "is-wrong" : "")) + '"><b>' + LETTERS[k] + '.</b> <span' + hiAttr + '>' + escapeHtml(opt) + "</span>" + tag + extra + "</li>";
    });
    html += "</ul></article>";
  });
  return html;
}
