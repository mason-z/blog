(function () {
  var bar = document.querySelector(".archive-filter");
  if (!bar) return;

  var buttons = bar.querySelectorAll("[data-archive-filter]");
  var articles = document.querySelectorAll(".archive-full-item[data-archive-categories]");
  var tocItems = document.querySelectorAll(".archive-toc__item[data-archive-categories]");
  var tocBlocks = document.querySelectorAll(".archive-toc__block");

  function applyFilter(cat) {
    var key = cat || "";
    articles.forEach(function (el) {
      var cats = (el.getAttribute("data-archive-categories") || "").split("|");
      var show = !key || cats.indexOf(key) !== -1;
      el.hidden = !show;
    });
    tocItems.forEach(function (el) {
      var cats = (el.getAttribute("data-archive-categories") || "").split("|");
      var show = !key || cats.indexOf(key) !== -1;
      el.hidden = !show;
    });
    tocBlocks.forEach(function (block) {
      var visible = block.querySelectorAll(".archive-toc__item:not([hidden])");
      block.hidden = visible.length === 0;
    });
    buttons.forEach(function (btn) {
      var active = (btn.getAttribute("data-archive-filter") || "") === key;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    try {
      var url = new URL(window.location.href);
      if (key) url.searchParams.set("cat", key);
      else url.searchParams.delete("cat");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch (e) {}
    try {
      document.dispatchEvent(new CustomEvent("archive-filter-changed"));
    } catch (e2) {}
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyFilter(btn.getAttribute("data-archive-filter") || "");
    });
  });

  try {
    var init = new URL(window.location.href).searchParams.get("cat") || "";
    if (init) {
      var matched = false;
      buttons.forEach(function (btn) {
        if ((btn.getAttribute("data-archive-filter") || "") === init) matched = true;
      });
      if (matched) applyFilter(init);
    }
  } catch (e) {}
})();
