<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Alert, Button, Collapse, CollapsePanel, Input, Select, SelectOption, TabPane, Tabs, Textarea, message } from 'ant-design-vue';
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
  activeTab.value = 1;
}

function startEdit(essay: MyEssay) {
  editing.value = { id: essay.id, title: essay.title, essay_type: essay.essay_type, content: essay.content };
  showForm.value = true;
}

async function saveEssay() {
  if (!editing.value.title.trim() || !editing.value.content.trim()) { message.warning('请填写标题和内容'); return; }
  try {
    const payload = { title: editing.value.title.trim(), essay_type: editing.value.essay_type, content: editing.value.content };
    if (editing.value.id) await updateEssay(editing.value.id, payload);
    else await createEssay(payload);
    message.success('已保存');
    showForm.value = false;
    await loadAll();
  } catch (cause) { message.error(apiError(cause)); }
}

async function removeEssay(id: number) {
  try { await deleteEssay(id); message.success('已删除'); await loadAll(); }
  catch (cause) { message.error(apiError(cause)); }
}

async function copyTemplate(t: EssayTemplate) {
  try {
    await navigator.clipboard.writeText(`【${t.title}】\n${t.outline ?? ''}\n${t.content}\n\n高分句型：\n${t.keywords.join('\n')}`);
    message.success('已复制到剪贴板');
  } catch { message.error('复制失败，请手动复制'); }
}

onMounted(loadAll);
</script>

<template>
  <section class="page essays-page">
    <DesktopPageHeader eyebrow="英语学习" title="作文" description="使用模板和高分句型完成练习，沉淀自己的考场表达。">
      <template #actions><Button type="primary" @click="startNew">写一篇作文</Button></template>
    </DesktopPageHeader>
    <p v-if="error" class="error">{{ error }}</p>

    <Tabs v-model:active-key="activeTab" class="essay-workspace">
      <TabPane :key="0" tab="模板">
        <Alert class="essay-notice" type="info" show-icon message="使用说明：［方括号］= 待替换成你自己的内容；A / B / C = 任选其一" />
        <Tabs v-model:active-key="typeFilter" class="essay-type-tabs">
          <TabPane key="ALL" tab="全部" />
          <TabPane v-for="t in ESSAY_TYPES" :key="t" :tab="ESSAY_TYPE_LABELS[t]" />
        </Tabs>
        <div v-if="busy && !templates.length" class="empty">加载中…</div>
        <Collapse v-model:active-key="expanded" class="essay-collapse">
          <CollapsePanel v-for="t in filteredTemplates" :key="t.id">
            <template #header><strong>{{ t.title }}</strong></template>
            <p style="margin:0 0 8px"><strong>结构：</strong>{{ t.outline }}</p>
            <pre class="essay-pre">{{ t.content }}</pre>
            <div style="margin-top:10px"><strong>高分句型：</strong></div>
            <div v-for="(kw, i) in t.keywords" :key="i" class="muted" style="margin-top:4px">{{ i + 1 }}. {{ kw }}</div>
            <Button size="small" style="margin-top:12px" @click="copyTemplate(t)">复制模板</Button>
          </CollapsePanel>
        </Collapse>
      </TabPane>
      <TabPane :key="1" tab="我的作文">
        <div v-if="showForm" class="essay-form">
          <label><span>标题</span><Input v-model:value="editing.title" placeholder="如：My Dream" :maxlength="200" /></label>
          <label><span>类型</span><Select v-model:value="editing.essay_type"><SelectOption v-for="t in ESSAY_TYPES" :key="t" :value="t">{{ ESSAY_TYPE_LABELS[t] }}</SelectOption></Select></label>
          <label><span>正文</span><Textarea v-model:value="editing.content" :rows="8" placeholder="写作文…（可用模板内容起笔）" /></label>
          <div class="essay-word-count">约 {{ countWords(editing.content) }} 词</div>
          <div class="essay-form-actions">
            <Button type="primary" @click="saveEssay">保存</Button>
            <Button @click="showForm = false">取消</Button>
          </div>
        </div>
        <div v-if="mine.length" class="my-essay-list">
          <article v-for="e in mine" :key="e.id" class="my-essay-item">
            <div class="my-essay-heading">
              <strong>{{ e.title }}</strong>
              <StatusBadge tone="info">{{ ESSAY_TYPE_LABELS[e.essay_type as keyof typeof ESSAY_TYPE_LABELS] ?? e.essay_type }}</StatusBadge>
              <span>{{ e.word_count }} 词 · {{ String(e.updated_at).slice(0, 10) }}</span>
              <Button size="small" @click="startEdit(e)">编辑</Button>
              <Button size="small" danger @click="removeEssay(e.id)">删除</Button>
            </div>
            <pre class="essay-pre">{{ e.content }}</pre>
          </article>
        </div>
        <AppEmptyState v-else-if="!showForm" title="还没有作文练习" description="从一篇短作文开始，把模板逐步转化为自己的表达。"><template #action><Button type="primary" @click="startNew">写第一篇作文</Button></template></AppEmptyState>
      </TabPane>
    </Tabs>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({ name: 'EssaysView' });
</script>

<style scoped>
.essays-page{max-width:1160px}.essay-workspace{overflow:hidden;border:1px solid var(--app-border);border-radius:10px;background:#fff;box-shadow:var(--app-shadow-sm)}.essay-workspace>:deep(.ant-tabs-nav){height:52px;margin:0;padding:0 18px;border-bottom:1px solid var(--app-border)}.essay-workspace>:deep(.ant-tabs-nav::before){border:0}.essay-workspace>:deep(.ant-tabs-nav .ant-tabs-tab){font-size:13px}.essay-workspace>:deep(.ant-tabs-content-holder){padding-top:14px}.essay-notice{margin:0 18px 12px;border-radius:8px}.essay-type-tabs{margin:0 18px 12px}.essay-type-tabs :deep(.ant-tabs-nav){margin-bottom:0}.essay-collapse{margin:0 18px 18px;border-color:var(--app-border);background:#fff}.essay-collapse :deep(.ant-collapse-header){padding:14px 16px!important;font-size:13px}.essay-collapse :deep(.ant-collapse-content-box){color:var(--app-text);font-size:13px;line-height:1.7}.essay-form{display:grid;gap:14px;margin:2px 18px 16px;padding:18px;border:1px solid var(--app-border);border-radius:8px;background:#fff}.essay-form label{display:grid;gap:6px}.essay-form label>span{color:var(--app-muted);font-size:12px}.essay-word-count{text-align:right;color:var(--app-faint);font-size:12px}.essay-form-actions{display:flex;justify-content:flex-end;gap:10px}.my-essay-list{display:grid;gap:10px;padding:2px 18px 18px}.my-essay-item{padding:17px;border:1px solid var(--app-border);border-radius:8px;background:#fff}.my-essay-heading{display:flex;align-items:center;gap:9px}.my-essay-heading>strong{font-size:14px;font-weight:600}.my-essay-heading>span:not(.status-pill){margin-left:auto;color:var(--app-muted);font-size:11px}.essay-pre{margin:12px 0 0;white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.8;color:#344054}.my-essay-item .essay-pre{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:4}
@media(max-width:700px){.my-essay-heading{align-items:flex-start;flex-wrap:wrap}.my-essay-heading>span:not(.status-pill){width:100%;margin-left:0}.essay-notice,.essay-type-tabs,.essay-collapse{margin-right:10px;margin-left:10px}}
</style>
