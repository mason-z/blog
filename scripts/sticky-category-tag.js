'use strict';

/**
 * 分类页、标签页文章列表按 Hexo 置顶字段 sticky（数字，越大越靠前）再按日期排序。
 * 首页由 hexo-generator-index 内已对 posts.data 做 sticky 处理。
 */
function sortByStickyThenDate(arr) {
  if (!arr || !arr.slice) return arr;
  return arr.slice().sort(function (a, b) {
    var sa = Number(a.sticky) || 0;
    var sb = Number(b.sticky) || 0;
    if (sa !== sb) return sb - sa;
    var da = a.date && a.date.valueOf ? a.date.valueOf() : 0;
    var dbb = b.date && b.date.valueOf ? b.date.valueOf() : 0;
    return dbb - da;
  });
}

hexo.extend.filter.register('before_generate', function () {
  const locals = this.locals;
  if (!locals || typeof locals.get !== 'function') return;

  const categories = locals.get('categories');
  if (categories && categories.each) {
    categories.each(function (cat) {
      if (cat.posts && cat.posts.data && cat.posts.data.length) {
        cat.posts.data = sortByStickyThenDate(cat.posts.data);
      }
    });
  }

  const tags = locals.get('tags');
  if (tags && tags.each) {
    tags.each(function (tag) {
      if (tag.posts && tag.posts.data && tag.posts.data.length) {
        tag.posts.data = sortByStickyThenDate(tag.posts.data);
      }
    });
  }
});
