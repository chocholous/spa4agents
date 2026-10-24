// Progressive enhancement only. The site works without this file.
(function () {
  var root = document.documentElement;
  var btn = document.getElementById("theme-btn");
  function current() {
    var forced = root.getAttribute("data-theme");
    if (forced) return forced;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (btn) {
    btn.hidden = false;
    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }
  var buttons = document.querySelectorAll("button.copy");
  Array.prototype.forEach.call(buttons, function (b) {
    b.hidden = false;
    var label = b.textContent;
    b.addEventListener("click", function () {
      var code = b.parentNode.querySelector("code");
      var text = code ? code.textContent : "";
      var done = function () {
        b.textContent = b.getAttribute("data-done") || label;
        setTimeout(function () { b.textContent = label; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else if (code) {
        var r = document.createRange();
        r.selectNodeContents(code);
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
      }
    });
  });
})();
