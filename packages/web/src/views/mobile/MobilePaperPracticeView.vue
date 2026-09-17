<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showConfirmDialog, showToast } from 'vant';
import { apiError } from '@/api/client';
import { getPaper, type PaperDetail, type PaperQuestion } from '@/api/papers';
import { renderInlineMarkdown, renderMarkdown } from '@/utils/markdown';
import {
  answerKeyOf,
  answerText,
  buildQuestionGroups,
  isObjective,
  numberQuestions,
  objectiveTally,
  type NumberedQuestion,
} from '@/utils/paperQuestion';

/**
 * 移动端做题页 —— 与 PC 端完全分离，PC 端是「展开答案对照」，这里是真的做题。
 *
 * 顶部栏：左 = 返回 + 当前题/总题数；右 = 答题卡 + 设置
 * 题面：左右滑动切题（van-swipe），每屏独立滚动
 * 答题卡：按真实考试板块分组（题型由 utils/paperQuestion 推断），可跳题、可交卷
 * 设置：右侧抽屉 —— 字体大小 / 自动下一题 / 背题模式（默认显示答案）
 *
 * 判分规则：未开背题模式时，交卷后统一判定客观题对错；主观题只给参考答案。
 */

type SwipeApi = {
  next: () => void;
  prev: () => void;
  swipeTo: (index: number, options?: { immediate?: boolean }) => void;
};

const route = useRoute();
const router = useRouter();

const detail = ref<PaperDetail | null>(null);
const error = ref('');
const busy = ref(false);

const index = ref(0);
const picks = ref<Record<number, string>>({});
const submitted = ref(false);

const showCard = ref(false);
const showSetting = ref(false);
const swipeRef = ref<SwipeApi | null>(null);
let autoNextTimer: number | undefined;

const FONT_SIZES = [
  { label: '小', value: 14 },
  { label: '标准', value: 16 },
  { label: '大', value: 18 },
  { label: '特大', value: 20 },
];

const settings = reactive({ fontSize: 16, autoNext: true, recite: false });

const SETTINGS_KEY = 'shck_practice_settings';
const progressKey = (paperId: number) => `shck_practice_paper_${paperId}`;

const questions = computed(() => detail.value?.questions ?? []);
const total = computed(() => questions.value.length);
const numbered = computed(() => numberQuestions(questions.value));
const current = computed(() => numbered.value[index.value] ?? null);
const groups = computed(() => (detail.value ? buildQuestionGroups(detail.value.subject, numbered.value) : []));
const typeLabelByPosition = computed(() => {
  const map = new Map<number, string>();
  for (const group of groups.value) {
    for (const item of group.items) map.set(item.position, group.label);
  }
  return map;
});
const currentLabel = computed(() => typeLabelByPosition.value.get(index.value) ?? '');
const tally = computed(() => objectiveTally(questions.value, picks.value));
const unanswered = computed(() => Math.max(0, tally.value.objectiveCount - tally.value.answered));
const subjectTitle = computed(() => (detail.value ? detail.value.subject.replace('高等数学（一）', '高等数学一') : ''));

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<typeof settings>;
    if (FONT_SIZES.some((item) => item.value === saved.fontSize)) settings.fontSize = saved.fontSize as number;
    if (typeof saved.autoNext === 'boolean') settings.autoNext = saved.autoNext;
    if (typeof saved.recite === 'boolean') settings.recite = saved.recite;
  } catch {
    /* 本地缓存损坏时沿用默认值 */
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings }));
  } catch {
    /* 隐私模式下写入失败可忽略 */
  }
}

function saveProgress() {
  if (!detail.value) return;
  try {
    localStorage.setItem(
      progressKey(detail.value.id),
      JSON.stringify({ picks: picks.value, index: index.value, submitted: submitted.value }),
    );
  } catch {
    /* 忽略写入失败 */
  }
}

