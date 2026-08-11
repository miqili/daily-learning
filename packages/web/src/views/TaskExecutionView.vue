<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiError } from '@/api/client';
import { searchKnowledge, type KnowledgeItem } from '@/api/knowledge';
import { listMistakes, reviewMistake, type Mistake } from '@/api/mistakes';
import { getTask, setTaskCompletion, type PlanTask } from '@/api/plan';
import { getPaper, listPapers, type PaperDetail, type PaperSummary } from '@/api/papers';
import { renderMarkdown } from '@/utils/markdown';
import { taskDestination } from '@/utils/taskDestination';

const route = useRoute();
const router = useRouter();
const task = ref<PlanTask | null>(null);
const knowledgeItems = ref<KnowledgeItem[]>([]);
const papers = ref<PaperSummary[]>([]);
const paperDetail = ref<PaperDetail | null>(null);
const mistakes = ref<Mistake[]>([]);
const revealedAnswers = ref<Set<number>>(new Set());
const busy = ref(false);
const resourceBusy = ref(false);
const saving = ref(false);
const error = ref('');

const mobile = computed(() => route.path.startsWith('/m/'));
const destination = computed(() => task.value ? taskDestination(task.value) : null);
const estimatedMinutes = computed(() => Number(task.value?.description?.match(/预计\s*(\d+)\s*分钟/)?.[1] ?? 0));
const taskDetail = computed(() => {
  const raw = task.value?.description ?? '';
  return raw.replace(/^预计\s*\d+\s*分钟｜/, '').split('\n完成标准：')[0]?.trim() ?? '';
});
const completionStandard = computed(() => task.value?.description?.split('\n完成标准：')[1]?.trim() ?? '完成任务要求并进行自查。');
const portalPath = computed(() => {
  if (!destination.value) return mobile.value ? '/m/tasks' : '/';
  const prefix = mobile.value ? '/m/' : '/';
  if (destination.value.kind === 'vocabulary') return mobile.value ? '/m/vocabulary?autostart=1' : '/vocabulary';
  if (destination.value.kind === 'essays') return `${prefix}essays`;
  if (destination.value.kind === 'mistakes') return mobile.value ? '/m/me' : '/mistakes';
  return mobile.value ? '/m/search' : '/';
});
const checklist = computed(() => taskDetail.value.split(/[；。]/).map((item) => item.trim()).filter(Boolean));

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${weekdays[date.getDay()]}`;
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push(mobile.value ? '/m/tasks' : '/');
}

async function loadKnowledge() {
  if (!task.value || !destination.value) return;
  const titles = destination.value.knowledgeTitles;
  if (titles.length) {
    const results = await Promise.all(titles.map((keyword) => searchKnowledge({ subject_id: task.value?.subject?.id, keyword, limit: 20 })));
    const exact = new Map<number, KnowledgeItem>();
    for (const result of results) {
      for (const item of result.list) exact.set(item.id, item);
    }
    knowledgeItems.value = [...exact.values()].sort((a, b) => {
      const ai = titles.indexOf(a.title);
      const bi = titles.indexOf(b.title);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
    return;
  }
  const result = await searchKnowledge({
    subject_id: task.value.subject?.id,
    keyword: destination.value.keyword || undefined,
    limit: 20,
  });
  knowledgeItems.value = result.list;
}

async function loadResources() {
  if (!task.value || !destination.value) return;
  resourceBusy.value = true;
  try {
    if (destination.value.kind === 'knowledge') await loadKnowledge();
    if (destination.value.kind === 'papers') papers.value = await listPapers({ subject: task.value.subject?.name });
    if (destination.value.kind === 'mistakes') mistakes.value = await listMistakes({ subject_id: task.value.subject?.id });
  } finally {
    resourceBusy.value = false;
  }
}

async function load() {
  const id = Number(route.params.taskId);
  if (!Number.isInteger(id) || id < 1) {
    error.value = '任务编号无效。';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    task.value = await getTask(id);
    await loadResources();
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

async function toggleCompletion() {
  if (!task.value || saving.value) return;
  saving.value = true;
  try {
    task.value = await setTaskCompletion(task.value.id, !task.value.is_completed);
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    saving.value = false;
  }
}

async function openPaper(paper: PaperSummary) {
  resourceBusy.value = true;
  try {
    paperDetail.value = await getPaper(paper.id);
    revealedAnswers.value = new Set();
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    resourceBusy.value = false;
  }
}

function toggleAnswer(id: number) {
  const next = new Set(revealedAnswers.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  revealedAnswers.value = next;
}

async function markMistake(mistake: Mistake, correct: boolean) {
  try {
    await reviewMistake(mistake.id, correct);
    mistakes.value = await listMistakes({ subject_id: task.value?.subject?.id });
  } catch (cause) {
    error.value = apiError(cause);
  }
}

onMounted(load);
</script>

<template>
  <main :class="['execution-page', { mobile }]">
    <div class="execution-shell">
      <button class="back-button" type="button" @click="goBack">← 返回时间轴</button>

      <p v-if="error" class="execution-error">{{ error }}</p>
      <div v-if="busy && !task" class="execution-loading">正在打开任务与对应资料…</div>

      <template v-else-if="task && destination">
        <header class="execution-header">
          <div>
            <p class="execution-eyebrow">{{ formatDate(task.plan_date) }} · {{ task.subject?.name ?? '综合任务' }}</p>
            <h1>{{ task.title }}</h1>
            <p>这是时间轴任务的执行页。学习资料、完成标准和打卡集中在这里。</p>
          </div>
          <span :class="['status-badge', { done: task.is_completed }]">{{ task.is_completed ? '已完成' : '待执行' }}</span>
        </header>

        <div class="execution-layout">
          <section class="execution-main">
            <article class="brief-card">
              <header><span>01</span><div><small>任务要求</small><strong>{{ estimatedMinutes ? `预计 ${estimatedMinutes} 分钟` : '按要求完成' }}</strong></div></header>
              <p>{{ taskDetail }}</p>
              <div class="standard"><span>完成标准</span><strong>{{ completionStandard }}</strong></div>
            </article>

            <section class="resource-card">
              <header class="resource-heading">
                <div><span>02</span><div><small>学习入口</small><h2>{{ destination.label }}</h2></div></div>
                <p>{{ destination.hint }}</p>
              </header>

              <div v-if="resourceBusy" class="resource-empty">正在匹配对应学习资料…</div>

              <div v-else-if="destination.kind === 'knowledge'" class="knowledge-stack">
                <details v-for="(item, index) in knowledgeItems" :key="item.id" :open="index === 0">
                  <summary><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ item.title }}</strong><em>展开学习</em></summary>
                  <div class="resource-content md" v-html="renderMarkdown(item.content)" />
                </details>
                <div v-if="!knowledgeItems.length" class="resource-empty">未找到标题完全匹配的知识条目。请先按任务说明学习，稍后补充该条知识库。</div>
              </div>

              <div v-else-if="destination.kind === 'papers'">
                <template v-if="paperDetail">
                  <div class="paper-detail-head"><button @click="paperDetail = null">← 选择其他试卷</button><strong>{{ paperDetail.title }}</strong><span>{{ paperDetail.question_count }} 题</span></div>
                  <div class="question-stack">
                    <article v-for="(question, index) in paperDetail.questions" :key="question.id">
                      <span class="question-no">{{ String(index + 1).padStart(2, '0') }}</span>
                      <div><div v-if="question.passage" class="md passage" v-html="renderMarkdown(question.passage)" /><div class="md" v-html="renderMarkdown(question.content)" />
                        <div v-if="question.options" class="options"><p v-for="option in question.options" :key="option.key"><b>{{ option.key }}</b>{{ option.text }}</p></div>
                        <button class="answer-toggle" @click="toggleAnswer(question.id)">{{ revealedAnswers.has(question.id) ? '收起答案' : '核对答案' }}</button>
                        <div v-if="revealedAnswers.has(question.id)" class="answer md" v-html="renderMarkdown(question.answer ?? '暂无答案')" />
                      </div>
                    </article>
                    <div v-if="!paperDetail.questions.length" class="resource-empty">这套试卷还没有录入题目。</div>
                  </div>
                </template>
                <div v-else class="paper-grid">
                  <button v-for="paper in papers" :key="paper.id" @click="openPaper(paper)"><span>{{ paper.year }}</span><strong>{{ paper.title }}</strong><small>{{ paper.question_count }}<template v-if="paper.expected_question_count">/{{ paper.expected_question_count }}</template> 题 · {{ paper.source_type === 'VERIFIED_RECALL' ? '多源核验回忆版' : paper.source_type === 'OFFICIAL' ? '官方原卷' : paper.is_complete ? '题量完整·来源待核验' : '内容不全' }}</small><em>开始 →</em></button>
                  <div v-if="!papers.length" class="resource-empty">当前科目还没有可用试卷，需要先补充真题题目。</div>
                </div>
              </div>

              <div v-else-if="destination.kind === 'mistakes'" class="mistake-stack">
                <article v-for="mistake in mistakes.slice(0, 12)" :key="mistake.id">
                  <div><span>掌握度 L{{ mistake.mastery_level }}</span><strong>{{ mistake.title }}</strong><p>{{ mistake.content }}</p></div>
                  <div class="mistake-actions"><button @click="markMistake(mistake, false)">还不会</button><button class="correct" @click="markMistake(mistake, true)">会了</button></div>
                </article>
                <div v-if="!mistakes.length" class="resource-empty">当前科目还没有错题。先闭卷回忆任务要点；发现错误后录入错题本。</div>
                <RouterLink v-if="!mobile" class="portal-button secondary" to="/mistakes">打开完整错题本</RouterLink>
              </div>

              <div v-else-if="destination.kind === 'checklist'" class="checklist">
                <label v-for="item in checklist" :key="item"><input type="checkbox" /><span>{{ item }}</span></label>
              </div>

              <div v-else class="portal-card">
                <span>{{ destination.kind === 'vocabulary' ? 'WORD QUEUE' : 'WRITING DESK' }}</span>
                <strong>{{ destination.hint }}</strong>
                <RouterLink class="portal-button" :to="portalPath">{{ destination.label }} →</RouterLink>
              </div>
            </section>
          </section>

          <aside class="execution-aside">
            <section>
              <span>03</span><small>完成与打卡</small>
              <h2>{{ task.is_completed ? '本项任务已完成' : '学完后再标记完成' }}</h2>
              <p>打卡只改变完成状态，不会影响知识库、真题或错题记录。</p>
              <button :class="['complete-button', { done: task.is_completed }]" :disabled="saving" @click="toggleCompletion">{{ saving ? '保存中…' : task.is_completed ? '撤销完成' : '标记为已完成' }}</button>
            </section>
            <dl><div><dt>任务类型</dt><dd>{{ task.task_type === 'STUDY' ? '知识学习' : task.task_type === 'PRACTICE' ? '练习实战' : '复习巩固' }}</dd></div><div><dt>所属科目</dt><dd>{{ task.subject?.name ?? '综合' }}</dd></div><div><dt>计划日期</dt><dd>{{ task.plan_date }}</dd></div></dl>
          </aside>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
.execution-page { min-height: calc(100vh - 56px); padding: 24px 32px 48px; background: var(--app-bg); color: var(--app-text); }
.execution-shell { width: min(100%, 1320px); margin: 0 auto; }
.back-button { margin-bottom: 18px; padding: 0; border: 0; background: transparent; color: var(--app-muted); font-size: 12px; font-weight: 600; }
.back-button:hover { color: var(--app-primary); }
.execution-error,.execution-loading { padding: 18px; border: 1px solid var(--app-border); border-radius: 10px; background: #fff; color: var(--app-danger); font-size: 13px; }
.execution-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
.execution-eyebrow { margin: 0 0 7px; color: var(--app-primary); font-size: 12px; font-weight: 600; }
.execution-header h1 { max-width: 850px; font-size: 24px; font-weight: 600; }
.execution-header > div > p:last-child { margin: 7px 0 0; color: var(--app-muted); font-size: 13px; }
.status-badge { padding: 5px 9px; border-radius: 6px; background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 600; }
.status-badge.done { background: #ecfdf3; color: var(--app-success); }
.execution-layout { display: grid; grid-template-columns: minmax(0,1fr) 290px; gap: 16px; align-items: start; }
.execution-main { display: grid; gap: 16px; }
.brief-card,.resource-card,.execution-aside > section,.execution-aside dl { border: 1px solid var(--app-border); border-radius: 10px; background: #fff; box-shadow: var(--app-shadow-sm); }
.brief-card { padding: 20px; }
.brief-card header,.resource-heading > div { display: flex; align-items: center; gap: 11px; }
.brief-card header > span,.resource-heading > div > span,.execution-aside section > span { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; background: var(--app-primary-soft); color: var(--app-primary); font-size: 10px; font-weight: 700; }
.brief-card header div { display: grid; gap: 2px; }
.brief-card small,.resource-heading small,.execution-aside small { color: var(--app-muted); font-size: 11px; }
.brief-card header strong { font-size: 13px; font-weight: 600; }
.brief-card > p { margin: 18px 0; color: #344054; font-size: 14px; line-height: 1.7; }
.standard { display: grid; grid-template-columns: 82px 1fr; gap: 12px; padding: 13px 14px; border-left: 3px solid var(--app-primary); border-radius: 0 8px 8px 0; background: #f7faff; }
.standard span { color: var(--app-primary); font-size: 11px; font-weight: 600; }
.standard strong { font-size: 12px; font-weight: 600; line-height: 1.6; }
.resource-card { min-height: 280px; overflow: hidden; }
.resource-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 16px 18px; border-bottom: 1px solid var(--app-border); }
.resource-heading h2 { font-size: 16px; font-weight: 600; }
.resource-heading p { max-width: 420px; margin: 0; color: var(--app-muted); text-align: right; font-size: 12px; line-height: 1.5; }
.resource-empty { padding: 36px 24px; color: var(--app-muted); text-align: center; font-size: 13px; }
.knowledge-stack { padding: 4px 16px 12px; }
.knowledge-stack details { border-bottom: 1px solid var(--app-border); }
.knowledge-stack summary { display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 8px; padding: 16px 8px; cursor: pointer; list-style: none; }
.knowledge-stack summary::-webkit-details-marker { display: none; }
.knowledge-stack summary span { color: var(--app-primary); font-size: 11px; }
.knowledge-stack summary strong { font-size: 13px; font-weight: 600; }
.knowledge-stack summary em { color: var(--app-muted); font-size: 11px; font-style: normal; }
.resource-content { padding: 4px 40px 22px; font-size: 14px; }
.paper-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; padding: 16px; }
.paper-grid > button { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 5px 10px; padding: 15px; border: 1px solid var(--app-border); border-radius: 8px; background: #fff; color: var(--app-text); text-align: left; }
.paper-grid > button:hover { border-color: #a9c2fb; background: #f7faff; }
.paper-grid span { grid-row: 1/3; color: var(--app-primary); font-size: 18px; font-weight: 600; }
.paper-grid strong { font-size: 13px; font-weight: 600; }
.paper-grid small { color: var(--app-muted); font-size: 11px; }
.paper-grid em { grid-row: 1/3; grid-column: 3; color: var(--app-primary); font-size: 11px; font-style: normal; }
.paper-detail-head { display: flex; align-items: center; gap: 10px; padding: 13px 16px; border-bottom: 1px solid var(--app-border); }
.paper-detail-head button { border: 0; background: transparent; color: var(--app-primary); font-size: 12px; }
.paper-detail-head strong { flex: 1; font-size: 13px; font-weight: 600; }
.paper-detail-head span { color: var(--app-muted); font-size: 12px; }
.question-stack { padding: 0 18px; }
.question-stack > article { display: grid; grid-template-columns: 34px 1fr; gap: 10px; padding: 20px 0; border-bottom: 1px solid var(--app-border); }
.question-no { color: var(--app-primary); font-size: 11px; font-weight: 600; }
.question-stack .md { font-size: 13px; }
.passage { margin-bottom: 12px; padding: 12px; background: #f8fafc; }
.options { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin: 12px 0; }
.options p { display: flex; gap: 7px; margin: 0; padding: 9px; border: 1px solid var(--app-border); border-radius: 7px; font-size: 12px; }
.options b { color: var(--app-primary); }
.answer-toggle { margin-top: 10px; padding: 7px 10px; border: 1px solid var(--app-border-strong); border-radius: 7px; background: #fff; color: var(--app-text); font-size: 11px; }
.answer { margin-top: 8px; padding: 11px; border-left: 3px solid var(--app-success); background: #f3fbf7; }
.mistake-stack { display: grid; gap: 0; padding: 4px 16px 16px; }
.mistake-stack article { display: flex; align-items: center; gap: 12px; padding: 15px 0; border-bottom: 1px solid var(--app-border); }
.mistake-stack article > div:first-child { flex: 1; display: grid; gap: 4px; }
.mistake-stack span { color: var(--app-primary); font-size: 11px; }
.mistake-stack strong { font-size: 13px; font-weight: 600; }
.mistake-stack p { margin: 0; color: var(--app-muted); font-size: 12px; }
.mistake-actions { display: flex; gap: 6px; }
.mistake-actions button { height: 30px; border: 1px solid var(--app-border-strong); border-radius: 6px; background: #fff; color: var(--app-muted); font-size: 11px; }
.mistake-actions button.correct { border-color: var(--app-success); background: var(--app-success); color: #fff; }
.checklist { display: grid; gap: 8px; padding: 18px; }
.checklist label { display: flex; align-items: flex-start; gap: 8px; padding: 12px; border: 1px solid var(--app-border); border-radius: 8px; font-size: 13px; }
.checklist input { margin-top: 2px; accent-color: var(--app-success); }
.portal-card { display: grid; justify-items: start; gap: 12px; margin: 16px; padding: 22px; border-left: 3px solid var(--app-primary); border-radius: 0 8px 8px 0; background: #f7faff; }
.portal-card > span { color: var(--app-primary); font-size: 11px; font-weight: 600; }
.portal-card > strong { font-size: 14px; font-weight: 600; }
.portal-button { display: inline-flex; align-items: center; min-height: 38px; padding: 0 14px; border-radius: 8px; background: var(--app-primary); color: #fff; text-decoration: none; font-size: 12px; font-weight: 600; }
.portal-button.secondary { margin-top: 12px; justify-self: start; border: 1px solid var(--app-border-strong); background: #fff; color: var(--app-text); }
.execution-aside { position: sticky; top: 76px; display: grid; gap: 12px; }
.execution-aside > section { padding: 18px; }
.execution-aside section > small { display: block; margin-top: 12px; }
.execution-aside h2 { margin-top: 5px; font-size: 16px; font-weight: 600; }
.execution-aside p { color: var(--app-muted); font-size: 12px; line-height: 1.6; }
.complete-button { width: 100%; height: 40px; margin-top: 8px; border: 0; border-radius: 8px; background: var(--app-primary); color: #fff; font-size: 12px; font-weight: 600; }
.complete-button.done { border: 1px solid #a7d8c8; background: #fff; color: var(--app-success); }
.execution-aside dl { margin: 0; padding: 8px 16px; }
.execution-aside dl > div { display: flex; justify-content: space-between; gap: 10px; padding: 11px 0; border-bottom: 1px solid var(--app-border); font-size: 12px; }
.execution-aside dl > div:last-child { border-bottom: 0; }
.execution-aside dt { color: var(--app-muted); }
.execution-aside dd { margin: 0; font-weight: 600; }
@media(max-width:900px){.execution-page{min-height:calc(100vh - 64px);min-height:calc(100dvh - 64px);padding:10px 16px 34px}.execution-shell{width:min(100%,560px)}.back-button{min-height:44px;display:inline-flex;align-items:center;margin-bottom:6px}.execution-header{gap:10px}.execution-header h1{font-size:20px}.execution-header>div>p:last-child{font-size:12px}.execution-layout{grid-template-columns:1fr}.execution-aside{position:static}.execution-aside dl{display:none}.brief-card{padding:15px}.brief-card>p{font-size:14px}.brief-card small,.resource-heading small,.execution-aside small,.standard span{font-size:12px}.standard strong{font-size:13px}.resource-heading{align-items:flex-start;flex-direction:column;padding:14px}.resource-heading p{text-align:left;font-size:13px}.paper-grid{grid-template-columns:1fr}.paper-grid>button{min-height:64px}.paper-detail-head button,.answer-toggle{min-height:44px}.options{grid-template-columns:1fr}.knowledge-stack summary{min-height:58px;grid-template-columns:26px 1fr}.knowledge-stack summary span{font-size:12px}.knowledge-stack summary em{display:none}.resource-content{padding:4px 10px 18px;font-size:14px}.mistake-stack article{align-items:stretch;flex-direction:column}.mistake-actions button{min-height:44px;flex:1}.portal-button{min-height:44px}.complete-button{min-height:46px;height:auto}.execution-page.mobile .execution-header>div>p:last-child{display:none}}
</style>
