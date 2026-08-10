<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button, Input, Select, SelectOption, Textarea } from 'ant-design-vue';
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
  <section class="page mistakes-page">
    <DesktopPageHeader eyebrow="复习工作区" title="错题本" description="围绕错因和掌握度安排复习，把每一道错题真正解决。">
      <template #actions><Button type="primary" :disabled="showForm" @click="showForm = true">录入错题</Button></template>
    </DesktopPageHeader>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="review-summary" aria-label="错题复习概览">
      <div><span>今日待复习</span><strong>{{ queueTotal }}</strong><small>题</small></div>
      <div><span>掌握中</span><strong>{{ learningCount }}</strong><small>题</small></div>
      <div><span>已掌握</span><strong>{{ masteredCount }}</strong><small>题</small></div>
    </section>

    <section class="review-section surface-section">
      <header class="section-heading">
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
            <button class="button secondary compact" @click="doReview(m, false)">还不会</button>
            <button class="button success compact" @click="doReview(m, true)">已掌握</button>
          </div>
        </article>
      </div>
      <AppEmptyState v-else title="今天没有到期错题" description="可以继续完成练习，新产生的错题会进入后续复习队列。" />
    </section>

    <section v-if="showForm" class="mistake-form surface-section">
      <header class="section-heading"><div><h2>录入错题</h2><p>保留题目、答案和错因，系统会安排后续复习。</p></div></header>
      <div class="form-stack">
        <label><span>科目</span><Select v-model:value="form.subject_id" allow-clear placeholder="未分类"><SelectOption v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</SelectOption></Select></label>
        <label><span>标题</span><Input v-model:value="form.title" placeholder="如：极限计算错误" /></label>
        <label><span>题目内容</span><Textarea v-model:value="form.content" :rows="5" placeholder="粘贴题目内容或拍照转写…" /></label>
        <div class="form-columns">
          <label><span>我的答案</span><Input v-model:value="form.user_answer" /></label>
          <label><span>正确答案</span><Input v-model:value="form.correct_answer" /></label>
        </div>
        <label><span>错因</span><Select v-model:value="form.error_reason"><SelectOption v-for="(label, key) in ERROR_REASON_LABELS" :key="key" :value="key">{{ label }}</SelectOption></Select></label>
        <div class="form-actions">
          <Button type="primary" @click="submitForm">保存错题</Button>
          <Button @click="showForm = false">取消</Button>
        </div>
      </div>
    </section>

    <section class="all-mistakes surface-section">
      <header class="section-heading"><div><h2>全部错题</h2><p>按科目和错因查找，查看当前掌握状态。</p></div><span>{{ list.length }} 题</span></header>
      <div class="mistake-filters">
        <Select v-model:value="filter.subject_id" allow-clear placeholder="全部科目" @change="loadList"><SelectOption v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</SelectOption></Select>
        <Select v-model:value="filter.error_reason" @change="loadList"><SelectOption value="">全部错因</SelectOption><SelectOption v-for="(label, key) in ERROR_REASON_LABELS" :key="key" :value="key">{{ label }}</SelectOption></Select>
        <Input v-model:value="filter.keyword" placeholder="搜索标题/内容…" @press-enter="loadList" />
        <Button @click="loadList">搜索</Button>
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
          <Button class="danger-link" type="text" danger size="small" @click="removeMistake(m.id)">删除</Button>
        </article>
      </div>
      <AppEmptyState v-else title="还没有错题记录" description="完成练习后，把需要再次掌握的题目记录在这里。"><template #action><Button type="primary" @click="showForm = true">录入第一道错题</Button></template></AppEmptyState>
    </section>
  </section>
</template>

<style scoped>
.mistakes-page { max-width: 1160px; }
.review-summary { display: grid; grid-template-columns: repeat(3,1fr); margin-bottom: 16px; border: 1px solid var(--app-border); border-radius: 10px; background: #fff; box-shadow: var(--app-shadow-sm); }
.review-summary > div { padding: 17px 20px; border-left: 1px solid var(--app-border); }
.review-summary > div:first-child { border-left: 0; }
.review-summary span { display: block; margin-bottom: 5px; color: var(--app-muted); font-size: 12px; }
.review-summary strong { color: var(--app-text); font-size: 28px; font-weight: 600; letter-spacing: -.04em; }
.review-summary small { margin-left: 4px; color: var(--app-muted); font-size: 12px; }
.surface-section { margin-bottom: 16px; overflow: hidden; border: 1px solid var(--app-border); border-radius: 10px; background: #fff; box-shadow: var(--app-shadow-sm); }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 68px; padding: 14px 18px; border-bottom: 1px solid var(--app-border); }
.section-heading h2 { font-size: 16px; font-weight: 600; }
.section-heading p { margin: 4px 0 0; color: var(--app-muted); font-size: 12px; }
.section-heading > span { color: var(--app-muted); font-size: 12px; }
.mistake-list { padding: 0 18px; }
.mistake-item { display: flex; align-items: center; gap: 20px; padding: 16px 0; border-bottom: 1px solid var(--app-border); }
.mistake-item:last-child { border-bottom: 0; }
.mistake-item.is-due { padding-left: 12px; border-left: 3px solid var(--app-warning); }
.mistake-copy { min-width: 0; flex: 1; }
.mistake-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; color: var(--app-muted); font-size: 11px; }
.mistake-copy h3 { margin: 7px 0 0; color: var(--app-text); font-size: 14px; font-weight: 600; }
.mistake-copy p { display: -webkit-box; overflow: hidden; margin: 5px 0 0; color: var(--app-muted); font-size: 13px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.mistake-copy small { display: block; margin-top: 7px; color: var(--app-faint); font-size: 11px; }
.review-actions { display: flex; flex: 0 0 auto; gap: 7px; }
.button.compact { min-height: 34px; padding: 0 12px; }
.danger-link { border: 0; padding: 6px; background: transparent; color: var(--app-faint); font-size: 11px; }
.danger-link:hover { color: var(--app-danger); }
.mistake-form { padding-bottom: 18px; }
.form-stack { display: grid; gap: 13px; padding: 18px; }
.form-stack label { display: grid; gap: 6px; }
.form-stack label > span { color: var(--app-muted); font-size: 12px; font-weight: 500; }
.form-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-actions { display: flex; gap: 10px; }
.mistake-filters { display: grid; grid-template-columns: 180px 180px minmax(0,1fr) auto; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--app-border); background: #fafbfc; }
@media(max-width:900px){.review-summary{grid-template-columns:repeat(3,1fr)}.review-summary>div{padding:14px 12px}.review-summary strong{font-size:23px}.mistake-filters{grid-template-columns:1fr 1fr}.mistake-item{align-items:flex-start;flex-direction:column}.review-actions{width:100%}.review-actions button{flex:1}.form-columns{grid-template-columns:1fr}}
@media(max-width:520px){.desktop-page-header{align-items:stretch;flex-direction:column}.review-summary{grid-template-columns:1fr}.review-summary>div{border-top:1px solid var(--app-border);border-left:0}.review-summary>div:first-child{border-top:0}.mistake-filters{grid-template-columns:1fr}}
</style>
