<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  BellOutlined,
  BookFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  EditFilled,
  FileTextFilled,
  MessageFilled,
  RightOutlined,
  ScheduleOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import { showConfirmDialog, showToast } from 'vant';
import { apiError } from '@/api/client';
import { getReviewQueue } from '@/api/mistakes';
import { getSummary as getPlanSummary, type PlanSummary } from '@/api/plan';
import { getSummary as getSessionSummary, getToday } from '@/api/sessions';
import { vocabularyStats, type VocabularyStats } from '@/api/vocabulary';
import { useStudyScheduleStore } from '@/stores/useStudyScheduleStore';
import { useUserStore } from '@/stores/useUserStore';

const router = useRouter();
const user = useUserStore();
const scheduleStore = useStudyScheduleStore();
const error = ref('');
const busy = ref(true);
const plan = ref<PlanSummary | null>(null);
const vocab = ref<VocabularyStats | null>(null);
const dueMistakes = ref(0);
const todaySecs = ref(0);
const weeklySecs = ref(0);

const initial = computed(() => (user.user?.username ?? 'U').slice(0, 1).toUpperCase());
const examDate = computed(() => user.user?.exam_date ?? plan.value?.exam_date ?? '--');
const todayMinutes = computed(() => Math.round(todaySecs.value / 60));
const todayHoursPart = computed(() => Math.floor(todayMinutes.value / 60));
const todayMinutesPart = computed(() => todayMinutes.value % 60);
const weeklyTargetMinutes = computed(() => scheduleStore.weeklyCapacityMinutes);
const weeklyProgress = computed(() => {
  if (!weeklyTargetMinutes.value) return 0;
  return Math.min(100, Math.round((weeklySecs.value / 60 / weeklyTargetMinutes.value) * 100));
});

function compactDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${rest}m` : `${hours}h`;
}

async function load() {
  error.value = '';
  busy.value = true;
  try {
    await user.restore();
    const [summary, vocabulary, queue, today, week] = await Promise.all([
      getPlanSummary(),
      vocabularyStats(),
      getReviewQueue(),
      getToday(),
      getSessionSummary(7),
      scheduleStore.loadAvailability(),
    ]);
    plan.value = summary;
    vocab.value = vocabulary;
    dueMistakes.value = queue.total;
    todaySecs.value = today.total_secs;
    weeklySecs.value = week.total_secs;
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

function showManagedNotice(message: string) {
  showToast({ message, position: 'top' });
}

async function signOut() {
  try {
    await showConfirmDialog({ title: '退出登录', message: '确定要退出当前账号吗？' });
    user.logout();
    router.push('/login');
  } catch {
    // User cancelled the confirmation dialog.
  }
}

onMounted(load);
</script>

<template>
  <main class="me-page">
    <div class="me-screen">
      <header class="me-header">
        <div><span>学习空间</span><h1>我的</h1></div>
        <button aria-label="查看通知设置" @click="showManagedNotice('通知提醒由后台统一管理')"><BellOutlined /></button>
      </header>

      <p v-if="error" class="error-banner">{{ error }}</p>

      <section class="profile-card" aria-label="考生信息">
        <div class="profile-avatar">{{ initial }}</div>
        <div class="profile-copy"><strong>{{ user.user?.username ?? '未登录' }}</strong><span>考试日 {{ examDate }}</span></div>
        <div class="countdown"><p><strong>{{ plan?.days_remaining ?? '--' }}</strong><span>天</span></p><small>距考试</small></div>
        <div class="profile-progress"><i :style="{ width: `${plan?.progress ?? 0}%` }" /></div>
      </section>

      <div v-if="busy" class="loading-card"><van-loading size="24">正在整理学习数据…</van-loading></div>

      <template v-else>
        <section class="summary-card" aria-label="学习摘要">
          <div class="summary-item">
            <i class="summary-icon time-icon"><ClockCircleFilled /></i>
            <strong>{{ todayHoursPart }}<small>h</small> {{ todayMinutesPart }}<small>m</small></strong>
            <span>今日学习时长</span>
          </div>
          <div class="summary-item">
            <i class="progress-ring" :style="{ '--progress': `${weeklyProgress * 3.6}deg` }"><b>{{ weeklyProgress }}%</b></i>
            <strong class="summary-label">本周学习进度</strong>
            <span>{{ compactDuration(Math.round(weeklySecs / 60)) }} / {{ compactDuration(weeklyTargetMinutes) }}</span>
          </div>
          <div class="summary-item">
            <i class="summary-icon words-icon"><b>Aa</b></i>
            <strong>{{ vocab?.learned ?? 0 }}</strong>
            <span>已学单词</span>
          </div>
          <div class="summary-item">
            <i class="summary-icon mistake-icon"><van-icon name="notes" /><van-icon class="mistake-cross" name="cross" /></i>
            <strong>{{ dueMistakes }}</strong>
            <span>待复习错题</span>
          </div>
        </section>

        <section class="me-section">
          <h2>我的学习</h2>
          <nav class="menu-card" aria-label="我的学习">
            <button @click="showManagedNotice('错题本移动端页面将在后续页面中实现')">
              <i class="menu-icon mistake-book"><BookFilled /><CloseCircleFilled class="menu-badge" /></i>
              <strong>错题本</strong><span>{{ dueMistakes }} 个错题待复习</span><RightOutlined class="menu-arrow" />
            </button>
            <RouterLink to="/m/vocabulary">
              <i class="menu-icon word-book"><b>Aa</b></i>
              <strong>单词本</strong><span>{{ vocab?.mastered ?? 0 }} 个单词已掌握</span><RightOutlined class="menu-arrow" />
            </RouterLink>
            <RouterLink to="/m/phrases">
              <i class="menu-icon phrase-icon"><MessageFilled /></i>
              <strong>短语簿</strong><span>搭配与固定表达</span><RightOutlined class="menu-arrow" />
            </RouterLink>
            <RouterLink to="/m/essays">
              <i class="menu-icon essay-icon"><EditFilled /></i>
              <strong>作文册</strong><span>模板与我的作文</span><RightOutlined class="menu-arrow" />
            </RouterLink>
            <RouterLink to="/m/papers">
              <i class="menu-icon paper-icon"><FileTextFilled /></i>
              <strong>历年真题</strong><span>近 9 年试卷</span><RightOutlined class="menu-arrow" />
            </RouterLink>
            <RouterLink to="/m/search">
              <i class="menu-icon search-icon"><SearchOutlined /></i>
              <strong>知识检索</strong><span>考点与复习资料</span><RightOutlined class="menu-arrow" />
            </RouterLink>
          </nav>
        </section>

        <section class="me-section settings-section">
          <h2>学习设置</h2>
          <div class="menu-card" aria-label="学习设置">
            <RouterLink to="/m/tasks">
              <i class="setting-icon"><BellOutlined /></i>
              <strong>学习计划</strong><span>查看今日与本周安排</span><RightOutlined class="menu-arrow" />
            </RouterLink>
            <button @click="showManagedNotice('通知提醒由后台统一管理')">
              <i class="setting-icon"><BellOutlined /></i>
              <strong>通知提醒</strong><span>由后台统一管理</span><RightOutlined class="menu-arrow" />
            </button>
            <button @click="showManagedNotice(`考试日 ${examDate}`)">
              <i class="setting-icon"><ScheduleOutlined /></i>
              <strong>考试信息</strong><span>{{ examDate }}</span><RightOutlined class="menu-arrow" />
            </button>
          </div>
        </section>

        <button class="signout-button" @click="signOut"><van-icon name="close" />退出当前账号</button>
      </template>
    </div>
  </main>
</template>

<style scoped>
.me-page {
  --me-blue: #1769f6;
  --me-ink: #101b36;
  --me-text: #263550;
  --me-muted: #78859e;
  --me-faint: #a1adc0;
  --me-line: #dfe6f1;
  min-height: calc(100dvh - 64px);
  background: #f8faff;
  color: var(--me-ink);
}
.me-screen { width: min(100%, 680px); min-height: inherit; margin: 0 auto; padding: 24px 22px 40px; }
button { font: inherit; }
.me-header { min-height: 112px; display: flex; align-items: flex-start; justify-content: space-between; }
.me-header>div>span { color: var(--me-blue); font-size: 13px; font-weight: 700; letter-spacing: .04em; }
.me-header h1 { margin: 8px 0 0; font-size: 32px; line-height: 1; letter-spacing: -.04em; }
.me-header button { width: 44px; height: 44px; display: grid; place-items: center; margin-top: 24px; padding: 0; border: 0; background: transparent; color: #768198; }.me-header button>.anticon { color: #768198; font-size: 27px; }
.error-banner { margin: 0 0 12px; padding: 12px; border: 1px solid #f0b6b1; border-radius: 12px; background: #fff4f3; color: #b42318; font-size: 12px; }

.profile-card { position: relative; display: grid; grid-template-columns: 66px minmax(0,1fr) auto; align-items: center; gap: 16px; min-height: 128px; padding: 19px 20px 30px; overflow: hidden; border: 1px solid #d9e3f1; border-radius: 17px; background: #fff; box-shadow: 0 7px 24px rgba(42,88,156,.07); }
.profile-avatar { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 15px; background: linear-gradient(145deg,#2677ff,#1457ee); box-shadow: 0 8px 18px rgba(23,105,246,.18); color: #fff; font-size: 30px; font-weight: 500; }
.profile-copy { min-width: 0; display: grid; gap: 8px; }.profile-copy strong { overflow: hidden; font-size: 20px; line-height: 1.1; text-overflow: ellipsis; white-space: nowrap; }.profile-copy span { color: var(--me-muted); font-size: 12px; }
.countdown { display: grid; justify-items: end; }.countdown p { display: flex; align-items: baseline; gap: 5px; margin: 0; color: var(--me-blue); }.countdown p strong { font-size: 37px; line-height: 1; letter-spacing: -.04em; }.countdown p span { font-size: 13px; font-weight: 650; }.countdown small { margin-top: 7px; color: var(--me-muted); font-size: 12px; }
.profile-progress { position: absolute; right: 20px; bottom: 15px; left: 20px; height: 4px; overflow: hidden; border-radius: 99px; background: #edf1f8; }.profile-progress i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#2878ff,#155af0); }
.loading-card { min-height: 225px; display: grid; place-items: center; margin-top: 12px; border: 1px solid var(--me-line); border-radius: 17px; background: #fff; color: var(--me-muted); }

.summary-card { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); margin-top: 14px; padding: 22px 8px; border: 1px solid #d9e3f1; border-radius: 17px; background: #fff; box-shadow: 0 7px 24px rgba(42,88,156,.065); }
.summary-item { position: relative; min-width: 0; min-height: 104px; display: grid; justify-items: center; align-content: start; padding: 0 8px; text-align: center; }.summary-item+ .summary-item { border-left: 1px solid var(--me-line); }
.summary-icon { position: relative; width: 44px; height: 44px; display: grid; place-items: center; margin-bottom: 10px; border-radius: 50%; font-style: normal; }.time-icon { background: #eaf3ff; color: var(--me-blue); font-size: 29px; }.time-icon::before { position: absolute; width: 34px; height: 34px; border: 1px solid #d9e7ff; border-radius: 50%; content: ''; }.time-icon>svg { z-index: 1; }.words-icon { background: #edf5ff; }.words-icon::before,.word-book::before { position: absolute; z-index: 1; width: 27px; height: 25px; border-radius: 3px 5px 5px 3px; background: linear-gradient(145deg,#2d84ff,#1764ef); box-shadow: inset 4px 0 rgba(255,255,255,.16); content: ''; }.words-icon::after,.word-book::after { position: absolute; width: 25px; height: 23px; transform: translate(4px,-4px); border: 1px solid #82b5ff; border-radius: 3px 5px 5px 3px; background: #d8e8ff; content: ''; }.words-icon b,.word-book b { z-index: 2; color: #fff; font-size: 13px; font-style: normal; font-weight: 700; letter-spacing: -.05em; }.mistake-icon { background: #fff0f1; color: #ef5662; font-size: 25px; }.mistake-cross { position: absolute; right: 2px; bottom: 2px; width: 16px; height: 16px; display: grid; place-items: center; border: 2px solid #fff; border-radius: 50%; background: #ef5662; color: #fff; font-size: 8px; }
.summary-item>strong { color: var(--me-ink); font-size: 21px; line-height: 1.15; white-space: nowrap; }.summary-item>strong small { margin: 0 2px; font-size: 10px; }.summary-item>strong.summary-label { margin-top: 1px; font-size: 12px; font-weight: 500; }.summary-item>span { margin-top: 6px; color: var(--me-muted); font-size: 10px; line-height: 1.3; }
.progress-ring { --progress: 0deg; position: relative; width: 44px; height: 44px; display: grid; place-items: center; margin-bottom: 10px; border-radius: 50%; background: conic-gradient(#3699ec var(--progress),#e8edf6 0); font-style: normal; }.progress-ring::before { position: absolute; width: 36px; height: 36px; border-radius: 50%; background: #fff; content: ''; }.progress-ring b { z-index: 1; font-size: 12px; }

.me-section { margin-top: 22px; }.me-section h2 { margin: 0 2px 11px; font-size: 17px; letter-spacing: -.02em; }
.menu-card { overflow: hidden; border: 1px solid #d9e3f1; border-radius: 17px; background: #fff; box-shadow: 0 7px 24px rgba(42,88,156,.06); }
.menu-card>a,.menu-card>button { width: 100%; min-height: 54px; display: grid; grid-template-columns: 35px minmax(90px,1fr) minmax(0,auto) 12px; align-items: center; gap: 10px; padding: 7px 15px; border: 0; border-bottom: 1px solid var(--me-line); background: transparent; color: var(--me-ink); text-align: left; text-decoration: none; }.menu-card>:last-child { border-bottom: 0; }.menu-card>a:active,.menu-card>button:active { background: #f6f9ff; }
.menu-card strong { font-size: 14px; font-weight: 650; }.menu-card>*>span { overflow: hidden; color: var(--me-muted); font-size: 11px; text-align: right; text-overflow: ellipsis; white-space: nowrap; }.menu-arrow { color: #9aa7bb; font-size: 15px; }
.menu-icon,.setting-icon { position: relative; width: 30px; height: 30px; display: grid; place-items: center; font-size: 25px; font-style: normal; line-height: 1; }.mistake-book { color: #7764ef; font-size: 27px; }.menu-badge { position: absolute; right: -1px; bottom: 0; width: 13px; height: 13px; border: 2px solid #fff; border-radius: 50%; background: #7764ef; color: #fff; font-size: 11px; }.word-book { color: #2174f5; }.word-book::before { width: 25px; height: 25px; }.word-book::after { width: 23px; height: 23px; }.word-book b { font-size: 12px; }.phrase-icon { color: #39c895; font-size: 27px; }.essay-icon { color: #f5a225; font-size: 27px; }.essay-icon::after { position: absolute; right: 3px; bottom: 1px; left: 3px; height: 2px; border-radius: 99px; background: currentColor; content: ''; }.paper-icon { color: #2b8df1; font-size: 27px; }.search-icon { color: #9a58e8; font-size: 28px; }
.settings-section { margin-top: 20px; }.setting-icon { overflow: hidden; color: var(--me-blue); font-size: 25px; }.setting-icon>.anticon { display: block; max-width: 100%; max-height: 100%; line-height: 1; }
.signout-button { width: 100%; min-height: 46px; display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 20px; border: 1px solid #e5e9f0; border-radius: 12px; background: #fff; color: #7b879a; font-size: 12px; font-weight: 650; }

@media (max-width: 390px) {
  .me-screen { padding-inline: 14px; }
  .profile-card { grid-template-columns: 56px minmax(0,1fr) auto; gap: 11px; padding-inline: 15px; }
  .profile-avatar { width: 54px; height: 54px; font-size: 25px; }
  .profile-copy strong { font-size: 18px; }
  .countdown p strong { font-size: 32px; }
  .summary-card { padding-inline: 3px; }
  .summary-item { padding-inline: 4px; }
  .summary-item>strong { font-size: 18px; }
  .menu-card>a,.menu-card>button { grid-template-columns: 32px minmax(80px,1fr) minmax(0,auto) 10px; gap: 8px; padding-inline: 11px; }
}
@media (min-width: 768px) { .me-screen { padding-inline: 30px; } }
</style>
