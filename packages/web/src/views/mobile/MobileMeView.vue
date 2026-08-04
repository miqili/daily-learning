<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showConfirmDialog } from 'vant';
import { apiError } from '@/api/client';
import { getReviewQueue } from '@/api/mistakes';
import { getSummary } from '@/api/plan';
import { getToday } from '@/api/sessions';
import { vocabularyStats, type VocabularyStats } from '@/api/vocabulary';
import { useUserStore } from '@/stores/useUserStore';

const router = useRouter();
const user = useUserStore();
const error = ref('');
const plan = ref<{ exam_date: string; progress: number; completed_tasks: number; total_tasks: number; days_remaining: number } | null>(null);
const vocab = ref<VocabularyStats | null>(null);
const dueMistakes = ref(0);
const todaySecs = ref(0);

function formatDuration(secs: number): string {
  const minutes = Math.round(secs / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
}

async function load() {
  error.value = '';
  try {
    await user.restore();
    const [summary, v, queue, today] = await Promise.all([
      getSummary(),
      vocabularyStats(),
      getReviewQueue(),
      getToday(),
    ]);
    plan.value = {
      exam_date: summary.exam_date,
      progress: summary.progress,
      completed_tasks: summary.completed_tasks,
      total_tasks: summary.total_tasks,
      days_remaining: summary.days_remaining,
    };
    vocab.value = v;
    dueMistakes.value = queue.total;
    todaySecs.value = today.total_secs;
  } catch (cause) { error.value = apiError(cause); }
}

async function signOut() {
  await showConfirmDialog({ title: '退出登录', message: '确定要退出当前账号吗？' });
  user.logout();
  router.push('/login');
}

onMounted(load);
</script>

<template>
  <div class="m-page">
    <van-nav-bar title="我的" fixed placeholder />

    <div class="m-body">
      <!-- 资料卡 -->
      <div class="profile">
        <div class="avatar">{{ (user.user?.username ?? 'U')[0].toUpperCase() }}</div>
        <div class="profile-meta">
          <strong>{{ user.user?.username ?? '未登录' }}</strong>
          <span>考试日 {{ user.user?.exam_date ?? plan?.exam_date ?? '--' }} · 距考试 {{ plan?.days_remaining ?? '--' }} 天</span>
        </div>
      </div>

      <p v-if="error" class="m-error">{{ error }}</p>

      <!-- 统计 -->
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">{{ plan?.progress ?? 0 }}%</div>
          <div class="stat-label">计划进度</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ vocab?.learned ?? 0 }}</div>
          <div class="stat-label">已学单词</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ vocab?.mastered ?? 0 }}</div>
          <div class="stat-label">已掌握</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ dueMistakes }}</div>
          <div class="stat-label">待复习错题</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ formatDuration(todaySecs) }}</div>
          <div class="stat-label">今日学习</div>
        </div>
      </div>

      <!-- 快捷入口 -->
      <van-cell-group inset title="常用">
        <van-cell title="今日任务" icon="todo-list-o" is-link to="/m/tasks" />
        <van-cell title="背单词" icon="edit" is-link to="/m/vocabulary" />
        <van-cell title="短语" icon="exchange" is-link to="/m/phrases" />
        <van-cell title="作文" icon="edit" is-link to="/m/essays" />
        <van-cell title="历年真题（近 9 年）" icon="orders-o" is-link to="/m/papers" />
        <van-cell title="检索知识点" icon="search" is-link to="/m/search" />
        <van-cell title="退出登录" icon="close" is-link @click="signOut" class="logout" />
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped>
.m-page { max-width: 640px; margin: 0 auto; min-height: 100vh; background: var(--van-background); }
.m-body { padding: 16px; }
.profile { display: flex; align-items: center; gap: 14px; padding: 20px; border-radius: 16px; background: linear-gradient(135deg, #3b82f6, #6366f1); box-shadow: 0 10px 26px rgba(59,130,246,.3); }
.avatar { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 50%; background: rgba(255,255,255,.22); color: #fff; font-size: 22px; font-weight: 800; }
.profile-meta { display: grid; gap: 4px; }
.profile-meta strong { font-size: 17px; color: #fff; }
.profile-meta span { font-size: 12px; color: rgba(255,255,255,.85); }
.m-error { color: var(--van-danger-color); font-size: 13px; margin: 12px 4px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }
.stat { display: grid; gap: 4px; text-align: center; padding: 14px 8px; background: var(--van-background-2); border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,.04); }
.stat-value { font-size: 19px; font-weight: 800; color: var(--van-text-color); white-space: nowrap; }
.stat-label { font-size: 12px; color: var(--van-text-color-3); }
.logout :deep(.van-cell__title) { color: var(--van-danger-color); }
</style>
