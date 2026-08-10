<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { apiError } from '@/api/client';
import type { PlanTask } from '@/api/plan';
import MobilePageHeader from '@/components/mobile/MobilePageHeader.vue';
import { usePlanStore } from '@/stores/usePlanStore';
import { useStudyScheduleStore } from '@/stores/useStudyScheduleStore';
import { taskRoute } from '@/utils/taskDestination';
import {
  addDays,
  buildDaySchedule,
  isWeekendDate,
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
const busy = ref(false);
const previewMode = ref<'weekday' | 'weekend'>('weekend');

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
const completedCount = computed(() => daySchedule.value.entries.filter((item) => item.task?.is_completed).length);
const scheduledTaskCount = computed(() => daySchedule.value.entries.filter((item) => item.kind === 'task').length);
const taskEntries = computed(() => daySchedule.value.entries.filter((item) => item.kind === 'task' && item.task));
const nextTaskEntry = computed(() => taskEntries.value.find((item) => !item.task?.is_completed) ?? null);
const completionPercent = computed(() => scheduledTaskCount.value ? Math.round((completedCount.value / scheduledTaskCount.value) * 100) : 0);
const remainingMinutes = computed(() => taskEntries.value.reduce((sum, item) => sum + (item.task?.is_completed ? 0 : item.duration), 0));
const transferCount = computed(() => store.overdue.length + deferredToToday.value.length);
const targetDate = computed(() => parseLocalDate(anchorDate.value).getDay() === 6 ? addDays(anchorDate.value, 1) : nextWeekendDate(anchorDate.value));
const isCurrentDay = computed(() => dayNumber.value === store.summary?.current_day);
const totalDays = computed(() => store.summary?.study_days ?? 1);
const todayLabel = computed(() => {
  const date = parseLocalDate(anchorDate.value);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${isCurrentDay.value ? '今天' : `${date.getMonth() + 1}月${date.getDate()}日`} ${weekdays[date.getDay()]}`;
});

async function load() {
  error.value = '';
  busy.value = true;
  try {
    await store.loadSummary();
    dayNumber.value = store.summary?.current_day ?? 1;
    if (store.summary?.initialized) {
      await store.loadToday();
      previewMode.value = isWeekendDate(anchorDate.value) ? 'weekend' : 'weekday';
    }
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
    previewMode.value = isWeekendDate(anchorDate.value) ? 'weekend' : 'weekday';
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
  router.push(taskRoute(task.id, true));
}

async function toggle(task: PlanTask, completed: boolean) {
  try {
    await store.toggleTask(task.id, completed);
    if (completed) scheduleStore.removeDeferred(task.id);
    if (scheduleTasks.value.length && scheduleTasks.value.every((item) => item.is_completed)) {
      showToast({ message: '今天的计划已全部完成', position: 'top' });
    }
  } catch (cause) {
    showToast(apiError(cause));
  }
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

onMounted(load);
</script>

<template>
  <main class="mobile-plan-page">
    <div class="mobile-plan-screen">
      <MobilePageHeader title="今日学习" eyebrow="成人本科 · 在职备考">
        <template #action><span class="exam-days">{{ store.summary?.days_remaining ?? 0 }}<small>天</small></span></template>
      </MobilePageHeader>

      <section class="today-overview" aria-labelledby="today-overview-title">
        <div class="today-overview-head">
          <div><span>{{ todayLabel }}</span><strong id="today-overview-title">{{ daySchedule.mode === 'weekend' ? '深度学习日' : '晚间学习日' }}</strong></div>
          <div class="today-count"><strong>{{ completedCount }}</strong><span>/ {{ scheduledTaskCount }} 项</span></div>
        </div>
        <div class="today-progress"><i :style="{ width: `${completionPercent}%` }" /></div>
        <div class="today-progress-meta"><span>今日完成 {{ completionPercent }}%</span><span>剩余 {{ minutesLabel(remainingMinutes, true) }}</span></div>

        <div v-if="nextTaskEntry?.task" class="next-task">
          <span class="next-label">下一项</span>
          <div class="next-subject"><i :style="{ background: nextTaskEntry.color }" />{{ nextTaskEntry.subject }}</div>
          <h2>{{ nextTaskEntry.title }}</h2>
          <p>{{ nextTaskEntry.start }}–{{ nextTaskEntry.end }} · {{ nextTaskEntry.duration }} 分钟</p>
          <van-button block type="primary" square class="next-task-cta" @click="openTask(nextTaskEntry.task)">{{ completedCount ? '继续学习' : '开始学习' }}</van-button>
        </div>
        <div v-else class="all-complete"><strong>今日计划已完成</strong><span>做得很好，记得留出时间休息。</span></div>
      </section>

      <button v-if="transferCount || daySchedule.overflow.length" class="mobile-transfer" @click="moveLastTask">
        <span>↕</span><p><strong>{{ transferCount ? '已将工作日积压任务移至周末' : `${daySchedule.overflow.length} 项任务超过今日容量` }}</strong><small>{{ transferCount ? `当前承接 ${transferCount} 项积压任务` : '点击将最后一项顺延到周末' }}</small></p><em>调整 →</em>
      </button>

      <div class="mobile-plan-heading">
        <div><h2>今日计划</h2><span>{{ todayLabel }}</span></div>
        <div class="mobile-day-nav"><button :disabled="dayNumber <= 1" aria-label="前一天" @click="selectDay(dayNumber - 1)">←</button><button :disabled="dayNumber >= totalDays" aria-label="后一天" @click="selectDay(dayNumber + 1)">→</button></div>
      </div>
      <div class="mobile-plan-meta"><span>专注 {{ minutesLabel(daySchedule.plannedMinutes, true) }}</span><span>容量 {{ minutesLabel(daySchedule.capacityMinutes, true) }}</span><button v-if="deferredFromToday.length" class="undo" @click="undoLastDeferral">撤销调整</button></div>

      <p v-if="error" class="study-error">{{ error }}</p>
      <div v-if="busy && !store.day" class="study-loading"><van-loading size="24">正在计算可用时间…</van-loading></div>
      <section v-else class="mobile-timeline">
        <article v-for="item in daySchedule.entries" :key="item.id" :class="[item.kind, { actionable: item.task, current: item.id === nextTaskEntry?.id, completed: item.task?.is_completed }]" :role="item.task ? 'button' : undefined" :tabindex="item.task ? 0 : undefined" @click="item.task && openTask(item.task)" @keydown.enter="item.task && openTask(item.task)" @keydown.space.prevent="item.task && openTask(item.task)">
          <time><strong>{{ item.start }}–{{ item.end }}</strong><span>{{ item.duration }}m</span></time>
          <div class="timeline-marker"><i :style="{ background: item.color }" /></div>
          <div class="mobile-task-copy">
            <div><strong :class="{ done: item.task?.is_completed }">{{ item.title }}</strong><span :style="{ color: item.color, borderColor: item.color }">{{ item.subject }}</span></div>
            <p>{{ item.subtitle }}</p>
            <div v-if="item.task" class="mobile-task-actions"><span>{{ item.id === nextTaskEntry?.id ? '当前任务' : '打开任务' }} →</span><label @click.stop><input type="checkbox" :checked="item.task.is_completed" @change="toggle(item.task, !item.task.is_completed)" />{{ item.task.is_completed ? '已完成' : '标记完成' }}</label></div>
          </div>
        </article>
        <div v-if="!daySchedule.entries.length" class="study-empty">这一天还没有任务。</div>
      </section>

      <section class="mobile-buffer"><span>✓</span><p>今天仍有 <strong>{{ minutesLabel(daySchedule.bufferMinutes) }}</strong> 缓冲，可应对临时事务</p></section>

      <section class="week-section">
        <div class="study-section-title"><h2>本周安排</h2><span>可用 {{ minutesLabel(scheduleStore.weeklyCapacityMinutes, true) }}</span></div>
        <div class="mobile-week-bars">
          <button v-for="day in weekDays" :key="day.key" type="button" class="mobile-week-day" :class="{ weekend: day.isWeekend, active: day.date === anchorDate }" :aria-label="`查看 ${day.date} 的计划`" @click="selectDate(day.date)">
            <span>{{ day.shortWeekday }}</span><div><i :style="{ height: `${Math.max(10, day.capacityMinutes / 360 * 42)}px` }" /></div><small>{{ minutesLabel(day.capacityMinutes, true) }}</small>
          </button>
        </div>
        <div class="mode-switch" role="tablist" aria-label="计划模式">
          <button :class="{ active: previewMode === 'weekday' }" role="tab" @click="previewMode = 'weekday'"><strong>工作日</strong><span>{{ minutesLabel(scheduleStore.availability.weekdayMinutes, true) }}</span></button>
          <button :class="{ active: previewMode === 'weekend' }" role="tab" @click="previewMode = 'weekend'"><strong>周末</strong><span>深度学习</span></button>
        </div>
        <p class="mode-explainer">{{ previewMode === 'weekday' ? `早间 ${scheduleStore.availability.weekdayMorningMinutes} 分钟用于记忆，晚间完成知识点与错题；长任务留给周末。` : `按 ${minutesLabel(scheduleStore.availability.saturdayMinutes)} 有效专注安排，包含午餐、短休与缓冲。` }}</p>
      </section>
      <RouterLink class="mobile-settings-link" to="/m/me">调整可用时间</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.mobile-plan-page { min-height:calc(100dvh - 64px); background:var(--app-bg); color:var(--app-text); }.mobile-plan-screen { width:min(100%,680px); min-height:inherit; margin:0 auto; padding:14px 16px 32px; }.exam-days { display:flex; align-items:baseline; gap:2px; color:var(--app-primary); font-size:22px; font-weight:700; }.exam-days small { color:var(--app-muted); font-size:12px; font-weight:600; }
.today-overview { padding:18px 16px 16px; border:1px solid var(--app-border); border-radius:var(--app-radius-lg); background:var(--app-surface); box-shadow:var(--app-shadow-sm); }.today-overview-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }.today-overview-head>div:first-child { display:grid; gap:3px; }.today-overview-head span { color:var(--app-muted); font-size:13px; }.today-overview-head strong { font-size:18px; font-weight:600; }.today-count { display:flex; align-items:baseline; gap:4px; }.today-count strong { color:var(--app-primary); font-size:30px; line-height:1; }.today-count span { font-size:12px; }.today-progress { height:7px; overflow:hidden; margin-top:14px; border-radius:99px; background:#e9edf4; }.today-progress i { display:block; height:100%; border-radius:inherit; background:var(--app-primary); transition:width .25s ease; }.today-progress-meta { display:flex; justify-content:space-between; margin-top:7px; }.today-progress-meta span { font-size:12px; }.next-task { margin-top:16px; padding-top:15px; border-top:1px solid var(--app-border); }.today-overview .next-label { display:block; margin-bottom:8px; color:var(--app-faint); font-size:12px; font-weight:600; }.next-subject { display:flex; align-items:center; gap:7px; color:var(--app-muted); font-size:12px; }.next-subject i { width:7px; height:7px; border-radius:50%; }.next-task h2 { margin-top:5px; font-size:18px; font-weight:600; }.next-task p { margin:5px 0 14px; color:var(--app-muted); font-size:13px; }.next-task-cta { min-height:46px; border-radius:8px; font-size:15px; font-weight:600; }.all-complete { display:grid; gap:4px; margin-top:16px; padding-top:16px; border-top:1px solid var(--app-border); }.all-complete strong { color:var(--app-success); font-size:16px; }.all-complete span { font-size:13px; }
.mobile-transfer { width:100%; min-height:56px; display:flex; align-items:center; gap:10px; margin-top:12px; padding:11px 12px; border:1px solid #fed7aa; border-radius:10px; background:#fffaf5; color:#c2410c; text-align:left; }.mobile-transfer>span { width:28px; height:28px; display:grid; place-items:center; flex:0 0 28px; border:1px solid currentColor; border-radius:8px; }.mobile-transfer p { flex:1; display:grid; gap:2px; margin:0; }.mobile-transfer strong { font-size:13px; }.mobile-transfer small { color:#9a6048; font-size:12px; }.mobile-transfer em { font-size:12px; font-style:normal; white-space:nowrap; }
.mobile-plan-heading { display:flex; align-items:center; justify-content:space-between; margin-top:24px; }.mobile-plan-heading>div:first-child { display:flex; align-items:baseline; gap:8px; }.mobile-plan-heading h2 { font-size:17px; font-weight:600; }.mobile-plan-heading span { color:var(--app-muted); font-size:12px; }.mobile-day-nav { display:flex; gap:6px; }.mobile-day-nav button { width:44px; height:44px; border:1px solid var(--app-border-strong); border-radius:8px; background:#fff; color:var(--app-text); }.mobile-day-nav button:disabled { opacity:.35; }.mobile-plan-meta { display:flex; align-items:center; gap:12px; margin:4px 0 7px; color:var(--app-muted); font-size:12px; }.mobile-plan-meta button { min-height:44px; margin-left:auto; border:0; background:transparent; color:var(--app-warning); font-size:12px; font-weight:600; }
.mobile-timeline article { display:grid; grid-template-columns:76px 18px minmax(0,1fr); min-height:92px; }.mobile-timeline article.actionable{cursor:pointer}.mobile-timeline article.actionable:active .mobile-task-copy{background:var(--app-primary-soft)}.mobile-timeline article.current .mobile-task-copy { margin-top:4px; margin-bottom:4px; padding-right:10px; border:1px solid #bfdbfe; border-radius:10px; background:var(--app-primary-soft); }.mobile-timeline article.completed { opacity:.62; }.mobile-timeline time { display:grid; align-content:start; gap:5px; padding-top:14px; color:var(--app-text); font-size:12px; }.mobile-timeline time strong { font-size:12px; font-weight:600; }.mobile-timeline time span { color:var(--app-faint); }.timeline-marker { position:relative; display:flex; justify-content:center; }.timeline-marker::after { position:absolute; top:20px; bottom:-12px; width:1px; content:""; background:var(--app-border-strong); }.mobile-timeline article:last-child .timeline-marker::after { display:none; }.timeline-marker i { z-index:1; width:10px; height:10px; margin-top:17px; border:2px solid #fff; border-radius:50%; outline:1px solid var(--app-border-strong); }.mobile-task-copy { min-width:0; margin-left:4px; padding:12px 0 14px 10px; border-bottom:1px solid var(--app-border); }.mobile-task-copy>div { display:flex; align-items:flex-start; gap:7px; }.mobile-task-copy strong { min-width:0; flex:1; font-size:14px; line-height:1.5; }.mobile-task-copy strong.done { color:var(--app-faint); text-decoration:line-through; }.mobile-task-copy>div span { flex:0 0 auto; padding:2px 6px; border:1px solid; border-radius:6px; font-size:11px; }.mobile-task-copy p { margin:4px 0 0; color:var(--app-muted); font-size:12px; line-height:1.55; }.mobile-task-copy .mobile-task-actions{min-height:44px;align-items:center;margin-top:4px}.mobile-task-copy .mobile-task-actions>span{padding:0;border:0;color:var(--app-primary);font-size:12px;font-weight:600}.mobile-task-actions label { min-height:44px; display:flex; align-items:center; gap:7px; margin-left:auto; color:var(--app-muted); font-size:12px; }.mobile-task-copy input { width:18px; height:18px; accent-color:var(--app-success); }.mobile-timeline article.break,.mobile-timeline article.lunch { min-height:64px; color:var(--app-faint); }.mobile-timeline article.break .mobile-task-copy,.mobile-timeline article.lunch .mobile-task-copy { padding-top:12px; }.mobile-buffer { display:flex; align-items:center; gap:9px; margin-top:12px; padding:12px; border-top:1px solid #a7f3d0; border-bottom:1px solid #a7f3d0; color:var(--app-success); }.mobile-buffer span { width:24px; height:24px; display:grid; place-items:center; border:1px solid currentColor; border-radius:50%; }.mobile-buffer p { margin:0; font-size:13px; }
.week-section { margin-top:24px; padding-top:1px; border-top:1px solid var(--app-border); }.mobile-week-bars { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:3px; }.mobile-week-day { min-width:0; min-height:88px; display:grid; justify-items:center; align-content:end; gap:4px; padding:6px 1px; border:0; border-radius:8px; background:transparent; color:inherit; }.mobile-week-day.weekend { background:var(--app-primary-soft); }.mobile-week-day.active { box-shadow:inset 0 0 0 1px var(--app-primary); }.mobile-week-bars span { font-size:12px; }.mobile-week-day>div { height:44px; display:flex; align-items:flex-end; }.mobile-week-bars i { width:14px; display:block; border-radius:3px 3px 0 0; background:#64748b; }.mobile-week-bars .weekend i { background:var(--app-primary); }.mobile-week-bars small { color:var(--app-muted); font-size:10px; }.mode-switch { display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-top:12px; padding:4px; border-radius:10px; background:#e9edf4; }.mode-switch button { min-height:44px; display:flex; align-items:center; justify-content:center; gap:7px; border:0; border-radius:7px; background:transparent; color:var(--app-muted); }.mode-switch button.active { background:#fff; color:var(--app-primary); box-shadow:var(--app-shadow-sm); }.mode-switch strong,.mode-switch span { font-size:12px; }.mode-explainer { margin:10px 2px 0; color:var(--app-muted); font-size:13px; line-height:1.65; }.mobile-settings-link { display:grid; place-items:center; min-height:44px; margin-top:12px; border:1px solid var(--app-border-strong); border-radius:8px; background:#fff; color:var(--app-text); text-decoration:none; font-size:13px; font-weight:600; }
@media (min-width:768px) { .mobile-plan-screen { padding-inline:24px; }.today-overview { padding:22px; }.mobile-timeline article { grid-template-columns:96px 20px minmax(0,1fr); } }
</style>
