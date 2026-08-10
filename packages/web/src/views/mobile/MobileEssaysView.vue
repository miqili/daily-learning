<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showSuccessToast, showToast } from 'vant';
import { ESSAY_TYPES, ESSAY_TYPE_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import { createEssay, deleteEssay, listMyEssays, listTemplates, updateEssay, type EssayTemplate, type MyEssay } from '@/api/essays';
import MobilePageHeader from '@/components/mobile/MobilePageHeader.vue';

const tab = ref(0);
const templates = ref<EssayTemplate[]>([]);
const mine = ref<MyEssay[]>([]);
const typeFilter = ref('ALL');
const expanded = ref<number[]>([]);
const editing = ref<{ id: number | null; title: string; essay_type: string; content: string }>({
  id: null, title: '', essay_type: 'ARGUMENT', content: '',
});
const showForm = ref(false);
const showTypePicker = ref(false);
const error = ref('');
const busy = ref(false);

const typeColumns = ESSAY_TYPES.map((t) => ({ text: ESSAY_TYPE_LABELS[t] }));

function onPickType({ selectedOptions }: { selectedOptions: Array<{ text: string }> }) {
  const label = selectedOptions[0]?.text;
  const idx = ESSAY_TYPES.findIndex((t) => ESSAY_TYPE_LABELS[t] === label);
  if (idx >= 0) editing.value.essay_type = ESSAY_TYPES[idx];
  showTypePicker.value = false;
}

const filteredTemplates = computed(() =>
  typeFilter.value === 'ALL' ? templates.value : templates.value.filter((t) => t.type === typeFilter.value),
);

const typeLabels = computed(() => ({ ALL: '全部', ...ESSAY_TYPE_LABELS }));

function countWords(content: string): number {
  const m = content.match(/[A-Za-z]+(?:['’-][A-Za-z]+)?/g);
  return m?.length ?? 0;
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
}

function startEdit(essay: MyEssay) {
  editing.value = { id: essay.id, title: essay.title, essay_type: essay.essay_type, content: essay.content };
  showForm.value = true;
}

async function saveEssay() {
  if (!editing.value.title.trim() || !editing.value.content.trim()) { showToast('请填写标题和内容'); return; }
  try {
    const payload = { title: editing.value.title.trim(), essay_type: editing.value.essay_type, content: editing.value.content };
    if (editing.value.id) await updateEssay(editing.value.id, payload);
    else await createEssay(payload);
    showSuccessToast('已保存');
    showForm.value = false;
    await loadAll();
  } catch (cause) { showToast(apiError(cause)); }
}

async function removeEssay(id: number) {
  try { await deleteEssay(id); showSuccessToast('已删除'); await loadAll(); }
  catch (cause) { showToast(apiError(cause)); }
}

async function copyTemplate(t: EssayTemplate) {
  try {
    await navigator.clipboard.writeText(`【${t.title}】\n${t.outline ?? ''}\n${t.content}\n\n高分句型：\n${t.keywords.join('\n')}`);
    showSuccessToast('已复制到剪贴板');
  } catch { showToast('复制失败，请手动复制'); }
}

function toggleTemplate(id: number) {
  expanded.value = expanded.value.includes(id) ? expanded.value.filter((itemId) => itemId !== id) : [...expanded.value, id];
}

onMounted(loadAll);
</script>

<template>
  <main class="study-page essays-page">
    <div class="study-screen">
      <MobilePageHeader title="作文册" eyebrow="英语写作训练" back :action-label="tab === 1 ? (showForm ? '收起' : '新建') : ''" @action="showForm ? showForm = false : startNew()" />

      <div class="study-segmented"><button :class="{ active: tab === 0 }" @click="tab = 0">作文模板</button><button :class="{ active: tab === 1 }" @click="tab = 1">我的作文</button></div>

      <p v-if="error" class="study-error">{{ error }}</p>

      <template v-if="tab === 0">
        <aside class="template-note">［方括号］替换为自己的内容；A / B / C 表示任选其一。</aside>
        <div class="study-filter-row">
          <button v-for="(label, key) in typeLabels" :key="key" class="study-filter" :class="{ active: typeFilter === key }" @click="typeFilter = String(key)">{{ label }}</button>
        </div>
        <div v-if="busy && !templates.length" class="study-loading"><van-loading size="24">正在整理模板…</van-loading></div>
        <section v-else class="template-list">
          <article v-for="(template, index) in filteredTemplates" :key="template.id" class="template-card" :class="{ open: expanded.includes(template.id) }">
            <button class="template-summary" @click="toggleTemplate(template.id)">
              <span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ template.title }}</strong><small>{{ ESSAY_TYPE_LABELS[template.type as keyof typeof ESSAY_TYPE_LABELS] ?? template.type }}</small><i>›</i>
            </button>
            <div v-if="expanded.includes(template.id)" class="template-content">
              <p class="template-outline"><strong>结构</strong>{{ template.outline }}</p>
              <div class="template-body md">{{ template.content }}</div>
              <div class="template-keywords"><strong>高分句型</strong><p v-for="(keywordItem, keywordIndex) in template.keywords" :key="keywordIndex"><span>{{ keywordIndex + 1 }}</span>{{ keywordItem }}</p></div>
              <button class="study-secondary copy-template" @click="copyTemplate(template)">复制模板</button>
            </div>
          </article>
        </section>
      </template>

      <template v-else>
        <div v-if="showForm" class="study-form essay-form">
          <h2 class="study-form-title">{{ editing.id ? '编辑作文' : '写一篇作文' }}</h2>
          <van-field v-model="editing.title" label="标题" placeholder="如：My Dream" maxlength="200" />
          <van-field v-model="editing.essay_type" label="类型" is-link readonly @click="showTypePicker = true" />
          <van-popup v-model:show="showTypePicker" position="bottom">
            <van-picker :columns="typeColumns" @confirm="onPickType" @cancel="showTypePicker = false" />
          </van-popup>
          <van-field v-model="editing.content" label="正文" type="textarea" rows="8" autosize placeholder="写作文…（可用模板内容起笔）" />
          <div class="word-count">约 {{ countWords(editing.content) }} 词</div>
          <div class="essay-form-actions"><button class="study-primary" @click="saveEssay">保存作文</button><button class="study-secondary" @click="showForm = false">取消</button></div>
        </div>

        <button v-else class="new-essay" @click="startNew"><span>＋</span><strong>写一篇新作文</strong><small>从标题开始，记录一次完整练习</small></button>

        <div v-if="mine.length" class="essay-list">
          <article v-for="(essay, index) in mine" :key="essay.id" class="essay-card">
            <div class="essay-top">
              <span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ essay.title }}</strong><small>{{ ESSAY_TYPE_LABELS[essay.essay_type as keyof typeof ESSAY_TYPE_LABELS] ?? essay.essay_type }}</small>
            </div>
            <p class="essay-preview">{{ essay.content.slice(0, 100) }}{{ essay.content.length > 100 ? '…' : '' }}</p>
            <div class="essay-meta">
              <span>{{ essay.word_count }} 词 · {{ String(essay.updated_at).slice(0, 10) }}</span><button @click="startEdit(essay)">编辑</button><button class="danger" @click="removeEssay(essay.id)">删除</button>
            </div>
          </article>
        </div>
        <div v-else-if="!showForm" class="study-empty">还没有作文。<br>从第一篇完整练习开始。</div>
      </template>
    </div>
  </main>
