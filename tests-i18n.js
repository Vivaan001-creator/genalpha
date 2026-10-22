// Words on the online test screens, in English and Hindi. The student switches with the button at the top right.
// Questions and options are shown exactly as the teacher typed them.
const S = {
  en: {
    pageTitle: "Online Test", pageSub: "Do not leave this screen during the test", loading: "Loading...",
    back: "Back to tests", verifyTitle: "Verify it is you",
    lblName: "Your name", lblFather: "Father's name", lblDob: "Date of birth", lblMobile: "Registered mobile number",
    rulesTitle: "Rules", rulesText: "Once the questions appear, do not switch to another app or tab, and do not go back. If you do, your answers and this verification are erased and you must fill in the details again. The timer keeps running.",
    cancel: "Cancel", verifyBtn: "Verify and start", submit: "Submit test", submitted: "Test submitted",
    errName: "Enter your name.", errFather: "Enter your father's name.", errDob: "Choose your date of birth.", errMobile: "Enter the registered mobile number.",
    tooMany: "Too many wrong tries. Wait {n} seconds and try again.", noMatch: "These details do not match our records. Check them and try again.",
    timerRunning: "Your timer is already running",
    questionOf: "Question {i} of {n}", progress: "Answered {d} of {n}", hiNA: "",
    marks1: "{n} mark", marksN: "{n} marks", hr: "hr", min: "min",
    naTitle: "This test is not available.", naText: "Go back and choose a test from your list.",
    nsTitle: "This test has not started yet.", nsText: "It starts at {t}. Starts in {c}.",
    endTitle: "Your time for this test has ended.", endText: "The test was not submitted. Please tell your teacher.",
    closedTitle: "This test is closed.", closedText: "The last time to start was {t}.",
    loadTitle: "Could not load the test.", loadText: "Please go back and try again.",
    noPaper: "The questions could not be opened. Check your phone's date and time, then verify again.",
    startFail: "Could not start the test. This usually means the start window has closed or the questions are not open yet. Please try again.",
    leftNow: "You left the test screen, so your answers and your verification were erased. Verify your details again to continue. Your timer kept running.",
    leftEarlier: "You left the test screen earlier, so your answers were erased. Verify your details again to continue.",
    confirmSubmit: "Submit your test now?", unanswered1: "You have 1 unanswered question.", unansweredN: "You have {n} unanswered questions.", noChange: "You cannot change answers after this.",
    failAuto: "Time is up, but your test could not be sent. Check your internet and tap Submit test now.", fail: "Could not submit. Check your internet connection and try again.",
    resAuto: "Time ended, so your test was submitted automatically.", resWait: "Your result will be ready after your teacher checks the test.",
    // report
    scoreSummary: "Score summary", outOf: "{s} / {t} marks", correct: "correct", wrong: "wrong", notAnswered: "not answered",
    question: "Question {i}", vCorrect: "Correct", vWrong: "Wrong", vSkipped: "Not answered", tagRight: "Correct answer", tagMine: "Your answer"
  },
  hi: {
    pageTitle: "ऑनलाइन टेस्ट", pageSub: "टेस्ट के दौरान इस स्क्रीन को न छोड़ें", loading: "लोड हो रहा है...",
    back: "टेस्ट सूची पर वापस जाएँ", verifyTitle: "अपनी पहचान सत्यापित करें",
    lblName: "आपका नाम", lblFather: "पिता का नाम", lblDob: "जन्म तिथि", lblMobile: "पंजीकृत मोबाइल नंबर",
    rulesTitle: "नियम", rulesText: "प्रश्न दिखने के बाद किसी दूसरे ऐप या टैब पर न जाएँ और पीछे न जाएँ। ऐसा करने पर आपके उत्तर और यह सत्यापन मिट जाएँगे और आपको जानकारी दोबारा भरनी होगी। टाइमर चलता रहेगा।",
    cancel: "रद्द करें", verifyBtn: "सत्यापित करें और शुरू करें", submit: "टेस्ट जमा करें", submitted: "टेस्ट जमा हो गया",
    errName: "अपना नाम लिखें।", errFather: "पिता का नाम लिखें।", errDob: "जन्म तिथि चुनें।", errMobile: "पंजीकृत मोबाइल नंबर लिखें।",
    tooMany: "बहुत ज़्यादा गलत प्रयास। {n} सेकंड रुककर फिर कोशिश करें।", noMatch: "ये जानकारी हमारे रिकॉर्ड से मेल नहीं खाती। जाँचकर फिर कोशिश करें।",
    timerRunning: "आपका टाइमर पहले से चल रहा है",
    questionOf: "प्रश्न {i} / {n}", progress: "{d} / {n} प्रश्नों के उत्तर दिए",
    marks1: "{n} अंक", marksN: "{n} अंक", hr: "घंटा", min: "मिनट",
    naTitle: "यह टेस्ट उपलब्ध नहीं है।", naText: "वापस जाकर सूची से टेस्ट चुनें।",
    nsTitle: "यह टेस्ट अभी शुरू नहीं हुआ है।", nsText: "यह {t} पर शुरू होगा। शुरू होने में {c}।",
    endTitle: "इस टेस्ट के लिए आपका समय समाप्त हो गया।", endText: "टेस्ट जमा नहीं हुआ। कृपया अपने शिक्षक को बताएँ।",
    closedTitle: "यह टेस्ट बंद हो चुका है।", closedText: "शुरू करने का आखिरी समय {t} था।",
    loadTitle: "टेस्ट लोड नहीं हो सका।", loadText: "कृपया वापस जाकर फिर कोशिश करें।",
    noPaper: "प्रश्न नहीं खुल सके। अपने फ़ोन की तारीख़ और समय जाँचें, फिर दोबारा सत्यापित करें।",
    startFail: "टेस्ट शुरू नहीं हो सका। आम तौर पर इसका मतलब है कि शुरू करने का समय निकल गया है या प्रश्न अभी नहीं खुले हैं। कृपया फिर कोशिश करें।",
    leftNow: "आपने टेस्ट स्क्रीन छोड़ दी, इसलिए आपके उत्तर और सत्यापन मिट गए। आगे बढ़ने के लिए जानकारी फिर से सत्यापित करें। आपका टाइमर चलता रहा।",
    leftEarlier: "आपने पहले टेस्ट स्क्रीन छोड़ी थी, इसलिए आपके उत्तर मिट गए। आगे बढ़ने के लिए जानकारी फिर से सत्यापित करें।",
    confirmSubmit: "क्या आप अभी टेस्ट जमा करना चाहते हैं?", unanswered1: "आपका 1 प्रश्न बिना उत्तर का है।", unansweredN: "आपके {n} प्रश्न बिना उत्तर के हैं।", noChange: "इसके बाद उत्तर बदले नहीं जा सकते।",
    failAuto: "समय समाप्त हो गया, लेकिन आपका टेस्ट भेजा नहीं जा सका। इंटरनेट जाँचें और अभी 'टेस्ट जमा करें' दबाएँ।", fail: "जमा नहीं हो सका। इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।",
    resAuto: "समय समाप्त हो गया, इसलिए आपका टेस्ट अपने आप जमा हो गया।", resWait: "आपका परिणाम शिक्षक के जाँचने के बाद तैयार होगा।",
    scoreSummary: "अंकों का सारांश", outOf: "{s} / {t} अंक", correct: "सही", wrong: "गलत", notAnswered: "उत्तर नहीं दिया",
    question: "प्रश्न {i}", vCorrect: "सही", vWrong: "गलत", vSkipped: "उत्तर नहीं दिया", tagRight: "सही उत्तर", tagMine: "आपका उत्तर"
  }
};

export function tr(lang, key, vars) {
  const dict = S[lang === "hi" ? "hi" : "en"];
  let s = dict[key] !== undefined ? dict[key] : (S.en[key] !== undefined ? S.en[key] : key);
  if (vars) Object.keys(vars).forEach((k) => { s = s.split("{" + k + "}").join(String(vars[k])); });
  return s;
}
