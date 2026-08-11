<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button, InputNumber, Select, SelectOption } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { ACTIVITY_TYPE_LABELS, FORMAL_EXAM_DATE, FORMAL_PLAN_START_DATE } from '@shck/shared';
import { apiError } from '@/api/client';
import { getDay, listSubjects, type PlanTask, type SubjectInfo } from '@/api/plan';
import { createSession, getToday, type TodaySummary } from '@/api/sessions';
import { usePlanStore } from '@/stores/usePlanStore';
import { useStudyScheduleStore } from '@/stores/useStudyScheduleStore';
import { taskRoute } from '@/utils/taskDestination';
import {
  addDays,
  buildDaySchedule,
  minutesLabel,
  nextWeekendDate,
  parseLocalDate,
  weekCapacityDays,
  weekRangeLabel,
} from '@/utils/studySchedule';

const store = usePlanStore();
const router = useRouter();
const scheduleStore = useStudyScheduleStore();
const dayNumber = ref(1);
const examDate = ref(FORMAL_EXAM_DATE);
const error = ref('');
const busy = ref(false);
const subjects = ref<SubjectInfo[]>([]);
const todayStats = ref<TodaySummary | null>(null);
const weekPlans = ref<Record<string, PlanTask[]>>({});
const sessionForm = ref({ subject_id: undefined as number | undefined, activity_type: 'READING', minutes: 30 });
const savingSession = ref(false);

const summary = computed(() => store.summary);
const isCurrentDay = computed(() => dayNumber.value === summary.value?.current_day);
const anchorDate = computed(() => store.day?.task_date ?? new Date().toISOString().slice(0, 10));
const weekDays = computed(() => weekCapacityDays(anchorDate.value, scheduleStore.availability));
const weekLabel = computed(() => weekRangeLabel(weekDays.value));
const deferredFromToday = computed(() => scheduleStore.deferredFrom(anchorDate.value));
const deferredToToday = computed(() => scheduleStore.deferredTo(anchorDate.value));
const sourceTaskIds = computed(() => new Set(deferredFromToday.value.map((entry) => entry.task.id)));
const manuallyReservedMinutes = computed(() => deferredFromToday.value.reduce((sum, entry) => sum + (entry.reservedMinutes ?? 0), 0));
const scheduleTasks = computed(() => {
  const merged = [
    ...(dayNumber.value === summary.value?.current_day ? store.overdue : []),
    ...(store.day?.tasks ?? []).filter((task) => !sourceTaskIds.value.has(task.id)),
    ...deferredToToday.value.map((entry) => entry.task),
  ];
  return [...new Map(merged.map((task) => [task.id, task])).values()];
});
const daySchedule = computed(() => buildDaySchedule(scheduleTasks.value, anchorDate.value, scheduleStore.availability, manuallyReservedMinutes.value));
const taskEntries = computed(() => daySchedule.value.entries.filter((item) => item.kind === 'task' && item.task));
const nextTaskEntry = computed(() => taskEntries.value.find((item) => !item.task?.is_completed) ?? null);
const completedCount = computed(() => scheduleTasks.value.filter((task) => task.is_completed).length);
const completionPct = computed(() => scheduleTasks.value.length ? Math.round((completedCount.value / scheduleTasks.value.length) * 100) : 0);

const weekCards = computed(() => weekDays.value.map((day) => {
  const tasks = weekPlans.value[day.date] ?? [];
  const schedule = buildDaySchedule(tasks, day.date, scheduleStore.availability);
  return { ...day, plannedMinutes: schedule.plannedMinutes, overflow: schedule.overflow.length };
}));
const weeklyPlannedMinutes = computed(() => weekCards.value.reduce((sum, day) => sum + day.plannedMinutes, 0));
const weeklyOverflowMinutes = computed(() => Math.max(0, weeklyPlannedMinutes.value - scheduleStore.weeklyCapacityMinutes));
const weeklyRemainingMinutes = computed(() => Math.max(0, scheduleStore.weeklyCapacityMinutes - weeklyPlannedMinutes.value));

const subjectAllocation = computed(() => {
  const totals = new Map<string, { name: string; color: string; minutes: number }>();
  for (const day of weekDays.value) {
    const schedule = buildDaySchedule(weekPlans.value[day.date] ?? [], day.date, scheduleStore.availability);
    for (const item of schedule.entries) {
      if (item.kind !== 'task') continue;
      const current = totals.get(item.subject) ?? { name: item.subject, color: subjectVisualColor(item.subject, item.color), minutes: 0 };
      current.minutes += item.duration;
      totals.set(item.subject, current);
    }
  }
  return [...totals.values()].sort((a, b) => b.minutes - a.minutes);
});

