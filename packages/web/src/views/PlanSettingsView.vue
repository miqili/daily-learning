<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { FORMAL_EXAM_DATE, FORMAL_PLAN_START_DATE } from '@shck/shared';
import { apiError } from '@/api/client';
import AppEmptyState from '@/components/common/AppEmptyState.vue';
import DesktopPageHeader from '@/components/common/DesktopPageHeader.vue';
import SubjectBadge from '@/components/common/SubjectBadge.vue';
import { createSubject, listSubjects, removeSubject, type SubjectInfo } from '@/api/plan';
import { usePlanStore } from '@/stores/usePlanStore';
import { useStudyScheduleStore, type StudyAvailability } from '@/stores/useStudyScheduleStore';
import { useUserStore } from '@/stores/useUserStore';
import { minutesLabel } from '@/utils/studySchedule';

const user = useUserStore();
const store = usePlanStore();
const scheduleStore = useStudyScheduleStore();
const subjects = ref<SubjectInfo[]>([]);
const newName = ref('');
const newColor = ref('#28b894');
const startDate = ref(FORMAL_PLAN_START_DATE);
const examDate = ref(FORMAL_EXAM_DATE);
const error = ref('');
const busy = ref(false);
const generated = ref(false);
const availabilitySaved = ref(false);
const availability = ref<StudyAvailability>({ ...scheduleStore.availability });
const weeklyCapacity = computed(() => availability.value.weekdayMinutes * 5 + availability.value.saturdayMinutes + availability.value.sundayMinutes);

async function load() {
  try {
    await scheduleStore.loadAvailability();
    availability.value = { ...scheduleStore.availability };
    subjects.value = await listSubjects();
    examDate.value = store.summary?.exam_date ?? user.user?.exam_date ?? FORMAL_EXAM_DATE;
    startDate.value = store.summary?.plan_start_date ?? FORMAL_PLAN_START_DATE;
  } catch (cause) { error.value = apiError(cause); }
}

async function addSubject() {
  const name = newName.value.trim();
  if (!name) return;
  error.value = '';
  try {
    await createSubject({ name, color: newColor.value });
    newName.value = '';
    await load();
  } catch (cause) { error.value = apiError(cause); }
}

async function remove(id: number) {
  error.value = '';
  try { await removeSubject(id); await load(); } catch (cause) { error.value = apiError(cause); }
}