function restoreProgress(paperId: number) {
  picks.value = {};
  index.value = 0;
  submitted.value = false;
  try {
    const raw = localStorage.getItem(progressKey(paperId));
    if (!raw) return;
    const saved = JSON.parse(raw) as { picks?: Record<number, string>; index?: number; submitted?: boolean };
    if (saved.picks && typeof saved.picks === 'object') picks.value = saved.picks;
    if (Number.isInteger(saved.index)) index.value = Math.min(Math.max(0, saved.index as number), Math.max(0, total.value - 1));
    if (typeof saved.submitted === 'boolean') submitted.value = saved.submitted;
  } catch {
    /* 忽略损坏的进度 */
  }
}

async function load() {
  const raw = route.params.paperId;
  const paperId = Number(raw);
  if (!Number.isInteger(paperId) || paperId < 1) {
    error.value = '试卷编号无效。';
    return;
  }
  error.value = '';
  busy.value = true;
  try {
    detail.value = await getPaper(paperId);
    restoreProgress(paperId);
    if (Object.keys(picks.value).length && !submitted.value) {
      showToast(`已恢复上次进度：第 ${index.value + 1} 题`);
    }
  } catch (cause) {
    error.value = apiError(cause);
    detail.value = null;
  } finally {
    busy.value = false;
  }
}

function clearAutoNextTimer() {
  if (autoNextTimer !== undefined) {
    window.clearTimeout(autoNextTimer);
    autoNextTimer = undefined;
  }
}

/** 背题模式下不做题，交卷后统一看答案 */
const answerVisible = computed(() => settings.recite || submitted.value);

function pick(question: PaperQuestion, key: string) {
  if (submitted.value || settings.recite) return;
  picks.value = { ...picks.value, [question.id]: key };
  saveProgress();
  if (!settings.autoNext || index.value >= total.value - 1) return;
  const from = index.value;
  clearAutoNextTimer();
  autoNextTimer = window.setTimeout(() => {
    autoNextTimer = undefined;
    if (submitted.value || !settings.autoNext || index.value !== from) return;
    swipeRef.value?.next();
  }, 320);
}

function onSwipeChange(next: number) {
  index.value = next;
  clearAutoNextTimer();
  saveProgress();
}

function onSwipeDown() {
  clearAutoNextTimer();
}

function jumpTo(position: number) {
  showCard.value = false;
  index.value = position;
  swipeRef.value?.swipeTo(position, { immediate: true });
  saveProgress();
}

function goPrev() {
  if (index.value === 0) return;
  swipeRef.value?.prev();
}

function goNext() {
  if (index.value >= total.value - 1) return;
  swipeRef.value?.next();
}

function optionClass(question: PaperQuestion, key: string) {
  const picked = picks.value[question.id];
  if (answerVisible.value) {
    const correct = answerKeyOf(question);
    return {
      'is-picked': picked === key && !submitted.value,
      'is-right': Boolean(correct) && key === correct,
      'is-wrong': Boolean(correct) && picked === key && key !== correct,
    };
  }
  return { 'is-picked': picked === key };
}

function verdict(question: PaperQuestion) {
  const correct = answerKeyOf(question);
  const picked = picks.value[question.id];
  if (!picked) return { text: '未作答', cls: 'is-miss' };
  return picked === correct ? { text: '答对', cls: 'is-right' } : { text: '答错', cls: 'is-wrong' };
}

function cellClass(item: NumberedQuestion) {
  const question = item.question;
  const picked = picks.value[question.id];
  const base = { 'is-current': item.position === index.value };
  if (!submitted.value) {
    return { ...base, 'is-picked': Boolean(picked) };
  }
  if (!isObjective(question)) {
    return { ...base, 'is-subjective': true };
  }
  return { ...base, 'is-picked': Boolean(picked), 'is-right': picked === answerKeyOf(question), 'is-wrong': picked !== answerKeyOf(question) };
}

async function submit() {
  if (!total.value || submitted.value) return;
  const missing = unanswered.value;
  if (missing > 0) {
    try {
      await showConfirmDialog({
        title: '确认交卷',
        message: `还有 ${missing} 道选择题没作答，交卷后选择题不能再修改。`,
        confirmButtonText: '交卷',
        cancelButtonText: '再检查下',
      });
    } catch {
      return;
    }
  }
  submitted.value = true;
  clearAutoNextTimer();
  saveProgress();
  showCard.value = true;
}

