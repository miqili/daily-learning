<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showSuccessToast, showToast } from 'vant';
import { apiError } from '@/api/client';
import { addQuestions, createPaper, getPaper, listPapers, type PaperDetail, type PaperSummary } from '@/api/papers';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import { renderMarkdown } from '@/utils/markdown';

const subjects = ref<SubjectInfo[]>([]);
const papers = ref<PaperSummary[]>([]);
const activeSubject = ref('ALL');
const detail = ref<PaperDetail | null>(null);
const revealed = ref<Set<number>>(new Set());
const error = ref('');
const busy = ref(false);

// 新建试卷
const showCreate = ref(false);
const showSubjectPicker = ref(false);
const createForm = ref({ subject: '', year: 2025, title: '' });
// 录入题目
const showAdd = ref(false);
const addForm = ref({ content: '', passage: '', optA: '', optB: '', optC: '', optD: '', answer: '', score: 5 });
const batchText = ref('');

const subjectTabs = computed(() => [{ name: 'ALL', label: '全部' }, ...subjects.value.map((s) => ({ name: s.name, label: s.name }))]);

const filteredPapers = computed(() =>
  activeSubject.value === 'ALL' ? papers.value : papers.value.filter((p) => p.subject === activeSubject.value),
);

function subjectColor(name: string): string {
  return subjects.value.find((s) => s.name === name)?.color ?? '#64748b';
}

function onPickSubject({ selectedOptions }: { selectedOptions: Array<{ text: string }> }) {
  createForm.value.subject = selectedOptions[0]?.text ?? '';
  showSubjectPicker.value = false;
}

