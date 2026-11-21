(function () {
  var toc = document.querySelector(".archive-toc");
  var nav = document.querySelector(".archive-toc__nav");
  if (!toc || !nav) return;

  var headerEl = document.getElementById("site-header");
  var observer = null;
  var activeId = "";

  function visibleArticles() {
    return Array.prototype.filter.call(
      document.querySelectorAll(".archive-full-item[data-archive-categories]"),
      function (el) {
        return !el.hidden;
      }
    );
  }

  function linkForId(id) {
    if (!id) return null;
    var item = nav.querySelector('.archive-toc__item[data-archive-target="' + id + '"]:not([hidden])');
    return item ? item.querySelector(".archive-toc__link") : null;
  }

  function scrollTocToItem(item) {
    if (!item) return;
    var pad = 10;
    var top = relTop(item, nav);
    var itemTop = top;
    var itemBottom = top + item.offsetHeight;
    if (itemTop < toc.scrollTop + pad) {
      toc.scrollTop = Math.max(0, itemTop - pad);
    } else if (itemBottom > toc.scrollTop + toc.clientHeight - pad) {
      toc.scrollTop = itemBottom - toc.clientHeight + pad;
    }
  }

  function relTop(el, root) {
    var top = 0;
    var node = el;
    while (node && node !== root) {
      top += node.offsetTop;
      node = node.offsetParent;
      if (node && !root.contains(node)) break;
    }
    return top;
  }

  function setActive(id, opts) {
    opts = opts || {};
    if (!id) return;
    var link = linkForId(id);
    if (!link) return;
    var changed = id !== activeId;
    activeId = id;

    nav.querySelectorAll(".archive-toc__link.is-active").forEach(function (el) {
      el.classList.remove("is-active");
    });
    link.classList.add("is-active");

    if (changed && opts.scrollToc !== false) {
      var item = link.closest(".archive-toc__item");
      scrollTocToItem(item);
    }
  }

  function pickActiveArticle() {
    var articles = visibleArticles();
    if (!articles.length) {
      activeId = "";
      nav.querySelectorAll(".archive-toc__link.is-active").forEach(function (el) {
        el.classList.remove("is-active");
      });
      return;
    }

    var headerH = headerEl ? headerEl.offsetHeight : 64;
    var probe = headerH + Math.min(window.innerHeight * 0.28, 180);
    var best = null;
    var bestScore = Infinity;

    articles.forEach(function (article) {
      var rect = article.getBoundingClientRect();
      if (rect.bottom <= headerH + 8) return;
      if (rect.top >= window.innerHeight - 24) return;
      var score = Math.abs(rect.top - probe);
      if (score < bestScore) {
        bestScore = score;
        best = article;
      }
    });

    if (!best) best = articles[0];
    setActive(best.id, { scrollToc: true });
  }

  function bindObserver() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(
      function () {
        pickActiveArticle();
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.08, 0.2, 0.4, 0.6, 0.85, 1],
      }
    );
    visibleArticles().forEach(function (article) {
      observer.observe(article);
    });
  }

  var scrollTimer = null;
  function onScroll() {
    if (scrollTimer) return;
    scrollTimer = window.requestAnimationFrame(function () {
      scrollTimer = null;
      pickActiveArticle();
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    pickActiveArticle();
  }, { passive: true });

  nav.addEventListener("click", function (e) {
    var link = e.target.closest(".archive-toc__link");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    if (href.charAt(0) !== "#") return;
    var id = href.slice(1);
    window.setTimeout(function () {
      setActive(id, { scrollToc: true });
    }, 120);
  });

  document.addEventListener("archive-filter-changed", function () {
    activeId = "";
    bindObserver();
    pickActiveArticle();
  });

  bindObserver();
  pickActiveArticle();
})();