const dayModeTitle = computed(() => daySchedule.value.mode === 'weekend' ? '深度学习日' : '轻量学习日');
const deferralTarget = computed(() => {
  const day = parseLocalDate(anchorDate.value).getDay();
  return day === 6 ? addDays(anchorDate.value, 1) : nextWeekendDate(anchorDate.value);
});
const moveActionLabel = computed(() => parseLocalDate(deferralTarget.value).getDay() === 0 ? '将末项移至周日' : '将末项移至周六');
const forecast = computed(() => {
  const progress = summary.value?.progress ?? 0;
  const capacityRatio = scheduleStore.weeklyCapacityMinutes > 0
    ? Math.min(1, weeklyPlannedMinutes.value / scheduleStore.weeklyCapacityMinutes)
    : 0;
  return Math.min(98, Math.max(progress, Math.round(70 + capacityRatio * 20)));
});

function formatDate(date: string): string {
  const value = parseLocalDate(date);
  return `${value.getMonth() + 1} 月 ${value.getDate()} 日`;
}

function dayOfMonth(date: string): string {
  return String(parseLocalDate(date).getDate());
}

function subjectVisualColor(name: string, fallback = '#667085'): string {
  if (/高等数学|高数|数学/.test(name)) return '#2563EB';
  if (/英语/.test(name)) return '#7C3AED';
  if (/政治/.test(name)) return '#F97316';
  if (/复习|完成/.test(name)) return '#059669';
  return fallback;
}

function dayNumberForDate(date: string): number | null {
  if (!summary.value?.plan_start_date) return null;
  const diff = Math.round((parseLocalDate(date).getTime() - parseLocalDate(summary.value.plan_start_date).getTime()) / 86_400_000);
  const next = diff + 1;
  return next >= 1 && next <= (summary.value?.study_days ?? 0) ? next : null;
}

async function loadWeekPlans() {
  const result: Record<string, PlanTask[]> = {};
  await Promise.all(weekDays.value.map(async (day) => {
    const number = dayNumberForDate(day.date);
    if (!number) return;
    const plan = await getDay(number);
    result[day.date] = plan.tasks;
  }));
  weekPlans.value = result;
}

