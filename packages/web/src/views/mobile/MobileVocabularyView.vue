<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  AimOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  ReadOutlined,
  ReloadOutlined,
  RightOutlined,
  SoundFilled,
  WarningOutlined,
} from '@ant-design/icons-vue';
import { showToast } from 'vant';
import { apiError } from '@/api/client';
import {
  answerWord,
  introduceWord,
  listDecks,
  listWords,
  reviewWord,
  todayQueue,
  type ProgressItem,
  type TodayVocabularyQueue,
  type VocabularyWord,
} from '@/api/vocabulary';
import completionIllustration from '@/assets/vocabulary-learning-complete.png';
import { speak, warmupVoices } from '@/utils/speech';

type ViewMode = 'overview' | 'session' | 'done';

const route = useRoute();
const router = useRouter();
const data = ref<TodayVocabularyQueue | null>(null);
const queue = ref<ProgressItem[]>([]);
const words = ref<VocabularyWord[]>([]);
const viewMode = ref<ViewMode>('overview');
const busy = ref(true);
const actionBusy = ref(false);
const error = ref('');
const selectedAnswer = ref<string | null>(null);
const answerResult = ref<{ correct: boolean; record: ProgressItem } | null>(null);

const current = computed(() => queue.value[0] ?? null);
const newTarget = computed(() => data.value?.new_count ?? 0);
const newCompleted = computed(() => data.value?.new_completed_count ?? 0);
const newRemaining = computed(() => data.value?.new_remaining_count ?? 0);
const dueRemaining = computed(() => data.value?.due_remaining_count ?? 0);
const retryRemaining = computed(() => queue.value.filter((item) => item.learning_stage === 'RETRY').length);
const introRemaining = computed(() => queue.value.filter((item) => item.queue_kind === 'NEW' && item.learning_stage === 'INTRO').length);
const checkRemaining = computed(() => queue.value.filter((item) => item.queue_kind === 'NEW' && item.learning_stage === 'CHECK').length);
const newProgress = computed(() => newTarget.value ? Math.round((newCompleted.value / newTarget.value) * 100) : 100);
const activeGroup = computed(() => data.value?.groups.find((group) => group.completed < group.total) ?? data.value?.groups.at(-1) ?? null);
const activeGroupIndex = computed(() => activeGroup.value?.index ?? Math.max(1, Math.ceil((newCompleted.value + 1) / 5)));
const currentGroupIndex = computed(() => current.value?.queue_position == null
  ? activeGroupIndex.value
  : Math.floor(current.value.queue_position / 5) + 1);
const withinGroupIndex = computed(() => current.value?.queue_position == null
  ? Math.max(1, (newCompleted.value % 5) + 1)
  : (current.value.queue_position % 5) + 1);
const isNewCard = computed(() => current.value?.queue_kind === 'NEW');
const isIntro = computed(() => isNewCard.value && current.value?.learning_stage === 'INTRO');
const isReview = computed(() => current.value?.queue_kind === 'REVIEW');
const isRetry = computed(() => current.value?.learning_stage === 'RETRY');
const isQuiz = computed(() => isReview.value || (isNewCard.value && (current.value?.learning_stage === 'CHECK' || isRetry.value)));
const overviewStep = computed(() => {
  if (!current.value) return 3;
  return current.value.learning_stage === 'INTRO' ? 1 : 3;
});
const sessionPosition = computed(() => {
  if (isReview.value) return Math.min(data.value?.due_count ?? 0, (data.value?.due_completed_count ?? 0) + 1);
  return Math.min(newTarget.value, (current.value?.queue_position ?? newCompleted.value) + 1);
});
const sessionTotal = computed(() => isReview.value ? (data.value?.due_count ?? 0) : newTarget.value);
const lastPosition = computed(() => current.value
  ? `${isReview.value ? '到期复习' : `第 ${currentGroupIndex.value} 组`} · ${current.value.word.word}`
  : '今日任务已完成');

const quizOptions = computed(() => {
  const item = current.value;
  if (!item) return [];
  const correct = item.word.meaning;
  const candidates = [...queue.value.map((record) => record.word), ...words.value]
    .filter((word) => word.id !== item.word.id && word.meaning !== correct)
    .map((word) => word.meaning)
    .filter((meaning, index, list) => list.indexOf(meaning) === index);
  const offset = item.id % Math.max(1, candidates.length);
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)].slice(0, 2);
  const result = [correct, ...rotated];
  while (result.length < 3) result.push(['改善；提高', '预测；预言', '限制；约束'][result.length - 1]);
  return result.sort((a, b) => ((a.length + item.id) % 3) - ((b.length + item.id) % 3));
});

const memoryLabel = computed(() => {
  const strategy = current.value?.word.memory.strategy;
  if (strategy === 'MORPHEME') return '构词拆解';
  if (strategy === 'FAMILY') return '词族联想';
  return '常用搭配';
});

