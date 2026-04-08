(function () {
  var THEME_KEY = "tony-theme";
  var root = document.documentElement;
  var themeBtn = document.getElementById("theme-toggle");

  function isDark() {
    return root.getAttribute("data-theme") === "dark";
  }

  function setTheme(dark) {
    if (dark) root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch (e) {}
    if (themeBtn) {
      themeBtn.setAttribute("aria-pressed", dark ? "true" : "false");
      themeBtn.setAttribute("aria-label", dark ? "切换为日间模式" : "切换为夜间模式");
      themeBtn.setAttribute("title", dark ? "当前：夜间 · 点击切换日间" : "当前：日间 · 点击切换夜间");
    }
  }

  if (themeBtn) {
    setTheme(isDark());
    themeBtn.addEventListener("click", function () {
      setTheme(!isDark());
    });
  }

  var toggle = document.getElementById("nav-toggle");
  var menus = document.getElementById("site-header-menus");
  var header = document.getElementById("site-header");
  if (toggle && menus) {
    toggle.addEventListener("click", function () {
      var open = menus.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  if (header) {
    function onScroll() {
      if (window.scrollY > 48) header.classList.add("site-header--scrolled");
      else header.classList.remove("site-header--scrolled");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* 归档页左侧目录：滚轮减速（系数越小越慢，可按习惯改 0.35～0.6） */
  var toc = document.querySelector(".archive-toc");
  if (toc && toc.scrollHeight > toc.clientHeight) {
    var wheelFactor = 0.42;
    toc.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        var dy = e.deltaY * wheelFactor;
        if (e.deltaMode === 1) dy *= 16;
        toc.scrollTop += dy;
      },
      { passive: false }
    );
  }
})();
