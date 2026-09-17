<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiError } from '@/api/client';
import AppEmptyState from '@/components/common/AppEmptyState.vue';
import DesktopPageHeader from '@/components/common/DesktopPageHeader.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import SubjectBadge from '@/components/common/SubjectBadge.vue';
import {
  ERROR_REASON_LABELS, createMistake, deleteMistake, getReviewQueue, listMistakes, reviewMistake,
  type CreateMistakeInput, type Mistake,
} from '@/api/mistakes';
import { listSubjects, type SubjectInfo } from '@/api/plan';

const subjects = ref<SubjectInfo[]>([]);
const queue = ref<Mistake[]>([]);
const queueTotal = ref(0);
const list = ref<Mistake[]>([]);
const filter = ref({ subject_id: undefined as number | undefined, error_reason: '', keyword: '' });
const error = ref('');
const busy = ref(false);
const showForm = ref(false);
const form = ref<CreateMistakeInput>({
  title: '', content: '', correct_answer: '', user_answer: '', error_reason: 'CONCEPT', subject_id: undefined, source: '',
});
const masteredCount = computed(() => list.value.filter((item) => item.mastery_level >= 4).length);
const learningCount = computed(() => list.value.filter((item) => item.mastery_level > 0 && item.mastery_level < 4).length);

async function loadList() {
  list.value = await listMistakes({
    subject_id: filter.value.subject_id,
    error_reason: filter.value.error_reason || undefined,
    keyword: filter.value.keyword || undefined,
  });
}

