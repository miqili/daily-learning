<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { apiError } from '@/api/client';
import type { PlanTask } from '@/api/plan';
import { getVocabularySettings } from '@/api/vocabulary';
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
} from '@/utils/studySchedule';

const store = usePlanStore();
const router = useRouter();
const scheduleStore = useStudyScheduleStore();
const dayNumber = ref(1);
const error = ref('');
const busy = ref(true);
const dailyWordTarget = ref(20);

const anchorDate = computed(() => store.day?.task_date ?? new Date().toISOString().slice(0, 10));
const weekDays = computed(() => weekCapacityDays(anchorDate.value, scheduleStore.availability));
const deferredFromToday = computed(() => scheduleStore.deferredFrom(anchorDate.value));
const deferredToToday = computed(() => scheduleStore.deferredTo(anchorDate.value));
const sourceTaskIds = computed(() => new Set(deferredFromToday.value.map((entry) => entry.task.id)));
const manuallyReservedMinutes = computed(() => deferredFromToday.value.reduce((sum, entry) => sum + (entry.reservedMinutes ?? 0), 0));
const scheduleTasks = computed(() => {
  const merged = [
    ...(dayNumber.value === store.summary?.current_day ? store.overdue : []),
    ...(store.day?.tasks ?? []).filter((task) => !sourceTaskIds.value.has(task.id)),
    ...deferredToToday.value.map((entry) => entry.task),
  ];
  return [...new Map(merged.map((task) => [task.id, task])).values()];
});
const daySchedule = computed(() => buildDaySchedule(scheduleTasks.value, anchorDate.value, scheduleStore.availability, manuallyReservedMinutes.value));
const taskEntries = computed(() => daySchedule.value.entries.filter((item) => item.kind === 'task' && item.task));
const completedCount = computed(() => taskEntries.value.filter((item) => item.task?.is_completed).length);
const remainingTaskCount = computed(() => taskEntries.value.filter((item) => !item.task?.is_completed).length);
const nextTaskEntry = computed(() => taskEntries.value.find((item) => !item.task?.is_completed) ?? null);
const totalPlannedMinutes = computed(() => taskEntries.value.reduce((sum, item) => sum + item.duration, 0));
const remainingMinutes = computed(() => taskEntries.value.reduce((sum, item) => sum + (item.task?.is_completed ? 0 : item.duration), 0));
const transferCount = computed(() => store.overdue.length + deferredToToday.value.length + deferredFromToday.value.length);
const targetDate = computed(() => parseLocalDate(anchorDate.value).getDay() === 6 ? addDays(anchorDate.value, 1) : nextWeekendDate(anchorDate.value));
const isCurrentDay = computed(() => dayNumber.value === store.summary?.current_day);
const totalDays = computed(() => store.summary?.study_days ?? 1);
const dateLabel = computed(() => {
  const date = parseLocalDate(anchorDate.value);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
});