const memoryBadge = computed(() => {
  const strategy = current.value?.word.memory.strategy;
  if (strategy === 'MORPHEME') return '拆解理解';
  if (strategy === 'FAMILY') return '同族识别';
  return '场景记忆';
});

const completionRoots = computed(() => {
  const labels = (data.value?.groups ?? []).map((group) => group.label.replace(/^词族\s*/, ''));
  return [...new Set(labels)].slice(0, 4);
});

function displayPhonetic(value: string | null) {
  if (!value) return '';
  const cleaned = value.trim().replace(/^\/+|\/+$/g, '');
  return `/${cleaned}/`;
}

function exampleLines(value: string | null) {
  if (!value) return [];
  return value.split('\n').map((line) => {
    const parts = line.split(/\s*[|｜]\s*/);
    return { en: parts[0]?.trim() ?? '', zh: parts.slice(1).join('｜').trim() };
  }).filter((line) => line.en);
}

async function loadQueue() {
  const result = await todayQueue();
  data.value = result;
  queue.value = result.list;
}

async function loadAll() {
  busy.value = true;
  error.value = '';
  try {
    const [queueResult, deckResult] = await Promise.all([todayQueue(), listDecks()]);
    const wordResult = deckResult[0] ? await listWords(deckResult[0].id) : [];
    words.value = wordResult;
    queue.value = queueResult.list;
    data.value = queueResult;
    viewMode.value = route.query.autostart === '1'
      ? (queueResult.list.length ? 'session' : 'done')
      : 'overview';
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

async function startPrimaryTask() {
  selectedAnswer.value = null;
  answerResult.value = null;
  if (!queue.value.length) {
    viewMode.value = 'done';
    return;
  }
  await router.replace({ query: { ...route.query, autostart: '1' } });
  viewMode.value = 'session';
}

async function showOverview() {
  const { autostart: _autostart, ...query } = route.query;
  await router.replace({ query });
  viewMode.value = 'overview';
}

async function exitSession() {
  selectedAnswer.value = null;
  answerResult.value = null;
  try {
    await loadQueue();
  } catch (cause) {
    showToast(apiError(cause));
  }
  await showOverview();
}

async function completeIntroduction() {
  if (!current.value || actionBusy.value) return;
  actionBusy.value = true;
  try {
    await introduceWord(current.value.id);
    await loadQueue();
  } catch (cause) {
    showToast(apiError(cause));
  } finally {
    actionBusy.value = false;
  }
}

async function chooseAnswer(option: string) {
  const item = current.value;
  if (!item || actionBusy.value || answerResult.value) return;
  selectedAnswer.value = option;
  actionBusy.value = true;
  try {
    const correct = option === item.word.meaning;
    const record = isReview.value
      ? await reviewWord(item.id, correct)
      : await answerWord(item.id, correct);
    answerResult.value = { correct, record };
  } catch (cause) {
    selectedAnswer.value = null;
    showToast(apiError(cause));
  } finally {
    actionBusy.value = false;
  }
}

async function continueAfterAnswer() {
  selectedAnswer.value = null;
  answerResult.value = null;
  try {
    await loadQueue();
    if (!queue.value.length) viewMode.value = 'done';
  } catch (cause) {
    showToast(apiError(cause));
  }
}

onMounted(() => {
  warmupVoices();
  loadAll();
});
</script>

<template>
  <main class="rapid-vocab-page">
    <div class="rapid-vocab-screen" :class="{ 'is-session': viewMode === 'session' }">
      <p v-if="error" class="error-banner">{{ error }}</p>
      <div v-if="busy && !data" class="loading-state">
        <van-loading size="24">正在整理今日词汇任务…</van-loading>
      </div>

      <template v-else-if="data">
        <template v-if="viewMode === 'overview'">
          <header class="page-header">
            <div>
              <span class="brand-line"><i />STUDY</span>
              <h1>英语词汇</h1>
            </div>
            <time>{{ data.queue_date.slice(5).replace('-', '月') }}日</time>
          </header>

          <section class="mission-panel">
            <div class="mission-head">
              <div><h2>继续本轮学习</h2></div>
              <div class="mission-count"><strong>{{ newCompleted }}</strong><span>/ {{ newTarget }}</span></div>
            </div>
            <div class="progress-track" role="progressbar" :aria-valuenow="newProgress" aria-valuemin="0" aria-valuemax="100">
              <i :style="{ width: `${newProgress}%` }" />
            </div>
            <div class="mission-meta">
              <span>新词 {{ newCompleted }}/{{ newTarget }}</span>
              <span>复习 {{ data.due_completed_count }}/{{ data.due_count }}</span>
            </div>

            <div class="learning-steps" aria-label="学习步骤">
              <div v-for="(label, index) in ['学习新词', '完成首次学习', '小测验']" :key="label" :class="{ active: overviewStep === index + 1 }">
                <span class="step-number">{{ index + 1 }}</span>
                <small>{{ label }}</small>
                <RightOutlined v-if="index < 2" class="step-arrow" />
              </div>
            </div>

            <p class="mission-caption">按步骤完成学习，巩固记忆效果更好</p>
            <button v-if="queue.length" class="direct-start" @click="startPrimaryTask">
              继续学习 <RightOutlined />
            </button>
            <div v-else class="mission-complete"><CheckOutlined /><strong>今日任务已完成</strong></div>
          </section>

          <div class="summary-grid">
            <section class="summary-card">
              <span class="summary-icon blue"><ReadOutlined /></span>
              <div><small>新词剩余</small><strong>{{ newRemaining }}<em>个</em></strong></div>
            </section>
            <section class="summary-card">
              <span class="summary-icon violet"><ReloadOutlined /></span>
              <div><small>复习剩余</small><strong>{{ dueRemaining }}<em>个</em></strong></div>
            </section>
            <section class="summary-card">
              <span class="summary-icon red"><WarningOutlined /></span>
              <div><small>错词待重练</small><strong>{{ retryRemaining }}<em>个</em></strong></div>
            </section>
          </div>

          <section class="schedule-panel">
            <h2>本轮安排</h2>
            <div class="schedule-list">
              <div class="schedule-row">
                <span class="schedule-icon"><ReadOutlined /></span>
                <strong>学习新词</strong>
                <span class="schedule-goal">{{ newTarget }} 词</span>
                <b v-if="introRemaining" class="schedule-status active"><i />进行中</b>
                <b v-else class="schedule-status done"><i />已完成</b>
              </div>
              <div class="schedule-row">
                <span class="schedule-icon"><FileDoneOutlined /></span>
                <strong>小测验</strong>
                <span class="schedule-goal">{{ Math.ceil(newTarget / 2) }} 题</span>
                <b v-if="checkRemaining" class="schedule-status active"><i />进行中</b>
                <b v-else-if="newTarget > 0 && newCompleted >= newTarget" class="schedule-status done"><i />已完成</b>
                <b v-else class="schedule-status pending"><i />待完成</b>
              </div>
              <div class="schedule-row">
                <span class="schedule-icon"><AimOutlined /></span>
                <strong>错题再练</strong>
                <span class="schedule-goal">自动触发</span>
                <b v-if="retryRemaining" class="schedule-status active"><i />进行中</b>
                <b v-else-if="newTarget > 0 && newCompleted >= newTarget" class="schedule-status done"><i />已完成</b>
                <b v-else class="schedule-status pending"><i />按结果进入</b>
              </div>
            </div>
          </section>

          <button class="last-position" :disabled="!queue.length" @click="startPrimaryTask">
            <ClockCircleOutlined />
            <span><small>上次学习位置</small><strong>{{ lastPosition }}</strong></span>
            <RightOutlined />
          </button>
        </template>

        <template v-else-if="viewMode === 'session' && current">
          <header class="session-header">
            <button aria-label="退出学习" @click="exitSession"><CloseOutlined />退出</button>
            <h1>{{ isIntro ? '学习新词' : isRetry ? '再练一次' : isReview ? '到期复习' : '小测验' }}</h1>
            <span>{{ sessionPosition }}/{{ sessionTotal }}</span>
          </header>

          <div class="session-line">
            <span>{{ isReview ? '选择最常用的含义' : `第 ${currentGroupIndex} 组 · ${withinGroupIndex}/5` }}</span>
            <div aria-hidden="true"><i v-for="index in 5" :key="index" :class="{ active: index <= withinGroupIndex }" /></div>
          </div>

          <template v-if="isIntro">
            <section class="word-card">
              <div class="word-card-head">
                <div><span class="micro-label">核心词汇</span><h2>{{ current.word.word }}</h2><p>{{ displayPhonetic(current.word.phonetic) }}</p></div>
                <button aria-label="播放发音" @click="speak(current.word.word)"><SoundFilled /></button>
              </div>
              <div class="core-meaning"><span>本轮只记住这个核心意思</span><strong>{{ current.word.meaning }}</strong></div>
            </section>

            <section class="memory-card">
              <div class="memory-head"><div><ReadOutlined /><strong>{{ memoryLabel }}</strong></div><span>{{ memoryBadge }}</span></div>
              <div v-if="current.word.memory.parts.length" class="part-formula">
                <template v-for="(part, index) in current.word.memory.parts" :key="`${part.text}-${index}`">
                  <i v-if="index">+</i><div><b>{{ part.text }}</b><small>{{ part.meaning }}</small></div>
                </template>
              </div>
              <p class="memory-note">{{ current.word.memory.literal_bridge ?? current.word.memory.memory_note }}</p>
              <div v-if="current.word.memory.family_words.length" class="family-grid">
                <div v-for="item in current.word.memory.family_words.slice(0, 3)" :key="item.word"><b>{{ item.word }}</b><span>{{ item.meaning }}</span></div>
              </div>
              <div v-else-if="current.word.memory.phrase" class="phrase-memory"><b>{{ current.word.memory.phrase.text }}</b><span>{{ current.word.memory.phrase.meaning }}</span></div>
            </section>

            <section v-if="exampleLines(current.word.example_sentence).length" class="example-card">
              <header><strong>常用例句</strong><span>场景记忆</span></header>
              <div v-for="(line, index) in exampleLines(current.word.example_sentence)" :key="line.en" class="example-line">
                <i>{{ index + 1 }}</i><p>{{ line.en }}<span v-if="line.zh">{{ line.zh }}</span></p>
              </div>
            </section>

            <div class="sticky-actions">
              <button class="secondary" @click="speak(current.word.word)"><SoundFilled />再听一遍</button>
              <button :disabled="actionBusy" @click="completeIntroduction">{{ actionBusy ? '保存中…' : '完成首次学习' }}<RightOutlined /></button>
            </div>
          </template>

          <template v-else-if="isQuiz">
            <section class="quiz-card">
              <span class="micro-label">选择最常用的中文含义</span>
              <h2>{{ current.word.word }}</h2>
              <div class="quiz-phonetic"><span>{{ displayPhonetic(current.word.phonetic) }}</span><button aria-label="播放发音" @click="speak(current.word.word)"><SoundFilled /></button></div>
              <div class="answer-list">
                <button
                  v-for="(option, index) in quizOptions"
                  :key="option"
                  :disabled="actionBusy || Boolean(answerResult)"
                  :class="{ correct: answerResult && option === current.word.meaning, wrong: answerResult && option === selectedAnswer && !answerResult.correct }"
                  @click="chooseAnswer(option)"
                >
                  <i><CheckOutlined v-if="answerResult && option === current.word.meaning" /><CloseOutlined v-else-if="answerResult && option === selectedAnswer" /><template v-else>{{ String.fromCharCode(65 + index) }}</template></i>
                  <span>{{ option }}</span>
                </button>
              </div>
            </section>

            <section v-if="answerResult" class="answer-feedback" :class="{ success: answerResult.correct }">
              <header><span><CheckOutlined v-if="answerResult.correct" /><ExclamationCircleOutlined v-else /></span><strong>{{ answerResult.correct ? '回答正确' : '正确答案已标出' }}</strong></header>
              <p class="feedback-meaning">{{ current.word.meaning }}</p>
              <div v-if="exampleLines(current.word.example_sentence).length" class="feedback-examples">
                <p v-for="line in exampleLines(current.word.example_sentence).slice(0, 2)" :key="line.en">{{ line.en }}<span v-if="line.zh">{{ line.zh }}</span></p>
              </div>
              <p v-else>{{ current.word.memory.literal_bridge ?? current.word.memory.memory_note }}</p>
            </section>
            <p v-if="answerResult && !isReview && !answerResult.correct && answerResult.record.learning_stage === 'RETRY'" class="retry-note"><ReloadOutlined />这个词会在本轮稍后再练一次</p>
            <div class="sticky-actions one"><button v-if="answerResult" @click="continueAfterAnswer">继续下一题<RightOutlined /></button></div>
          </template>
        </template>

        <template v-else>
          <header class="page-header"><div><span class="brand-line"><i />STUDY</span><h1>今日完成</h1></div><time>{{ data.queue_date.slice(5).replace('-', '月') }}日</time></header>
          <section class="completion-visual"><img :src="completionIllustration" alt="学习资料、进度图表与完成标记组成的学习完成插画"><span>SESSION COMPLETE</span></section>
          <div class="completion-copy"><span class="micro-label">PROGRESS SAVED</span><h2>{{ newCompleted }} 个新词学习完成</h2><p>今天的学习与检测已记录。暂时没记住的单词，明天会优先复习。</p></div>
          <section class="completion-progress"><div><strong>今日新词</strong><span>{{ newCompleted }} / {{ newTarget }}</span></div><i><b :style="{ width: `${newProgress}%` }" /></i></section>
          <div class="result-grid"><section><strong>{{ data.once_pass_count }}</strong><span>一次通过</span></section><section><strong>{{ data.retry_pass_count }}</strong><span>稍后记住</span></section><section><strong>{{ data.tomorrow_focus_count }}</strong><span>明日重点</span></section></div>
          <section class="root-summary"><h3>今天建立的记忆线索</h3><p>后续复习会继续强化，不要求今天一次全部记住。</p><div><span v-for="label in completionRoots" :key="label">{{ label }}</span></div></section>
          <div class="completion-actions"><button class="secondary" @click="showOverview">查看今日进度</button></div>
        </template>
      </template>
    </div>
  </main>
</template>

<style scoped>
.rapid-vocab-page {
  --rv-bg: #f6f8fc;
  --rv-card: #fff;
  --rv-ink: #15213a;
  --rv-text: #33415c;
  --rv-muted: #68758c;
  --rv-faint: #98a3b5;
  --rv-border: #e3e8f1;
  --rv-strong: #cbd4e1;
  --rv-blue: #3367e8;
  --rv-blue-dark: #2455d2;
  --rv-blue-soft: #edf3ff;
  --rv-green: #15906f;
  --rv-green-soft: #ebf9f4;
  --rv-red: #c53b36;
  --rv-red-soft: #fff1f0;
  --rv-amber: #b56c0d;
  --rv-amber-soft: #fff7e8;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--rv-bg);
  color: var(--rv-ink);
}
.rapid-vocab-screen { width: min(100%, 680px); min-height: inherit; margin: 0 auto; padding: 18px clamp(16px, 4.6vw, 24px) 42px; }
.rapid-vocab-screen.is-session { display: flex; flex-direction: column; }
button { font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.page-header { min-height: 70px; display: flex; align-items: center; justify-content: space-between; padding: 0 2px 16px; }
.page-header h1 { margin: 4px 0 0; font-size: 27px; font-weight: 760; letter-spacing: -.04em; }
.page-header time { color: var(--rv-muted); font-size: 13px; font-variant-numeric: tabular-nums; }
.brand-line { display: flex; align-items: center; gap: 7px; color: var(--rv-muted); font-size: 10px; font-weight: 760; letter-spacing: .14em; }
.brand-line i { width: 16px; height: 2px; border-radius: 99px; background: var(--rv-blue); }
.micro-label { color: var(--rv-muted); font-size: 10px; font-weight: 780; letter-spacing: .1em; text-transform: uppercase; }
.error-banner { margin: 0 0 12px; padding: 11px 12px; border: 1px solid #f0b3af; border-radius: 12px; background: var(--rv-red-soft); color: var(--rv-red); font-size: 12px; }
.loading-state { min-height: 70vh; display: grid; place-items: center; color: var(--rv-muted); }

.mission-panel { padding: 21px; border: 1px solid var(--rv-border); border-radius: 20px; background: var(--rv-card); box-shadow: 0 10px 32px rgba(33, 50, 86, .07); }
.mission-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.mission-head h2 { margin: 2px 0 0; font-size: 22px; line-height: 1.25; letter-spacing: -.025em; }
.mission-count { display: flex; align-items: baseline; gap: 3px; padding-top: 2px; white-space: nowrap; }
.mission-count strong { color: var(--rv-blue); font-size: 35px; line-height: 1; font-variant-numeric: tabular-nums; }
.mission-count span { color: var(--rv-muted); font-size: 13px; }
.progress-track { height: 7px; overflow: hidden; margin-top: 19px; border-radius: 99px; background: #e9edf5; }
.progress-track i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #3166e8, #5a83ed); transition: width .2s ease; }
.mission-meta { display: flex; justify-content: space-between; margin-top: 8px; color: var(--rv-muted); font-size: 11px; }
.learning-steps { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-top: 21px; padding: 18px 0 14px; border-top: 1px solid var(--rv-border); }
.learning-steps>div { min-width: 0; display: flex; align-items: center; gap: 8px; color: var(--rv-muted); white-space: nowrap; }
.learning-steps .step-number { width: 28px; height: 28px; display: grid; flex: 0 0 28px; place-items: center; border: 1px solid var(--rv-strong); border-radius: 50%; background: #fff; font-size: 11px; font-weight: 760; }
.learning-steps>div.active { color: var(--rv-blue); font-weight: 700; }
.learning-steps>div.active .step-number { border: 2px solid var(--rv-blue); background: #fff; color: var(--rv-blue); }
.learning-steps small { font-size: 11px; line-height: 1; }
.step-arrow { margin-left: 3px; color: #78859a; font-size: 11px; }
.mission-caption { margin: 2px 0 0; color: var(--rv-muted); font-size: 12px; text-align: center; }
.direct-start { width: 100%; min-height: 52px; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 15px; border: 0; border-radius: 13px; background: var(--rv-blue); color: #fff; font-size: 15px; font-weight: 750; box-shadow: 0 8px 18px rgba(51, 103, 232, .18); }
.direct-start:active { background: var(--rv-blue-dark); }
.mission-complete { min-height: 52px; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 15px; border-radius: 13px; background: linear-gradient(100deg, #2e6ef0, #2162e8); color: #fff; font-size: 14px; box-shadow: 0 8px 18px rgba(51, 103, 232, .18); }

.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
.summary-card { position: relative; min-width: 0; min-height: 96px; padding: 15px 13px; border: 1px solid var(--rv-border); border-radius: 16px; background: #fff; box-shadow: 0 5px 16px rgba(33, 50, 86, .05); }
.summary-icon { position: absolute; right: 12px; bottom: 15px; width: 26px; height: 26px; display: grid; place-items: center; background: transparent; font-size: 23px; }
.summary-icon.blue { color: #8bb0ff; }
.summary-icon.violet { color: var(--rv-blue); }
.summary-icon.red { color: #f04a4a; }
.summary-card div { min-width: 0; }
.summary-card small { display: block; overflow: hidden; margin-bottom: 22px; color: var(--rv-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.summary-card strong { display: flex; align-items: baseline; gap: 3px; padding-right: 25px; font-size: 23px; line-height: 1; font-variant-numeric: tabular-nums; }
.summary-card em { color: var(--rv-muted); font-size: 10px; font-style: normal; font-weight: 600; }

.schedule-panel { margin-top: 12px; padding: 18px; border: 1px solid var(--rv-border); border-radius: 18px; background: #fff; }
.schedule-panel>h2 { margin: 0 0 14px; font-size: 17px; letter-spacing: -.02em; }
.schedule-list { overflow: hidden; border: 1px solid var(--rv-border); border-radius: 12px; }
.schedule-row { min-height: 58px; display: grid; grid-template-columns: 34px minmax(74px, 1fr) auto minmax(70px, auto); align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--rv-border); }
.schedule-row:last-child { border-bottom: 0; }
.schedule-icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: linear-gradient(145deg, #4381f6, #1761e9); color: #fff; font-size: 15px; box-shadow: 0 4px 10px rgba(44, 101, 232, .18); }
.schedule-row>strong { min-width: 0; overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.schedule-goal { color: var(--rv-muted); font-size: 11px; white-space: nowrap; }
.schedule-status { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 8px; border-radius: 8px; font-size: 10px; font-weight: 650; white-space: nowrap; }
.schedule-status i { width: 5px; height: 5px; flex: 0 0 5px; border-radius: 50%; background: currentColor; }
.schedule-status.active { background: var(--rv-blue-soft); color: var(--rv-blue); }
.schedule-status.done { background: var(--rv-green-soft); color: var(--rv-green); }
.schedule-status.pending { background: #f2f4f7; color: #8c98aa; }
.last-position { width: 100%; min-height: 66px; display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 12px 15px; border: 1px solid var(--rv-border); border-radius: 16px; background: #fff; color: var(--rv-text); text-align: left; }
.last-position>svg { color: var(--rv-blue); font-size: 17px; }
.last-position>span { min-width: 0; flex: 1; }
.last-position small,.last-position strong { display: block; }
.last-position small { margin-bottom: 4px; color: var(--rv-muted); font-size: 9px; }
.last-position strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.last-position>svg:last-child { color: var(--rv-faint); font-size: 12px; }
.last-position:disabled { cursor: default; opacity: .7; }

.session-header { min-height: 54px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin-bottom: 5px; }
.session-header button { min-height: 44px; display: flex; align-items: center; gap: 6px; justify-self: start; padding: 0 4px 0 0; border: 0; background: transparent; color: var(--rv-muted); font-size: 12px; }
.session-header button svg { font-size: 11px; }
.session-header h1 { margin: 0; font-size: 16px; letter-spacing: -.02em; }
.session-header>span { justify-self: end; color: var(--rv-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.session-line { display: flex; align-items: center; justify-content: space-between; margin: 4px 1px 15px; color: var(--rv-muted); font-size: 11px; }
.session-line>div { display: flex; gap: 5px; }
.session-line i { width: 27px; height: 4px; border-radius: 99px; background: #dfe5ee; }
.session-line i.active { background: var(--rv-blue); }
.word-card,.memory-card,.quiz-card,.example-card { border: 1px solid var(--rv-border); border-radius: 18px; background: #fff; box-shadow: 0 2px 8px rgba(33, 50, 86, .035); }
.word-card { padding: 22px; }
.word-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.word-card-head h2,.quiz-card h2 { margin: 9px 0 4px; color: var(--rv-ink); font-size: clamp(39px, 12vw, 56px); line-height: 1; letter-spacing: -.055em; overflow-wrap: anywhere; }
.word-card-head p { margin: 9px 0 0; color: var(--rv-muted); font-size: 13px; }
.word-card-head button,.quiz-phonetic button { width: 44px; height: 44px; display: grid; flex: 0 0 44px; place-items: center; border: 1px solid #c8d6f7; border-radius: 13px; background: var(--rv-blue-soft); color: var(--rv-blue); font-size: 18px; }
.core-meaning { margin-top: 21px; padding-top: 18px; border-top: 1px solid var(--rv-border); }
.core-meaning span { display: block; margin-bottom: 7px; color: var(--rv-muted); font-size: 10px; }
.core-meaning strong { font-size: 20px; line-height: 1.45; }
.memory-card { margin-top: 12px; padding: 17px; }
.memory-head { display: flex; align-items: center; justify-content: space-between; }
.memory-head>div { display: flex; align-items: center; gap: 7px; }
.memory-head>div>svg { color: var(--rv-blue); }
.memory-head strong { font-size: 13px; }
.memory-head>span { padding: 5px 8px; border-radius: 7px; background: var(--rv-blue-soft); color: var(--rv-blue); font-size: 9px; font-weight: 750; }
.part-formula { display: flex; align-items: stretch; gap: 6px; margin-top: 13px; }
.part-formula>div { min-width: 0; flex: 1; padding: 11px 9px; border: 1px solid #cfdbf4; border-radius: 10px; background: #f8faff; text-align: center; }
.part-formula b { display: block; overflow: hidden; color: #2455bc; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.part-formula small { display: block; margin-top: 4px; color: var(--rv-muted); font-size: 9px; }
.part-formula>i { align-self: center; color: var(--rv-faint); font-style: normal; }
.memory-note { margin: 11px 0 0; padding: 11px 12px; border-left: 3px solid var(--rv-blue); border-radius: 0 9px 9px 0; background: #f7f9fc; color: var(--rv-text); font-size: 11px; line-height: 1.6; }
.family-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 10px; }
.family-grid>div,.phrase-memory { padding: 10px; border: 1px solid var(--rv-border); border-radius: 9px; background: #fbfcfe; }
.family-grid b,.phrase-memory b { display: block; margin-bottom: 3px; font-size: 11px; }
.family-grid span,.phrase-memory span { color: var(--rv-muted); font-size: 9px; }
.phrase-memory { margin-top: 10px; }
.example-card { margin-top: 12px; padding: 16px; }
.example-card>header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.example-card>header strong { font-size: 13px; }
.example-card>header span { padding: 4px 7px; border-radius: 6px; background: #f3f5f9; color: var(--rv-muted); font-size: 9px; }
.example-line { display: flex; align-items: flex-start; gap: 9px; padding: 9px 0; border-top: 1px solid var(--rv-border); }
.example-line i { width: 20px; height: 20px; display: grid; flex: 0 0 20px; place-items: center; border-radius: 50%; background: var(--rv-blue-soft); color: var(--rv-blue); font-size: 9px; font-style: normal; font-weight: 750; }
.example-line p { margin: 0; color: var(--rv-text); font-size: 11px; line-height: 1.5; }
.example-line p span { display: block; margin-top: 2px; color: var(--rv-muted); }
.sticky-actions { position: sticky; bottom: 0; z-index: 10; display: grid; grid-template-columns: .9fr 1.2fr; gap: 10px; margin: 16px -24px -42px; padding: 14px 24px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid rgba(227, 232, 241, .9); background: rgba(255, 255, 255, .96); backdrop-filter: blur(12px); }
.sticky-actions.one { grid-template-columns: 1fr; margin-top: auto; }
.sticky-actions button,.completion-actions button { min-height: 52px; display: flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--rv-blue); border-radius: 13px; background: var(--rv-blue); color: #fff; font-size: 13px; font-weight: 750; }
.sticky-actions button.secondary,.completion-actions button.secondary { border-color: var(--rv-strong); background: #fff; color: var(--rv-text); }
.sticky-actions button:disabled { opacity: .55; }

.quiz-card { padding: 23px 18px 19px; }
.quiz-card h2 { margin-top: 17px; font-size: 43px; }
.quiz-phonetic { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; color: var(--rv-muted); font-size: 13px; }
.quiz-phonetic button { width: 36px; height: 36px; flex-basis: 36px; border-radius: 10px; font-size: 15px; }
.answer-list { display: grid; gap: 10px; margin-top: 21px; }
.answer-list button { min-height: 57px; display: flex; align-items: center; gap: 12px; padding: 10px 13px; border: 1px solid var(--rv-strong); border-radius: 12px; background: #fff; color: var(--rv-text); text-align: left; font-size: 13px; font-weight: 680; }
.answer-list button i { width: 27px; height: 27px; display: grid; flex: 0 0 27px; place-items: center; border: 1px solid var(--rv-strong); border-radius: 50%; color: var(--rv-muted); font-size: 10px; font-style: normal; }
.answer-list button.correct { border-color: #72c3a8; background: var(--rv-green-soft); color: #087159; }
.answer-list button.correct i { border-color: var(--rv-green); background: var(--rv-green); color: #fff; }
.answer-list button.wrong { border-color: #e69e99; background: var(--rv-red-soft); color: var(--rv-red); }
.answer-list button.wrong i { border-color: var(--rv-red); background: var(--rv-red); color: #fff; }
.answer-feedback { margin-top: 12px; padding: 16px; border: 1px solid #ebc47d; border-radius: 13px; background: var(--rv-amber-soft); }
.answer-feedback.success { border-color: #78cbb1; background: var(--rv-green-soft); }
.answer-feedback header { display: flex; align-items: center; gap: 8px; color: var(--rv-amber); }
.answer-feedback.success header { color: var(--rv-green); }
.answer-feedback header>span { width: 23px; height: 23px; display: grid; place-items: center; border-radius: 50%; background: rgba(181, 108, 13, .12); }
.answer-feedback.success header>span { background: rgba(21, 144, 111, .12); }
.answer-feedback strong { font-size: 12px; }
.feedback-meaning { margin: 11px 0 0; color: var(--rv-ink); font-size: 14px; font-weight: 750; }
.feedback-examples { margin-top: 10px; padding-top: 9px; border-top: 1px solid rgba(181, 108, 13, .2); }
.answer-feedback.success .feedback-examples { border-color: rgba(21, 144, 111, .2); }
.feedback-examples p,.answer-feedback>p:not(.feedback-meaning) { margin: 5px 0 0; color: var(--rv-text); font-size: 10px; line-height: 1.55; }
.feedback-examples span { display: block; color: var(--rv-muted); }
.retry-note { display: flex; align-items: center; gap: 7px; margin: 10px 0 0; padding: 11px 12px; border-radius: 10px; background: #edf0f5; color: var(--rv-muted); font-size: 10px; }

.completion-visual { position: relative; height: 220px; overflow: hidden; border: 1px solid var(--rv-border); border-radius: 19px; background: #eef2f7; }
.completion-visual img { width: 100%; height: 100%; display: block; object-fit: cover; }
.completion-visual span { position: absolute; top: 12px; right: 12px; padding: 6px 9px; border-radius: 8px; background: rgba(21, 33, 58, .9); color: #fff; font-size: 9px; font-weight: 750; }
.completion-copy { padding: 19px 4px 0; text-align: center; }
.completion-copy .micro-label { color: var(--rv-green); }
.completion-copy h2 { margin: 7px 0 6px; font-size: 22px; }
.completion-copy p { margin: 0; color: var(--rv-muted); font-size: 11px; line-height: 1.6; }
.completion-progress,.root-summary { margin-top: 13px; padding: 15px; border: 1px solid var(--rv-border); border-radius: 15px; background: #fff; }
.completion-progress>div { display: flex; justify-content: space-between; }
.completion-progress span { color: var(--rv-green); font-size: 12px; font-weight: 750; }
.completion-progress>i { height: 6px; display: block; overflow: hidden; margin-top: 10px; border-radius: 99px; background: #dce5e1; }
.completion-progress b { display: block; height: 100%; background: var(--rv-green); }
.result-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 9px; }
.result-grid section { padding: 13px 5px; border: 1px solid var(--rv-border); border-radius: 13px; background: #fff; text-align: center; }
.result-grid strong { display: block; margin-bottom: 4px; font-size: 21px; }
.result-grid span { color: var(--rv-muted); font-size: 9px; }
.root-summary h3 { margin: 0 0 5px; font-size: 13px; }
.root-summary p { margin: 0; color: var(--rv-muted); font-size: 10px; }
.root-summary>div { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.root-summary span { padding: 6px 8px; border: 1px solid #c9d7f2; border-radius: 7px; background: var(--rv-blue-soft); color: #2455bc; font-size: 9px; font-weight: 750; }
.completion-actions { display: grid; gap: 8px; margin-top: 13px; }

@media (max-width: 370px) {
  .rapid-vocab-screen { padding-inline: 13px; }
  .mission-panel { padding: 17px; }
  .mission-head h2 { font-size: 20px; }
  .summary-grid { gap: 7px; }
  .summary-card { min-height: 91px; padding: 13px 10px; }
  .summary-card small { font-size: 10px; }
  .summary-card strong { font-size: 21px; }
  .summary-icon { right: 9px; bottom: 13px; font-size: 20px; }
  .learning-steps { gap: 2px; }
  .learning-steps>div { gap: 5px; }
  .learning-steps .step-number { width: 25px; height: 25px; flex-basis: 25px; }
  .learning-steps small { font-size: 9px; }
  .step-arrow { margin-left: 1px; font-size: 9px; }
  .schedule-panel { padding: 15px; }
  .schedule-row { grid-template-columns: 31px minmax(68px, 1fr) auto minmax(66px, auto); gap: 7px; padding-inline: 9px; }
  .schedule-icon { width: 30px; height: 30px; font-size: 14px; }
  .schedule-status { padding-inline: 6px; }
  .session-line i { width: 21px; }
  .family-grid { grid-template-columns: 1fr 1fr; }
  .family-grid>div:nth-child(3) { display: none; }
  .sticky-actions { margin-inline: -13px; padding-inline: 13px; }
  .completion-visual { height: 190px; }
}
</style>
