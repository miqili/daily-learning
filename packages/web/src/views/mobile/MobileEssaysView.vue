<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showSuccessToast, showToast } from 'vant';
import { ESSAY_TYPES, ESSAY_TYPE_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import { createEssay, deleteEssay, listMyEssays, listTemplates, updateEssay, type EssayTemplate, type MyEssay } from '@/api/essays';

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

onMounted(loadAll);
</script>

<template>
  <div class="m-page">
    <van-nav-bar title="作文" fixed placeholder />

    <div class="m-body">
      <van-tabs v-model:active="tab" shrink line-width="24">
        <van-tab :name="0" title="模板" />
        <van-tab :name="1" title="我的作文" />
      </van-tabs>

      <p v-if="error" class="m-error">{{ error }}</p>

      <!-- 模板 -->
      <template v-if="tab === 0">
        <van-notice-bar left-icon="info-o" color="#3b82f6" background="#eff6ff" text="使用说明：［方括号］= 待替换成你自己的内容；A / B / C = 任选其一" style="margin-top:8px" />
        <van-tabs v-model:active="typeFilter" shrink line-width="20" style="margin-top:8px">
          <van-tab v-for="(label, key) in typeLabels" :key="key" :name="key" :title="label" />
        </van-tabs>
        <div v-if="busy && !templates.length" class="m-loading"><van-loading size="24">加载中…</van-loading></div>
        <van-collapse v-model="expanded" style="margin-top:14px">
          <van-collapse-item v-for="t in filteredTemplates" :key="t.id" :name="t.id">
            <template #title>
              <div class="tpl-title">
                <span>{{ t.title }}</span>
                <van-tag round plain color="#3b82f6">{{ ESSAY_TYPE_LABELS[t.type as keyof typeof ESSAY_TYPE_LABELS] ?? t.type }}</van-tag>
              </div>
            </template>
            <div class="tpl-outline"><strong>结构：</strong>{{ t.outline }}</div>
            <div class="md" style="margin-top:10px">{{ t.content }}</div>
            <div class="tpl-kw">
              <strong>高分句型：</strong>
              <div v-for="(kw, i) in t.keywords" :key="i" class="kw-item">{{ i + 1 }}. {{ kw }}</div>
            </div>
            <van-button size="small" round type="primary" plain style="margin-top:12px" @click="copyTemplate(t)">复制模板</van-button>
          </van-collapse-item>
        </van-collapse>
      </template>

      <!-- 我的作文 -->
      <template v-else>
        <van-button block round type="primary" icon="plus" style="margin:14px 0" @click="startNew">写一篇作文</van-button>

        <div v-if="showForm" class="form-card">
          <van-field v-model="editing.title" label="标题" placeholder="如：My Dream" maxlength="200" />
          <van-field v-model="editing.essay_type" label="类型" is-link readonly @click="showTypePicker = true" />
          <van-popup v-model:show="showTypePicker" position="bottom">
            <van-picker :columns="typeColumns" @confirm="onPickType" @cancel="showTypePicker = false" />
          </van-popup>
          <van-field v-model="editing.content" label="正文" type="textarea" rows="8" autosize placeholder="写作文…（可用模板内容起笔）" />
          <div class="word-count">约 {{ countWords(editing.content) }} 词</div>
          <div style="display:flex;gap:10px;margin-top:12px">
            <van-button block round type="primary" @click="saveEssay">保存</van-button>
            <van-button block round plain @click="showForm = false">取消</van-button>
          </div>
        </div>

        <div v-if="mine.length" class="essay-list">
          <div v-for="e in mine" :key="e.id" class="essay-card">
            <div class="essay-top">
              <strong>{{ e.title }}</strong>
              <van-tag round plain color="#3b82f6">{{ ESSAY_TYPE_LABELS[e.essay_type as keyof typeof ESSAY_TYPE_LABELS] ?? e.essay_type }}</van-tag>
            </div>
            <p class="essay-preview">{{ e.content.slice(0, 80) }}…</p>
            <div class="essay-meta">
              <span>{{ e.word_count }} 词</span>
              <span>{{ String(e.updated_at).slice(0, 10) }}</span>
              <div class="essay-ops">
                <van-button size="mini" plain type="primary" @click="startEdit(e)">编辑</van-button>
                <van-button size="mini" plain type="danger" @click="removeEssay(e.id)">删除</van-button>
              </div>
            </div>
          </div>
        </div>
        <van-empty v-else-if="!showForm" description="还没有作文，点上方「写一篇作文」" />
      </template>
    </div>
  </div>
</template>
<style scoped>
.m-page { max-width: 640px; margin: 0 auto; min-height: 100vh; background: var(--van-background); }
.m-body { padding: 16px; }
.tpl-title { display: flex; align-items: center; gap: 8px; font-size: 14.5px; font-weight: 600; color: var(--van-text-color); }
.tpl-outline { font-size: 12.5px; color: var(--van-text-color-2); line-height: 1.6; }
.tpl-kw { margin-top: 12px; font-size: 12.5px; color: var(--van-text-color-2); }
.tpl-kw strong { color: var(--van-text-color); }
.kw-item { margin-top: 6px; line-height: 1.6; }
.form-card { background: var(--van-background-2); border-radius: 16px; padding: 16px; margin-bottom: 14px; }
.word-count { font-size: 12px; color: var(--van-text-color-3); text-align: right; margin-top: 6px; }
.essay-list { display: grid; gap: 12px; }
.essay-card { background: var(--van-background-2); border-radius: 16px; padding: 15px 16px; box-shadow: 0 1px 3px rgba(16,24,40,.04); }
.essay-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.essay-top strong { font-size: 15px; color: var(--van-text-color); }
.essay-preview { font-size: 12.5px; color: var(--van-text-color-2); margin-top: 8px; line-height: 1.6; }
.essay-meta { display: flex; align-items: center; gap: 10px; margin-top: 10px; font-size: 11px; color: var(--van-text-color-3); }
.essay-ops { margin-left: auto; display: flex; gap: 8px; }
.m-error { color: var(--van-danger-color); font-size: 13px; margin: 12px 4px; }
.m-loading { display: grid; place-items: center; padding: 48px 0; color: var(--van-text-color-3); font-size: 13px; }
</style>
