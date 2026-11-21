'use strict';

/** Hexo Post 模型不保留 front matter 的 `private`，请用 `meiso_private: true` */
function isPrivateVal(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function isPrivatePost(post) {
  if (!post) return false;
  if (isPrivateVal(post.meiso_private)) return true;
  if (isPrivateVal(post.private)) return true;
  const raw = String(post.raw || '');
  return /^meiso_private:\s*true\s*$/m.test(raw) || /^private:\s*true\s*$/m.test(raw);
}

hexo.extend.filter.register('before_generate', function () {
  const Post = this.model('Post');
  if (!Post || !Post.find) return;
  const include = Boolean(hexo.config.include_private);
  Post.find({}).forEach(function (post) {
    if (!isPrivatePost(post)) return;
    Post.update({ _id: post._id }, { published: include });
  });
});
