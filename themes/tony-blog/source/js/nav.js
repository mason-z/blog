(function () {
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