</template>
<style scoped>
.template-note { margin-top: 14px; padding: 10px 12px; border-left: 3px solid var(--app-primary); background:var(--app-primary-soft); color: var(--study-muted); font-family: inherit; font-size: 12px; line-height: 1.6; }.template-list { display: grid; gap: 9px; margin-top: 9px; }.template-card { overflow: hidden; border: 1px solid var(--study-line); border-radius: 12px; background: var(--app-surface); }.template-card.open { background: var(--app-surface); box-shadow: var(--app-shadow-sm); }.template-summary { width: 100%; min-height:58px; display: grid; grid-template-columns: 26px 1fr auto 12px; align-items: center; gap: 8px; padding: 14px; border: 0; background: transparent; color: var(--study-text); text-align: left; }.template-summary > span { color: var(--study-accent); font-family: inherit; font-size: 12px; }.template-summary strong { font-family: inherit; font-size: 14px; }.template-summary small { color: var(--study-muted); font-size: 12px; }.template-summary i { color: var(--study-muted); font-style: normal; transition: transform .2s ease; }.template-card.open .template-summary i { transform: rotate(90deg); }.template-content { padding: 15px 16px 17px 48px; border-top: 1px solid var(--app-border); }.template-outline { margin: 0; color: var(--study-muted); font-size: 12px; line-height: 1.65; }.template-outline strong, .template-keywords > strong { display: block; margin-bottom: 4px; color: var(--study-accent); font-family: inherit; font-size: 12px; }.template-body { margin-top: 13px; white-space: pre-wrap; }.template-keywords { margin-top: 14px; color: var(--study-muted); font-size: 12px; }.template-keywords p { display: grid; grid-template-columns: 20px 1fr; gap: 5px; margin: 7px 0 0; line-height: 1.55; }.template-keywords p span { color: var(--study-accent); font-family: inherit; }.copy-template { min-height: 44px; margin-top: 14px; font-size: 12px; }
.word-count { margin-top: 6px; color: var(--study-muted); text-align: right; font-size: 12px; }.essay-form-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 12px; }.new-essay { width: 100%; min-height:64px; display: grid; grid-template-columns: 36px 1fr; gap: 2px 10px; margin: 14px 0; padding: 15px; border: 1px dashed var(--app-border-strong); border-radius: 12px; background: transparent; color: var(--study-text); text-align: left; }.new-essay > span { grid-row: 1 / span 2; display: grid; place-items: center; color: var(--study-accent); font-family: inherit; font-size: 28px; }.new-essay strong { font-family: inherit; font-size: 14px; }.new-essay small { color: var(--study-muted); font-size: 12px; }.essay-list { display: grid; gap: 9px; }.essay-card { padding: 15px 14px 12px; border: 1px solid var(--study-line); border-radius: 12px; background: var(--app-surface); }.essay-top { display: grid; grid-template-columns: 26px 1fr auto; align-items: center; gap: 8px; }.essay-top > span { color: var(--study-accent); font-family: inherit; font-size: 12px; }.essay-top strong { color: var(--study-ink); font-family: inherit; font-size: 14px; }.essay-top small { color: var(--study-muted); font-size: 12px; }.essay-preview { margin: 10px 0 0 34px; color: var(--study-muted); font-size: 13px; line-height: 1.65; }.essay-meta { display: flex; align-items: center; gap: 6px; margin: 11px 0 0 34px; padding-top: 5px; border-top: 1px solid var(--app-border); color: var(--study-faint); font-size: 12px; }.essay-meta > span { flex: 1; }.essay-meta button { min-width:44px; min-height:44px; padding: 0; border: 0; background: transparent; color: var(--study-ink); font-size: 12px; }.essay-meta button.danger { color: var(--app-danger); }
</style>