async function load() {
  error.value = '';
  busy.value = true;
  try {
    await scheduleStore.loadAvailability();
    subjects.value = await listSubjects();
    await store.loadSummary();
    if (store.summary?.initialized) {
      dayNumber.value = store.summary.current_day;
      await store.loadToday();
      await loadWeekPlans();
    }
    todayStats.value = await getToday();
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

async function initialize() {
  error.value = '';
  busy.value = true;
  try {
    await store.initialize(examDate.value, FORMAL_PLAN_START_DATE);
    dayNumber.value = store.summary?.current_day ?? 1;
    await store.loadToday();
    await loadWeekPlans();
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

async function selectDay(next: number) {
  if (next < 1 || next > (summary.value?.study_days ?? 0) || busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    if (next === summary.value?.current_day) await store.loadToday();
    else await store.loadDay(next);
    dayNumber.value = next;
    await loadWeekPlans();
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

async function selectDate(date: string) {
  const next = dayNumberForDate(date);
  if (next) await selectDay(next);
}

function openTask(task: PlanTask) {
  router.push(taskRoute(task.id, false));
}

async function toggle(task: PlanTask, completed: boolean) {
  try {
    await store.toggleTask(task.id, completed);
    if (completed) scheduleStore.removeDeferred(task.id);
    await loadWeekPlans();
  } catch (cause) {
    error.value = apiError(cause);
  }
}

function moveLastTask() {
  const last = [...daySchedule.value.entries].reverse().find((item) => item.kind === 'task' && item.task && !item.task.is_completed);
  if (!last?.task) return;
  scheduleStore.deferTask(last.task, anchorDate.value, deferralTarget.value, last.duration);
}

function undoLastDeferral() {
  const last = deferredFromToday.value[deferredFromToday.value.length - 1];
  if (last) scheduleStore.removeDeferred(last.task.id);
}

async function recordSession() {
  if (!sessionForm.value.minutes || sessionForm.value.minutes < 1) return;
  savingSession.value = true;
  try {
    await createSession({
      subject_id: sessionForm.value.subject_id,
      activity_type: sessionForm.value.activity_type,
      duration_secs: Math.round(sessionForm.value.minutes * 60),
    });
    todayStats.value = await getToday();
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    savingSession.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="page planning-page">
    <header class="planning-heading">
      <div>
        <p class="page-eyebrow">学习工作台</p>
        <h1>{{ isCurrentDay ? '今天，保持节奏' : `${formatDate(anchorDate)}学习计划` }}</h1>
        <p>{{ formatDate(anchorDate) }} · 工作日轻量推进，周末集中完成深度任务。</p>
      </div>
      <div class="heading-actions">
        <span class="exam-countdown">距考试 <strong>{{ summary?.days_remaining ?? 0 }}</strong> 天</span>
        <RouterLink class="button secondary" to="/plan">时间设置</RouterLink>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="busy && !summary" class="empty">正在计算你的可执行学习容量…</div>

    <template v-else-if="summary?.initialized">
      <section class="today-overview">
        <div class="today-intro">
          <span class="section-kicker">{{ isCurrentDay ? '今日计划' : '当日计划' }}</span>
          <h2>{{ dayModeTitle }}</h2>
          <p>{{ daySchedule.mode === 'weekend' ? `${scheduleStore.availability.weekendStart}–${scheduleStore.availability.weekendEnd} · 深度任务优先` : `早间 ${scheduleStore.availability.weekdayMorningMinutes} 分钟 + 晚间 ${scheduleStore.availability.weekdayMinutes - scheduleStore.availability.weekdayMorningMinutes} 分钟` }}</p>
        </div>

        <div class="today-progress" aria-label="今日完成进度">
          <div><span>{{ isCurrentDay ? '今日完成' : '当日完成' }}</span><strong>{{ completionPct }}%</strong></div>
          <div class="progress-track"><i :style="{ width: `${completionPct}%` }" /></div>
          <small>{{ completedCount }} / {{ scheduleTasks.length }} 项 · 计划 {{ minutesLabel(daySchedule.plannedMinutes) }}</small>
        </div>

        <button v-if="nextTaskEntry?.task" class="next-task" type="button" @click="openTask(nextTaskEntry.task)">
          <span class="next-label">下一项任务</span>
          <span class="next-meta">
            <time>{{ nextTaskEntry.start }}</time>
            <i :style="{ background: subjectVisualColor(nextTaskEntry.subject, nextTaskEntry.color) }" />
            {{ nextTaskEntry.subject }} · {{ nextTaskEntry.duration }} 分钟
          </span>
          <strong>{{ nextTaskEntry.title }}</strong>
          <small>开始学习 <b>→</b></small>
        </button>
        <div v-else class="next-task all-done">
          <span class="next-label">今日状态</span>
          <strong>今日任务已完成</strong>
          <small>可以进行轻量复盘，或提前休息。</small>
        </div>
      </section>

      <section class="capacity-panel">
        <header class="capacity-header">
          <div>
            <h2>本周计划</h2>
            <p>{{ weekLabel }} · 第 {{ Math.ceil(dayNumber / 7) }} 周</p>
          </div>
          <div class="capacity-totals">
            <span>已规划 <strong>{{ minutesLabel(weeklyPlannedMinutes) }}</strong></span>
            <span>本周余量 <strong>{{ minutesLabel(weeklyRemainingMinutes) }}</strong></span>
            <span :class="weeklyOverflowMinutes ? 'danger-text' : 'success-text'">{{ weeklyOverflowMinutes ? `超出 ${minutesLabel(weeklyOverflowMinutes)}` : '容量适配' }}</span>
          </div>
          <div class="week-toolbar">
            <button aria-label="上一周" @click="selectDay(Math.max(1, dayNumber - 7))">←</button>
            <button aria-label="下一周" @click="selectDay(Math.min(summary?.study_days ?? dayNumber, dayNumber + 7))">→</button>
          </div>
        </header>

        <div class="week-capacity-grid">
          <button v-for="day in weekCards" :key="day.key" type="button" class="week-day-card" :class="{ weekend: day.isWeekend, selected: day.date === anchorDate }" :aria-label="`查看 ${day.date} 的计划`" @click="selectDate(day.date)">
            <span class="day-name">{{ day.weekday }}<em v-if="day.isToday">今天</em></span>
            <strong class="day-date">{{ dayOfMonth(day.date) }}</strong>
            <span class="day-duration">{{ minutesLabel(day.plannedMinutes || day.capacityMinutes, true) }}</span>
            <span class="day-load"><i :style="{ width: `${Math.min(100, day.capacityMinutes ? day.plannedMinutes / day.capacityMinutes * 100 : 0)}%` }" /></span>
            <small :class="day.overflow ? 'danger-text' : ''">{{ day.overflow ? `${day.overflow} 项顺延` : day.isWeekend ? '深度学习' : '轻量学习' }}</small>
          </button>
        </div>
      </section>

      <div class="planning-layout">
        <main class="timeline-panel">
          <header class="timeline-heading">
            <div>
              <div class="timeline-title"><h2>{{ formatDate(anchorDate) }}学习安排</h2><span>{{ dayModeTitle }}</span></div>
              <p>按时间顺序执行，点击任务进入学习页面。</p>
            </div>
            <div class="day-switcher"><button :disabled="dayNumber <= 1" aria-label="前一天" @click="selectDay(dayNumber - 1)">←</button><button :disabled="dayNumber >= (summary?.study_days ?? 1)" aria-label="后一天" @click="selectDay(dayNumber + 1)">→</button></div>
          </header>

          <div v-if="store.overdue.length || deferredToToday.length" class="transfer-notice">
            <span>↕</span>
            <p><strong>已把积压任务纳入当前计划</strong><small>{{ store.overdue.length + deferredToToday.length }} 项任务优先进入可用时段，仍保留必要缓冲。</small></p>
            <button v-if="deferredFromToday.length" class="undo-transfer" @click="undoLastDeferral">撤销</button><button @click="moveLastTask">{{ moveActionLabel }}</button>
          </div>
          <div v-else-if="daySchedule.overflow.length" class="transfer-notice warning">
            <span>!</span>
            <p><strong>今天有 {{ daySchedule.overflow.length }} 项超过可用容量</strong><small>建议顺延末项，不透支睡眠或休息时间。</small></p>
            <button @click="moveLastTask">{{ moveActionLabel }}</button>
          </div>

          <div class="timeline-list">
            <article v-for="item in daySchedule.entries" :key="item.id" :class="['timeline-row', item.kind, { actionable: item.task, 'is-next': item.id === nextTaskEntry?.id, 'is-complete': item.task?.is_completed }]" :role="item.task ? 'button' : undefined" :tabindex="item.task ? 0 : undefined" @click="item.task && openTask(item.task)" @keydown.enter="item.task && openTask(item.task)" @keydown.space.prevent="item.task && openTask(item.task)">
              <div class="timeline-time"><time>{{ item.start }}</time><span>至 {{ item.end }}</span></div>
              <span class="timeline-rail" :style="{ '--subject-color': subjectVisualColor(item.subject, item.color) }"><i /></span>
              <div class="timeline-task">
                <div class="task-meta">
                  <span class="subject-tag" :style="{ '--subject-color': subjectVisualColor(item.subject, item.color) }">{{ item.subject }}</span>
                  <span>{{ item.kind === 'task' ? (item.duration >= 75 ? '深度学习' : '重点任务') : '休息' }}</span>
                  <span>{{ item.duration }} 分钟</span>
                  <em v-if="item.id === nextTaskEntry?.id">当前任务</em>
                </div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.subtitle }}</p>
              </div>
              <label v-if="item.task" class="timeline-check" @click.stop><input type="checkbox" :checked="item.task.is_completed" @change="toggle(item.task, !item.task.is_completed)" /><span>{{ item.task.is_completed ? '已完成' : '待开始' }}</span></label>
              <span v-else class="rest-status">必要休息</span>
            </article>
            <div v-if="!daySchedule.entries.length" class="empty">当前日期没有可安排的任务。</div>
          </div>
          <footer class="timeline-summary"><span>计划专注 <strong>{{ minutesLabel(daySchedule.plannedMinutes) }}</strong></span><span>有效容量 <strong>{{ minutesLabel(daySchedule.capacityMinutes) }}</strong></span><span class="success-text">缓冲 {{ minutesLabel(daySchedule.bufferMinutes) }}</span></footer>
        </main>

        <aside class="planning-aside">
          <section class="aside-card weekly-status-card">
            <header><h2>本周状态</h2><span>{{ forecast }}% 可完成</span></header>
            <div class="status-metrics">
              <div><span>距考试</span><strong>{{ summary.days_remaining }}</strong><small>天</small></div>
              <div><span>本周余量</span><strong>{{ minutesLabel(weeklyRemainingMinutes, true) }}</strong></div>
            </div>
            <div class="forecast-meter"><i :style="{ width: `${forecast}%` }" /></div>
            <p class="status-copy">{{ forecast >= 80 ? '当前节奏可持续，继续按工作日轻量、周末深度的方式执行。' : '当前容量偏紧，建议调整本周任务分布。' }}</p>

            <div class="aside-divider" />
            <div class="aside-subhead"><h3>科目时间分布</h3><span>{{ minutesLabel(weeklyPlannedMinutes) }}</span></div>
            <div v-for="subject in subjectAllocation" :key="subject.name" class="allocation-row"><i :style="{ background: subject.color }" /><span>{{ subject.name }}</span><strong>{{ minutesLabel(subject.minutes, true) }}</strong></div>
            <p v-if="!subjectAllocation.length" class="aside-empty">本周暂无科目任务。</p>

            <div class="aside-divider" />
            <div class="availability-summary">
              <div><span>工作日</span><strong>{{ minutesLabel(scheduleStore.availability.weekdayMinutes, true) }} / 天</strong></div>
              <div><span>周六 / 周日</span><strong>{{ minutesLabel(scheduleStore.availability.saturdayMinutes, true) }} / {{ minutesLabel(scheduleStore.availability.sundayMinutes, true) }}</strong></div>
            </div>
            <RouterLink class="aside-link" to="/plan">调整可用时间 →</RouterLink>
          </section>

          <section class="aside-card record-card">
            <header><h2>记录实际学习</h2><span v-if="todayStats">今日 {{ minutesLabel(todayStats.total_secs / 60) }}</span></header>
            <div class="record-form"><Select v-model:value="sessionForm.subject_id" allow-clear placeholder="不指定科目"><SelectOption v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.name }}</SelectOption></Select><Select v-model:value="sessionForm.activity_type"><SelectOption v-for="(label, key) in ACTIVITY_TYPE_LABELS" :key="key" :value="key">{{ label }}</SelectOption></Select><label><InputNumber v-model:value="sessionForm.minutes" :min="1" :max="600" /><span>分钟</span></label><Button type="primary" :loading="savingSession" @click="recordSession">{{ savingSession ? '保存中…' : '记录学习' }}</Button></div>
          </section>
        </aside>
      </div>
    </template>

    <section v-else class="setup-panel">
      <span>开始规划</span><h2>生成你的成人本科备考计划</h2><p>系统将从 2026 年 8 月 10 日排到 10 月 16 日，工作日轻量学习，完整章节和真题集中在周末。</p>
      <div><label>目标考试日期<input v-model="examDate" type="date" /></label><Button type="primary" :loading="busy" @click="initialize">{{ busy ? '正在生成…' : '生成个人计划' }}</Button></div>
    </section>
  </section>
</template>

<style scoped>
.planning-page {
  --math: #2563eb;
  --english: #7c3aed;
  --politics: #f97316;
  --complete: #059669;
  max-width: 1500px;
  color: var(--app-text);
}

.planning-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
.planning-heading h1 { font-size: 24px; font-weight: 600; letter-spacing: -.02em; }
.planning-heading p:not(.page-eyebrow) { margin: 6px 0 0; color: var(--app-muted); font-size: 13px; }
.heading-actions { display: flex; align-items: center; gap: 12px; }
.exam-countdown { color: var(--app-muted); font-size: 13px; }
.exam-countdown strong { margin: 0 3px; color: var(--app-text); font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }

.today-overview,
.capacity-panel,
.timeline-panel,
.aside-card,
.setup-panel { border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-surface); box-shadow: var(--app-shadow-sm); }

.today-overview { display: grid; grid-template-columns: minmax(190px,.75fr) minmax(190px,.8fr) minmax(300px,1.35fr); align-items: stretch; margin-bottom: 16px; overflow: hidden; }
.today-intro { padding: 20px 24px; }
.section-kicker { display: block; margin-bottom: 7px; color: var(--app-primary); font-size: 12px; font-weight: 600; }
.today-intro h2 { font-size: 20px; font-weight: 600; }
.today-intro p { margin: 6px 0 0; color: var(--app-muted); font-size: 13px; line-height: 1.5; }
.today-progress { align-self: center; padding: 12px 24px; border-left: 1px solid var(--app-border); }
.today-progress > div:first-child { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; color: var(--app-muted); font-size: 13px; }
.today-progress strong { color: var(--app-text); font-size: 30px; font-weight: 600; letter-spacing: -.04em; }
.today-progress .progress-track { height: 7px; margin: 10px 0 8px; background: #eef1f5; }
.today-progress .progress-track i { display: block; height: 100%; border-radius: inherit; background: var(--complete); transition: width .2s ease; }
.today-progress small { color: var(--app-muted); font-size: 12px; }
.next-task { display: grid; align-content: center; justify-items: start; min-width: 0; padding: 18px 22px; border: 0; border-left: 1px solid #cbdafb; background: #f7faff; color: var(--app-text); text-align: left; transition: background .15s ease, box-shadow .15s ease; }
.next-task:hover { background: #f0f5ff; box-shadow: inset 3px 0 var(--app-primary); }
.next-task:focus-visible { outline-offset: -4px; }
.next-label { margin-bottom: 7px; color: var(--app-primary); font-size: 12px; font-weight: 600; }
.next-meta { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; color: var(--app-muted); font-size: 12px; }
.next-meta time { color: var(--app-text); font-weight: 600; font-variant-numeric: tabular-nums; }
.next-meta i { width: 7px; height: 7px; border-radius: 50%; }
.next-task > strong { overflow: hidden; max-width: 100%; font-size: 15px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.next-task > small { margin-top: 8px; color: var(--app-primary); font-size: 12px; font-weight: 600; }
.next-task.all-done { background: #f3fbf7; }
.next-task.all-done .next-label, .next-task.all-done small { color: var(--complete); }

.capacity-panel { margin-bottom: 16px; padding: 0 16px 14px; }
.capacity-header { display: grid; grid-template-columns: minmax(210px,1fr) auto auto; align-items: center; gap: 24px; min-height: 64px; }
.capacity-header h2 { font-size: 16px; font-weight: 600; }
.capacity-header p { margin: 3px 0 0; color: var(--app-muted); font-size: 12px; }
.capacity-totals { display: flex; align-items: center; gap: 20px; color: var(--app-muted); font-size: 12px; }
.capacity-totals strong { margin-left: 4px; color: var(--app-text); font-size: 13px; font-weight: 600; }
.week-toolbar,.day-switcher { display: flex; gap: 6px; }
.week-toolbar button,.day-switcher button { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid var(--app-border-strong); border-radius: 8px; background: #fff; color: var(--app-text); }
.week-toolbar button:hover,.day-switcher button:hover:not(:disabled) { border-color: #aebedb; background: var(--app-primary-soft); color: var(--app-primary); }
.week-toolbar button:disabled,.day-switcher button:disabled { cursor: not-allowed; opacity: .4; }
.week-capacity-grid { display: grid; grid-template-columns: repeat(7,minmax(0,1fr)); gap: 6px; }
.week-day-card { display: grid; grid-template-columns: 1fr auto; gap: 4px 8px; min-width: 0; padding: 10px 11px; border: 1px solid transparent; border-radius: 8px; background: #fafbfc; color: inherit; text-align: left; transition: border-color .15s ease, background .15s ease; }
.week-day-card:hover { border-color: var(--app-border-strong); background: #fff; }
.week-day-card.weekend { background: #f8f9fc; }
.week-day-card.selected { border-color: #a9c2fb; background: #f5f8ff; }
.day-name { color: var(--app-muted); font-size: 12px; }
.day-name em { margin-left: 5px; color: var(--app-primary); font-size: 10px; font-style: normal; }
.day-date { justify-self: end; color: var(--app-text); font-size: 14px; font-weight: 600; }
.day-duration { color: var(--app-text); font-size: 13px; font-weight: 600; }
.day-load { align-self: center; height: 4px; overflow: hidden; border-radius: 99px; background: #e7ebf1; }
.day-load i { display: block; height: 100%; border-radius: inherit; background: var(--app-primary); }
.week-day-card small { grid-column: 1/-1; overflow: hidden; color: var(--app-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }

.planning-layout { display: grid; grid-template-columns: minmax(0,1fr) 290px; gap: 16px; align-items: start; }
.timeline-heading { min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 15px 18px; border-bottom: 1px solid var(--app-border); }
.timeline-title { display: flex; align-items: center; gap: 9px; }
.timeline-title h2 { font-size: 16px; font-weight: 600; }
.timeline-title span { padding: 3px 7px; border-radius: 5px; background: var(--app-primary-soft); color: var(--app-primary); font-size: 11px; font-weight: 600; }
.timeline-heading p { margin: 4px 0 0; color: var(--app-muted); font-size: 12px; }
.transfer-notice { display: flex; align-items: center; gap: 10px; margin: 12px; padding: 11px 12px; border: 1px solid #fed7aa; border-radius: 8px; background: #fffaf5; color: #c2410c; }
.transfer-notice > span { display: grid; place-items: center; width: 25px; height: 25px; flex: 0 0 25px; border-radius: 6px; background: #ffedd5; font-weight: 600; }
.transfer-notice p { flex: 1; display: grid; gap: 2px; margin: 0; }
.transfer-notice strong { font-size: 12px; font-weight: 600; }
.transfer-notice small { color: #9a5d43; font-size: 11px; }
.transfer-notice button { min-height: 30px; border: 0; border-radius: 6px; padding: 0 10px; background: var(--politics); color: #fff; font-size: 11px; font-weight: 600; }
.transfer-notice button.undo-transfer { border: 1px solid #fed7aa; background: #fff; color: #c2410c; }
.timeline-list { padding: 4px 0; }
.timeline-row { position: relative; display: grid; grid-template-columns: 76px 18px minmax(0,1fr) 76px; align-items: center; gap: 12px; min-height: 102px; padding: 13px 18px; border-bottom: 1px solid #eef1f4; font-size: 13px; }
.timeline-row:last-child { border-bottom: 0; }
.timeline-row.actionable { cursor: pointer; transition: background .15s ease; }
.timeline-row.actionable:hover { background: #fafcff; }
.timeline-row.is-next { background: #f7faff; }
.timeline-row.is-next::before { position: absolute; top: 0; bottom: 0; left: 0; width: 3px; content: ''; background: var(--app-primary); }
.timeline-row.is-complete { opacity: .7; }
.timeline-row.break,.timeline-row.lunch { min-height: 66px; background: #fbfcfd; }
.timeline-time { display: grid; gap: 3px; align-self: start; padding-top: 3px; }
.timeline-time time { color: var(--app-text); font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.timeline-time span { color: var(--app-faint); font-size: 11px; }
.timeline-rail { position: relative; align-self: stretch; display: flex; justify-content: center; }
.timeline-rail::after { position: absolute; top: 19px; bottom: -32px; width: 1px; content: ''; background: var(--app-border); }
.timeline-row:last-child .timeline-rail::after { display: none; }
.timeline-rail i { position: relative; z-index: 1; width: 9px; height: 9px; margin-top: 6px; border: 2px solid #fff; border-radius: 50%; background: var(--subject-color); box-shadow: 0 0 0 2px color-mix(in srgb,var(--subject-color) 25%,#fff); }
.timeline-task { min-width: 0; }
.task-meta { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; color: var(--app-muted); font-size: 11px; }
.task-meta em { padding: 2px 6px; border-radius: 4px; background: var(--app-primary); color: #fff; font-size: 10px; font-style: normal; font-weight: 600; }
.subject-tag { padding: 2px 7px; border-radius: 5px; background: color-mix(in srgb,var(--subject-color) 9%,#fff); color: var(--subject-color); font-weight: 600; }
.timeline-task > strong { display: block; color: var(--app-text); font-size: 14px; font-weight: 600; line-height: 1.45; }
.timeline-task p { display: -webkit-box; overflow: hidden; margin: 4px 0 0; color: var(--app-muted); font-size: 12px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.timeline-check { display: grid; justify-items: start; gap: 5px; color: var(--app-muted); font-size: 11px; cursor: pointer; }
.timeline-check input { width: 17px; height: 17px; margin: 0; accent-color: var(--complete); }
.rest-status { color: var(--app-faint); font-size: 11px; }
.timeline-summary { display: flex; justify-content: flex-end; gap: 20px; padding: 13px 18px; border-top: 1px solid var(--app-border); color: var(--app-muted); font-size: 12px; }
.timeline-summary strong { margin-left: 3px; color: var(--app-text); font-size: 13px; font-weight: 600; }

.planning-aside { display: grid; gap: 12px; }
.aside-card { padding: 18px; }
.aside-card header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 15px; }
.aside-card h2 { font-size: 16px; font-weight: 600; }
.aside-card header > span { color: var(--app-primary); font-size: 12px; font-weight: 600; }
.status-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.status-metrics > div { padding: 12px; border-radius: 8px; background: #f8f9fb; }
.status-metrics span { display: block; margin-bottom: 5px; color: var(--app-muted); font-size: 11px; }
.status-metrics strong { color: var(--app-text); font-size: 28px; font-weight: 600; letter-spacing: -.04em; }
.status-metrics small { margin-left: 3px; color: var(--app-muted); font-size: 12px; }
.forecast-meter { height: 6px; overflow: hidden; margin: 14px 0 9px; border-radius: 99px; background: #e9edf3; }
.forecast-meter i { display: block; height: 100%; border-radius: inherit; background: var(--app-primary); }
.status-copy { margin: 0; color: var(--app-muted); font-size: 12px; line-height: 1.55; }
.aside-divider { height: 1px; margin: 17px 0; background: var(--app-border); }
.aside-subhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.aside-subhead h3 { margin: 0; color: var(--app-text); font-size: 13px; font-weight: 600; }
.aside-subhead span { color: var(--app-muted); font-size: 11px; }
.allocation-row { display: grid; grid-template-columns: 8px 1fr auto; align-items: center; gap: 8px; padding: 6px 0; color: var(--app-muted); font-size: 12px; }
.allocation-row i { width: 8px; height: 8px; border-radius: 50%; }
.allocation-row strong { color: var(--app-text); font-size: 12px; font-weight: 600; }
.availability-summary { display: grid; gap: 9px; }
.availability-summary div { display: flex; justify-content: space-between; gap: 12px; color: var(--app-muted); font-size: 12px; }
.availability-summary strong { color: var(--app-text); font-weight: 600; }
.aside-link { display: inline-block; margin-top: 13px; color: var(--app-primary); font-size: 12px; font-weight: 600; text-decoration: none; }
.aside-empty { color: var(--app-muted); font-size: 12px; }
.record-card header { margin-bottom: 12px; }
.record-form { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.record-form :deep(.ant-select),.record-form label { min-width: 0; }
.record-form :deep(.ant-select-selector),.record-form label { height: 36px!important; border-radius: 7px!important; font-size: 12px; }
.record-form label { display: flex; align-items: center; }
.record-form label :deep(.ant-input-number) { min-width: 0; width: 100%; height: 36px; border: 0; box-shadow: none; }
.record-form label :deep(.ant-input-number-input) { height: 34px; }
.record-form label span { padding-right: 8px; color: var(--app-muted); white-space: nowrap; }
.record-form :deep(.ant-btn) { grid-column: 1/-1; height: 36px; border-radius: 7px; font-size: 12px; }
.success-text { color: var(--complete) !important; }
.danger-text { color: #d9480f !important; }

.setup-panel { max-width: 720px; padding: 32px; }
.setup-panel > span { color: var(--app-primary); font-size: 12px; font-weight: 600; }
.setup-panel h2 { margin-top: 10px; font-size: 22px; }
.setup-panel p { max-width: 560px; color: var(--app-muted); font-size: 13px; line-height: 1.7; }
.setup-panel > div { display: flex; gap: 10px; margin-top: 20px; }
.setup-panel label { display: grid; gap: 6px; flex: 1; color: var(--app-muted); font-size: 12px; }
.setup-panel input { height: 40px; border: 1px solid var(--app-border-strong); border-radius: 8px; padding: 0 10px; }
.setup-panel button { align-self: end; height: 40px; border: 0; border-radius: 8px; background: var(--app-primary); color: #fff; padding: 0 16px; font-weight: 600; }

@media (max-width: 1250px) {
  .today-overview { grid-template-columns: minmax(180px,.7fr) minmax(170px,.65fr) minmax(280px,1.2fr); }
  .planning-layout { grid-template-columns: minmax(0,1fr) 268px; }
  .capacity-totals { gap: 12px; }
}

@media (max-width: 1080px) {
  .today-overview { grid-template-columns: 1fr 1fr; }
  .next-task { grid-column: 1/-1; border-top: 1px solid #cbdafb; border-left: 0; }
  .planning-layout { grid-template-columns: 1fr; }
  .planning-aside { grid-template-columns: 1.4fr 1fr; }
  .capacity-header { grid-template-columns: 1fr auto; }
  .capacity-totals { grid-column: 1/-1; grid-row: 2; padding-bottom: 12px; }
  .week-toolbar { grid-column: 2; grid-row: 1; }
}

@media (max-width: 900px) {
  .planning-heading { align-items: flex-start; flex-direction: column; }
  .heading-actions { width: 100%; justify-content: space-between; }
  .today-overview { grid-template-columns: 1fr; }
  .today-progress,.next-task { grid-column: auto; border-top: 1px solid var(--app-border); border-left: 0; }
  .week-capacity-grid { overflow-x: auto; grid-template-columns: repeat(7,112px); padding-bottom: 3px; }
  .planning-aside { grid-template-columns: 1fr; }
  .timeline-row { grid-template-columns: 62px 14px minmax(0,1fr); gap: 8px; padding: 13px 14px; }
  .timeline-check,.rest-status { grid-column: 3; grid-row: 2; display: flex; align-items: center; }
  .timeline-task p { -webkit-line-clamp: 3; }
}

@media (max-width: 560px) {
  .capacity-header { gap: 12px; }
  .capacity-totals { display: grid; grid-template-columns: 1fr 1fr; }
  .capacity-totals span:last-child { grid-column: 1/-1; }
  .timeline-heading { align-items: flex-start; }
  .timeline-row { grid-template-columns: 52px 10px minmax(0,1fr); }
  .task-meta { flex-wrap: wrap; gap: 6px; }
  .timeline-summary { flex-wrap: wrap; justify-content: flex-start; }
}
</style>