async function load() {
  error.value = '';
  busy.value = true;
  try {
    const [, , vocabularySettings] = await Promise.all([
      scheduleStore.loadAvailability(),
      store.loadSummary(),
      getVocabularySettings(),
    ]);
    dailyWordTarget.value = vocabularySettings.daily_target;
    dayNumber.value = store.summary?.current_day ?? 1;
    if (store.summary?.initialized) await store.loadToday();
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

async function selectDay(next: number) {
  if (next < 1 || next > totalDays.value || busy.value) return;
  busy.value = true;
  try {
    if (next === store.summary?.current_day) await store.loadToday();
    else await store.loadDay(next);
    dayNumber.value = next;
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

function dayNumberForDate(date: string): number | null {
  if (!store.summary?.plan_start_date) return null;
  const diff = Math.round((parseLocalDate(date).getTime() - parseLocalDate(store.summary.plan_start_date).getTime()) / 86_400_000);
  const next = diff + 1;
  return next >= 1 && next <= totalDays.value ? next : null;
}

async function selectDate(date: string) {
  const next = dayNumberForDate(date);
  if (next) await selectDay(next);
}

function openTask(task: PlanTask) {
  if (task.task_type === 'VOCABULARY') {
    router.push({ path: '/m/vocabulary', query: { autostart: '1' } });
    return;
  }
  router.push(taskRoute(task.id, true));
}

function taskTitle(task: PlanTask) {
  if (task.task_type !== 'VOCABULARY') return task.title;
  return task.title.replace(/新词\s*\d+/, `新词 ${dailyWordTarget.value}`);
}

function moveLastTask() {
  const last = [...daySchedule.value.entries].reverse().find((item) => item.kind === 'task' && item.task && !item.task.is_completed);
  if (!last?.task) return;
  scheduleStore.deferTask(last.task, anchorDate.value, targetDate.value, last.duration);
  const destination = parseLocalDate(targetDate.value).getDay() === 0 ? '周日' : '周六';
  showToast({ message: `已将任务移至${destination}`, position: 'top' });
}

function undoLastDeferral() {
  const last = deferredFromToday.value[deferredFromToday.value.length - 1];
  if (!last) return;
  scheduleStore.removeDeferred(last.task.id);
  showToast({ message: '已恢复到今天', position: 'top' });
}

function showTransferDetails() {
  const titles = [...deferredFromToday.value, ...deferredToToday.value].map((entry) => entry.task.title);
  showToast({ message: titles.length ? titles.slice(0, 2).join('；') : `${store.overdue.length} 项历史任务已加入今天`, position: 'top' });
}

onMounted(load);
</script>

<template>
  <main class="today-page">
    <div class="today-screen">
      <header class="today-header">
        <div>
          <span>成人本科 · 在职备考 <van-icon class="header-chevron" name="arrow-down" aria-hidden="true" /></span>
          <h1>{{ isCurrentDay ? '今日学习' : dateLabel }}</h1>
        </div>
        <p><span>距考试</span><strong>{{ store.summary?.days_remaining ?? 0 }}</strong><small>天</small></p>
      </header>

      <p v-if="error" class="error-banner">{{ error }}</p>
      <div v-if="busy && !store.day" class="loading-state"><van-loading size="24">正在准备今日学习…</van-loading></div>

      <template v-else>
        <section class="focus-card" aria-labelledby="focus-title">
          <div class="focus-copy">
            <span>下一项任务</span>
            <h2 id="focus-title">{{ nextTaskEntry?.task ? taskTitle(nextTaskEntry.task) : '今日任务已完成' }}</h2>
            <p v-if="nextTaskEntry">{{ nextTaskEntry.start }}–{{ nextTaskEntry.end }} <i /> 预计 {{ nextTaskEntry.duration }} 分钟</p>
            <p v-else>今天的学习状态已经保存</p>
          </div>

          <div class="study-mark" aria-hidden="true"><div>Aa</div><i>✓</i><span /></div>

          <div class="focus-metrics">
            <div><i class="metric-icon task-list-icon" aria-hidden="true"><van-icon name="todo-list-o" /></i><span>剩余任务<strong>{{ remainingTaskCount }} <small>项</small></strong></span></div>
            <div><i class="metric-icon" aria-hidden="true"><van-icon name="clock-o" /></i><span>预计用时<strong>{{ minutesLabel(remainingMinutes, true) }}</strong></span></div>
          </div>

          <button v-if="nextTaskEntry?.task" class="primary-cta" @click="openTask(nextTaskEntry.task)">开始学习</button>
          <div v-else class="complete-state">今日学习已完成</div>
        </section>

        <section v-if="transferCount || daySchedule.overflow.length" class="transfer-card">
          <div class="calendar-icon" aria-hidden="true"><van-icon name="calendar-o" /><van-icon class="calendar-clock" name="clock-o" /></div>
          <p><strong>{{ transferCount ? `有 ${transferCount} 项任务已调整` : `${daySchedule.overflow.length} 项任务超过今日容量` }}</strong><span>{{ transferCount ? '合理安排时间，高效补回进度' : '可将最后一项任务移至本周末' }}</span></p>
          <div>
            <button v-if="transferCount" @click="showTransferDetails">查看详情 ›</button>
            <button v-else @click="moveLastTask">移至周末 ›</button>
            <button v-if="deferredFromToday.length" class="undo" @click="undoLastDeferral">撤销</button>
          </div>
        </section>

        <section class="plan-section">
          <header class="section-header">
            <div><h2>今日计划</h2><span>{{ dateLabel }}</span></div>
            <p>总用时 <strong>{{ minutesLabel(totalPlannedMinutes, true) }}</strong></p>
          </header>

          <div class="timeline">
            <article v-for="item in taskEntries" :key="item.id" :class="{ completed: item.task?.is_completed, current: item.id === nextTaskEntry?.id }">
              <time><strong>{{ item.start }}</strong><strong>{{ item.end }}</strong><span>{{ item.duration }} 分钟</span></time>
              <div class="rail"><i /></div>
              <button v-if="item.task" class="task-card" @click="openTask(item.task)">
                <span class="subject" :style="{ color: item.color, backgroundColor: `${item.color}12` }">{{ item.subject }}</span>
                <strong>{{ taskTitle(item.task) }}</strong>
                <em v-if="item.task.is_completed">已完成</em><b v-else>开始学习</b>
              </button>
            </article>
            <div v-if="!taskEntries.length" class="empty-state">这一天还没有学习任务。</div>
          </div>
        </section>

        <section class="week-section">
          <header class="section-header"><h2>本周安排</h2><p>可用学习时长 <strong>{{ minutesLabel(scheduleStore.weeklyCapacityMinutes, true) }}</strong></p></header>
          <div class="week-bars">
            <button v-for="day in weekDays" :key="day.key" :class="{ weekend: day.isWeekend, active: day.date === anchorDate }" :aria-label="`查看 ${day.date} 的计划`" @click="selectDate(day.date)">
              <span>{{ day.shortWeekday }}</span>
              <div><i :style="{ height: `${Math.max(12, day.capacityMinutes / 360 * 48)}px` }" /></div>
              <small>{{ minutesLabel(day.capacityMinutes, true) }}</small>
            </button>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.today-page {
  --today-blue: #1769f6;
  --today-blue-dark: #0e5dec;
  --today-blue-soft: #eef5ff;
  --today-ink: #101b36;
  --today-text: #273550;
  --today-muted: #73819b;
  --today-faint: #9aa7ba;
  --today-line: #dce5f2;
  --today-card: #ffffff;
  min-height: calc(100dvh - 64px);
  background: #f8faff;
  color: var(--today-ink);
}
.today-screen { width: min(100%, 680px); min-height: inherit; margin: 0 auto; padding: 24px 22px 42px; }
button { font: inherit; }
.today-header { min-height: 112px; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.today-header>div>span { display: flex; align-items: center; gap: 7px; min-height: 18px; color: #485a79; font-size: 13px; font-weight: 650; line-height: 18px; letter-spacing: .05em; }
.header-chevron { width: 14px; height: 18px; display: inline-grid; place-items: center; color: #485a79; font-size: 11px; line-height: 1; }
.today-header h1 { margin: 8px 0 0; font-size: 32px; line-height: 1; letter-spacing: -.04em; }
.today-header p { display: flex; align-items: baseline; gap: 5px; margin: 27px 0 0; color: #53627e; }
.today-header p span { font-size: 13px; }.today-header p strong { color: var(--today-blue); font-size: 38px; line-height: 1; letter-spacing: -.04em; }.today-header p small { font-size: 13px; }
.error-banner { margin: 0 0 12px; padding: 12px; border: 1px solid #f0b6b1; border-radius: 12px; background: #fff4f3; color: #b42318; font-size: 12px; }
.loading-state { min-height: 460px; display: grid; place-items: center; color: var(--today-muted); }

.focus-card { position: relative; overflow: hidden; padding: 18px 17px 16px; border: 1px solid #c9dcfb; border-radius: 17px; background: linear-gradient(145deg,#fff 12%,#f5f9ff 100%); box-shadow: 0 7px 24px rgba(42,88,156,.08); }
.focus-copy { max-width: calc(100% - 95px); }.focus-copy>span { color: #52617c; font-size: 12px; }.focus-copy h2 { margin: 10px 0 4px; font-size: 20px; line-height: 1.35; letter-spacing: -.02em; }.focus-copy p { display: flex; align-items: center; gap: 8px; margin: 0; color: #6d7a92; font-size: 12px; }.focus-copy p i { width: 1px; height: 12px; background: #b6c1d1; }
.study-mark { position: absolute; top: 36px; right: 19px; width: 76px; height: 78px; }.study-mark>div { width: 55px; height: 66px; display: grid; place-items: center; transform: rotate(7deg); border: 1px solid #9bbcff; border-radius: 9px; background: linear-gradient(150deg,#83aaff,#4179ed); box-shadow: 5px 5px 0 #d5e2ff; color: #fff; font-size: 25px; }.study-mark>i { position: absolute; right: 0; bottom: 2px; width: 35px; height: 35px; display: grid; place-items: center; border: 5px solid #fff; border-radius: 50%; background: #f3f7ff; color: var(--today-blue); font-size: 20px; font-style: normal; font-weight: 800; }.study-mark>span { position: absolute; right: -2px; top: 13px; width: 23px; height: 39px; border-right: 1px solid #b9cdf1; border-radius: 50%; transform: rotate(-23deg); }
.focus-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 17px 92px 15px 0; }.focus-metrics>div { display: flex; align-items: center; gap: 9px; min-width: 0; }.metric-icon { position: relative; width: 29px; height: 29px; display: grid; flex: 0 0 29px; place-items: center; color: var(--today-blue); font-size: 28px; font-style: normal; line-height: 1; }.metric-icon>.van-icon { display: block; line-height: 1; }.task-list-icon::after { position: absolute; right: -1px; bottom: 0; width: 9px; height: 9px; border: 2px solid #fff; border-radius: 50%; background: #f2bd27; box-shadow: inset 0 0 0 1px rgba(189,127,0,.12); content: ''; }.focus-metrics span { display: grid; gap: 2px; color: #68758b; font-size: 10px; }.focus-metrics strong { color: var(--today-ink); font-size: 16px; white-space: nowrap; }.focus-metrics small { font-size: 10px; }
.primary-cta { width: 100%; min-height: 48px; border: 0; border-radius: 11px; background: linear-gradient(90deg,var(--today-blue),#175eed); box-shadow: 0 7px 14px rgba(23,105,246,.18); color: #fff; font-size: 16px; font-weight: 700; }.primary-cta:active { transform: translateY(1px); }.complete-state { min-height: 48px; display: grid; place-items: center; border-radius: 11px; background: #e9fbf4; color: #09865d; font-weight: 700; }

.transfer-card { display: grid; grid-template-columns: 38px minmax(0,1fr) auto; align-items: center; gap: 11px; margin-top: 11px; padding: 13px 14px; border: 1px solid #cbdcf8; border-radius: 13px; background: #f8fbff; }.calendar-icon { position: relative; width: 36px; height: 36px; display: grid; place-items: center; color: var(--today-blue); font-size: 31px; line-height: 1; }.calendar-icon>.van-icon:first-child { display: block; line-height: 1; }.calendar-clock { position: absolute; right: -1px; bottom: -1px; width: 17px; height: 17px; display: grid; place-items: center; border: 2px solid #f8fbff; border-radius: 50%; background: #eef2f7; color: #73819b; font-size: 13px; line-height: 1; }.transfer-card p { display: grid; gap: 3px; margin: 0; }.transfer-card p strong { font-size: 12px; }.transfer-card p span { color: var(--today-muted); font-size: 10px; }.transfer-card>div:last-child { display: grid; justify-items: end; gap: 4px; }.transfer-card button { min-height: 32px; padding: 0; border: 0; background: transparent; color: var(--today-blue); font-size: 11px; font-weight: 700; white-space: nowrap; }.transfer-card button.undo { min-height: 20px; color: #8a96a8; font-size: 9px; }

.plan-section { margin-top: 24px; }.section-header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 11px; }.section-header>div { display: flex; align-items: baseline; gap: 8px; }.section-header h2 { margin: 0; font-size: 18px; letter-spacing: -.02em; }.section-header span,.section-header p { margin: 0; color: var(--today-muted); font-size: 11px; }.section-header p strong { color: var(--today-blue); font-weight: 650; }
.timeline article { display: grid; grid-template-columns: 50px 18px minmax(0,1fr); min-height: 76px; }.timeline time { display: grid; align-content: start; padding-top: 10px; color: var(--today-ink); font-size: 11px; line-height: 1.45; }.timeline time strong { font-weight: 650; }.timeline time span { margin-top: 4px; color: var(--today-faint); font-size: 9px; }.rail { position: relative; display: flex; justify-content: center; }.rail::after { position: absolute; top: 18px; bottom: -8px; width: 1px; content: ''; background: #d6dfec; }.timeline article:last-child .rail::after { display: none; }.rail i { z-index: 1; width: 9px; height: 9px; margin-top: 13px; border: 2px solid #fff; border-radius: 50%; background: #99a5b8; outline: 1px solid #bdc8d7; }.timeline article.current .rail i { background: var(--today-blue); outline-color: #9bbcff; }.timeline article.completed .rail i { width: 20px; height: 20px; display: grid; margin-top: 8px; border-color: var(--today-blue); background: #fff; outline: 0; }.timeline article.completed .rail i::after { content: '✓'; color: var(--today-blue); font-size: 11px; }
.task-card { min-width: 0; min-height: 60px; display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 8px; margin-bottom: 10px; padding: 10px 11px; border: 1px solid #d9e1ed; border-radius: 11px; background: #fff; color: var(--today-ink); text-align: left; box-shadow: 0 3px 12px rgba(32,64,112,.035); }.task-card .subject { padding: 4px 7px; border-radius: 6px; font-size: 10px; font-weight: 700; white-space: nowrap; }.task-card>strong { min-width: 0; overflow: hidden; font-size: 12px; font-weight: 650; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }.task-card b { min-height: 31px; display: grid; place-items: center; padding: 0 9px; border: 1px solid var(--today-blue); border-radius: 8px; color: var(--today-blue); font-size: 10px; font-weight: 650; white-space: nowrap; }.task-card em { color: #11a46e; font-size: 11px; font-style: normal; font-weight: 700; white-space: nowrap; }.timeline article.completed .task-card { border-color: transparent; background: transparent; box-shadow: none; }.timeline article.completed time strong { color: var(--today-faint); }.empty-state { padding: 32px 0; color: var(--today-muted); text-align: center; font-size: 12px; }

.week-section { margin-top: 21px; padding-top: 17px; border-top: 1px solid var(--today-line); }.week-bars { display: grid; grid-template-columns: repeat(7,minmax(0,1fr)); gap: 4px; }.week-bars button { min-width: 0; min-height: 96px; display: grid; justify-items: center; align-content: end; gap: 5px; padding: 7px 1px; border: 0; border-radius: 10px; background: transparent; color: var(--today-text); }.week-bars button.weekend { background: #f4f8ff; }.week-bars button.active { background: #edf4ff; box-shadow: inset 0 0 0 1px #c8dcff; }.week-bars span { font-size: 11px; }.week-bars button>div { height: 49px; display: flex; align-items: flex-end; }.week-bars i { width: 13px; display: block; border-radius: 4px 4px 1px 1px; background: #63718c; }.week-bars button.active i,.week-bars button.weekend i { background: var(--today-blue); }.week-bars small { color: var(--today-muted); font-size: 9px; white-space: nowrap; }

@media (max-width: 370px) {
  .today-screen { padding-inline: 14px; }
  .today-header h1 { font-size: 29px; }
  .today-header p strong { font-size: 34px; }
  .focus-copy h2 { font-size: 18px; }
  .focus-metrics { margin-right: 72px; }
  .focus-metrics>div { gap: 6px; }
  .task-card { grid-template-columns: auto minmax(0,1fr); }
  .task-card b,.task-card em { grid-column: 2; justify-self: start; }
}
@media (min-width: 768px) { .today-screen { padding-inline: 30px; } }
</style>
