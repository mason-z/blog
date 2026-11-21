import { invalidateListCache } from './posts.mjs';
import { markProdPublicFresh, regeneratePreviewNow } from './preview.mjs';
import { activityLogStatus } from './activity-log.mjs';

/**
 * 手机通道同步、导入等改动了 source/_posts 后：刷新管理列表缓存并重建预览 public/
 * @param {{ rebuildPreview?: boolean, log?: boolean }} [opts]
 */
export function afterBlogSourceChanged(opts = {}) {
  const rebuild = opts.rebuildPreview !== false;
  const log = opts.log !== false;
  invalidateListCache();
  markProdPublicFresh();
  if (rebuild) {
    if (log) activityLogStatus('文章文件已变更，正在同步预览（build:prod）…');
    void regeneratePreviewNow();
  }
}
