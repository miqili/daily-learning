<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showSuccessToast, showToast } from 'vant';
import { ESSAY_TYPES, ESSAY_TYPE_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import { createEssay, deleteEssay, listMyEssays, listTemplates, updateEssay, type EssayTemplate, type MyEssay } from '@/api/essays';

const templates = ref<EssayTemplate[]>([]);
const mine = ref<MyEssay[]>([]);
const typeFilter = ref('ALL');
const expanded = ref<number[]>([]);
const editing = ref({ id: null as number | null, title: '', essay_type: 'ARGUMENT', content: '' });
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
  <section class="page" style="max-width:960px">
    <div class="page-heading">
      <div><h1>作文</h1><p class="muted" style="margin:8px 0 0">模板 + 高分句型 + 我的作文，考前背熟 2-3 套模板。</p></div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <van-tabs style="margin-bottom:16px">
      <van-tab title="模板">
        <van-notice-bar left-icon="info-o" color="#3b82f6" background="#eff6ff" text="使用说明：［方括号］= 待替换成你自己的内容；A / B / C = 任选其一" style="margin:12px 0" />
        <van-tabs v-model:active="typeFilter" shrink style="margin:12px 0">
          <van-tab title="全部" name="ALL" />
          <van-tab v-for="t in ESSAY_TYPES" :key="t" :title="ESSAY_TYPE_LABELS[t]" :name="t" />
        </van-tabs>
        <div v-if="busy && !templates.length" class="empty">加载中…</div>
        <van-collapse v-model="expanded">
          <van-collapse-item v-for="t in filteredTemplates" :key="t.id" :name="t.id">
            <template #title><strong>{{ t.title }}</strong></template>
            <p style="margin:0 0 8px"><strong>结构：</strong>{{ t.outline }}</p>
            <pre class="essay-pre">{{ t.content }}</pre>
            <div style="margin-top:10px"><strong>高分句型：</strong></div>
            <div v-for="(kw, i) in t.keywords" :key="i" class="muted" style="margin-top:4px">{{ i + 1 }}. {{ kw }}</div>
            <van-button size="small" round type="primary" plain style="margin-top:12px" @click="copyTemplate(t)">复制模板</van-button>
          </van-collapse-item>
        </van-collapse>
      </van-tab>
      <van-tab title="我的作文">
        <div style="display:flex;justify-content:flex-end;margin:14px 0">
          <van-button type="primary" round icon="plus" @click="startNew">写一篇作文</van-button>
        </div>
        <van-cell-group v-if="showForm" inset style="margin-bottom:14px">
          <van-field v-model="editing.title" label="标题" placeholder="如：My Dream" maxlength="200" />
          <van-field v-model="editing.essay_type" label="类型" is-link readonly @click="showTypePicker = true" />
          <van-field v-model="editing.content" label="正文" type="textarea" rows="8" autosize placeholder="写作文…（可用模板内容起笔）" />
          <div style="text-align:right;font-size:12px;color:#94a3b8;padding:4px 16px">约 {{ countWords(editing.content) }} 词</div>
          <div style="display:flex;gap:10px;padding:12px 16px">
            <van-button block round type="primary" @click="saveEssay">保存</van-button>
            <van-button block round plain @click="showForm = false">取消</van-button>
          </div>
        </van-cell-group>
        <van-popup v-model:show="showTypePicker" position="bottom">
          <van-picker :columns="typeColumns" @confirm="onPickType" @cancel="showTypePicker = false" />
        </van-popup>
        <div v-if="mine.length" style="display:grid;gap:12px">
          <div v-for="e in mine" :key="e.id" class="card card-pad">
            <div style="display:flex;align-items:center;gap:10px">
              <strong>{{ e.title }}</strong>
              <van-tag round plain color="#3b82f6">{{ ESSAY_TYPE_LABELS[e.essay_type as keyof typeof ESSAY_TYPE_LABELS] ?? e.essay_type }}</van-tag>
              <span class="caption" style="margin-left:auto">{{ e.word_count }} 词 · {{ String(e.updated_at).slice(0, 10) }}</span>
              <van-button size="small" plain type="primary" @click="startEdit(e)">编辑</van-button>
              <van-button size="small" plain type="danger" @click="removeEssay(e.id)">删除</van-button>
            </div>
            <pre class="essay-pre" style="margin-top:10px">{{ e.content }}</pre>
          </div>
        </div>
        <van-empty v-else-if="!showForm" description="还没有作文，点上方「写一篇作文」" />
      </van-tab>
    </van-tabs>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({ name: 'EssaysView' });
</script>

<style scoped>
.essay-pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.8; color: #334155; margin: 0; }
</style>
