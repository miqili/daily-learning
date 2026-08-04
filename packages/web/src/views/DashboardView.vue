<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ACTIVITY_TYPE_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import type { PlanTask } from '@/api/plan';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import { createSession, getSummary as getSessionsSummary, getToday, type TodaySummary, type SessionsSummary } from '@/api/sessions';
import PlanTaskList from '@/components/plan/PlanTaskList.vue';
import { usePlanStore } from '@/stores/usePlanStore';

const store = usePlanStore();
const dayNumber = ref(1);
const examDate = ref('2026-10-24');
const error = ref('');
const busy = ref(false);
const subjects = ref<SubjectInfo[]>([]);
const todayStats = ref<TodaySummary | null>(null);
const weekStats = ref<SessionsSummary | null>(null);
const sessionForm = ref({ subject_id: undefined as number | undefined, activity_type: 'READING', minutes: 30 });
const savingSession = ref(false);

const summary = computed(() => store.summary);

function formatDuration(secs: number): string {
  const minutes = Math.round(secs / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
}

function maxWeekSeconds(): number {
  const max = Math.max(1, ...(weekStats.value?.list.map((d) => d.seconds) ?? [0]));
  return max;
}

async function loadSessions() {
  todayStats.value = await getToday();
  weekStats.value = await getSessionsSummary(7);
}

async function recordSession() {
  if (!sessionForm.value.minutes || sessionForm.value.minutes < 1) return;
  error.value = '';
  savingSession.value = true;
  try {
    await createSession({
      subject_id: sessionForm.value.subject_id,
      activity_type: sessionForm.value.activity_type,
      duration_secs: Math.round(sessionForm.value.minutes * 60),
    });
    sessionForm.value = { subject_id: undefined, activity_type: 'READING', minutes: 30 };
    await loadSessions();
  } catch (cause) { error.value = apiError(cause); } finally { savingSession.value = false; }
}

const groups = computed(() => {
  const all = store.day?.tasks ?? [];
  const map = new Map<number, { subject: NonNullable<PlanTask['subject']>; tasks: PlanTask[] }>();
  for (const task of all) {
    if (!task.subject) continue;
    const entry = map.get(task.subject.id);
    if (entry) entry.tasks.push(task);
    else map.set(task.subject.id, { subject: task.subject, tasks: [task] });
  }
  return [...map.values()];
});

async function load() {
  error.value = '';
  busy.value = true;
  try {
    subjects.value = await listSubjects();
    await store.loadSummary();
    if (store.summary?.initialized) {
      dayNumber.value = store.summary.current_day;
      await store.loadDay(dayNumber.value);
    }
    await loadSessions();
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function initialize() {
  error.value = '';
  busy.value = true;
  try {
    await store.initialize(examDate.value);
    dayNumber.value = store.summary?.current_day ?? 1;
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function selectDay(next: number) {
  if (next < 1 || next > 70 || busy.value) return;
  busy.value = true;
  error.value = '';
  try { await store.loadDay(next); dayNumber.value = next; }
  catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function toggle(task: PlanTask, completed: boolean) {
  try { await store.toggleTask(task.id, completed); } catch (cause) { error.value = apiError(cause); }
}

onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-heading">
      <div><h1>今日任务</h1><p class="muted" style="margin:8px 0 0">每天完成三科小任务，70 天稳步推进。</p></div>
      <div v-if="summary" class="badge amber">距考试 {{ summary.days_remaining }} 天</div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="busy && !summary" class="empty">正在加载备考进度…</div>
    <template v-else-if="summary?.initialized">
      <div class="stat-grid" style="margin-bottom:24px">
        <div class="stat"><span class="caption">备考进度</span><div class="stat-value">{{ summary.progress }}%</div></div>
        <div class="stat"><span class="caption">已完成任务</span><div class="stat-value">{{ summary.completed_tasks }}<small style="font-size:14px;color:#64748b"> / {{ summary.total_tasks }}</small></div></div>
        <div class="stat"><span class="caption">当前节奏</span><div class="stat-value">D{{ dayNumber }}<small style="font-size:14px;color:#64748b"> / 70</small></div></div>
      </div>
      <section class="card card-pad" style="margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:12px"><span class="caption">全局完成度</span><strong>{{ summary.completed_tasks }} / {{ summary.total_tasks }}</strong></div>
        <div class="progress-track"><div class="progress-value" :style="{ width: `${summary.progress}%` }" /></div>
      </section>
      <section class="card card-pad" style="margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2>各科进度</h2><span class="caption">70 天计划 · {{ summary.plan_start_date }} → {{ summary.exam_date }}</span></div>
        <div style="display:grid;gap:14px">
          <div v-for="s in summary.by_subject" :key="s.subject_id">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px"><strong style="font-size:14px">{{ s.name }}</strong><span class="caption">{{ s.completed_tasks }} / {{ s.total_tasks }}（{{ s.progress }}%）</span></div>
            <div class="progress-track"><div class="progress-value" :style="{ width: `${s.progress}%`, background: s.color }" /></div>
          </div>
        </div>
      </section>
      <section class="card card-pad" style="margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
          <h2>今日学习</h2>
          <span v-if="todayStats" class="badge green">已记录 {{ formatDuration(todayStats.total_secs) }} · {{ todayStats.count }} 条</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end;margin-bottom:16px;flex-wrap:wrap">
          <label style="display:grid;gap:6px"><span class="caption">科目</span><select v-model="sessionForm.subject_id" class="select"><option :value="undefined">不指定</option><option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
          <label style="display:grid;gap:6px"><span class="caption">活动</span><select v-model="sessionForm.activity_type" class="select"><option v-for="(label, key) in ACTIVITY_TYPE_LABELS" :key="key" :value="key">{{ label }}</option></select></label>
          <label style="display:grid;gap:6px"><span class="caption">时长（分钟）</span><input v-model.number="sessionForm.minutes" class="input" type="number" min="1" max="600" /></label>
          <button class="button" :disabled="savingSession" @click="recordSession">{{ savingSession ? '保存中…' : '记录' }}</button>
        </div>
        <div v-if="todayStats?.by_subject.length" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          <span v-for="s in todayStats.by_subject" :key="s.subject_id" class="badge" :style="{ background: `${s.color}1a`, color: s.color }">{{ s.name }} {{ formatDuration(s.seconds) }}</span>
        </div>
        <div v-if="weekStats?.list.length" style="display:flex;gap:10px;align-items:flex-end;min-height:110px">
          <div v-for="day in weekStats.list" :key="day.date" style="flex:1;display:flex;flex-direction:column;gap:6px;align-items:center">
            <span class="caption" style="font-size:11px">{{ day.seconds > 0 ? Math.round(day.seconds / 60) : '' }}</span>
            <div class="progress-value" :style="{ width: '100%', height: `${day.seconds > 0 ? Math.max(6, Math.round((day.seconds / maxWeekSeconds()) * 80)) : 4}px`, background: day.seconds > 0 ? '#2563eb' : '#e2e8f0' }" />
            <span class="caption" style="font-size:11px">{{ day.date.slice(5) }}</span>
          </div>
        </div>
      </section>
      <div class="page-heading" style="margin-bottom:16px;align-items:center">
        <div><h2>第 {{ dayNumber }} 天</h2><span class="caption">{{ store.day?.task_date }}</span></div>
        <div style="display:flex;gap:8px"><button class="button secondary" :disabled="dayNumber <= 1 || busy" @click="selectDay(dayNumber - 1)">← 前一天</button><button class="button secondary" :disabled="dayNumber >= 70 || busy" @click="selectDay(dayNumber + 1)">后一天 →</button></div>
      </div>
      <div class="grid-3">
        <PlanTaskList v-for="group in groups" :key="group.subject.id" :subject="group.subject" :tasks="group.tasks" @toggle="toggle" />
      </div>
    </template>
    <section v-else class="card card-pad" style="max-width:680px">
      <h2>生成你的 70 天计划</h2>
      <p class="muted" style="margin:8px 0 20px">系统会从目标考试日倒推 69 天，按科目生成 70 天每日任务。可在「计划配置」中调整科目与考试日期。</p>
      <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap"><label style="display:grid;gap:8px;flex:1;min-width:220px"><span class="caption">目标考试日期</span><input v-model="examDate" class="input" type="date" /></label><button class="button" :disabled="busy" @click="initialize">{{ busy ? '正在生成…' : '生成计划' }}</button></div>
    </section>
  </section>
</template>