function redo() {
  submitted.value = false;
  picks.value = {};
  index.value = 0;
  saveProgress();
  showCard.value = false;
  swipeRef.value?.swipeTo(0, { immediate: true });
}

function exit() {
  // 带上科目，回到列表页时保持原来的筛选
  const subject = detail.value?.subject;
  void router.push({ name: 'm-papers', query: subject ? { subject } : {} });
}

onMounted(() => {
  loadSettings();
  void load();
});

onBeforeUnmount(clearAutoNextTimer);
</script>

<template>
  <div class="practice-root" :class="{ 'is-recite': settings.recite }" :style="{ '--q-font': `${settings.fontSize}px` }">
    <header class="p-topbar">
      <div class="p-bar-left">
        <button class="p-icon" aria-label="返回试卷列表" @click="exit">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <div class="p-progress">
          <strong>{{ current ? current.number : 0 }}</strong><span>/{{ total }}</span>
          <small>{{ currentLabel }}</small>
        </div>
      </div>
      <div class="p-bar-right">
        <button class="p-icon" aria-label="答题卡" @click="showCard = true">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" /><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" stroke-width="2.4" /></svg>
          <span v-if="unanswered" class="p-badge">{{ unanswered }}</span>
        </button>
        <button class="p-icon" aria-label="设置" @click="showSetting = true">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1" /><path d="M19.1 14.2a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V20a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H4a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10a1.7 1.7 0 0 0 1.03-1.56V4a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.56 1.03H20a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.56 1.03z" /></svg>
        </button>
      </div>
    </header>

    <p v-if="error" class="p-error">{{ error }}</p>
    <div v-else-if="busy && !detail" class="p-loading"><van-loading size="24">正在加载试卷…</van-loading></div>
    <div v-else-if="!total" class="p-loading">这套试卷还没有题目。</div>

    <div v-else class="p-swipe-wrap" @touchstart.passive="onSwipeDown">
      <van-swipe
        ref="swipeRef"
        class="p-swipe"
        :initial-swipe="index"
        :loop="false"
        :show-indicators="false"
        :duration="220"
        @change="onSwipeChange"
      >
        <van-swipe-item
          v-for="item in numbered"
          :key="item.question.id"
          :class="{ 'is-current-q': item.position === index }"
        >
          <div class="p-scroll">
            <div class="p-qhead">
              <span class="p-kind">{{ typeLabelByPosition.get(item.position) }}</span>
              <span class="p-score">{{ item.question.score }} 分</span>
            </div>

            <div v-if="item.question.passage" class="p-passage md" v-html="renderMarkdown(item.question.passage)" />
            <div class="p-content md" v-html="renderMarkdown(item.question.content)" />

            <div v-if="item.question.options?.length" class="p-opts">
              <button
                v-for="option in item.question.options"
                :key="option.key"
                type="button"
                class="p-opt"
                :class="optionClass(item.question, option.key)"
                :disabled="submitted || settings.recite"
                @click="pick(item.question, option.key)"
              >
                <i class="p-opt-key">{{ option.key }}</i>
                <span class="p-opt-text" v-html="renderInlineMarkdown(option.text)" />
              </button>
            </div>
            <p v-else-if="!answerVisible" class="p-subjective-tip">本题为主观题，交卷后可对照参考答案。</p>

            <div v-if="answerVisible" class="p-answer">
              <div class="p-answer-head">
                <span v-if="isObjective(item.question)" class="p-verdict" :class="verdict(item.question).cls">{{ verdict(item.question).text }}</span>
                <span v-else class="p-verdict is-miss">主观题 · 自行对照</span>
                <span v-if="settings.recite && !submitted" class="p-answer-tag">背题模式</span>
              </div>
              <div class="p-answer-md md" v-html="renderMarkdown(answerText(item.question))" />
            </div>

            <p class="p-swipe-hint">← 左右滑动切题 →</p>
          </div>
        </van-swipe-item>
      </van-swipe>
    </div>

    <footer v-if="total" class="p-bottombar">
      <button type="button" class="p-nav" :disabled="index === 0" @click="goPrev">上一题</button>
      <button v-if="!submitted" type="button" class="p-submit" @click="submit">交卷</button>
      <button v-else type="button" class="p-nav is-again" @click="redo">重做</button>
      <button type="button" class="p-nav" :disabled="index >= total - 1" @click="goNext">下一题</button>
    </footer>

    <van-popup v-model:show="showCard" position="bottom" round class="p-pop p-pop-card" :style="{ maxHeight: '78%' }">
      <div class="p-pop-head">
        <strong>答题卡</strong>
        <span v-if="submitted" class="p-tally">客观题 {{ tally.right }}/{{ tally.objectiveCount }} 题 · {{ tally.scored }}/{{ tally.scoredFull }} 分</span>
        <span v-else class="p-tally">已答 {{ tally.answered }}/{{ tally.objectiveCount }}</span>
      </div>
      <div class="p-pop-body">
        <section v-for="group in groups" :key="group.label" class="p-card-group">
          <header><span>{{ group.label }}</span><small>{{ group.items.length }} 题 · 每题 {{ group.items[0].question.score }} 分</small></header>
          <div class="p-grid">
            <button
              v-for="item in group.items"
              :key="item.question.id"
              type="button"
              class="p-cell"
              :class="cellClass(item)"
              @click="jumpTo(item.position)"
            >
              {{ item.number }}
            </button>
          </div>
        </section>
      </div>
      <div class="p-legend">
        <span><i class="lg-current" />当前</span>
        <span><i class="lg-done" />已答</span>
        <span v-if="submitted"><i class="lg-right" />答对</span>
        <span v-if="submitted"><i class="lg-wrong" />答错</span>
        <span v-if="submitted && tally.subjectiveCount"><i class="lg-manual" />主观题</span>
      </div>
      <div class="p-pop-foot">
        <van-button v-if="!submitted" block round type="primary" @click="submit">交卷并判分</van-button>
        <van-button v-else block round @click="redo">重做这套</van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="showSetting" position="right" class="p-drawer" :style="{ width: '78%', maxWidth: '330px', height: '100%' }">
      <div class="p-pop-head">
        <strong>做题设置</strong>
        <button class="p-icon" aria-label="关闭设置" @click="showSetting = false">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div class="p-drawer-body">
        <section class="p-set">
          <h3>字体大小</h3>
          <div class="p-seg">
            <button
              v-for="size in FONT_SIZES"
              :key="size.value"
              type="button"
              class="p-seg-item"
              :class="{ on: settings.fontSize === size.value }"
              @click="settings.fontSize = size.value; saveSettings()"
            >
              {{ size.label }}
            </button>
          </div>
          <p class="p-seg-preview" :style="{ fontSize: `${settings.fontSize}px` }">示例：设函数 f(x) 在点 x₀ 处可导</p>
        </section>

        <section class="p-set is-row">
          <div><h3>自动下一题</h3><p>选完选项后自动翻到下一题</p></div>
          <van-switch v-model="settings.autoNext" size="22" @change="saveSettings" />
        </section>

        <section class="p-set is-row">
          <div><h3>背题模式</h3><p>默认直接显示答案，不用作答</p></div>
          <van-switch v-model="settings.recite" size="22" @change="saveSettings" />
        </section>

        <p class="p-drawer-note">
          {{ subjectTitle }} · 共 {{ total }} 题。交卷后判定客观题对错，主观题给出参考答案。
        </p>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.practice-root { position: fixed; inset: 0; display: flex; flex-direction: column; background: var(--app-bg); color: var(--study-text); }