async function regenerate() {
  error.value = '';
  busy.value = true;
  try {
    await store.initialize(examDate.value, startDate.value);
    generated.value = true;
    await load();
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function saveAvailability() {
  const next = {
    ...availability.value,
    weekdayMinutes: Math.max(30, Math.min(240, Number(availability.value.weekdayMinutes))),
    weekdayMorningMinutes: Math.max(0, Math.min(Number(availability.value.weekdayMinutes), Number(availability.value.weekdayMorningMinutes))),
    saturdayMinutes: Math.max(60, Math.min(600, Number(availability.value.saturdayMinutes))),
    sundayMinutes: Math.max(60, Math.min(600, Number(availability.value.sundayMinutes))),
  };
  availability.value = next;
  try {
    await scheduleStore.saveAvailability(next);
    availability.value = { ...scheduleStore.availability };
    availabilitySaved.value = true;
  } catch (cause) { error.value = apiError(cause); }
}

async function resetAvailability() {
  try {
    await scheduleStore.resetAvailability();
    availability.value = { ...scheduleStore.availability };
    availabilitySaved.value = true;
  } catch (cause) { error.value = apiError(cause); }
}

onMounted(load);
</script>

<template>
  <section class="wb-page settings-page">
    <DesktopPageHeader eyebrow="学习设置" title="计划配置" description="设置真实可用时间、考试日期和备考科目。" />
    <p v-if="error" class="wb-alert page-alert">{{ error }}</p>

    <section class="wb-card availability-settings">
      <header class="card-head">
        <div><h2>可用学习时间</h2><p>工作日按碎片时间安排，周末按有效专注时间安排；系统不会把全天排满。</p></div>
        <strong class="weekly-capacity">每周 {{ minutesLabel(weeklyCapacity) }}</strong>
      </header>
      <div class="availability-grid">
        <label>
          <span>工作日每天</span>
          <div><input v-model.number="availability.weekdayMinutes" class="num" type="number" min="30" max="240" /><em>分钟</em></div>
          <small>建议 60–120 分钟</small>
        </label>
        <label>
          <span>其中早间</span>
          <div><input v-model.number="availability.weekdayMorningMinutes" class="num" type="number" min="0" :max="availability.weekdayMinutes" /><em>分钟</em></div>
          <small>其余时间自动放到晚间</small>
        </label>
        <label>
          <span>周六有效专注</span>
          <div><input v-model.number="availability.saturdayMinutes" class="num" type="number" min="60" max="600" step="30" /><em>分钟</em></div>
          <small>默认 6 小时，不含午餐与短休</small>
        </label>
        <label>
          <span>周日有效专注</span>
          <div><input v-model.number="availability.sundayMinutes" class="num" type="number" min="60" max="600" step="30" /><em>分钟</em></div>
          <small>用于深度任务与一周复盘</small>
        </label>
        <label>
          <span>工作日晚间开始</span>
          <input v-model="availability.weekdayEveningStart" type="time" />
          <small>系统从该时间生成晚间任务</small>
        </label>
        <label>
          <span>周末学习窗口</span>
          <div class="time-range">
            <input v-model="availability.weekendStart" type="time" /><i>至</i><input v-model="availability.weekendEnd" type="time" />
          </div>
          <small>学习时段中会自动加入休息</small>
        </label>
      </div>
      <footer class="availability-footer">
        <p v-if="availabilitySaved" class="saved-hint">可用时间已保存，计划总览将立即按新容量计算。</p>
        <span v-else />
        <button type="button" class="wb-btn" @click="resetAvailability">恢复默认</button>
        <button type="button" class="wb-btn is-primary" @click="saveAvailability">保存可用时间</button>
      </footer>
    </section>

    <section class="wb-card settings-section exam-settings">
      <header class="card-head"><div><h2>考试与计划周期</h2><p>重新生成计划前请确认日期，已有学习进度会被清除。</p></div></header>
      <div class="exam-form">
        <label class="wb-field"><span class="wb-label">正式开始日期</span><input v-model="startDate" class="wb-input" type="date" /></label>
        <label class="wb-field"><span class="wb-label">考试日期</span><input v-model="examDate" class="wb-input" type="date" /></label>
        <button type="button" class="wb-btn is-primary gen-btn" :disabled="busy" @click="regenerate">
          <span v-if="busy" class="wb-spin" aria-hidden="true" />
          {{ busy ? '生成中…' : '生成 / 重新生成计划' }}
        </button>
      </div>
      <p v-if="generated" class="wb-notice generated-notice">计划已生成：{{ store.summary?.study_days }} 天、共 {{ store.summary?.total_tasks ?? 0 }} 条任务，从 {{ store.summary?.plan_start_date }} 到 {{ store.summary?.plan_end_date }}，{{ store.summary?.exam_date }} 考试。</p>
    </section>

    <section class="wb-card settings-section subject-settings">
      <header class="card-head">
        <div><h2>备考科目</h2><p>科目将用于任务、知识点和学习数据分类。</p></div>
        <span class="head-count">{{ subjects.length }} 门</span>
      </header>
      <div v-if="subjects.length" class="subject-list">
        <div v-for="subject in subjects" :key="subject.id" class="subject-row">
          <SubjectBadge :name="subject.name" :color="subject.color" />
          <span>排序 {{ subject.sort_order + 1 }}</span>
          <button type="button" class="wb-btn is-sm is-danger" @click="remove(subject.id)">删除</button>
        </div>
      </div>
      <AppEmptyState v-else title="还没有备考科目" description="添加科目后才能生成对应学习计划。" />
      <div class="subject-form">
        <label class="wb-field">
          <span class="wb-label">科目名称</span>
          <input v-model="newName" class="wb-input" placeholder="如：高等数学（一）" @keyup.enter="addSubject" />
        </label>
        <label class="wb-field color-field"><span class="wb-label">标识颜色</span><input v-model="newColor" class="color-input" type="color" /></label>
        <button type="button" class="wb-btn add-subject-btn" @click="addSubject">添加科目</button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.page-alert { margin: 0 0 16px; }

.availability-settings, .settings-section { margin-bottom: 16px; overflow: hidden; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 72px; padding: 15px 18px; margin-bottom: 0; border-bottom: 1px solid var(--wb-line-soft); }
.card-head h2 { margin: 0; color: var(--wb-ink); font-size: 16px; font-weight: 680; }
.card-head p { margin: 4px 0 0; color: var(--wb-faint); font-size: 12px; }
.head-count { color: var(--wb-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.weekly-capacity { color: var(--wb-brand-deep); font-size: 15px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }

.availability-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.availability-grid > label { display: grid; gap: 7px; align-content: start; min-height: 126px; padding: 17px; border-right: 1px solid var(--wb-line-soft); border-bottom: 1px solid var(--wb-line-soft); }
.availability-grid > label:nth-child(3n) { border-right: 0; }
.availability-grid > label:nth-last-child(-n + 3) { border-bottom: 0; }
.availability-grid > label > span { color: var(--wb-ink-2); font-size: 12px; font-weight: 600; }
.availability-grid label > div:not(.time-range) { display: flex; align-items: center; border-bottom: 1px solid var(--wb-line); }
.availability-grid label > div:not(.time-range):focus-within { border-bottom-color: var(--wb-brand); }
.availability-grid input:not([type='color']) { width: 100%; min-width: 0; height: 36px; border: 0; outline: 0; background: transparent; color: var(--wb-ink); font-size: 17px; font-weight: 600; font-variant-numeric: tabular-nums; }
.availability-grid .num { appearance: textfield; -moz-appearance: textfield; }
.availability-grid .num::-webkit-outer-spin-button,
.availability-grid .num::-webkit-inner-spin-button { margin: 0; -webkit-appearance: none; }
.availability-grid em { color: var(--wb-muted); font-size: 11px; font-style: normal; white-space: nowrap; }
.availability-grid small { color: var(--wb-faint); font-size: 11px; line-height: 1.45; }
.time-range { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 7px; border-bottom: 1px solid var(--wb-line); }
.time-range:focus-within { border-bottom-color: var(--wb-brand); }
.time-range input { font-size: 13px; font-weight: 500; }
.time-range i { color: var(--wb-muted); font-size: 12px; font-style: normal; }

.availability-footer { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--wb-line-soft); background: var(--wb-surface-2); }
.availability-footer span { flex: 1; }
.availability-footer p { flex: 1; margin: 0; }
.saved-hint { color: var(--wb-brand-deep); font-size: 12px; }
.saved-hint::before { margin-right: 6px; content: "✓"; }

.exam-form { display: grid; grid-template-columns: 200px 200px auto; align-items: end; gap: 12px; padding: 18px; }
.gen-btn { min-height: 36px; }
.generated-notice { margin: 0 18px 18px; }

.subject-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 13px 18px; border-bottom: 1px solid var(--wb-line-soft); }
.subject-row:last-child { border-bottom: 0; }
.subject-row > span { color: var(--wb-faint); font-size: 12px; font-variant-numeric: tabular-nums; }
.subject-form { display: grid; grid-template-columns: minmax(0, 1fr) 140px auto; align-items: end; gap: 12px; padding: 18px; border-top: 1px solid var(--wb-line-soft); background: var(--wb-surface-2); }
.color-field { max-width: 140px; }
.color-input { width: 100%; height: 36px; padding: 3px; border: 1px solid var(--wb-line); border-radius: var(--wb-radius); background: var(--wb-surface); cursor: pointer; }
.add-subject-btn { min-height: 36px; }

@media (max-width: 1024px) {
  .exam-form { grid-template-columns: 1fr 1fr; }
  .gen-btn { grid-column: 1 / -1; justify-self: start; }
  .subject-form { grid-template-columns: minmax(0, 1fr) auto; }
  .color-field { max-width: none; }
  .add-subject-btn { grid-column: 1 / -1; justify-self: start; }
}
@media (max-width: 760px) {
  .card-head { align-items: flex-start; flex-direction: column; }
  .availability-grid { grid-template-columns: 1fr 1fr; }
  .availability-grid > label:nth-child(3n) { border-right: 1px solid var(--wb-line-soft); }
  .availability-grid > label:nth-child(2n) { border-right: 0; }
  .availability-footer { align-items: stretch; flex-direction: column; }
  .availability-footer span { display: none; }
  .exam-form, .subject-form { grid-template-columns: 1fr; }
  .subject-row { grid-template-columns: 1fr auto; }
  .subject-row > span { display: none; }
}
</style>
