<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button, Input, InputNumber } from 'ant-design-vue';
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
const newColor = ref('#2563eb');
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
  <section class="page settings-page">
    <DesktopPageHeader eyebrow="学习设置" title="计划配置" description="设置真实可用时间、考试日期和备考科目。" />
    <p v-if="error" class="error">{{ error }}</p>

    <section class="availability-settings">
      <header>
        <div><h2>可用学习时间</h2><p>工作日按碎片时间安排，周末按有效专注时间安排；系统不会把全天排满。</p></div>
        <strong>每周 {{ minutesLabel(weeklyCapacity) }}</strong>
      </header>
      <div class="availability-grid">
        <label><span>工作日每天</span><div><InputNumber v-model:value="availability.weekdayMinutes" class="availability-number" :min="30" :max="240" /><em>分钟</em></div><small>建议 60–120 分钟</small></label>
        <label><span>其中早间</span><div><InputNumber v-model:value="availability.weekdayMorningMinutes" class="availability-number" :min="0" :max="availability.weekdayMinutes" /><em>分钟</em></div><small>其余时间自动放到晚间</small></label>
        <label><span>周六有效专注</span><div><InputNumber v-model:value="availability.saturdayMinutes" class="availability-number" :min="60" :max="600" :step="30" /><em>分钟</em></div><small>默认 6 小时，不含午餐与短休</small></label>
        <label><span>周日有效专注</span><div><InputNumber v-model:value="availability.sundayMinutes" class="availability-number" :min="60" :max="600" :step="30" /><em>分钟</em></div><small>用于深度任务与一周复盘</small></label>
        <label><span>工作日晚间开始</span><input v-model="availability.weekdayEveningStart" type="time" /><small>系统从该时间生成晚间任务</small></label>
        <label><span>周末学习窗口</span><div class="time-range"><input v-model="availability.weekendStart" type="time" /><i>至</i><input v-model="availability.weekendEnd" type="time" /></div><small>学习时段中会自动加入休息</small></label>
      </div>
      <footer><p v-if="availabilitySaved">✓ 可用时间已保存，计划总览将立即按新容量计算。</p><span /><Button @click="resetAvailability">恢复默认</Button><Button type="primary" @click="saveAvailability">保存可用时间</Button></footer>
    </section>

    <section class="settings-section exam-settings">
      <header><div><h2>考试与计划周期</h2><p>重新生成计划前请确认日期，已有学习进度会被清除。</p></div></header>
      <div class="exam-form">
        <label><span>正式开始日期</span><input v-model="startDate" class="input" type="date" /></label>
        <label><span>考试日期</span><input v-model="examDate" class="input" type="date" /></label>
        <Button type="primary" :loading="busy" @click="regenerate">{{ busy ? '生成中…' : '生成 / 重新生成计划' }}</Button>
      </div>
      <p v-if="generated" class="notice generated-notice">计划已生成：{{ store.summary?.study_days }} 天、共 {{ store.summary?.total_tasks ?? 0 }} 条任务，从 {{ store.summary?.plan_start_date }} 到 {{ store.summary?.plan_end_date }}，{{ store.summary?.exam_date }} 考试。</p>
    </section>

    <section class="settings-section subject-settings">
      <header><div><h2>备考科目</h2><p>科目将用于任务、知识点和学习数据分类。</p></div><span>{{ subjects.length }} 门</span></header>
      <div v-if="subjects.length" class="subject-list">
        <div v-for="subject in subjects" :key="subject.id" class="subject-row">
          <SubjectBadge :name="subject.name" :color="subject.color" />
          <span>排序 {{ subject.sort_order + 1 }}</span>
          <Button class="danger-link" type="text" danger size="small" @click="remove(subject.id)">删除</Button>
        </div>
      </div>
      <AppEmptyState v-else title="还没有备考科目" description="添加科目后才能生成对应学习计划。" />
      <div class="subject-form">
        <label><span>科目名称</span><Input v-model:value="newName" placeholder="如：高等数学（一）" @press-enter="addSubject" /></label>
        <label class="color-field"><span>标识颜色</span><input v-model="newColor" class="input" type="color" /></label>
        <Button @click="addSubject">添加科目</Button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.settings-page{max-width:1080px}.availability-settings,.settings-section{margin-bottom:16px;overflow:hidden;border:1px solid var(--app-border);border-radius:10px;background:#fff;box-shadow:var(--app-shadow-sm)}.availability-settings>header,.settings-section>header{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:72px;padding:15px 18px;border-bottom:1px solid var(--app-border)}.availability-settings header h2,.settings-section header h2{font-size:16px;font-weight:600}.availability-settings header p,.settings-section header p{margin:4px 0 0;color:var(--app-muted);font-size:12px}.availability-settings header>strong{color:var(--app-primary);font-size:15px;font-weight:600;white-space:nowrap}.settings-section header>span{color:var(--app-muted);font-size:12px}.availability-grid{display:grid;grid-template-columns:repeat(3,1fr)}.availability-grid>label{display:grid;gap:7px;min-height:126px;padding:17px;border-right:1px solid var(--app-border);border-bottom:1px solid var(--app-border)}.availability-grid>label:nth-child(3n){border-right:0}.availability-grid>label>span{color:#475467;font-size:12px;font-weight:600}.availability-grid label>div:not(.time-range){display:flex;align-items:center;border-bottom:1px solid var(--app-border-strong)}.availability-grid input{width:100%;min-width:0;height:36px;border:0;outline:0;background:#fff;color:var(--app-text);font-size:17px;font-weight:600}.availability-grid .availability-number{width:100%;border:0;box-shadow:none}.availability-grid .availability-number :deep(.ant-input-number-input){padding:0;font-size:17px;font-weight:600}.availability-grid em{color:var(--app-muted);font-size:11px;font-style:normal;white-space:nowrap}.availability-grid small{color:var(--app-faint);font-size:11px;line-height:1.45}.time-range{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:7px;border-bottom:1px solid var(--app-border-strong)}.time-range input{font-size:13px}.time-range i{color:var(--app-muted);font-size:11px;font-style:normal}.availability-settings>footer{display:flex;align-items:center;gap:8px;padding:13px 18px}.availability-settings footer p{margin:0;color:var(--app-success);font-size:11px}.availability-settings footer span{flex:1}.exam-form{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end;padding:18px}.exam-form label,.subject-form label{display:grid;gap:7px}.exam-form label>span,.subject-form label>span{color:var(--app-muted);font-size:12px}.generated-notice{margin:0 18px 18px}.subject-list{padding:0 18px}.subject-row{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--app-border)}.subject-row>span{color:var(--app-muted);font-size:11px}.danger-link{border:0;padding:6px;background:transparent;color:var(--app-faint);font-size:11px}.danger-link:hover{color:var(--app-danger)}.subject-form{display:grid;grid-template-columns:1fr 120px auto;gap:12px;align-items:end;padding:18px;background:#fafbfc}.color-field input{height:42px;padding:4px}
@media(max-width:760px){.availability-settings>header{align-items:flex-start;flex-direction:column}.availability-grid{grid-template-columns:1fr 1fr}.availability-grid>label:nth-child(3n){border-right:1px solid var(--app-border)}.availability-grid>label:nth-child(2n){border-right:0}.availability-settings>footer{align-items:stretch;flex-direction:column}.availability-settings footer span{display:none}.exam-form,.subject-form{grid-template-columns:1fr}.subject-row{grid-template-columns:1fr auto}.subject-row>span{display:none}}
</style>
