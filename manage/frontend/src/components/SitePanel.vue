<script setup>
import { ref, watch, onMounted } from 'vue';
import { uploadFile, fetchStats } from '../api';

const props = defineProps({
  data: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['save']);

const tabs = [
  { id: 'appearance', label: '外观与背景' },
  { id: 'archive', label: '归档页' },
  { id: 'categories', label: '分类标准' },
  { id: 'home', label: '首页侧栏' },
  { id: 'weather', label: '顶栏天气' },
  { id: 'meta', label: 'SEO / 统计' },
  { id: 'guestbook', label: '留言墙' },
  { id: 'advanced', label: '高级 JSON' },
];

const activeTab = ref('appearance');
const form = ref(emptyForm());
const jsonText = ref('{}');
const usedCategories = ref([]);
const presetsText = ref('随笔');

function emptyForm() {
  return {
    site_name: { name: '' },
    theme: {
      brand: '',
      landing_title: '',
      landing_lead: '',
      menu: [],
      footer: '',
      dark_mode_bg_image: '',
    },
    site_ui: {
      meta: { site_title: '', site_description: '', favicon: '' },
      analytics: { cf_web_analytics_token: '' },
      home: {
        sr_only_title: '博客',
        stat_total_prefix: '文库共',
        stat_unit: '篇',
        stat_dot: '·',
        stat_page_prefix: '本页',
        aside_categories_title: '分类',
        aside_latest_title: '最新',
        aside_aria_label: '站点侧栏',
      },
      labels: {
        uncategorized: '未分类',
        updated: '更新',
        head_fallback_blog: '博客',
        head_tag_prefix: '标签：',
        tag_page_title_prefix: '标签：',
        category_page_title_prefix: '分类：',
        pagination_prev: '上一页',
        pagination_next: '下一页',
        pagination_aria: '分页',
        pinned_label: '置顶',
      },
      archive: {
        sr_only_all: '博客归档',
        empty_posts: '暂无文章。',
        toc_title: '目录',
        filter_all_label: '全部',
        filter_aria_label: '按分类筛选',
        content_font_size: 0.88,
        title_font_size: 1.05,
        panel_bg_opacity: 0.85,
      },
      header: {
        aria_home: '首页',
        aria_nav: '主导航',
        nav_toggle_label: '菜单',
      },
      weather_chip: {
        enable: true,
        city_label: '深圳',
        latitude: '22.5431',
        longitude: '114.0579',
        show_on_guestbook: true,
      },
      post_defaults: {
        default_category: '随笔',
        category_presets: ['随笔'],
      },
    },
    guestbook: {
      page: { title: '留言墙', intro: '' },
      waline: { serverURL: '' },
    },
  };
}

function deepMerge(base, src) {
  if (!src || typeof src !== 'object') return base;
  const out = { ...base };
  for (const key of Object.keys(src)) {
    const v = src[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[key] = deepMerge(base[key] || {}, v);
    } else if (v !== undefined) {
      out[key] = v;
    }
  }
  return out;
}

function fromData(raw) {
  const base = emptyForm();
  const merged = deepMerge(base, raw || {});
  if (!Array.isArray(merged.theme.menu)) merged.theme.menu = [];
  if (!merged.site_ui.post_defaults) {
    merged.site_ui.post_defaults = { default_category: '随笔', category_presets: ['随笔'] };
  }
  if (!Array.isArray(merged.site_ui.post_defaults.category_presets)) {
    merged.site_ui.post_defaults.category_presets = ['随笔'];
  }
  form.value = merged;
  presetsText.value = merged.site_ui.post_defaults.category_presets.join(', ');
  jsonText.value = JSON.stringify(merged, null, 2);
}

watch(
  () => props.data,
  (d) => fromData(d),
  { immediate: true }
);

onMounted(async () => {
  try {
    const stats = await fetchStats();
    usedCategories.value = stats.categories || [];
  } catch (_) {}
});

function addMenuItem() {
  form.value.theme.menu.push({ label: '', path: '/' });
}

function removeMenuItem(i) {
  form.value.theme.menu.splice(i, 1);
}

function buildPayload() {
  const payload = JSON.parse(JSON.stringify(form.value));
  payload.site_ui.post_defaults.category_presets = presetsText.value
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!payload.site_ui.post_defaults.category_presets.length) {
    payload.site_ui.post_defaults.category_presets = [payload.site_ui.post_defaults.default_category || '随笔'];
  }
  payload.site_ui.archive.content_font_size = Number(payload.site_ui.archive.content_font_size) || 0.88;
  payload.site_ui.archive.title_font_size = Number(payload.site_ui.archive.title_font_size) || 1.05;
  payload.site_ui.archive.panel_bg_opacity = Number(payload.site_ui.archive.panel_bg_opacity);
  if (Number.isNaN(payload.site_ui.archive.panel_bg_opacity)) {
    payload.site_ui.archive.panel_bg_opacity = 0.85;
  }
  return payload;
}

