<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ESSAY_TYPES, ESSAY_TYPE_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import AppEmptyState from '@/components/common/AppEmptyState.vue';
import DesktopPageHeader from '@/components/common/DesktopPageHeader.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import { createEssay, deleteEssay, listMyEssays, listTemplates, updateEssay, type EssayTemplate, type MyEssay } from '@/api/essays';

const templates = ref<EssayTemplate[]>([]);
const mine = ref<MyEssay[]>([]);
const typeFilter = ref('ALL');
const expanded = ref<number[]>([]);
const editing = ref({ id: null as number | null, title: '', essay_type: 'ARGUMENT', content: '' });
const showForm = ref(false);
const error = ref('');
const busy = ref(false);
const activeTab = ref(0);
const toast = ref<{ text: string; tone: 'ok' | 'warn' | 'error' } | null>(null);
let toastTimer: number | undefined;

const filteredTemplates = computed(() =>
  typeFilter.value === 'ALL' ? templates.value : templates.value.filter((t) => t.type === typeFilter.value),
);

function countWords(content: string): number {
  const m = content.match(/[A-Za-z]+(?:['’-][A-Za-z]+)?/g);
  return m?.length ?? 0;
}

// 轻量提示：替代 antd message（避免弹出层脱离 wb 主题）
function notify(text: string, tone: 'ok' | 'warn' | 'error' = 'ok') {
  toast.value = { text, tone };
  if (toastTimer !== undefined) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.value = null; }, 2400);
}

function toggle(id: number) {
  const i = expanded.value.indexOf(id);
  if (i === -1) expanded.value = [...expanded.value, id];
  else expanded.value = expanded.value.filter((x) => x !== id);
}

async function loadAll() {
  error.value = '';
  busy.value = true;
  try {
    templates.value = await listTemplates();
    mine.value = await listMyEssays();
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

function startNew() {
  editing.value = { id: null, title: '', essay_type: 'ARGUMENT', content: '' };
  showForm.value = true;
  activeTab.value = 1;
}

function startEdit(essay: MyEssay) {
  editing.value = { id: essay.id, title: essay.title, essay_type: essay.essay_type, content: essay.content };
  showForm.value = true;
}

async function saveEssay() {
  if (!editing.value.title.trim() || !editing.value.content.trim()) { notify('请填写标题和内容', 'warn'); return; }
  try {
    const payload = { title: editing.value.title.trim(), essay_type: editing.value.essay_type, content: editing.value.content };
    if (editing.value.id) await updateEssay(editing.value.id, payload);
    else await createEssay(payload);
    notify('已保存');
    showForm.value = false;
    await loadAll();
  } catch (cause) { notify(apiError(cause), 'error'); }
}

async function removeEssay(id: number) {
  try { await deleteEssay(id); notify('已删除'); await loadAll(); }
  catch (cause) { notify(apiError(cause), 'error'); }
}

async function copyTemplate(t: EssayTemplate) {
  try {
    await navigator.clipboard.writeText(`【${t.title}】\n${t.outline ?? ''}\n${t.content}\n\n高分句型：\n${t.keywords.join('\n')}`);
    notify('已复制到剪贴板');
  } catch { notify('复制失败，请手动复制', 'error'); }
}

onMounted(loadAll);
</script>

<template>
  <section class="wb-page essays-page">
    <DesktopPageHeader eyebrow="英语学习" title="作文" description="使用模板和高分句型完成练习，沉淀自己的考场表达。">
      <template #actions><button type="button" class="wb-btn is-primary" @click="startNew">写一篇作文</button></template>
    </DesktopPageHeader>
    <p v-if="error" class="wb-alert page-alert">{{ error }}</p>

    <div class="wb-card essay-workspace">
      <div class="wb-seg workspace-seg">
        <button type="button" class="wb-seg-item" :class="{ 'is-active': activeTab === 0 }" @click="activeTab = 0">
          模板 <em>{{ filteredTemplates.length }}</em>
        </button>
        <button type="button" class="wb-seg-item" :class="{ 'is-active': activeTab === 1 }" @click="activeTab = 1">
          我的作文 <em>{{ mine.length }}</em>
        </button>
      </div>

      <div v-if="activeTab === 0" class="tab-body">
        <p class="wb-notice essay-notice">使用说明：［方括号］= 待替换成你自己的内容；A / B / C = 任选其一</p>
        <div class="wb-seg type-seg">
          <button type="button" class="wb-seg-item" :class="{ 'is-active': typeFilter === 'ALL' }" @click="typeFilter = 'ALL'">全部</button>
          <button
            v-for="t in ESSAY_TYPES"
            :key="t"
            type="button"
            class="wb-seg-item"
            :class="{ 'is-active': typeFilter === t }"
            @click="typeFilter = t"
          >{{ ESSAY_TYPE_LABELS[t] }}</button>
        </div>

        <div v-if="busy && !templates.length" class="wb-skeleton essay-skeleton"><span /><span /></div>
        <div v-else-if="filteredTemplates.length" class="essay-collapse">
          <article v-for="t in filteredTemplates" :key="t.id" class="essay-item">
            <button type="button" class="essay-item-head" :aria-expanded="expanded.includes(t.id)" @click="toggle(t.id)">
              <strong>{{ t.title }}</strong>
              <span class="essay-type-tag">{{ ESSAY_TYPE_LABELS[t.type as keyof typeof ESSAY_TYPE_LABELS] ?? t.type }}</span>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ 'is-open': expanded.includes(t.id) }"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            <div v-if="expanded.includes(t.id)" class="essay-item-body">
              <p class="essay-outline"><strong>结构：</strong>{{ t.outline }}</p>
              <pre class="essay-pre">{{ t.content }}</pre>
              <div class="essay-keywords">
                <strong>高分句型：</strong>
                <div v-for="(kw, i) in t.keywords" :key="i" class="kw-line">{{ i + 1 }}. {{ kw }}</div>
              </div>
              <button type="button" class="wb-btn is-sm copy-btn" @click="copyTemplate(t)">复制模板</button>
            </div>
          </article>
        </div>
        <AppEmptyState v-else title="没有符合条件的模板" description="切换上方的作文类型，或查看全部分类。" />
      </div>

      <div v-else class="tab-body">
        <div v-if="showForm" class="essay-form">
          <label class="wb-field">
            <span class="wb-label">标题</span>
            <input v-model="editing.title" class="wb-input" placeholder="如：My Dream" maxlength="200" />
          </label>
          <label class="wb-field">
            <span class="wb-label">类型</span>
            <select v-model="editing.essay_type" class="wb-select">
              <option v-for="t in ESSAY_TYPES" :key="t" :value="t">{{ ESSAY_TYPE_LABELS[t] }}</option>
            </select>
          </label>
          <label class="wb-field">
            <span class="wb-label">正文</span>
            <textarea v-model="editing.content" class="wb-textarea" rows="8" placeholder="写作文…（可用模板内容起笔）"></textarea>
          </label>
          <div class="essay-word-count">约 {{ countWords(editing.content) }} 词</div>
          <div class="essay-form-actions">
            <button type="button" class="wb-btn is-primary" @click="saveEssay">保存</button>
            <button type="button" class="wb-btn" @click="showForm = false">取消</button>
          </div>
        </div>
        <div v-if="mine.length" class="my-essay-list">
          <article v-for="e in mine" :key="e.id" class="my-essay-item">
            <div class="my-essay-heading">
              <strong>{{ e.title }}</strong>
              <StatusBadge tone="info">{{ ESSAY_TYPE_LABELS[e.essay_type as keyof typeof ESSAY_TYPE_LABELS] ?? e.essay_type }}</StatusBadge>
              <span>{{ e.word_count }} 词 · {{ String(e.updated_at).slice(0, 10) }}</span>
              <button type="button" class="wb-btn is-sm" @click="startEdit(e)">编辑</button>
              <button type="button" class="wb-btn is-sm is-danger" @click="removeEssay(e.id)">删除</button>
            </div>
            <pre class="essay-pre">{{ e.content }}</pre>
          </article>
        </div>
        <AppEmptyState v-else-if="!showForm" title="还没有作文练习" description="从一篇短作文开始，把模板逐步转化为自己的表达。">
          <template #action><button type="button" class="wb-btn is-primary" @click="startNew">写第一篇作文</button></template>
        </AppEmptyState>
      </div>
    </div>

    <Transition name="toast">
      <div v-if="toast" class="page-toast" :class="`is-${toast.tone}`" role="status">{{ toast.text }}</div>
    </Transition>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({ name: 'EssaysView' });
</script>

<style scoped>
.page-alert { margin: 0 0 16px; }
.essay-workspace { overflow: hidden; }

.workspace-seg { margin: 14px 18px 0; }
.type-seg { margin: 0 18px 14px; flex-wrap: wrap; }

.tab-body { padding: 0 0 18px; }
.essay-notice { margin: 0 18px 14px; }

.essay-skeleton { padding: 0 18px; }
.essay-skeleton span { height: 58px; }

.essay-collapse { display: grid; gap: 8px; padding: 0 18px; }
.essay-item { overflow: hidden; border: 1px solid var(--wb-line-soft); border-radius: var(--wb-radius-lg); background: var(--wb-surface); transition: border-color var(--wb-dur) var(--wb-ease), box-shadow var(--wb-dur) var(--wb-ease); }
.essay-item:hover { border-color: var(--wb-brand-bright); box-shadow: var(--wb-shadow-sm); }
.essay-item-head { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 50px; padding: 12px 15px; border: 0; background: transparent; color: var(--wb-ink); text-align: left; }
.essay-item-head strong { min-width: 0; flex: 1; font-size: 14px; font-weight: 600; }
.essay-item-head svg { flex: 0 0 15px; color: var(--wb-faint); transition: transform var(--wb-dur) var(--wb-ease), color var(--wb-dur) var(--wb-ease); }
.essay-item-head svg.is-open { color: var(--wb-brand-deep); transform: rotate(180deg); }
.essay-item-head:hover svg { color: var(--wb-brand-deep); }
.essay-type-tag { flex: 0 0 auto; padding: 2px 8px; border-radius: var(--wb-radius-sm); background: var(--wb-brand-soft); color: var(--wb-brand-deep); font-size: 11px; font-weight: 600; }
.essay-item-body { padding: 0 15px 15px; border-top: 1px solid var(--wb-line-soft); }
.essay-outline { margin: 12px 0 0; color: var(--wb-ink-2); font-size: 13px; line-height: 1.7; }
.essay-keywords { margin-top: 12px; color: var(--wb-ink-2); font-size: 13px; }
.kw-line { margin-top: 5px; color: var(--wb-muted); line-height: 1.7; }
.copy-btn { margin-top: 13px; }

.essay-form { display: grid; gap: 14px; margin: 2px 18px 16px; padding: 18px; border: 1px solid var(--wb-line-soft); border-radius: var(--wb-radius-lg); background: var(--wb-surface-2); }
.essay-word-count { color: var(--wb-faint); text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; }
.essay-form-actions { display: flex; justify-content: flex-end; gap: 10px; }

.my-essay-list { display: grid; gap: 10px; padding: 2px 18px; }
.my-essay-item { padding: 17px; border: 1px solid var(--wb-line-soft); border-radius: var(--wb-radius-lg); background: var(--wb-surface); }
.my-essay-heading { display: flex; align-items: center; gap: 9px; }
.my-essay-heading > strong { color: var(--wb-ink); font-size: 14px; font-weight: 600; }
.my-essay-heading > span:not(.status-pill) { margin-left: auto; color: var(--wb-faint); font-size: 11px; font-variant-numeric: tabular-nums; }

.essay-pre { margin: 12px 0 0; color: var(--wb-ink-2); white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.8; }
.my-essay-item .essay-pre { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 4; }
.essay-item .essay-pre { padding: 12px 13px; border-radius: var(--wb-radius); background: var(--wb-surface-2); font-size: 13.5px; }

.page-toast { position: fixed; right: 28px; bottom: 28px; z-index: 60; padding: 11px 16px; border: 1px solid var(--wb-line-soft); border-radius: var(--wb-radius); background: var(--wb-ink); color: #fff; font-size: 13px; font-weight: 600; box-shadow: var(--wb-shadow-lg); }
.page-toast.is-warn { background: var(--wb-warn); }
.page-toast.is-error { background: var(--wb-danger); }
.toast-enter-active, .toast-leave-active { transition: opacity var(--wb-dur) var(--wb-ease), transform var(--wb-dur) var(--wb-ease); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }

@media (max-width: 700px) {
  .my-essay-heading { align-items: flex-start; flex-wrap: wrap; }
  .my-essay-heading > span:not(.status-pill) { width: 100%; margin-left: 0; }
  .essay-notice, .type-seg, .essay-collapse, .essay-form, .my-essay-list { margin-right: 10px; margin-left: 10px; }
  .essay-collapse, .my-essay-list { padding-right: 0; padding-left: 0; }
  .page-toast { right: 16px; bottom: 16px; left: 16px; }
}
</style>
