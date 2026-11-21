/**
 * 文章正文图片灯箱：点击放大，左右切换，范围限定在当前 .article-body 内
 */
(function () {
  var LB_CLASS = 'article-lightbox';
  var OPEN_CLASS = 'article-lightbox-open';

  function collectImages(root) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll('img')).filter(function (img) {
      if (!img.getAttribute('src')) return false;
      if (img.closest('[data-lightbox-ignore]')) return false;
      return true;
    });
  }

  function getAlt(img) {
    return img.getAttribute('alt') || '';
  }

  function ArticleLightbox() {
    this.root = null;
    this.images = [];
    this.index = 0;
    this.el = null;
    this.imgEl = null;
    this.counterEl = null;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.touchStartX = 0;
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.build();
  }

  ArticleLightbox.prototype.build = function () {
    var el = document.createElement('div');
    el.className = LB_CLASS;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="article-lightbox__backdrop" data-lb-close></div>' +
      '<div class="article-lightbox__panel">' +
      '<button type="button" class="article-lightbox__close" data-lb-close aria-label="关闭">&times;</button>' +
      '<button type="button" class="article-lightbox__nav article-lightbox__nav--prev" data-lb-prev aria-label="上一张">&#10094;</button>' +
      '<figure class="article-lightbox__figure">' +
      '<img class="article-lightbox__img" alt="" decoding="async" />' +
      '<figcaption class="article-lightbox__caption"></figcaption>' +
      '</figure>' +
      '<button type="button" class="article-lightbox__nav article-lightbox__nav--next" data-lb-next aria-label="下一张">&#10095;</button>' +
      '<p class="article-lightbox__counter"></p>' +
      '</div>';
    document.body.appendChild(el);
    this.el = el;
    this.imgEl = el.querySelector('.article-lightbox__img');
    this.captionEl = el.querySelector('.article-lightbox__caption');
    this.counterEl = el.querySelector('.article-lightbox__counter');
    this.prevBtn = el.querySelector('[data-lb-prev]');
    this.nextBtn = el.querySelector('[data-lb-next]');

    var self = this;
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-lb-close]')) self.close();
      else if (e.target.closest('[data-lb-prev]')) self.step(-1);
      else if (e.target.closest('[data-lb-next]')) self.step(1);
    });
    el.addEventListener('touchstart', this.onTouchStart, { passive: true });
    el.addEventListener('touchend', this.onTouchEnd, { passive: true });
  };

  ArticleLightbox.prototype.onTouchStart = function (e) {
    if (!e.changedTouches || !e.changedTouches.length) return;
    this.touchStartX = e.changedTouches[0].clientX;
  };

  ArticleLightbox.prototype.onTouchEnd = function (e) {
    if (!e.changedTouches || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(dx) < 48) return;
    this.step(dx > 0 ? -1 : 1);
  };

  ArticleLightbox.prototype.open = function (images, index) {
    if (!images || !images.length) return;
    this.images = images;
    this.index = Math.max(0, Math.min(index, images.length - 1));
    this.render();
    this.el.classList.add(LB_CLASS + '--visible');
    this.el.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add(OPEN_CLASS);
    document.addEventListener('keydown', this.onKeyDown);
  };

  ArticleLightbox.prototype.close = function () {
    this.el.classList.remove(LB_CLASS + '--visible');
    this.el.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove(OPEN_CLASS);
    document.removeEventListener('keydown', this.onKeyDown);
    this.imgEl.removeAttribute('src');
  };

  ArticleLightbox.prototype.step = function (delta) {
    if (this.images.length < 2) return;
    this.index = (this.index + delta + this.images.length) % this.images.length;
    this.render();
  };

  ArticleLightbox.prototype.render = function () {
    var item = this.images[this.index];
    var src = typeof item === 'string' ? item : item.src;
    var alt = typeof item === 'string' ? '' : item.alt || '';
    this.imgEl.src = src;
    this.imgEl.alt = alt;
    if (alt) {
      this.captionEl.textContent = alt;
      this.captionEl.hidden = false;
    } else {
      this.captionEl.textContent = '';
      this.captionEl.hidden = true;
    }
    var multi = this.images.length > 1;
    this.prevBtn.hidden = !multi;
    this.nextBtn.hidden = !multi;
    this.counterEl.textContent = multi ? this.index + 1 + ' / ' + this.images.length : '';
    this.counterEl.hidden = !multi;
  };

  ArticleLightbox.prototype.onKeyDown = function (e) {
    if (e.key === 'Escape') this.close();
    else if (e.key === 'ArrowLeft') this.step(-1);
    else if (e.key === 'ArrowRight') this.step(1);
  };

  function bindArticleBody(articleBody, lightbox) {
    var imgs = collectImages(articleBody);
    if (!imgs.length) return;

    imgs.forEach(function (img) {
      img.classList.add('article-img-zoomable');
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', '查看大图');
    });

    articleBody.addEventListener('click', function (e) {
      var img = e.target.closest('img');
      if (!img || !articleBody.contains(img)) return;
      var list = collectImages(articleBody);
      var idx = list.indexOf(img);
      if (idx < 0) return;
      e.preventDefault();
      lightbox.open(
        list.map(function (node) {
          return { src: node.currentSrc || node.src, alt: getAlt(node) };
        }),
        idx
      );
    });

    articleBody.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var img = e.target.closest('img.article-img-zoomable');
      if (!img || !articleBody.contains(img)) return;
      e.preventDefault();
      img.click();
    });
  }

  function init() {
    var lightbox = new ArticleLightbox();
    document.querySelectorAll('.article-body').forEach(function (body) {
      bindArticleBody(body, lightbox);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