function onSave() {
  emit('save', buildPayload());
}

function onSaveJson() {
  try {
    const parsed = JSON.parse(jsonText.value);
    emit('save', parsed);
  } catch (e) {
    alert('JSON 格式错误：' + (e.message || e));
  }
}

async function onImageUpload(field, e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const res = await uploadFile(file);
    if (field === 'bg') form.value.theme.dark_mode_bg_image = res.url;
    if (field === 'favicon') form.value.site_ui.meta.favicon = res.url;
  } catch (err) {
    alert(err.message || '上传失败');
  }
  e.target.value = '';
}

function applyPreset(name) {
  if (!presetsText.value.split(/[,，]/).map((s) => s.trim()).includes(name)) {
    presetsText.value = presetsText.value.trim()
      ? `${presetsText.value}, ${name}`
      : name;
  }
  form.value.site_ui.post_defaults.default_category = name;
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="border-b border-surface-border px-5 py-3">
      <h2 class="text-sm font-semibold text-white">站点配置</h2>
      <p class="mt-0.5 text-xs text-gray-500">背景、透明度、分类、导航等 · 保存后请点侧边栏「构建站点」</p>
      <div class="mt-3 flex flex-wrap gap-1.5">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          :class="activeTab === t.id ? 'chip-active' : 'chip-inactive'"
          @click="activeTab = t.id"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-gray-500">加载中…</div>

    <div v-else class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      <!-- 外观与背景 -->
      <template v-if="activeTab === 'appearance'">
        <section class="site-section">
          <h3 class="site-section-title">站点名称</h3>
          <label class="field">
            <span class="field-label">网站名称（顶栏与浏览器标题后缀）</span>
            <input v-model="form.site_name.name" class="input" placeholder="meiso" />
          </label>
        </section>

        <section class="site-section">
          <h3 class="site-section-title">首页</h3>
          <label class="field">
            <span class="field-label">首页主标题</span>
            <input v-model="form.theme.landing_title" class="input" />
          </label>
          <label class="field">
            <span class="field-label">首页引言（Markdown）</span>
            <textarea v-model="form.theme.landing_lead" class="textarea min-h-[140px]" />
          </label>
        </section>

        <section class="site-section">
          <h3 class="site-section-title">导航菜单</h3>
          <div v-for="(item, i) in form.theme.menu" :key="i" class="flex gap-2 mb-2">
            <input v-model="item.label" class="input flex-1" placeholder="显示文字" />
            <input v-model="item.path" class="input flex-1 font-mono text-xs" placeholder="/archives/" />
            <button type="button" class="btn-ghost shrink-0 px-2" @click="removeMenuItem(i)">×</button>
          </div>
          <button type="button" class="btn-outline text-xs" @click="addMenuItem">+ 导航项</button>
        </section>

        <section class="site-section">
          <h3 class="site-section-title">页脚</h3>
          <input v-model="form.theme.footer" class="input" placeholder="© meiso" />
        </section>

        <section class="site-section">
          <h3 class="site-section-title">夜间模式背景图</h3>
          <p class="field-hint">关灯模式下全站页面背景；带半透明遮罩保证正文可读。留空则使用纯色背景。</p>
          <div class="flex gap-2">
            <input v-model="form.theme.dark_mode_bg_image" class="input flex-1 font-mono text-xs" placeholder="../../assets/..." />
            <label class="btn-outline shrink-0 cursor-pointer text-xs">
              上传
              <input type="file" class="hidden" accept="image/*" @change="onImageUpload('bg', $event)" />
            </label>
          </div>
          <img
            v-if="form.theme.dark_mode_bg_image"
            :src="form.theme.dark_mode_bg_image"
            alt="背景预览"
            class="mt-2 max-h-32 rounded-lg border border-surface-border object-cover"
          />
        </section>
      </template>

      <!-- 归档页 -->
      <template v-else-if="activeTab === 'archive'">
        <section class="site-section">
          <h3 class="site-section-title">字号</h3>
          <div class="grid grid-cols-2 gap-3">
            <label class="field">
              <span class="field-label">正文正文字号（rem）</span>
              <input v-model.number="form.site_ui.archive.content_font_size" type="number" step="0.02" min="0.72" max="1.2" class="input" />
              <span class="field-hint">默认 0.88，目录与侧栏链接</span>
            </label>
            <label class="field">
              <span class="field-label">文章标题字号（rem）</span>
              <input v-model.number="form.site_ui.archive.title_font_size" type="number" step="0.02" min="0.9" max="1.6" class="input" />
              <span class="field-hint">默认 1.05</span>
            </label>
          </div>
        </section>

        <section class="site-section">
          <h3 class="site-section-title">文字区背景透明度</h3>
          <p class="field-hint">筛选条、左侧目录、文章块背后的遮罩深浅。越大越不透明，夜间壁纸下建议 0.75～0.92。</p>
          <div class="flex items-center gap-4">
            <input
              v-model.number="form.site_ui.archive.panel_bg_opacity"
              type="range"
              min="0"
              max="1"
              step="0.05"
              class="flex-1 accent-accent"
            />
            <span class="w-12 text-right font-mono text-sm text-accent">{{ form.site_ui.archive.panel_bg_opacity }}</span>
          </div>
        </section>

        <section class="site-section">
          <h3 class="site-section-title">文案</h3>
          <div class="grid grid-cols-2 gap-3">
            <label class="field">
              <span class="field-label">左侧目录标题</span>
              <input v-model="form.site_ui.archive.toc_title" class="input" />
            </label>
            <label class="field">
              <span class="field-label">「全部」按钮</span>
              <input v-model="form.site_ui.archive.filter_all_label" class="input" />
            </label>
            <label class="field col-span-2">
              <span class="field-label">筛选区无障碍说明</span>
              <input v-model="form.site_ui.archive.filter_aria_label" class="input" />
            </label>
            <label class="field col-span-2">
              <span class="field-label">无文章提示</span>
              <input v-model="form.site_ui.archive.empty_posts" class="input" />
            </label>
          </div>
        </section>
      </template>

      <!-- 分类标准 -->
      <template v-else-if="activeTab === 'categories'">
        <section class="site-section">
          <h3 class="site-section-title">新建文章默认分类</h3>
          <input v-model="form.site_ui.post_defaults.default_category" class="input max-w-xs" placeholder="随笔" />
        </section>

        <section class="site-section">
          <h3 class="site-section-title">推荐分类（逗号分隔）</h3>
          <p class="field-hint">写文章时可快速点选；不影响已有文章，也不会自动创建 Hexo 分类页。</p>
          <input v-model="presetsText" class="input" placeholder="随笔, 技术, 生活" />
          <div v-if="usedCategories.length" class="mt-3">
            <p class="text-xs text-gray-500 mb-2">当前文章已使用的分类（点击可加入推荐列表）：</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="c in usedCategories"
                :key="c"
                type="button"
                class="chip-inactive"
                @click="applyPreset(c)"
              >
                {{ c }}
              </button>
            </div>
          </div>
        </section>

        <section class="site-section">
          <h3 class="site-section-title">界面文案</h3>
          <div class="grid grid-cols-2 gap-3">
            <label class="field">
              <span class="field-label">侧栏「分类」标题</span>
              <input v-model="form.site_ui.home.aside_categories_title" class="input" />
            </label>
            <label class="field">
              <span class="field-label">未分类占位</span>
              <input v-model="form.site_ui.labels.uncategorized" class="input" />
            </label>
            <label class="field">
              <span class="field-label">分类页标题前缀</span>
              <input v-model="form.site_ui.labels.category_page_title_prefix" class="input" />
            </label>
            <label class="field">
              <span class="field-label">「置顶」角标</span>
              <input v-model="form.site_ui.labels.pinned_label" class="input" />
            </label>
          </div>
        </section>
      </template>

      <!-- 首页侧栏 -->
      <template v-else-if="activeTab === 'home'">
        <section class="site-section">
          <h3 class="site-section-title">列表统计文案</h3>
          <div class="grid grid-cols-2 gap-3">
            <label class="field">
              <span class="field-label">「文库共 N 篇」前缀</span>
              <input v-model="form.site_ui.home.stat_total_prefix" class="input" />
            </label>
            <label class="field">
              <span class="field-label">篇数单位</span>
              <input v-model="form.site_ui.home.stat_unit" class="input" />
            </label>
            <label class="field">
              <span class="field-label">统计中间点</span>
              <input v-model="form.site_ui.home.stat_dot" class="input" />
            </label>
            <label class="field">
              <span class="field-label">「本页 N 篇」前缀</span>
              <input v-model="form.site_ui.home.stat_page_prefix" class="input" />
            </label>
          </div>
        </section>
        <section class="site-section">
          <h3 class="site-section-title">侧栏</h3>
          <div class="grid grid-cols-2 gap-3">
            <label class="field">
              <span class="field-label">「最新」标题</span>
              <input v-model="form.site_ui.home.aside_latest_title" class="input" />
            </label>
            <label class="field">
              <span class="field-label">分页 · 上一页</span>
              <input v-model="form.site_ui.labels.pagination_prev" class="input" />
            </label>
            <label class="field">
              <span class="field-label">分页 · 下一页</span>
              <input v-model="form.site_ui.labels.pagination_next" class="input" />
            </label>
          </div>
        </section>
      </template>

      <!-- 天气 -->
      <template v-else-if="activeTab === 'weather'">
        <section class="site-section">
          <label class="flex items-center gap-2 text-sm text-gray-300">
            <input v-model="form.site_ui.weather_chip.enable" type="checkbox" class="rounded border-surface-border" />
            开启顶栏天气小模块
          </label>
          <label class="flex items-center gap-2 text-sm text-gray-300 mt-3">
            <input v-model="form.site_ui.weather_chip.show_on_guestbook" type="checkbox" class="rounded border-surface-border" />
            留言墙页正文区再显示一块
          </label>
        </section>
        <section class="site-section">
          <div class="grid grid-cols-2 gap-3">
            <label class="field">
              <span class="field-label">城市显示名</span>
              <input v-model="form.site_ui.weather_chip.city_label" class="input" />
            </label>
            <label class="field">
              <span class="field-label">纬度</span>
              <input v-model="form.site_ui.weather_chip.latitude" class="input font-mono text-xs" />
            </label>
            <label class="field">
              <span class="field-label">经度</span>
              <input v-model="form.site_ui.weather_chip.longitude" class="input font-mono text-xs" />
            </label>
          </div>
        </section>
      </template>

      <!-- SEO -->
      <template v-else-if="activeTab === 'meta'">
        <section class="site-section">
          <h3 class="site-section-title">站点信息</h3>
          <label class="field">
            <span class="field-label">站点描述（Markdown，用于 SEO）</span>
            <textarea v-model="form.site_ui.meta.site_description" class="textarea min-h-[120px]" />
          </label>
          <label class="field">
            <span class="field-label">网站图标 URL</span>
            <div class="flex gap-2">
              <input v-model="form.site_ui.meta.favicon" class="input flex-1 font-mono text-xs" />
              <label class="btn-outline shrink-0 cursor-pointer text-xs">
                上传
                <input type="file" class="hidden" accept="image/*" @change="onImageUpload('favicon', $event)" />
              </label>
            </div>
          </label>
        </section>
        <section class="site-section">
          <h3 class="site-section-title">Cloudflare Web Analytics</h3>
          <label class="field">
            <span class="field-label">Beacon Token（留空不加载）</span>
            <input v-model="form.site_ui.analytics.cf_web_analytics_token" class="input font-mono text-xs" />
          </label>
        </section>
      </template>

      <!-- 留言墙 -->
      <template v-else-if="activeTab === 'guestbook'">
        <section class="site-section">
          <label class="field">
            <span class="field-label">页面大标题</span>
            <input v-model="form.guestbook.page.title" class="input" />
          </label>
          <label class="field">
            <span class="field-label">说明段落（Markdown）</span>
            <textarea v-model="form.guestbook.page.intro" class="textarea min-h-[120px]" />
          </label>
          <label class="field">
            <span class="field-label">Waline serverURL（无末尾斜杠）</span>
            <input v-model="form.guestbook.waline.serverURL" class="input font-mono text-xs" placeholder="https://waline.example.com" />
          </label>
        </section>
      </template>

      <!-- 高级 JSON -->
      <template v-else-if="activeTab === 'advanced'">
        <p class="text-xs text-gray-500">完整 site_cms.yml 结构，适合批量修改或与 Decap 后台对照。</p>
        <textarea v-model="jsonText" class="textarea min-h-[420px]" spellcheck="false" />
        <button type="button" class="btn-outline text-xs mt-2" @click="onSaveJson">从 JSON 保存</button>
      </template>
    </div>

    <div v-if="!loading && activeTab !== 'advanced'" class="border-t border-surface-border px-5 py-4">
      <button type="button" class="btn-primary w-full" @click="onSave">保存站点配置</button>
    </div>
  </div>
</template>

<style scoped>
.site-section {
  @apply rounded-xl border border-surface-border bg-surface/50 p-4 space-y-3;
}
.site-section-title {
  @apply text-xs font-semibold uppercase tracking-wider text-gray-400;
}
.field {
  @apply block space-y-1;
}
.field-label {
  @apply text-xs text-gray-500;
}
.field-hint {
  @apply text-[11px] leading-relaxed text-gray-600;
}
</style>