async function loadAll() {
  error.value = '';
  busy.value = true;
  try {
    subjects.value = await listSubjects();
    const q = await getReviewQueue();
    queue.value = q.list;
    queueTotal.value = q.total;
    await loadList();
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function submitForm() {
  error.value = '';
  try {
    await createMistake(form.value);
    form.value = { title: '', content: '', correct_answer: '', user_answer: '', error_reason: 'CONCEPT', subject_id: undefined, source: '' };
    showForm.value = false;
    await loadAll();
  } catch (cause) { error.value = apiError(cause); }
}

async function doReview(mistake: Mistake, correct: boolean) {
  error.value = '';
  try { await reviewMistake(mistake.id, correct); await loadAll(); }
  catch (cause) { error.value = apiError(cause); }
}

async function removeMistake(id: number) {
  error.value = '';
  try { await deleteMistake(id); await loadAll(); }
  catch (cause) { error.value = apiError(cause); }
}

onMounted(loadAll);
</script>

<template>
  <section class="wb-page mistakes-page">
    <DesktopPageHeader eyebrow="复习工作区" title="错题本" description="围绕错因和掌握度安排复习，把每一道错题真正解决。">
      <template #actions>
        <button type="button" class="wb-btn is-primary" :disabled="showForm" @click="showForm = true">录入错题</button>
      </template>
    </DesktopPageHeader>
    <p v-if="error" class="wb-alert page-alert">{{ error }}</p>

    <section class="review-summary" aria-label="错题复习概览">
      <div><span>今日待复习</span><strong>{{ queueTotal }}</strong><small>题</small></div>
      <div><span>掌握中</span><strong>{{ learningCount }}</strong><small>题</small></div>
      <div><span>已掌握</span><strong>{{ masteredCount }}</strong><small>题</small></div>
    </section>

    <section class="wb-card surface-section">
      <header class="wb-card-head section-heading">
        <div><h2>到期复习</h2><p>优先处理已经到达复习时间的错题。</p></div>
        <StatusBadge v-if="queueTotal" tone="warning">{{ queueTotal }} 题待处理</StatusBadge>
      </header>
      <div v-if="queue.length" class="mistake-list">
        <article v-for="m in queue" :key="m.id" class="mistake-item is-due">
          <div class="mistake-copy">
            <div class="mistake-meta">
              <SubjectBadge v-if="m.subject" :name="m.subject.name" :color="m.subject.color" />
              <StatusBadge tone="warning">掌握度 L{{ m.mastery_level }}</StatusBadge>
              <span>{{ ERROR_REASON_LABELS[m.error_reason] ?? m.error_reason }}</span>
            </div>
            <h3>{{ m.title }}</h3>
            <p>{{ m.content }}</p>
          </div>
          <div class="review-actions">
            <button type="button" class="wb-btn" @click="doReview(m, false)">还不会</button>
            <button type="button" class="wb-btn is-primary" @click="doReview(m, true)">已掌握</button>
          </div>
        </article>
      </div>
      <AppEmptyState v-else title="今天没有到期错题" description="可以继续完成练习，新产生的错题会进入后续复习队列。" />
    </section>

    <section v-if="showForm" class="wb-card mistake-form">
      <header class="wb-card-head section-heading"><div><h2>录入错题</h2><p>保留题目、答案和错因，系统会安排后续复习。</p></div></header>
      <div class="form-stack">
        <label class="wb-field">
          <span class="wb-label">科目</span>
          <select v-model="form.subject_id" class="wb-select">
            <option :value="undefined">未分类</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
        <label class="wb-field">
          <span class="wb-label">标题</span>
          <input v-model="form.title" class="wb-input" placeholder="如：极限计算错误" />
        </label>
        <label class="wb-field">
          <span class="wb-label">题目内容</span>
          <textarea v-model="form.content" class="wb-textarea" rows="5" placeholder="粘贴题目内容或拍照转写…"></textarea>
        </label>
        <div class="form-columns">
          <label class="wb-field"><span class="wb-label">我的答案</span><input v-model="form.user_answer" class="wb-input" /></label>
          <label class="wb-field"><span class="wb-label">正确答案</span><input v-model="form.correct_answer" class="wb-input" /></label>
        </div>
        <label class="wb-field">
          <span class="wb-label">错因</span>
          <select v-model="form.error_reason" class="wb-select">
            <option v-for="(label, key) in ERROR_REASON_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="button" class="wb-btn is-primary" @click="submitForm">保存错题</button>
          <button type="button" class="wb-btn" @click="showForm = false">取消</button>
        </div>
      </div>
    </section>

    <section class="wb-card all-mistakes">
      <header class="wb-card-head section-heading"><div><h2>全部错题</h2><p>按科目和错因查找，查看当前掌握状态。</p></div><span class="head-count">{{ list.length }} 题</span></header>
      <div class="mistake-filters">
        <select v-model="filter.subject_id" class="wb-select" @change="loadList">
          <option :value="undefined">全部科目</option>
          <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <select v-model="filter.error_reason" class="wb-select" @change="loadList">
          <option value="">全部错因</option>
          <option v-for="(label, key) in ERROR_REASON_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
        <div class="wb-search filter-search">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
          <input v-model="filter.keyword" placeholder="搜索标题/内容…" @keyup.enter="loadList" />
        </div>
        <button type="button" class="wb-btn" @click="loadList">搜索</button>
      </div>
      <div v-if="list.length" class="mistake-list">
        <article v-for="m in list" :key="m.id" class="mistake-item">
          <div class="mistake-copy">
            <div class="mistake-meta">
              <SubjectBadge v-if="m.subject" :name="m.subject.name" :color="m.subject.color" />
              <StatusBadge :tone="m.mastery_level >= 4 ? 'success' : m.mastery_level ? 'info' : 'neutral'">L{{ m.mastery_level }}/4</StatusBadge>
              <span>{{ ERROR_REASON_LABELS[m.error_reason] ?? m.error_reason }}</span>
            </div>
            <h3>{{ m.title }}</h3>
            <p>{{ m.content }}</p>
            <small>已复习 {{ m.review_count }} 次 · 下次复习 {{ String(m.next_review_at).slice(0, 10) }}</small>
          </div>
          <button type="button" class="wb-btn is-sm is-danger danger-link" @click="removeMistake(m.id)">删除</button>
        </article>
      </div>
      <AppEmptyState v-else title="还没有错题记录" description="完成练习后，把需要再次掌握的题目记录在这里。">
        <template #action><button type="button" class="wb-btn is-primary" @click="showForm = true">录入第一道错题</button></template>
      </AppEmptyState>
    </section>
  </section>
</template>

<style scoped>
/* 页面骨架沿用 .wb-page，此处只写本页特有样式 */
.page-alert { margin: 0 0 16px; }

/* 概览条：与真题页统计面板同一套标签 + 数值层级 */
.review-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: var(--wb-surface);
  box-shadow: var(--wb-shadow-sm);
}
.review-summary > div { padding: 17px 20px; border-left: 1px solid var(--wb-line-soft); }
.review-summary > div:first-child { border-left: 0; }
.review-summary span { display: block; margin-bottom: 6px; color: var(--wb-faint); font-size: 12px; }
.review-summary strong { color: var(--wb-ink); font-size: 26px; font-weight: 700; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
.review-summary small { margin-left: 4px; color: var(--wb-muted); font-size: 12px; }

.surface-section { margin-bottom: 16px; overflow: hidden; }
.section-heading { min-height: 68px; padding: 14px 18px; margin-bottom: 0; border-bottom: 1px solid var(--wb-line-soft); }
.section-heading h2 { font-size: 16px; }
.section-heading p { margin: 4px 0 0; color: var(--wb-faint); font-size: 12px; }
.head-count { color: var(--wb-muted); font-size: 12px; font-variant-numeric: tabular-nums; }

.mistake-list { padding: 0 18px; }
.mistake-item { display: flex; align-items: center; gap: 20px; padding: 16px 0; border-bottom: 1px solid var(--wb-line-soft); }
.mistake-item:last-child { border-bottom: 0; }
.mistake-item.is-due { padding-left: 12px; border-left: 3px solid var(--wb-warn); }
.mistake-copy { min-width: 0; flex: 1; }
.mistake-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; color: var(--wb-muted); font-size: 11px; }
.mistake-copy h3 { margin: 7px 0 0; color: var(--wb-ink); font-size: 14px; font-weight: 600; }
.mistake-copy p { display: -webkit-box; overflow: hidden; margin: 5px 0 0; color: var(--wb-muted); font-size: 13px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.mistake-copy small { display: block; margin-top: 7px; color: var(--wb-faint); font-size: 11px; }
.review-actions { display: flex; flex: 0 0 auto; gap: 7px; }
.danger-link { flex: 0 0 auto; }

.mistake-form { margin-bottom: 16px; padding-bottom: 18px; }
.form-stack { display: grid; gap: 13px; padding: 18px; }
.form-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-actions { display: flex; gap: 10px; }

.mistake-filters { display: grid; grid-template-columns: 180px 180px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--wb-line-soft); background: var(--wb-surface-2); }
.filter-search { width: 100%; }
.mistake-filters .wb-select { min-height: 34px; }

@media (max-width: 1024px) {
  .mistake-filters { grid-template-columns: 1fr 1fr; }
  .filter-search { grid-column: 1 / -1; }
}
@media (max-width: 900px) {
  .review-summary > div { padding: 14px 12px; }
  .review-summary strong { font-size: 23px; }
  .mistake-item { align-items: flex-start; flex-direction: column; }
  .review-actions { width: 100%; }
  .review-actions button { flex: 1; }
  .form-columns { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .review-summary { grid-template-columns: 1fr; }
  .review-summary > div { border-top: 1px solid var(--wb-line-soft); border-left: 0; }
  .review-summary > div:first-child { border-top: 0; }
  .mistake-filters { grid-template-columns: 1fr; }
}
</style>
