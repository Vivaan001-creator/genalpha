// Keeps every "(c) year" in page footers correct without editing pages each January.
(function () {
  var y = String(new Date().getFullYear());
  var els = document.querySelectorAll("[data-year]");
  for (var i = 0; i < els.length; i++) els[i].textContent = y;
})();
