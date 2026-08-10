<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showConfirmDialog, showToast } from 'vant';
import { apiError } from '@/api/client';
import { getReviewQueue } from '@/api/mistakes';
import { getSummary } from '@/api/plan';
import { getToday } from '@/api/sessions';
import { vocabularyStats, type VocabularyStats } from '@/api/vocabulary';
import MobilePageHeader from '@/components/mobile/MobilePageHeader.vue';
import { useStudyScheduleStore, type StudyAvailability } from '@/stores/useStudyScheduleStore';
import { useUserStore } from '@/stores/useUserStore';
import { minutesLabel } from '@/utils/studySchedule';

const router = useRouter();
const user = useUserStore();
const scheduleStore = useStudyScheduleStore();
const error = ref('');
const plan = ref<{ exam_date: string; progress: number; completed_tasks: number; total_tasks: number; days_remaining: number } | null>(null);
const vocab = ref<VocabularyStats | null>(null);
const dueMistakes = ref(0);
const todaySecs = ref(0);
const availability = ref<StudyAvailability>({ ...scheduleStore.availability });

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

function saveAvailability() {
  const next = {
    ...availability.value,
    weekdayMinutes: Math.max(30, Math.min(240, Number(availability.value.weekdayMinutes))),
    weekdayMorningMinutes: Math.max(0, Math.min(Number(availability.value.weekdayMinutes), Number(availability.value.weekdayMorningMinutes))),
    saturdayMinutes: Math.max(60, Math.min(600, Number(availability.value.saturdayMinutes))),
    sundayMinutes: Math.max(60, Math.min(600, Number(availability.value.sundayMinutes))),
  };
  availability.value = next;
  scheduleStore.saveAvailability(next);
  showToast({ message: '可用时间已保存', position: 'top' });
}

onMounted(load);
</script>

<template>
  <main class="study-page me-page">
    <div class="study-screen">
      <MobilePageHeader title="我的" eyebrow="学习空间" />

      <section class="profile-sheet">
        <div class="profile-monogram">{{ (user.user?.username ?? 'U')[0].toUpperCase() }}</div>
        <div class="profile-copy"><span>考生账号</span><strong>{{ user.user?.username ?? '未登录' }}</strong><small>考试日 {{ user.user?.exam_date ?? plan?.exam_date ?? '--' }}</small></div>
        <div class="countdown"><strong>{{ plan?.days_remaining ?? '--' }}</strong><span>天</span><small>距考试</small></div>
        <div class="profile-progress"><i :style="{ width: `${plan?.progress ?? 0}%` }" /></div>
      </section>

      <p v-if="error" class="study-error">{{ error }}</p>

      <div class="study-section-title"><h2>学习摘要</h2><span>今日 {{ formatDuration(todaySecs) }}</span></div>
      <section class="stats-ledger">
        <div><span>计划进度</span><strong>{{ plan?.progress ?? 0 }}<small>%</small></strong></div>
        <div><span>已学单词</span><strong>{{ vocab?.learned ?? 0 }}</strong></div>
        <div><span>已掌握</span><strong>{{ vocab?.mastered ?? 0 }}</strong></div>
        <div><span>待复习错题</span><strong>{{ dueMistakes }}</strong></div>
      </section>

      <div class="study-section-title"><h2>我的可用时间</h2><span>每周 {{ minutesLabel(availability.weekdayMinutes * 5 + availability.saturdayMinutes + availability.sundayMinutes) }}</span></div>
      <section class="mobile-availability">
        <label><span><strong>工作日每天</strong><small>早晚分段完成</small></span><van-stepper v-model="availability.weekdayMinutes" :min="30" :max="240" :step="10" input-width="48px" button-size="44px" /><em>分钟</em></label>
        <label><span><strong>其中早间</strong><small>剩余时间放到晚间</small></span><van-stepper v-model="availability.weekdayMorningMinutes" :min="0" :max="availability.weekdayMinutes" :step="5" input-width="48px" button-size="44px" /><em>分钟</em></label>
        <label><span><strong>周六专注</strong><small>默认 6 小时</small></span><van-stepper v-model="availability.saturdayMinutes" :min="60" :max="600" :step="30" input-width="48px" button-size="44px" /><em>分钟</em></label>
        <label><span><strong>周日专注</strong><small>包含周复盘</small></span><van-stepper v-model="availability.sundayMinutes" :min="60" :max="600" :step="30" input-width="48px" button-size="44px" /><em>分钟</em></label>
        <van-button block type="primary" square class="availability-save" @click="saveAvailability">保存并重新计算计划</van-button>
      </section>

      <div class="study-section-title"><h2>备考目录</h2><span>所有工具</span></div>
      <nav class="tool-index">
        <RouterLink to="/m/tasks"><span class="tool-no">01</span><strong>今日任务</strong><small>{{ plan?.completed_tasks ?? 0 }} / {{ plan?.total_tasks ?? 0 }} 项已完成</small><i>›</i></RouterLink>
        <RouterLink to="/m/vocabulary"><span class="tool-no">02</span><strong>背单词</strong><small>{{ vocab?.due_today ?? 0 }} 个待复习</small><i>›</i></RouterLink>
        <RouterLink to="/m/phrases"><span class="tool-no">03</span><strong>短语簿</strong><small>搭配与固定表达</small><i>›</i></RouterLink>
        <RouterLink to="/m/essays"><span class="tool-no">04</span><strong>作文册</strong><small>模板与我的作文</small><i>›</i></RouterLink>
        <RouterLink to="/m/papers"><span class="tool-no">05</span><strong>历年真题</strong><small>近 9 年试卷</small><i>›</i></RouterLink>
        <RouterLink to="/m/search"><span class="tool-no">06</span><strong>知识检索</strong><small>考点与复习资料</small><i>›</i></RouterLink>
      </nav>

      <button class="signout-button" @click="signOut">退出当前账号</button>
    </div>
  </main>