.p-topbar { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 54px; padding: calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom: 1px solid var(--app-border); background: var(--app-surface); }
.p-bar-left, .p-bar-right { display: flex; align-items: center; gap: 6px; }
.p-icon { position: relative; width: 38px; height: 38px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 10px; background: transparent; color: var(--app-text); }
.p-icon:active { background: var(--app-primary-soft); }
.p-badge { position: absolute; top: 2px; right: 2px; min-width: 15px; height: 15px; padding: 0 4px; border-radius: 8px; background: var(--app-danger); color: #fff; font-size: 10px; font-weight: 600; line-height: 15px; text-align: center; }
.p-progress { display: flex; align-items: baseline; gap: 1px; }
.p-progress strong { color: var(--app-text); font-size: 19px; font-weight: 600; letter-spacing: -.02em; }
.p-progress span { color: var(--app-faint); font-size: 13px; }
.p-progress small { margin-left: 6px; padding: 2px 7px; border-radius: 6px; background: var(--app-primary-soft); color: var(--app-primary); font-size: 11px; font-weight: 600; }

.p-error { margin: 14px 16px; padding: 11px 12px; border: 1px solid #fecaca; border-radius: 10px; background: #fef2f2; color: #b42318; font-size: 13px; }
.p-loading { display: grid; min-height: 60vh; place-items: center; color: var(--app-muted); font-size: 13px; }

.p-swipe-wrap { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.p-swipe { flex: 1 1 auto; min-height: 0; }
/* 注意：vant 4 的 SwipeItem 根类名是 .van-swipe-item（不是 .van-swipe__item），写错会静默失效 */
.p-swipe :deep(.van-swipe__track) { height: 100%; }
.p-swipe :deep(.van-swipe-item) { height: 100%; }
.p-scroll { height: 100%; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 14px 16px 26px; }

.p-qhead { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.p-kind { padding: 2px 8px; border-radius: 6px; background: var(--app-primary-soft); color: var(--app-primary); font-size: 11px; font-weight: 600; }
.p-score { color: var(--app-faint); font-size: 11px; }
.p-passage { margin-bottom: 12px; padding: 11px 12px; border-left: 3px solid var(--app-primary); border-radius: 0 8px 8px 0; background: var(--study-accent-soft); color: var(--study-muted); font-size: 13px; }
.p-content { color: var(--app-text); font-size: var(--q-font); line-height: 1.78; }
.p-opts { display: grid; gap: 9px; margin-top: 15px; }
.p-opt { display: flex; align-items: flex-start; gap: 10px; width: 100%; padding: 12px 13px; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-surface); color: var(--study-text); text-align: left; }
.p-opt-key { flex: 0 0 22px; width: 22px; height: 22px; display: grid; place-items: center; border: 1px solid var(--app-border-strong); border-radius: 50%; color: var(--app-muted); font-size: 12px; font-weight: 600; }
.p-opt-text { min-width: 0; flex: 1; font-size: var(--q-font); line-height: 1.6; }
.p-opt.is-picked { border-color: var(--app-primary); background: var(--app-primary-soft); }
.p-opt.is-picked .p-opt-key { border-color: var(--app-primary); background: var(--app-primary); color: #fff; }
.p-opt.is-right { border-color: #a7d8c8; background: #f3fbf7; }
.p-opt.is-right .p-opt-key { border-color: var(--app-success); background: var(--app-success); color: #fff; }
.p-opt.is-wrong { border-color: #f5b5b5; background: #fef5f5; }
.p-opt.is-wrong .p-opt-key { border-color: var(--app-danger); background: var(--app-danger); color: #fff; }
.p-opt:disabled { opacity: 1; }
.is-recite .p-opt { cursor: default; }
.p-subjective-tip { margin-top: 14px; color: var(--app-faint); font-size: 12px; }

.p-answer { margin-top: 16px; padding: 13px 14px; border-left: 3px solid var(--app-success); border-radius: 0 10px 10px 0; background: #f3fbf7; }
.p-answer-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.p-verdict { padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
.p-verdict.is-right { background: #d1fadf; color: #05603a; }
.p-verdict.is-wrong { background: #fee4e2; color: #b42318; }
.p-verdict.is-miss { background: #f2f4f7; color: var(--app-muted); }
.p-answer-tag { color: var(--app-primary); font-size: 11px; font-weight: 600; }
.p-answer-md { color: #344054; font-size: 13.5px; line-height: 1.75; }
.p-swipe-hint { margin: 22px 0 4px; color: var(--app-faint); font-size: 12px; text-align: center; }

.p-bottombar { flex: 0 0 auto; display: grid; grid-template-columns: 1fr 1.3fr 1fr; gap: 8px; padding: 9px 14px calc(9px + env(safe-area-inset-bottom)); border-top: 1px solid var(--app-border); background: var(--app-surface); }
.p-nav, .p-submit { min-height: 44px; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; }
.p-nav { border: 1px solid var(--app-border-strong); background: var(--app-surface); color: var(--app-text); }
.p-nav:disabled { color: var(--app-faint); opacity: .6; }
.p-nav.is-again { border-color: var(--app-primary); color: var(--app-primary); }
.p-submit { border: 1px solid var(--app-primary); background: var(--app-primary); color: #fff; }

.p-pop { background: var(--app-surface); }
.p-pop-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 16px 10px; border-bottom: 1px solid var(--app-border); }
.p-pop-head strong { color: var(--app-text); font-size: 16px; font-weight: 600; }
.p-tally { color: var(--app-primary); font-size: 12px; font-weight: 600; }
.p-pop-body { max-height: 46vh; overflow-y: auto; padding: 12px 16px 4px; }
.p-card-group + .p-card-group { margin-top: 14px; }
.p-card-group header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.p-card-group header span { color: var(--app-text); font-size: 13px; font-weight: 600; }
.p-card-group header small { color: var(--app-faint); font-size: 11px; }
.p-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 7px; }
.p-cell { min-height: 36px; border: 1px solid var(--app-border-strong); border-radius: 8px; background: var(--app-surface); color: var(--app-text); font-family: inherit; font-size: 13px; font-weight: 600; }
.p-cell.is-picked { border-color: var(--app-primary); background: var(--app-primary-soft); color: var(--app-primary); }
.p-cell.is-current { border-color: var(--app-primary); box-shadow: 0 0 0 2px rgba(37, 99, 235, .18); }
.p-cell.is-right { border-color: #a7d8c8; background: #d1fadf; color: #05603a; }
.p-cell.is-wrong { border-color: #f5b5b5; background: #fee4e2; color: #b42318; }
.p-cell.is-subjective { border-style: dashed; color: var(--app-muted); }
.p-legend { display: flex; flex-wrap: wrap; gap: 12px; padding: 12px 16px 0; color: var(--app-muted); font-size: 11px; }
.p-legend span { display: inline-flex; align-items: center; gap: 5px; }
.p-legend i { width: 11px; height: 11px; border: 1px solid var(--app-border-strong); border-radius: 3px; }
.p-legend .lg-current { border-color: var(--app-primary); box-shadow: 0 0 0 2px rgba(37, 99, 235, .18); }
.p-legend .lg-done { border-color: var(--app-primary); background: var(--app-primary-soft); }
.p-legend .lg-right { border-color: #a7d8c8; background: #d1fadf; }
.p-legend .lg-wrong { border-color: #f5b5b5; background: #fee4e2; }
.p-legend .lg-manual { border-style: dashed; }
.p-pop-foot { padding: 14px 16px calc(16px + env(safe-area-inset-bottom)); }

.p-drawer { display: flex; flex-direction: column; background: var(--app-surface); }
.p-drawer .p-pop-head { padding-top: calc(16px + env(safe-area-inset-top)); }
.p-drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; }
.p-set + .p-set { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--app-border); }
.p-set h3 { margin: 0 0 10px; color: var(--app-text); font-size: 14px; font-weight: 600; }
.p-set.is-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.p-set.is-row h3 { margin-bottom: 3px; }
.p-set.is-row p { margin: 0; color: var(--app-muted); font-size: 12px; }
.p-seg { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.p-seg-item { min-height: 38px; border: 1px solid var(--app-border-strong); border-radius: 9px; background: var(--app-surface); color: var(--app-text); font-family: inherit; font-size: 13px; }
.p-seg-item.on { border-color: var(--app-primary); background: var(--app-primary-soft); color: var(--app-primary); font-weight: 600; }
.p-seg-preview { margin: 12px 0 0; padding: 11px 12px; border-radius: 9px; background: var(--app-surface-subtle); color: var(--study-text); line-height: 1.7; }
.p-drawer-note { margin: 22px 0 0; color: var(--app-faint); font-size: 12px; line-height: 1.7; }
</style>
