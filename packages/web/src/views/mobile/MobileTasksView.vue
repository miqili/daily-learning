<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { apiError } from '@/api/client';
import { listSubjects, type PlanTask, type SubjectInfo } from '@/api/plan';
import { usePlanStore } from '@/stores/usePlanStore';

const router = useRouter();
const store = usePlanStore();
const subjects = ref<SubjectInfo[]>([]);
const dayNumber = ref(1);
const activeTab = ref<number | 0>(0);
const error = ref('');
const busy = ref(false);

const isToday = ref(true);

const visibleTasks = computed<PlanTask[]>(() => {
  const tasks = store.day?.tasks ?? [];
  if (activeTab.value === 0) return tasks;
  return tasks.filter((t) => t.subject?.id === activeTab.value);
});

const visibleOverdue = computed<PlanTask[]>(() => {
  if (activeTab.value === 0) return store.overdue;
  return store.overdue.filter((t) => t.subject?.id === activeTab.value);
});

const activeSubject = computed<SubjectInfo | null>(() =>
  activeTab.value === 0 ? null : (subjects.value.find((s) => s.id === activeTab.value) ?? null),
);

const subjectTabs = computed(() => [
  { id: 0, name: '全部' },
  ...subjects.value.map((s) => ({ id: s.id, name: s.name })),
]);