async function load() {
  error.value = '';
  busy.value = true;
  try {
    subjects.value = await listSubjects();
    papers.value = await listPapers();
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function openPaper(id: number) {
  error.value = '';
  busy.value = true;
  try {
    detail.value = await getPaper(id);
    revealed.value.clear();
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

function back() {
  detail.value = null;
}

async function submitCreate() {
  if (!createForm.value.subject || !createForm.value.year) { showToast('请选择科目并填写年份'); return; }
  try {
    await createPaper({ subject: createForm.value.subject, year: Number(createForm.value.year), title: createForm.value.title || undefined });
    showSuccessToast('试卷已创建');
    showCreate.value = false;
    createForm.value = { subject: '', year: new Date().getFullYear(), title: '' };
    await load();
  } catch (cause) { showToast(apiError(cause)); }
}

function buildQuestion() {
  const opts = [addForm.value.optA, addForm.value.optB, addForm.value.optC, addForm.value.optD];
  const hasOpts = opts.some((o) => o.trim());
  return {
    content: addForm.value.content.trim(),
    passage: addForm.value.passage.trim() || undefined,
    options: hasOpts ? opts.map((text, i) => ({ key: 'ABCD'[i], text: text.trim() })) : undefined,
    answer: addForm.value.answer.trim() || undefined,
    score: Number(addForm.value.score) || 5,
  };
}

async function submitOne() {
  if (!addForm.value.content.trim()) { showToast('请填写题干'); return; }
  if (!detail.value) return;
  try {
    await addQuestions(detail.value.id, [buildQuestion()]);
    addForm.value = { content: '', passage: '', optA: '', optB: '', optC: '', optD: '', answer: '', score: 5 };
    showSuccessToast('已录入');
    await openPaper(detail.value.id);
  } catch (cause) { showToast(apiError(cause)); }
}

function parseBatchLine(line: string) {
  const parts = line.split('|').map((s) => s.trim());
  const content = parts[0];
  if (!content) return null;
  if (parts.length >= 6) {
    return {
      content,
      options: parts.slice(1, 5).map((text, i) => ({ key: 'ABCD'[i], text })),
      answer: parts[5] || undefined,
      score: 5,
    };
  }
  if (parts.length === 5) {
    return { content, options: parts.slice(1, 5).map((text, i) => ({ key: 'ABCD'[i], text })), answer: parts[4] || undefined, score: 5 };
  }
  if (parts.length >= 2) {
    return { content, answer: parts[1] || undefined, score: parts.length >= 3 ? Number(parts[2]) || 5 : 5 };
  }
  return { content, score: 5 };
}

async function submitBatch() {
  if (!detail.value) return;
  const questions = batchText.value.split('\n').map((l) => l.trim()).filter(Boolean).map(parseBatchLine).filter((q): q is NonNullable<typeof q> => q !== null);
  if (!questions.length) { showToast('请粘贴题目内容'); return; }
  try {
    await addQuestions(detail.value.id, questions);
    batchText.value = '';
    showSuccessToast(`已批量录入 ${questions.length} 题`);
    await openPaper(detail.value.id);
  } catch (cause) { showToast(apiError(cause)); }
}

onMounted(load);
</script>

<template>
  <div class="m-page">
    <van-nav-bar :title="detail ? `${detail.year} 年${detail.subject}` : '历年真题'" fixed placeholder @click-left="back">
      <template v-if="detail" #left><van-icon name="arrow-left" size="18" /></template>
      <template #right>
        <span v-if="!detail" class="nav-add" @click="showCreate = true">＋ 新建试卷</span>
        <span v-else class="nav-add" @click="showAdd = true">＋ 录入题目</span>
      </template>
    </van-nav-bar>

    <div class="m-body">
      <p v-if="error" class="m-error">{{ error }}</p>

      <!-- 列表 -->
      <template v-if="!detail">
        <van-tabs v-model:active="activeSubject" shrink line-width="20">
          <van-tab v-for="t in subjectTabs" :key="t.name" :name="t.name" :title="t.label" />
        </van-tabs>
        <div v-if="busy && !papers.length" class="m-loading"><van-loading size="24">加载中…</van-loading></div>
        <div v-else class="paper-list">
          <div v-for="paper in filteredPapers" :key="paper.id" class="paper-card" @click="openPaper(paper.id)">
            <span class="paper-year">{{ paper.year }}</span>
            <div class="paper-meta">
              <strong>{{ paper.title }}</strong>
              <span>{{ paper.question_count }} 题</span>
            </div>
            <van-tag v-if="paper.source" round plain color="#94a3b8">{{ paper.source }}</van-tag>
            <van-icon name="arrow" color="#c0c4cc" />
          </div>
          <van-empty v-if="!filteredPapers.length" description="暂无试卷，点右上角「新建试卷」" />
        </div>
      </template>

      <!-- 详情 -->
      <template v-else>
        <div class="paper-head">
          <span class="dot" :style="{ background: subjectColor(detail.subject) }">{{ detail.subject[0] }}</span>
          <div>
            <strong>{{ detail.title }}</strong>
            <span>{{ detail.question_count }} 题 · 共 {{ detail.questions.reduce((s, q) => s + q.score, 0) }} 分</span>
          </div>
        </div>
        <div class="source-note">{{ detail.source || '考生回忆版' }} · 收录于本系统，可右上角继续录入/修正</div>
        <div class="q-list">
          <div v-for="(q, idx) in detail.questions" :key="q.id" class="q-card">
            <div class="q-no">{{ idx + 1 }}.</div>
            <div class="q-body">
              <div v-if="q.passage" class="passage md" v-html="renderMarkdown(q.passage)" />
              <div class="md" v-html="renderMarkdown(q.content)" />
              <div v-if="q.options" class="opts">
                <div v-for="opt in q.options" :key="opt.key" class="opt"><span class="opt-key">{{ opt.key }}</span>{{ opt.text }}</div>
              </div>
              <div class="q-actions">
                <van-button size="small" round plain type="primary" @click="revealed.has(q.id) ? revealed.delete(q.id) : revealed.add(q.id)">
                  {{ revealed.has(q.id) ? '收起答案' : '查看答案' }}
                </van-button>
                <span class="q-score">{{ q.score }} 分</span>
              </div>
              <div v-if="revealed.has(q.id)" class="q-answer md" v-html="renderMarkdown(`答案：${q.answer ?? '（略）'}`)" />
            </div>
          </div>
          <van-empty v-if="!detail.questions.length" description="还没有题目，点右上角「录入题目」" />
        </div>
      </template>
    </div>

    <!-- 新建试卷 -->
    <van-popup v-model:show="showCreate" position="bottom" round>
      <div class="pop-title">新建试卷</div>
      <van-field v-model="createForm.subject" label="科目" is-link readonly @click="showSubjectPicker = true" />
      <van-field v-model.number="createForm.year" label="年份" type="number" />
      <van-field v-model="createForm.title" label="标题（可选）" placeholder="如：2025 年政治真题" />
      <div class="pop-actions">
        <van-button block round type="primary" @click="submitCreate">创建</van-button>
      </div>
    </van-popup>

    <!-- 录入题目 -->
    <van-popup v-model:show="showAdd" position="bottom" round style="max-height:86%">
      <div class="pop-title">录入题目</div>
      <van-tabs>
        <van-tab title="单题录入">
          <van-field v-model="addForm.content" label="题干" type="textarea" rows="3" autosize placeholder="支持公式：$\lim_{x\to0}\frac{\sin x}{x}$" />
          <van-field v-model="addForm.passage" label="文章/材料" type="textarea" rows="4" autosize placeholder="阅读题的文章、材料（可选）" />
          <div class="opt-grid">
            <van-field v-model="addForm.optA" label="A" placeholder="选项 A（可选）" />
            <van-field v-model="addForm.optB" label="B" placeholder="选项 B（可选）" />
            <van-field v-model="addForm.optC" label="C" placeholder="选项 C（可选）" />
            <van-field v-model="addForm.optD" label="D" placeholder="选项 D（可选）" />
          </div>
          <div class="opt-grid">
            <van-field v-model="addForm.answer" label="答案" placeholder="如：C" />
            <van-field v-model.number="addForm.score" label="分值" type="number" />
          </div>
          <div class="pop-actions">
            <van-button block round type="primary" @click="submitOne">保存本题</van-button>
          </div>
        </van-tab>
        <van-tab title="批量粘贴">
          <div class="batch-tip">每行一题：选择题「题干 | A | B | C | D | 答案」，简答「题干 | 答案」</div>
          <van-field v-model="batchText" type="textarea" rows="8" autosize placeholder="1. 题干 | A | B | C | D | C&#10;2. 题干 | 答案" />
          <div class="pop-actions">
            <van-button block round type="primary" @click="submitBatch">批量导入</van-button>
          </div>
        </van-tab>
      </van-tabs>
    </van-popup>

    <!-- 科目选择器 -->
    <van-popup v-model:show="showSubjectPicker" position="bottom" round>
      <van-picker :columns="subjects.map((s) => ({ text: s.name }))" @confirm="onPickSubject" @cancel="showSubjectPicker = false" />
    </van-popup>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({ name: 'MobilePapersView' });
</script>

<style scoped>
.m-page { max-width: 640px; margin: 0 auto; min-height: 100vh; background: var(--van-background); }
.nav-add { color: #3b82f6; font-size: 13px; font-weight: 600; }
.m-body { padding: 16px; }
.paper-list { display: grid; gap: 12px; margin-top: 14px; }
.paper-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--van-background-2); border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,.04); cursor: pointer; }
.paper-year { font-size: 18px; font-weight: 800; color: #3b82f6; width: 56px; }
.paper-meta { flex: 1; min-width: 0; display: grid; gap: 3px; }
.paper-meta strong { font-size: 14px; color: var(--van-text-color); }
.paper-meta span { font-size: 12px; color: var(--van-text-color-3); }
.paper-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--van-background-2); border-radius: 14px; margin-bottom: 10px; }
.paper-head .dot { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; color: #fff; font-weight: 800; }
.paper-head strong { display: block; font-size: 15px; color: var(--van-text-color); }
.paper-head span { font-size: 12px; color: var(--van-text-color-3); }
.source-note { font-size: 12px; color: #f59e0b; margin-bottom: 12px; }
.q-list { display: grid; gap: 12px; }
.q-card { display: flex; gap: 10px; padding: 15px 16px; background: var(--van-background-2); border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,.04); }
.q-no { font-size: 14px; font-weight: 800; color: #3b82f6; flex: 0 0 auto; }
.q-body { flex: 1; min-width: 0; }
.opts { display: grid; gap: 8px; margin-top: 10px; }
.opt { display: flex; gap: 8px; align-items: flex-start; padding: 9px 12px; border: 1px solid var(--van-border-color); border-radius: 10px; font-size: 13px; color: var(--van-text-color); }
.opt-key { font-weight: 700; color: #3b82f6; }
.q-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.q-score { font-size: 12px; color: var(--van-text-color-3); }
.q-answer { margin-top: 10px; padding: 10px 12px; background: #ecfdf5; border-radius: 10px; }
.passage { margin: 0 0 10px; padding: 12px; background: #f0f7ff; border-left: 3px solid #3b82f6; border-radius: 8px; font-size: 13px; color: var(--van-text-color-2); }
.m-error { color: var(--van-danger-color); font-size: 13px; margin: 12px 4px; }
.m-loading { display: grid; place-items: center; padding: 48px 0; color: var(--van-text-color-3); font-size: 13px; }
.pop-title { padding: 16px 16px 4px; font-size: 16px; font-weight: 700; color: var(--van-text-color); }
.pop-actions { padding: 12px 16px 20px; }
.opt-grid { display: grid; grid-template-columns: 1fr 1fr; }
.batch-tip { padding: 8px 16px 0; font-size: 12px; color: #f59e0b; }
</style>
