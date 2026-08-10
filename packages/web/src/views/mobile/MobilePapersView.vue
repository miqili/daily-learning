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

function sourceLabel(paper: PaperSummary): string {
  if (paper.source_type === 'OFFICIAL') return '官方原卷';
  if (paper.source_type === 'VERIFIED_RECALL') return '多源核验回忆版';
  if (paper.source_type === 'SINGLE_SOURCE_RECALL') return '单源回忆版';
  if (paper.source_type === 'USER_PROVIDED') return '自行录入';
  if (paper.source_type === 'SIMULATION') return '模拟题';
  return '来源待核验';
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
  <main class="study-page papers-page">
    <div class="study-screen">
      <header class="study-header">
        <button v-if="detail" class="study-header-back" aria-label="返回试卷列表" @click="back"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m15 18-6-6 6-6" /></svg></button>
        <div class="study-header-copy"><span class="study-header-eyebrow">Past papers</span><h1>{{ detail ? `${detail.year} 年${detail.subject}` : '历年真题' }}</h1></div>
        <button class="study-header-action" @click="detail ? showAdd = true : showCreate = true">{{ detail ? '录入题目' : '新建试卷' }}</button>
      </header>

      <p v-if="error" class="study-error">{{ error }}</p>

      <template v-if="!detail">
        <div class="study-filter-row"><button v-for="tabItem in subjectTabs" :key="tabItem.name" class="study-filter" :class="{ active: activeSubject === tabItem.name }" @click="activeSubject = tabItem.name">{{ tabItem.label }}</button></div>
        <div v-if="busy && !papers.length" class="study-loading"><van-loading size="24">正在加载试卷…</van-loading></div>
        <div v-else class="paper-list">
          <button v-for="paper in filteredPapers" :key="paper.id" class="paper-card" @click="openPaper(paper.id)">
            <span class="paper-year"><strong>{{ paper.year }}</strong><small>YEAR</small></span>
            <div class="paper-meta">
              <strong>{{ paper.title }}</strong>
              <span>{{ paper.subject }} · {{ paper.question_count }}<template v-if="paper.expected_question_count">/{{ paper.expected_question_count }}</template> 题</span>
              <span class="paper-trust" :class="{ verified: paper.source_type === 'OFFICIAL' || paper.source_type === 'VERIFIED_RECALL', incomplete: !paper.is_complete }">{{ sourceLabel(paper) }} · {{ paper.is_complete ? '题量完整' : '内容不全' }}</span>
            </div>
            <i :style="{ background: subjectColor(paper.subject) }" />
            <span class="paper-arrow">›</span>
          </button>
          <div v-if="!filteredPapers.length" class="study-empty">暂无试卷。<br>点击右上角「新建试卷」。</div>
        </div>
      </template>

      <template v-else>
        <div class="paper-head">
          <span class="paper-seal" :style="{ borderColor: subjectColor(detail.subject), color: subjectColor(detail.subject) }">{{ detail.subject[0] }}</span>
          <div><small>{{ detail.year }} · {{ detail.subject }}</small><strong>{{ detail.title }}</strong><span>{{ detail.question_count }} 题 · 共 {{ detail.questions.reduce((sum, question) => sum + question.score, 0) }} 分</span></div>
        </div>
        <div class="source-note">
          <span>真实性</span>{{ sourceLabel(detail) }} · {{ detail.is_complete ? '题量完整' : `当前 ${detail.question_count}/${detail.expected_question_count ?? '?'} 题` }}
          <br><span>来源</span><a v-if="detail.source_url" :href="detail.source_url" target="_blank" rel="noreferrer">{{ detail.source || '打开原始资料' }}</a><template v-else>{{ detail.source || '未保留来源链接' }}</template>
          <template v-if="detail.verification_notes"><br><span>核验</span>{{ detail.verification_notes }}</template>
        </div>
        <div class="q-list">
          <article v-for="(question, index) in detail.questions" :key="question.id" class="q-card">
            <div class="q-no">{{ String(index + 1).padStart(2, '0') }}</div>
            <div class="q-body">
              <div v-if="question.passage" class="passage md" v-html="renderMarkdown(question.passage)" />
              <div class="md question-copy" v-html="renderMarkdown(question.content)" />
              <div v-if="question.options" class="opts">
                <div v-for="option in question.options" :key="option.key" class="opt"><span class="opt-key">{{ option.key }}</span>{{ option.text }}</div>
              </div>
              <div class="q-actions">
                <button class="answer-button" @click="revealed.has(question.id) ? revealed.delete(question.id) : revealed.add(question.id)">{{ revealed.has(question.id) ? '收起答案' : '查看答案' }}</button>
                <span class="q-score">{{ question.score }} 分</span>
              </div>
              <div v-if="revealed.has(question.id)" class="q-answer md" v-html="renderMarkdown(`答案：${question.answer ?? '（略）'}`)" />
            </div>
          </article>
          <div v-if="!detail.questions.length" class="study-empty">还没有题目。<br>点击右上角「录入题目」。</div>
        </div>
      </template>
    </div>

    <!-- 新建试卷 -->
    <van-popup v-model:show="showCreate" position="bottom" round class="study-popup">
      <div class="pop-title">新建试卷</div>
      <van-field v-model="createForm.subject" label="科目" is-link readonly @click="showSubjectPicker = true" />
      <van-field v-model.number="createForm.year" label="年份" type="number" />
      <van-field v-model="createForm.title" label="标题（可选）" placeholder="如：2025 年政治真题" />
      <div class="pop-actions">
        <van-button block round type="primary" @click="submitCreate">创建</van-button>
      </div>
    </van-popup>

    <!-- 录入题目 -->
    <van-popup v-model:show="showAdd" position="bottom" round class="study-popup" style="max-height:86%">
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
    <van-popup v-model:show="showSubjectPicker" position="bottom" round class="study-popup">
      <van-picker :columns="subjects.map((s) => ({ text: s.name }))" @confirm="onPickSubject" @cancel="showSubjectPicker = false" />
    </van-popup>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({ name: 'MobilePapersView' });
</script>

<style scoped>
.paper-list { display: grid; gap: 9px; margin-top: 10px; }.paper-card { width: 100%; min-height:78px; display: grid; grid-template-columns: 54px 1fr 6px 12px; align-items: center; gap: 11px; padding: 14px; border: 1px solid var(--study-line); border-radius: 12px; background: var(--app-surface); color: var(--study-text); text-align: left; }.paper-year { display: grid; gap: 1px; text-align: center; }.paper-year strong { color: var(--study-accent); font-family: inherit; font-size: 20px; font-weight: 600; }.paper-year small { color: var(--study-faint); font-size: 12px; }.paper-meta { display: grid; gap: 4px; min-width: 0; }.paper-meta strong { color: var(--study-ink); font-family: inherit; font-size: 14px; line-height: 1.4; }.paper-meta span { color: var(--study-muted); font-size: 12px; }.paper-meta .paper-trust { width: fit-content; padding: 2px 6px; border-radius: 6px; background: #fff7ed; color: #9a5b13; }.paper-meta .paper-trust.verified { background: #ecfdf3; color: #18794e; }.paper-meta .paper-trust.incomplete { background: #fff1f0; color: #b42318; }.paper-card > i { width: 6px; height: 30px; border-radius: 2px; }.paper-arrow { color: var(--study-muted); }
.paper-head { display: flex; align-items: center; gap: 13px; margin-top: 14px; padding: 16px; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); }.paper-seal { width: 44px; height: 44px; display: grid; place-items: center; border: 0!important; border-radius: 10px; background: var(--app-primary); color: #fff!important; font-family: inherit; font-size: 16px; font-weight: 700; }.paper-head div { display: grid; gap: 3px; }.paper-head small, .paper-head span { color: var(--study-muted); font-size: 12px; }.paper-head strong { color: var(--study-ink); font-family: inherit; font-size: 15px; }.source-note { margin: 10px 1px 15px; color: var(--study-muted); font-size: 12px; line-height: 1.7; }.source-note span { margin-right: 7px; color: var(--study-accent); font-family: inherit; font-weight: 700; }.source-note a { color: var(--study-accent); text-decoration: underline; text-underline-offset: 2px; }.q-list { display: grid; gap: 10px; }.q-card { display: flex; gap: 10px; padding: 15px 14px; border: 1px solid var(--study-line); border-radius: 12px; background: var(--app-surface); }.q-no { flex: 0 0 25px; color: var(--study-accent); font-family: inherit; font-size: 12px; font-weight: 700; }.q-body { min-width: 0; flex: 1; }.question-copy { font-size: 14px; }.passage { margin-bottom: 11px; padding: 10px 12px; border-left: 3px solid var(--study-accent); border-radius: 0 8px 8px 0; background: var(--app-primary-soft); color: var(--study-muted); font-size: 13px; }.opts { display: grid; gap: 7px; margin-top: 10px; }.opt { display: flex; align-items: flex-start; gap: 8px; padding: 10px; border: 1px solid var(--study-line); border-radius: 9px; color: var(--study-text); font-size: 13px; }.opt-key { color: var(--study-accent); font-family: inherit; font-weight: 700; }.q-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }.answer-button { min-height: 44px; padding: 0 13px; border: 1px solid var(--app-border-strong); border-radius: 9px; background: #fff; color: var(--app-primary); font-size: 12px; font-weight: 600; }.q-score { color: var(--study-muted); font-size: 12px; }.q-answer { margin-top: 10px; padding: 10px 12px; border: 1px solid #a6f4c5; border-radius: 9px; background: #ecfdf3; }
.pop-title { padding: 18px 16px 7px; color: var(--study-ink); font-family: inherit; font-size: 18px; font-weight: 600; }.pop-actions { padding: 12px 16px calc(20px + env(safe-area-inset-bottom)); }.opt-grid { display: grid; grid-template-columns: 1fr 1fr; }.batch-tip { padding: 8px 16px 0; color: var(--study-warning); font-size: 12px; }
:global(.study-popup) { background: var(--study-card); }
</style>