</template>

<style scoped>
.profile-sheet { position: relative; overflow: hidden; display: grid; grid-template-columns: 50px 1fr auto; align-items: center; gap: 13px; margin-top: 8px; padding: 18px 16px 22px; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); box-shadow: var(--app-shadow-sm); }.profile-monogram { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 10px; background: var(--app-primary); color: #fff; font-size: 18px; font-weight: 700; }.profile-copy { display: grid; gap: 3px; }.profile-copy span, .profile-copy small { color: var(--app-muted); font-size: 12px; }.profile-copy strong { color: var(--app-text); font-family: inherit; font-size: 16px; font-weight: 600; }.countdown { display: grid; grid-template-columns: auto auto; align-items: baseline; color: var(--app-primary); }.countdown strong { font-size: 30px; font-weight: 600; }.countdown > span { font-family: inherit; font-size: 12px; font-weight: 600; }.countdown small { grid-column: 1 / -1; color: var(--app-muted); text-align: right; font-size: 12px; }.profile-progress { position: absolute; right: 16px; bottom: 9px; left: 16px; height: 4px; overflow: hidden; border-radius: 99px; background: #e9edf4; }.profile-progress i { display: block; height: 100%; border-radius: inherit; background: var(--app-primary); }
.stats-ledger { display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); }.stats-ledger div { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding: 15px; border-bottom:1px solid var(--app-border); }.stats-ledger div:nth-child(odd){border-right:1px solid var(--app-border)}.stats-ledger div:nth-last-child(-n+2){border-bottom:0}.stats-ledger span { color: var(--app-muted); font-size: 12px; }.stats-ledger strong { color: var(--app-text); font-size: 22px; font-weight: 600; }.stats-ledger small { font-size: 12px; }
.tool-index { display: grid; border-top:1px solid var(--app-border); }.tool-index a { min-height:58px; display: grid; grid-template-columns: 30px 1fr auto 12px; align-items: center; gap: 9px; padding: 10px 2px; border-bottom: 1px solid var(--app-border); color: var(--app-text); text-decoration: none; }.tool-no { color: var(--app-primary); font-size: 12px; font-weight: 600; }.tool-index strong { font-family: inherit; font-size: 14px; font-weight: 600; }.tool-index small { color: var(--app-muted); font-size: 12px; }.tool-index i { color: var(--app-faint); font-style: normal; }
.signout-button { width: 100%; min-height:44px; margin-top: 22px; padding: 12px; border: 1px solid #fecaca; border-radius: 9px; background: #fff; color: var(--app-danger); font-size: 13px; font-weight: 600; }
.mobile-availability { overflow:hidden; border:1px solid var(--app-border); border-radius:12px; background:#fff; }.mobile-availability label { min-height:64px; display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid var(--app-border); }.mobile-availability label>span { min-width:0; display:grid; flex:1; gap:3px; }.mobile-availability label strong { color:var(--app-text); font-size:14px; font-weight:600; }.mobile-availability small { color:var(--app-muted); font-size:12px; }.mobile-availability em { color:var(--app-muted); font-size:12px; font-style:normal; }.availability-save { min-height:46px; border-radius:0; font-size:14px; font-weight:600; }
</style>
