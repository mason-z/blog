/** 文章预览区图片灯箱（与管理后台预览共用逻辑） */

export function collectPreviewImages(root) {
  if (!root) return [];
  return [...root.querySelectorAll('img')].filter((img) => img.src && !img.closest('[data-lightbox-ignore]'));
}

export function createLightboxController() {
  let images = [];
  let index = 0;
  let open = false;
  let onChange = null;

  function setListener(fn) {
    onChange = fn;
  }

  function emit() {
    onChange?.({ open, images, index });
  }

  function renderState() {
    emit();
  }

  function openAt(list, i) {
    if (!list?.length) return;
    images = list;
    index = Math.max(0, Math.min(i, list.length - 1));
    open = true;
    renderState();
  }

  function close() {
    open = false;
    renderState();
  }

  function step(delta) {
    if (!open || images.length < 2) return;
    index = (index + delta + images.length) % images.length;
    renderState();
  }

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
  }

  return {
    setListener,
    openAt,
    close,
    step,
    getState: () => ({ open, images, index }),
  };
}

export function bindPreviewLightbox(root, controller) {
  if (!root || !controller) return () => {};

  const onClick = (e) => {
    const img = e.target.closest('img');
    if (!img || !root.contains(img)) return;
    const list = collectPreviewImages(root);
    const idx = list.indexOf(img);
    if (idx < 0) return;
    e.preventDefault();
    controller.openAt(
      list.map((node) => ({ src: node.currentSrc || node.src, alt: node.alt || '' })),
      idx
    );
  };

  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