async function load() {
  error.value = '';
  busy.value = true;
  try {
    subjects.value = await listSubjects();
    await store.loadSummary();
    dayNumber.value = store.summary?.current_day ?? 1;
    if (store.summary?.initialized) {
      await store.loadToday();
      isToday.value = true;
    }
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

async function selectDay(next: number) {
  if (next < 1 || next > 70 || busy.value) return;
  busy.value = true;
  try {
    if (next === store.summary?.current_day) {
      await store.loadToday();
      isToday.value = true;
    } else {
      await store.loadDay(next);
      isToday.value = false;
    }
    dayNumber.value = next;
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

async function toggle(task: PlanTask, completed: boolean) {
  try {
    await store.toggleTask(task.id, completed);
    const list = visibleTasks.value;
    if (list.length && list.every((t) => t.is_completed))
      showToast({ message: '🎉 今日任务已全部完成', position: 'top' });
  } catch (cause) {
    showToast(apiError(cause));
  }
}

function goKnowledge() {
  if (activeSubject.value) router.push(`/m/subject/${activeSubject.value.id}`);
}

function goSubject(id: number) {
  router.push(`/m/subject/${id}`);
}

onMounted(load);
</script>

<template>
  <div class="m-page">
    <van-nav-bar title="任务" fixed placeholder />

    <div class="m-body">
      <div class="day-bar">
        <van-button
          size="small"
          round
          plain
          icon="arrow-left"
          :disabled="dayNumber <= 1"
          @click="selectDay(dayNumber - 1)"
        />
        <div class="day-info">
          <strong>第 {{ dayNumber }} 天</strong>
          <span>{{ store.day?.task_date }}</span>
        </div>
        <van-button
          size="small"
          round
          plain
          icon="arrow"
          :disabled="dayNumber >= 70"
          @click="selectDay(dayNumber + 1)"
        />
      </div>

      <van-tabs v-model:active="activeTab" shrink line-width="24">
        <van-tab v-for="tab in subjectTabs" :key="tab.id" :name="tab.id" :title="tab.name" />
      </van-tabs>

      <div v-if="activeSubject" class="subject-bar" @click="goKnowledge">
        <span class="dot" :style="{ background: activeSubject.color }">{{
          activeSubject.name[0]
        }}</span>
        <span
          >{{ activeSubject.name }} · {{ visibleTasks.filter((t) => t.is_completed).length }}/{{
            visibleTasks.length
          }}
          完成</span
        >
        <span class="go-knowledge">知识点 ›</span>
      </div>

      <p v-if="error" class="m-error">{{ error }}</p>

      <div v-if="isToday && visibleOverdue.length" class="overdue-block">
        <div class="overdue-title">⚠ 补做（逾期 {{ visibleOverdue.length }} 项）</div>
        <div v-for="task in visibleOverdue" :key="task.id" class="task-card overdue">
          <van-checkbox
            :model-value="task.is_completed"
            icon-size="19px"
            checked-color="#f59e0b"
            @update:model-value="toggle(task, !task.is_completed)"
          />
          <div class="task-body" @click="task.subject && goSubject(task.subject.id)">
            <div class="task-title" :class="{ done: task.is_completed }">{{ task.title }}</div>
            <p v-if="task.description" class="task-desc">{{ task.description }}</p>
            <div class="task-tags">
              <van-tag v-if="task.subject" round plain :color="task.subject.color">{{
                task.subject.name
              }}</van-tag>
              <van-tag round plain color="#f59e0b">逾期 D{{ (task as any).due_day }}</van-tag>
            </div>
          </div>
        </div>
      </div>

      <div v-if="store.day" class="task-list">
        <div v-for="task in visibleTasks" :key="task.id" class="task-card">
          <van-checkbox
            :model-value="task.is_completed"
            icon-size="19px"
            checked-color="#3b82f6"
            @update:model-value="toggle(task, !task.is_completed)"
          />
          <div class="task-body" @click="task.subject && goSubject(task.subject.id)">
            <div class="task-title" :class="{ done: task.is_completed }">{{ task.title }}</div>
            <p v-if="task.description" class="task-desc">{{ task.description }}</p>
            <div class="task-tags">
              <van-tag v-if="task.subject" round plain :color="task.subject.color">{{
                task.subject.name
              }}</van-tag>
              <van-tag round plain color="#64748b">{{ task.task_type }}</van-tag>
            </div>
          </div>
        </div>
        <van-empty v-if="!visibleTasks.length" description="该科目今天没有任务" />
      </div>
      <div v-else class="m-loading"><van-loading size="24">加载中…</van-loading></div>
    </div>
  </div>
</template>

<style scoped>
.m-page {
  max-width: 640px;
  margin: 0 auto;
  background: var(--van-background);
}
.m-body {
  padding: 16px;
}
.day-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.day-info {
  display: grid;
  gap: 2px;
  text-align: center;
}
.day-info strong {
  font-size: 16px;
  color: var(--van-text-color);
}
.day-info span {
  font-size: 12px;
  color: var(--van-text-color-3);
}
.subject-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin: 12px 0;
  border-radius: 14px;
  background: var(--van-background-2);
  font-size: 13px;
  font-weight: 600;
  color: var(--van-text-color);
}
.dot {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 9px;
  color: #fff;
  font-weight: 800;
  font-size: 12px;
}
.go-knowledge {
  color: #3b82f6;
  font-size: 13px;
  margin-left: auto;
  font-weight: 600;
}
.subject-bar {
  cursor: pointer;
}
.task-list {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}
.task-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  background: var(--van-background-2);
  border-radius: 14px;
  box-shadow:
    0 1px 3px rgba(16, 24, 40, 0.04),
    0 4px 14px rgba(16, 24, 40, 0.04);
}
.task-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}
.task-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--van-text-color);
  line-height: 1.5;
}
.task-title.done {
  text-decoration: line-through;
  color: var(--van-text-color-3);
}
.task-desc {
  font-size: 12px;
  color: var(--van-text-color-2);
  margin-top: 5px;
  line-height: 1.6;
}
.task-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.overdue-block {
  margin: 14px 0;
}
.overdue-title {
  font-size: 13px;
  font-weight: 700;
  color: #f59e0b;
  margin-bottom: 10px;
}
.task-card.overdue {
  border: 1px solid #fde68a;
}
.m-error {
  color: var(--van-danger-color);
  font-size: 13px;
  margin: 12px 4px;
}
.m-loading {
  display: grid;
  place-items: center;
  padding: 48px 0;
  color: var(--van-text-color-3);
  font-size: 13px;
}
</style>
