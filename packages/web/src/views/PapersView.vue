<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiError } from '@/api/client';
import AppEmptyState from '@/components/common/AppEmptyState.vue';
import { getPaper, listPapers, type PaperDetail, type PaperQuestion, type PaperSummary } from '@/api/papers';
import { createMistake, ERROR_REASON_LABELS, listMistakes } from '@/api/mistakes';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import { renderInlineMarkdown, renderMarkdown } from '@/utils/markdown';
import { answerKeyOf, answerText, buildQuestionGroups, isObjective, numberQuestions, type NumberedQuestion } from '@/utils/paperQuestion';
import {
  answeredCount,
  loadInstant,
  loadMode,
  loadProgress,
  loadSelfScores,
  practiceSummary,
  saveInstant,
  saveMode,
  saveProgress,
  saveSelfScores,
  verdictOf,
  type PaperMode,
  type QuestionVerdict,
  type SelfVerdict,
} from '@/utils/paperPractice';

const route = useRoute();
const router = useRouter();

const papers = ref<PaperSummary[]>([]);
const subjects = ref<SubjectInfo[]>([]);
const detail = ref<PaperDetail | null>(null);
const revealed = ref<Set<number>>(new Set());

// —— 答题模式（与移动端做题页共用 localStorage 键，作答进度可跨端续答）——
const mode = ref<PaperMode>('read');
const picks = ref<Record<number, string>>({});
const submitted = ref(false);
const restored = ref(false); // 本次进入详情是否恢复了历史作答
const confirmKind = ref<'' | 'submit' | 'redo'>(''); // 自绘确认弹窗（PC 端已无 antd）
const instant = ref(false); // 即时判分（选完当场判，不等交卷）
const selfScores = ref<Record<number, SelfVerdict>>({}); // 主观题自评

// —— 错题本联动（交卷后把答错的题批量入本）——
const mistakeOpen = ref(false);
const mistakeSelected = ref<Set<number>>(new Set());
const mistakeReason = ref('CONCEPT');
const mistakeBusy = ref(false);
const mistakeNote = ref('');
const mistakeError = ref('');
const existingSources = ref<Set<string>>(new Set());
const error = ref('');
const busy = ref(false);
const detailBusy = ref(false);
const filter = ref({ subject: 'ALL', year: 'ALL', complete: 'ALL', keyword: '' });
const fabRef = ref<HTMLElement | null>(null);
const fabHover = ref(false); // 指针悬停在悬浮区上
const fabPinned = ref(false); // 触屏 / 键盘点击展开时置位（鼠标场景靠悬停）
const fabOpen = computed(() => fabHover.value || fabPinned.value);
const activeIndex = ref(0); // 详情页当前题位置（滚动联动）
let fabLeaveTimer: number | undefined;
let queryTimer: number | undefined;
let persistTimer: number | undefined;
let scrollRaf = 0;
let syncingFromRoute = false;

const SOURCE_LABELS: Record<PaperSummary['source_type'], string> = {
  OFFICIAL: '官方原卷',
  VERIFIED_RECALL: '多源核验回忆版',
  SINGLE_SOURCE_RECALL: '单源回忆版',
  USER_PROVIDED: '自行录入',
  SIMULATION: '模拟题',
  UNVERIFIED: '来源待核验',
};

const COMPLETE_OPTIONS = [
  { value: 'ALL', label: '全部' },
  { value: 'FULL', label: '题量完整' },
  { value: 'PARTIAL', label: '内容不全' },
];

const isDetailRoute = computed(() => Boolean(route.params.paperId));

// workbuddy.cn 品牌色系：数学=薄荷绿、英语=辅助紫、政治=暖橙
function paperColor(name: string): string {
  if (/高等数学|高数|数学/.test(name)) return '#28B894';
  if (/英语/.test(name)) return '#6C4DFF';
  if (/政治/.test(name)) return '#F97316';
  return subjects.value.find((item) => item.name === name)?.color ?? '#858699';
}

// 库里科目名是「高等数学（一）」，展示层统一为「高等数学一」
function subjectLabel(name: string): string {
  return name.replace('高等数学（一）', '高等数学一');
}

function normalizeTitle(title: string): string {
  return title.replace('高等数学（一）', '高等数学一');
}

function subjectOrder(name: string): number {
  const index = subjects.value.findIndex((item) => item.name === name);
  return index === -1 ? 99 : index;
}

const yearOptions = computed(() => [...new Set(papers.value.map((paper) => paper.year))].sort((a, b) => b - a));

const totalQuestions = computed(() => papers.value.reduce((sum, paper) => sum + paper.question_count, 0));

const completeCount = computed(() => papers.value.filter((paper) => paper.is_complete).length);

const yearRange = computed(() => {
  const years = yearOptions.value;
  if (!years.length) return '—';
  return `${years[years.length - 1]}–${years[0]}`;
});

const filteredPapers = computed(() => {
  const keyword = filter.value.keyword.trim().toLowerCase();
  return papers.value.filter((paper) => {
    if (filter.value.subject !== 'ALL' && paper.subject !== filter.value.subject) return false;
    if (filter.value.year !== 'ALL' && String(paper.year) !== filter.value.year) return false;
    if (filter.value.complete === 'FULL' && !paper.is_complete) return false;
    if (filter.value.complete === 'PARTIAL' && paper.is_complete) return false;
    if (keyword && !`${paper.title} ${paper.subject} ${paper.year}`.toLowerCase().includes(keyword)) return false;
    return true;
  });
});

const hasFilter = computed(
  () =>
    filter.value.subject !== 'ALL' ||
    filter.value.year !== 'ALL' ||
    filter.value.complete !== 'ALL' ||
    filter.value.keyword.trim() !== '',
);

const isAllComplete = computed(() => {
  const list = filteredPapers.value;
  return list.length > 0 && list.every((paper) => paper.is_complete);
});

// 按科目分组，组内年份倒序；筛选了某一科时自然只剩一组
const groupedPapers = computed(() => {
  const map = new Map<string, PaperSummary[]>();
  for (const paper of filteredPapers.value) {
    const list = map.get(paper.subject);
    if (list) list.push(paper);
    else map.set(paper.subject, [paper]);
  }
  return [...map.entries()]
    .sort((a, b) => subjectOrder(a[0]) - subjectOrder(b[0]))
    .map(([subject, list]) => {
      const years = list.map((item) => item.year);
      return {
        subject,
        label: subjectLabel(subject),
        color: paperColor(subject),
        count: list.length,
        span: years.length > 1 ? `${Math.min(...years)}–${Math.max(...years)}` : String(years[0]),
        questions: list.reduce((sum, item) => sum + item.question_count, 0),
        papers: [...list].sort((a, b) => b.year - a.year),
      };
    });
});

// —— 悬浮切换器：科目 + 该科目下的历年试卷 ——
// 详情页以试卷自身的科目为准，列表页以当前筛选为准
const activeSubject = computed(() => {
  if (isDetailRoute.value) return detail.value?.subject ?? 'ALL';
  return filter.value.subject;
});

const activeSubjectLabel = computed(() => (activeSubject.value === 'ALL' ? '全部真题' : subjectLabel(activeSubject.value)));

const subjectOptions = computed(() => {
  const counts = new Map<string, number>();
  for (const paper of papers.value) counts.set(paper.subject, (counts.get(paper.subject) ?? 0) + 1);
  const names = [...counts.keys()].sort((a, b) => subjectOrder(a) - subjectOrder(b));
  return [
    { value: 'ALL', label: '全部', color: '#858699', count: papers.value.length },
    ...names.map((name) => ({ value: name, label: subjectLabel(name), color: paperColor(name), count: counts.get(name) ?? 0 })),
  ];
});

const subjectPapers = computed(() => {
  const subject = activeSubject.value;
  if (subject === 'ALL') return [];
  return papers.value.filter((paper) => paper.subject === subject).sort((a, b) => b.year - a.year);
});

// 「全部」状态下给每个科目的最新一套卷，避免面板只有科目行
const latestPapers = computed(() => {
  const newest = new Map<string, PaperSummary>();
  for (const paper of papers.value) {
    const current = newest.get(paper.subject);
    if (!current || paper.year > current.year) newest.set(paper.subject, paper);
  }
  return [...newest.values()].sort((a, b) => subjectOrder(a.subject) - subjectOrder(b.subject));
});

const detailScore = computed(() => detail.value?.questions.reduce((sum, q) => sum + q.score, 0) ?? 0);

const numberedQuestions = computed(() => (detail.value ? numberQuestions(detail.value.questions) : []));

// 详情目录：按真实考试板块分组（选择 / 填空 / 解答 / 阅读 / 写作…）
const questionGroups = computed(() =>
  detail.value ? buildQuestionGroups(detail.value.subject, numberedQuestions.value) : [],
);

const objectiveCount = computed(() => detail.value?.questions.filter((q) => isObjective(q)).length ?? 0);

const allRevealed = computed(
  () => Boolean(detail.value?.questions.length) && detail.value!.questions.every((q) => revealed.value.has(q.id)),
);

function resetFilter() {
  filter.value = { subject: 'ALL', year: 'ALL', complete: 'ALL', keyword: '' };
}

// 答案解析统一放在 utils/paperQuestion.ts，与移动端做题页共用同一套判定
function toggleAnswer(id: number) {
  const next = new Set(revealed.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  revealed.value = next;
}

function toggleAll() {
  if (!detail.value) return;
  revealed.value = allRevealed.value ? new Set() : new Set(detail.value.questions.map((q) => q.id));
}

/* ==================== 答题模式（阅读模式行为完全不变） ==================== */

// 列表页不挂 is-practice，避免样式泄漏
const isPractice = computed(() => mode.value === 'practice' && Boolean(detail.value));

const answered = computed(() => (detail.value ? answeredCount(detail.value.questions, picks.value) : 0));

const summary = computed(() => (detail.value ? practiceSummary(detail.value.questions, picks.value) : null));

/** 某题是否已判分：交卷后全部判定；开了即时判分时，已作答的题当场判定 */
function isGraded(question: PaperQuestion): boolean {
  return submitted.value || (instant.value && Boolean(picks.value[question.id]));
}

// 逐题状态预计算：模板里不重复调用 verdictOf（目录 + 题目流会翻倍）
const verdictMap = computed<Record<number, QuestionVerdict>>(() => {
  const map: Record<number, QuestionVerdict> = {};
  if (!detail.value) return map;
  for (const question of detail.value.questions) {
    map[question.id] = verdictOf(question, picks.value, isGraded(question));
  }
  return map;
});

const progressPercent = computed(() => {
  if (!detail.value) return 0;
  if (isPractice.value) return objectiveCount.value ? (answered.value / objectiveCount.value) * 100 : 0;
  return detail.value.questions.length ? (revealed.value.size / detail.value.questions.length) * 100 : 0;
});

const VERDICT_LABELS: Record<QuestionVerdict, string> = {
  idle: '未作答',
  picked: '已作答',
  right: '答对',
  wrong: '答错',
  subjective: '主观题',
};

/** 题头徽标文案：主观题的判定被自评覆盖 */
function verdictLabel(id: number): string {
  const verdict = verdictMap.value[id] ?? 'idle';
  if (verdict === 'subjective') {
    const self = selfScores.value[id];
    if (self === 'right') return '自评答对';
    if (self === 'wrong') return '自评答错';
    return VERDICT_LABELS.subjective;
  }
  return VERDICT_LABELS[verdict];
}

/** 题头徽标配色 */
function verdictClass(id: number): string {
  const verdict = verdictMap.value[id] ?? 'idle';
  if (verdict === 'subjective') {
    const self = selfScores.value[id];
    if (self) return `is-${self}`;
  }
  return `is-${verdict}`;
}

/** 需要进错题本的题：客观题答错 + 主观题自评答错 */
const wrongList = computed<NumberedQuestion[]>(() => {
  if (!detail.value) return [];
  return numberedQuestions.value.filter((item) => {
    const verdict = verdictMap.value[item.question.id];
    if (verdict === 'wrong') return true;
    return verdict === 'subjective' && selfScores.value[item.question.id] === 'wrong';
  });
});

/** 错题本的 source 既用于展示也用于去重，务必稳定 */
function mistakeSource(item: NumberedQuestion): string {
  if (!detail.value) return '';
  return `${detail.value.year} ${subjectLabel(detail.value.subject)}真题 第 ${item.number} 题`;
}

const mistakePending = computed(
  () =>
    wrongList.value.filter(
      (item) => mistakeSelected.value.has(item.question.id) && !existingSources.value.has(mistakeSource(item)),
    ).length,
);

const mistakeDuplicated = computed(
  () =>
    wrongList.value.filter(
      (item) => mistakeSelected.value.has(item.question.id) && existingSources.value.has(mistakeSource(item)),
    ).length,
);

const allMistakesPicked = computed(
  () => wrongList.value.length > 0 && mistakeSelected.value.size === wrongList.value.length,
);

/** 目录状态格：阅读模式一律 idle，不参与着色 */
function tocStateOf(questionId: number): QuestionVerdict {
  return isPractice.value ? (verdictMap.value[questionId] ?? 'idle') : 'idle';
}

/** 选项状态：阅读模式只表达"这是正确答案（已展开）"；答题模式表达"选了啥 / 对不对" */
function optionClass(question: PaperQuestion, key: string): Record<string, boolean> {
  if (!isPractice.value) {
    return { 'is-answer': revealed.value.has(question.id) && answerKeyOf(question) === key };
  }
  const picked = picks.value[question.id] === key;
  const correct = answerKeyOf(question) === key;
  const objective = isObjective(question);
  if (!isGraded(question)) return { 'is-choice': true, 'is-picked': picked };
  return {
    'is-choice': true,
    'is-picked': picked,
    'is-right': objective && picked && correct,
    'is-wrong': objective && picked && !correct,
    'is-answer': objective && correct,
  };
}

function activePaperId(): number | null {
  const id = Number(route.params.paperId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function persist() {
  const id = activePaperId();
  if (id === null) return;
  saveProgress(id, { picks: picks.value, index: activeIndex.value, submitted: submitted.value });
}

function onOptionClick(question: PaperQuestion, key: string) {
  if (!isPractice.value || submitted.value) return;
  const next = { ...picks.value };
  if (next[question.id] === key) delete next[question.id]; // 再点同项 = 取消
  else next[question.id] = key;
  picks.value = next;
  persist();
}

function setMode(next: PaperMode) {
  mode.value = next;
  saveMode(next);
  const id = activePaperId();
  if (id === null) return;
  const query = { ...route.query };
  if (next === 'practice') query.mode = 'practice';
  else delete query.mode;
  void router.replace({ name: 'paper-detail', params: { paperId: String(id) }, query });
}

function jumpToFirstUnanswered() {
  const target = numberedQuestions.value.find((item) => isObjective(item.question) && !picks.value[item.question.id]);
  if (target) scrollToQuestion(target.position);
}

function askSubmit() {
  if (!detail.value || submitted.value) return;
  confirmKind.value = 'submit';
}

function askRedo() {
  if (!detail.value) return;
  confirmKind.value = 'redo';
}

function closeConfirm() {
  confirmKind.value = '';
}

function confirmAction() {
  const kind = confirmKind.value;
  confirmKind.value = '';
  if (kind === 'submit') {
    submitted.value = true;
    persist();
    return;
  }
  if (kind === 'redo') {
    picks.value = {};
    submitted.value = false;
    restored.value = false;
    persist();
    activeIndex.value = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

const confirmTitle = computed(() => (confirmKind.value === 'redo' ? '重做本卷？' : '确认交卷？'));
const confirmOK = computed(() => (confirmKind.value === 'redo' ? '重做' : '交卷'));
const confirmCancel = computed(() => (confirmKind.value === 'redo' ? '取消' : '再检查下'));
const confirmText = computed(() => {
  if (confirmKind.value === 'redo') return '将清空本卷的全部作答，重新从第一题开始。';
  const missing = summary.value?.unanswered ?? 0;
  return missing > 0
    ? `还有 ${missing} 道选择题没有作答，交卷后选项不能再修改。`
    : '选择题已全部作答，交卷后选项不能再修改。';
});

function toggleInstant() {
  instant.value = !instant.value;
  saveInstant(instant.value);
}

/** 主观题自评：再点同项 = 取消自评 */
function setSelfScore(question: PaperQuestion, value: SelfVerdict) {
  const next = { ...selfScores.value };
  if (next[question.id] === value) delete next[question.id];
  else next[question.id] = value;
  selfScores.value = next;
  const id = activePaperId();
  if (id !== null) saveSelfScores(id, next);
}

/* ---------- 错题本联动（半自动：先勾选、再批量入本） ---------- */

async function openMistakeDialog() {
  if (!wrongList.value.length) return;
  mistakeOpen.value = true;
  mistakeNote.value = '';
  mistakeError.value = '';
  mistakeSelected.value = new Set(wrongList.value.map((item) => item.question.id));
  try {
    // 用 source 去重，避免同一道题反复入本把 mastery_level 复习曲线灌脏
    const all = await listMistakes();
    existingSources.value = new Set(all.map((item) => item.source ?? '').filter(Boolean));
  } catch (cause) {
    existingSources.value = new Set();
    mistakeError.value = apiError(cause);
  }
}

function closeMistakeDialog() {
  mistakeOpen.value = false;
  mistakeBusy.value = false;
}

function toggleMistakePick(id: number) {
  const next = new Set(mistakeSelected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  mistakeSelected.value = next;
}

function toggleAllMistakes() {
  mistakeSelected.value = allMistakesPicked.value
    ? new Set()
    : new Set(wrongList.value.map((item) => item.question.id));
}

/** 弹窗列表里的题干摘要 */
function excerpt(content: string): string {
  const text = (content ?? '').replace(/\s+/g, ' ').trim();
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

async function submitMistakes() {
  const current = detail.value;
  if (!current || mistakeBusy.value) return;
  const targets = wrongList.value.filter(
    (item) => mistakeSelected.value.has(item.question.id) && !existingSources.value.has(mistakeSource(item)),
  );
  if (!targets.length) {
    mistakeNote.value = '所选题目都已经在错题本里了';
    return;
  }
  mistakeBusy.value = true;
  mistakeError.value = '';
  mistakeNote.value = '';
  const subjectId = subjects.value.find((item) => item.name === current.subject)?.id;
  let added = 0;
  const failed: string[] = [];
  for (const item of targets) {
    const question = item.question;
    const source = mistakeSource(item);
    try {
      await createMistake({
        title: source,
        content: question.content,
        correct_answer: isObjective(question) ? answerKeyOf(question) : (question.answer ?? '').trim().slice(0, 500),
        user_answer: picks.value[question.id] ?? (selfScores.value[question.id] === 'wrong' ? '未答对（自评）' : ''),
        error_reason: mistakeReason.value,
        subject_id: subjectId,
        source,
      });
      added += 1;
      existingSources.value = new Set([...existingSources.value, source]);
    } catch {
      failed.push(`第 ${item.number} 题`);
    }
  }
  mistakeBusy.value = false;
  if (failed.length) {
    mistakeNote.value = `已加入 ${added} 题，以下 ${failed.length} 题失败：${failed.join('、')}`;
  } else {
    mistakeNote.value = `已加入 ${added} 题到错题本`;
    mistakeSelected.value = new Set();
  }
}

/* ---------- 键盘快捷键（PC 特有，移动端无） ---------- */

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** 字母 / 数字 → 选项字母 */
function shortcutLetter(key: string): string {
  if (key.length !== 1) return '';
  const upper = key.toUpperCase();
  if (OPTION_LETTERS.includes(upper)) return upper;
  if (/^[1-8]$/.test(key)) return OPTION_LETTERS[Number(key) - 1];
  return '';
}

/** 焦点在输入类控件里时不响应快捷键（按钮不吞字母键，故放行） */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

/** Enter / Space 会触发按钮默认行为，焦点在按钮上时交给浏览器，避免双触发 */
function isButtonTarget(target: EventTarget | null): boolean {
  return (target as HTMLElement | null)?.tagName === 'BUTTON';
}

/** 答题模式快捷键，返回 true 表示已处理 */
function handlePracticeShortcut(event: KeyboardEvent): boolean {
  if (!isPractice.value || confirmKind.value || mistakeOpen.value) return false;
  if (isTypingTarget(event.target)) return false;

  const letter = shortcutLetter(event.key);
  if (letter) {
    // 当前题 = 滚动联动高亮的那一道
    if (submitted.value) return false;
    const item = numberedQuestions.value[activeIndex.value];
    if (!item || !isObjective(item.question)) return false;
    event.preventDefault();
    onOptionClick(item.question, letter);
    return true;
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const total = numberedQuestions.value.length;
    const next = Math.min(Math.max(activeIndex.value + step, 0), total - 1);
    if (next !== activeIndex.value) {
      event.preventDefault();
      scrollToQuestion(next);
    }
    return true;
  }

  if (event.key === 'Enter' && !submitted.value) {
    // 焦点在按钮上时交给按钮自己处理，避免与全局交卷双触发
    if (isButtonTarget(event.target)) return false;
    event.preventDefault();
    askSubmit();
    return true;
  }

  if ((event.key === 'r' || event.key === 'R') && submitted.value) {
    event.preventDefault();
    askRedo();
    return true;
  }

  return false;
}

/** Space 展开 / 收起当前题答案（仅阅读模式；答题模式判分前不展示答案） */
function handleAnswerShortcut(event: KeyboardEvent): boolean {
  if (event.key !== ' ' && event.key !== 'Spacebar') return false;
  if (confirmKind.value || mistakeOpen.value) return false;
  if (isTypingTarget(event.target) || isButtonTarget(event.target)) return false;
  if (isPractice.value) return false;
  const item = numberedQuestions.value[activeIndex.value];
  if (!item) return false;
  event.preventDefault();
  toggleAnswer(item.question.id);
  return true;
}

function openPaper(id: number) {
  router.push({ name: 'paper-detail', params: { paperId: String(id) } });
}

function backToList() {
  closeFab();
  router.push({ name: 'papers', query: filterQuery() });
}

// —— 当前题定位：点击目录跳转 + 滚动联动高亮 ——
function scrollToQuestion(position: number) {
  const el = document.getElementById(`q-anchor-${position}`);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 136;
  window.scrollTo({ top, behavior: 'smooth' });
  activeIndex.value = position; // 立刻反馈，不等滚动结束
}

/**
 * 滚动联动：取「顶部已越过判定线」的最后一题作为当前题。
 * 用判定线而不是 IntersectionObserver —— 后者的回调只带本批变化的元素，
 * 平滑滚动时容易把当前题判成下一题（实测会 15→16 跳一格）。
 * 不额外做「滚到底强选最后一题」：那会让被点中的题在页尾被抢走高亮。
 */
function updateActiveByScroll() {
  const cards = document.querySelectorAll<HTMLElement>('.papers-page .question-card');
  if (!cards.length) return;
  const line = 190;
  let current = Number(cards[0].dataset.position ?? 0);
  for (const card of cards) {
    if (card.getBoundingClientRect().top <= line) current = Number(card.dataset.position ?? 0);
  }
  activeIndex.value = current;
}

/**
 * 深链定位：/papers/12?no=37 → 直接滚到原卷第 37 题（必背考点页的「在真题页查看」用）。
 * 参数名用 no 而不是 q —— q 已被列表页的关键词筛选占用。
 */
function jumpToQueryQuestion() {
  const raw = route.query.no;
  const target = typeof raw === 'string' ? Number(raw) : Number.NaN;
  if (!Number.isInteger(target) || target < 1) return;
  const item = numberedQuestions.value.find((entry) => entry.number === target);
  if (!item) return;
  void nextTick(() => scrollToQuestion(item.position));
}

function onWindowScroll() {
  if (scrollRaf) return;
  scrollRaf = window.requestAnimationFrame(() => {
    scrollRaf = 0;
    updateActiveByScroll();
  });
}

function bindScrollSpy() {
  unbindScrollSpy();
  window.addEventListener('scroll', onWindowScroll, { passive: true });
  updateActiveByScroll();
}

function unbindScrollSpy() {
  window.removeEventListener('scroll', onWindowScroll);
  if (scrollRaf) {
    window.cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
  }
}

// 切换科目：列表页就地筛选并保持面板展开（可接着挑年份），详情页退回列表
function switchSubject(value: string) {
  if (isDetailRoute.value) {
    closeFab();
    void router.push({ name: 'papers', query: value === 'ALL' ? {} : { subject: value } });
    return;
  }
  filter.value.subject = value;
  // 年份筛选可能与新科目冲突（该科目没有这一年），冲突时退回全部年份
  if (
    filter.value.year !== 'ALL' &&
    !papers.value.some((paper) => paper.subject === value && String(paper.year) === filter.value.year)
  ) {
    filter.value.year = 'ALL';
  }
  void router.replace({ name: 'papers', query: filterQuery() });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToPaper(id: number) {
  closeFab();
  openPaper(id);
}

// —— 悬浮切换器：指针移上去即展开，移开自动收起 ——
// 收起留 140ms 缓冲，避免指针在按钮与面板之间移动时闪一下
const FAB_CLOSE_DELAY = 140;

function clearFabTimer() {
  if (fabLeaveTimer !== undefined) {
    window.clearTimeout(fabLeaveTimer);
    fabLeaveTimer = undefined;
  }
}

function onFabPointerEnter(event: PointerEvent) {
  // 只认鼠标指针：触摸 / 触控笔不触发悬停展开，避免触屏误开
  if (event.pointerType && event.pointerType !== 'mouse') return;
  clearFabTimer();
  fabHover.value = true;
}

function onFabPointerLeave() {
  clearFabTimer();
  fabLeaveTimer = window.setTimeout(() => {
    fabHover.value = false;
    fabLeaveTimer = undefined;
  }, FAB_CLOSE_DELAY);
}

function toggleFab() {
  // 鼠标场景下点击必然先经过悬停（面板已经开着了），所以点击的语义是"收起来"；
  // 触屏 / 键盘没有悬停，点击的语义是"展开"。两者用同一个判断即可。
  if (fabOpen.value) {
    closeFab();
    return;
  }
  fabPinned.value = true;
}

function closeFab() {
  clearFabTimer();
  fabHover.value = false;
  fabPinned.value = false;
}

// 筛选条件全量写入 URL，刷新 / 收藏 / 分享都能保持同一视图
function filterQuery(): Record<string, string> {
  const query: Record<string, string> = {};
  if (filter.value.subject !== 'ALL') query.subject = filter.value.subject;
  if (filter.value.year !== 'ALL') query.year = filter.value.year;
  if (filter.value.complete !== 'ALL') query.complete = filter.value.complete;
  const keyword = filter.value.keyword.trim();
  if (keyword) query.q = keyword;
  return query;
}

function applyQuery() {
  const query = route.query;
  const subject = typeof query.subject === 'string' ? query.subject : '';
  filter.value.subject = subject && papers.value.some((paper) => paper.subject === subject) ? subject : 'ALL';

  const year = typeof query.year === 'string' ? query.year : '';
  filter.value.year = year && yearOptions.value.some((value) => String(value) === year) ? year : 'ALL';

  const complete = typeof query.complete === 'string' ? query.complete : '';
  filter.value.complete = complete === 'FULL' || complete === 'PARTIAL' ? complete : 'ALL';

  filter.value.keyword = typeof query.q === 'string' ? query.q : '';

  // 模式：URL 显式指定优先（?mode=practice 可分享 / 可刷新），否则沿用上次选择
  if (isDetailRoute.value) {
    const modeQuery = typeof query.mode === 'string' ? query.mode : '';
    mode.value = modeQuery ? (modeQuery === 'practice' ? 'practice' : 'read') : loadMode();
  }
}

function onDocPointerDown(event: PointerEvent) {
  if (!fabOpen.value) return;
  const root = fabRef.value;
  if (root && !root.contains(event.target as Node)) closeFab();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    // 弹窗优先于悬浮切换器
    if (mistakeOpen.value) {
      closeMistakeDialog();
      return;
    }
    if (confirmKind.value) {
      closeConfirm();
      return;
    }
    closeFab();
    return;
  }
  if (handleAnswerShortcut(event)) return;
  handlePracticeShortcut(event);
}

async function loadList() {
  error.value = '';
  busy.value = true;
  try {
    const [subjectList, paperList] = await Promise.all([listSubjects(), listPapers()]);
    subjects.value = subjectList;
    papers.value = paperList;
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

async function loadDetail(id: number) {
  error.value = '';
  detailBusy.value = true;
  activeIndex.value = 0;
  try {
    detail.value = await getPaper(id);
    revealed.value = new Set();
    // 恢复该卷的作答进度（键与移动端做题页一致，故手机上答过一半这里能接着答）
    const saved = loadProgress(id);
    picks.value = saved.picks;
    submitted.value = saved.submitted;
    selfScores.value = loadSelfScores(id);
    instant.value = loadInstant();
    restored.value = saved.submitted || Object.keys(saved.picks).length > 0;
    await nextTick();
    bindScrollSpy();
    jumpToQueryQuestion();
  } catch (cause) {
    error.value = apiError(cause);
    detail.value = null;
  } finally {
    detailBusy.value = false;
  }
}

function syncFromRoute() {
  const raw = route.params.paperId;
  if (!raw) {
    detail.value = null;
    unbindScrollSpy();
    return;
  }
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    error.value = '试卷编号无效。';
    detail.value = null;
    return;
  }
  void loadDetail(id);
}

onMounted(async () => {
  document.addEventListener('pointerdown', onDocPointerDown);
  document.addEventListener('keydown', onKeydown);
  await loadList();
  applyQuery();
  syncFromRoute();
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown);
  document.removeEventListener('keydown', onKeydown);
  clearFabTimer();
  if (queryTimer !== undefined) window.clearTimeout(queryTimer);
  if (persistTimer !== undefined) window.clearTimeout(persistTimer);
  unbindScrollSpy();
});

watch(
  () => route.params.paperId,
  () => {
    closeFab();
    syncFromRoute();
  },
);

// 路由是唯一真源：query 变了就回灌筛选，筛选变了（防抖后）再写回 query
watch(
  () => route.query,
  () => {
    syncingFromRoute = true;
    applyQuery();
    void nextTick(() => {
      syncingFromRoute = false;
    });
  },
);

// 深链定位：?no= 变化时重新定位（首次进入由 loadDetail 负责，避免重复滚动）
watch(
  () => route.query.no,
  () => {
    if (!detail.value) return;
    void nextTick(jumpToQueryQuestion);
  },
);

watch(
  filter,
  () => {
    if (syncingFromRoute || isDetailRoute.value) return;
    if (queryTimer !== undefined) window.clearTimeout(queryTimer);
    queryTimer = window.setTimeout(() => {
      queryTimer = undefined;
      void router.replace({ name: 'papers', query: filterQuery() });
    }, 260);
  },
  { deep: true },
);

// 浏览位置随作答一起持久化（防抖：滚动时不做高频写盘）
watch(activeIndex, () => {
  if (!isPractice.value) return;
  if (persistTimer !== undefined) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = undefined;
    persist();
  }, 400);
});
</script>

<template>
  <section class="page papers-page" :class="{ 'is-practice': isPractice }">
    <template v-if="!isDetailRoute">
      <!-- ① 宽幅 Hero：品牌色渐隐光带 + 大字号标题 + 右侧数据面板 -->
      <header class="wb-hero">
        <span class="wb-hero-glow" aria-hidden="true" />
        <div class="wb-hero-copy">
          <p class="wb-eyebrow"><i aria-hidden="true" />真题工作区</p>
          <h1>历年真题</h1>
          <p class="wb-hero-desc">三科历年真题入库版本，按科目与年份查阅，逐题核对答案。</p>
        </div>
        <dl class="wb-metrics">
          <div><dt>试卷总数</dt><dd>{{ papers.length }}<small>套</small></dd></div>
          <div><dt>题目总数</dt><dd>{{ totalQuestions }}<small>题</small></dd></div>
          <div><dt>覆盖年份</dt><dd class="is-text">{{ yearRange }}</dd></div>
          <div><dt>题量完整</dt><dd>{{ completeCount }}<small>/{{ papers.length || 0 }}</small></dd></div>
        </dl>
      </header>

      <p v-if="error" class="wb-alert">{{ error }}</p>

      <!-- ② 粘性筛选条：科目分段控件 + 关键词 + 年份胶囊 + 完整性 -->
      <div class="wb-toolbar">
        <div class="wb-seg" role="tablist" aria-label="按科目筛选">
          <button
            v-for="option in subjectOptions"
            :key="option.value"
            type="button"
            role="tab"
            class="wb-seg-item"
            :class="{ 'is-active': filter.subject === option.value }"
            :aria-selected="filter.subject === option.value"
            :style="{ '--seg-tone': option.color }"
            @click="switchSubject(option.value)"
          >
            <i aria-hidden="true" />{{ option.label }}<em>{{ option.count }}</em>
          </button>
        </div>

        <div class="wb-toolbar-right">
          <label class="wb-search">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" />
            </svg>
            <input v-model="filter.keyword" type="search" placeholder="搜索试卷名称…" aria-label="搜索试卷名称" />
            <button v-if="filter.keyword" type="button" class="wb-search-clear" aria-label="清空搜索" @click="filter.keyword = ''">×</button>
          </label>
          <button type="button" class="wb-btn" :disabled="!hasFilter" @click="resetFilter">重置</button>
        </div>

        <div class="wb-toolbar-row">
          <div class="wb-years" role="group" aria-label="按年份筛选">
            <button
              type="button"
              class="wb-year"
              :class="{ 'is-active': filter.year === 'ALL' }"
              @click="filter.year = 'ALL'"
            >
              全部年份
            </button>
            <button
              v-for="year in yearOptions"
              :key="year"
              type="button"
              class="wb-year"
              :class="{ 'is-active': filter.year === String(year) }"
              @click="filter.year = String(year)"
            >
              {{ year }}
            </button>
          </div>

          <div class="wb-seg is-compact" role="group" aria-label="按题量完整性筛选">
            <button
              v-for="option in COMPLETE_OPTIONS"
              :key="option.value"
              type="button"
              class="wb-seg-item is-plain"
              :class="{ 'is-active': filter.complete === option.value }"
              @click="filter.complete = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <p class="wb-result">
        命中 <strong>{{ filteredPapers.length }}</strong> 套
        <template v-if="hasFilter"> · 已启用筛选 <a href="#" role="button" @click.prevent="resetFilter">清除</a></template>
      </p>

      <!-- ③ 列表：按科目分组的年份卡阵列 -->
      <div v-if="busy && !papers.length" class="wb-grid-skeleton" aria-hidden="true">
        <span v-for="n in 8" :key="n" />
      </div>
      <AppEmptyState v-else-if="!papers.length" title="真题库还是空的" description="当前没有可查阅的试卷。" />
      <AppEmptyState
        v-else-if="!filteredPapers.length"
        title="没有匹配的试卷"
        description="试着换个科目、年份或关键词，或者直接重置筛选条件。"
      >
        <template #action><button type="button" class="wb-btn is-solid" @click="resetFilter">重置筛选</button></template>
      </AppEmptyState>

      <div v-else class="wb-groups">
        <section v-for="group in groupedPapers" :key="group.subject" class="wb-group" :style="{ '--group-tone': group.color }">
          <header class="wb-group-head">
            <h2><i aria-hidden="true" />{{ group.label }}</h2>
            <p>
              <span>{{ group.count }} 套</span>
              <b aria-hidden="true">·</b>
              <span>{{ group.questions }} 题</span>
              <b aria-hidden="true">·</b>
              <span>{{ group.span }}</span>
            </p>
          </header>
          <div class="wb-cards">
            <button
              v-for="paper in group.papers"
              :key="paper.id"
              type="button"
              class="wb-card"
              @click="openPaper(paper.id)"
            >
              <span class="wb-card-top">
                <strong class="wb-card-year">{{ paper.year }}</strong>
                <span class="wb-card-dot" :class="paper.is_complete ? 'is-ok' : 'is-warn'">
                  {{ paper.is_complete ? '题量完整' : '内容不全' }}
                </span>
              </span>
              <span class="wb-card-title">{{ normalizeTitle(paper.title) }}</span>
              <span class="wb-card-meta">
                <span class="wb-card-count">
                  {{ paper.question_count }}<template v-if="paper.expected_question_count">/{{ paper.expected_question_count }}</template> 题
                </span>
                <span class="wb-card-src">{{ SOURCE_LABELS[paper.source_type] ?? '来源待核验' }}</span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </template>

    <!-- ④ 详情：试卷信息卡 + 粘性目录 + 题目流 -->
    <template v-else>
      <div v-if="detailBusy && !detail" class="wb-detail-skeleton" aria-hidden="true">
        <span class="is-block" v-for="n in 3" :key="n" />
      </div>
      <AppEmptyState v-else-if="!detail" title="试卷打不开" :description="error || '这份试卷可能已不存在。'">
        <template #action><button type="button" class="wb-btn is-solid" @click="backToList">返回试卷列表</button></template>
      </AppEmptyState>

      <template v-else>
        <nav class="wb-crumb" aria-label="面包屑">
          <button type="button" class="wb-back" @click="backToList">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M19 12H5m6 6-6-6 6-6" />
            </svg>
            试卷列表
          </button>
          <span aria-hidden="true">/</span>
          <span>{{ detail.year }} 年 · {{ subjectLabel(detail.subject) }}</span>
        </nav>

        <header class="wb-detail-head" :style="{ '--head-tone': paperColor(detail.subject) }">
          <span class="wb-hero-glow" aria-hidden="true" />
          <div class="wb-hero-copy">
            <p class="wb-eyebrow"><i aria-hidden="true" />{{ detail.year }} · {{ subjectLabel(detail.subject) }}</p>
            <h1>{{ normalizeTitle(detail.title) }}</h1>
            <p class="wb-hero-desc">
              {{ detail.questions.length }} 题 · 共 {{ detailScore }} 分 ·
              {{ detail.is_complete ? '题量完整' : `当前 ${detail.question_count}/${detail.expected_question_count ?? '?'} 题` }}
            </p>
          </div>
          <div class="wb-detail-actions">
            <div class="wb-seg wb-mode-seg" role="tablist" aria-label="查看模式">
              <button
                type="button"
                role="tab"
                class="wb-seg-item"
                :class="{ 'is-active': !isPractice }"
                :aria-selected="!isPractice"
                @click="setMode('read')"
              >
                阅读模式
              </button>
              <button
                type="button"
                role="tab"
                class="wb-seg-item"
                :class="{ 'is-active': isPractice }"
                :aria-selected="isPractice"
                @click="setMode('practice')"
              >
                答题模式
              </button>
            </div>
            <button type="button" class="wb-btn" @click="backToList">返回列表</button>
            <button v-if="!isPractice" type="button" class="wb-btn is-solid" @click="toggleAll">
              {{ allRevealed ? '全部收起答案' : '全部展开答案' }}
            </button>
          </div>
        </header>

        <section class="wb-source">
          <div class="wb-source-grid">
            <div>
              <span class="wb-source-k">真实性</span>
              <span class="wb-source-v">{{ SOURCE_LABELS[detail.source_type] ?? '来源待核验' }}</span>
            </div>
            <div>
              <span class="wb-source-k">完整性</span>
              <span class="wb-source-v">{{ detail.is_complete ? '题量完整，可直接练时间分配' : '内容不全，仅用于考点参考' }}</span>
            </div>
            <div>
              <span class="wb-source-k">来源</span>
              <span class="wb-source-v">
                <a v-if="detail.source_url" :href="detail.source_url" target="_blank" rel="noreferrer">{{ detail.source || '打开原始资料' }}</a>
                <template v-else>{{ detail.source || '未保留来源链接' }}</template>
              </span>
            </div>
          </div>
          <details v-if="detail.verification_notes" class="wb-verify">
            <summary>核验说明 · 数据来源与处理流程</summary>
            <p>{{ detail.verification_notes }}</p>
          </details>
        </section>

        <!-- 答题模式工具条：作答统计 / 即时判分 / 交卷 / 结果 / 错题本 -->
        <section v-if="isPractice && summary" class="wb-practice-bar" aria-live="polite">
          <div class="wb-practice-facts">
            <template v-if="submitted">
              <span class="wb-practice-k">客观题得分</span>
              <b class="wb-practice-v">{{ summary.scored }}<em>/ {{ summary.scoredFull }} 分</em></b>
              <span class="wb-practice-sub">答对 {{ summary.right }} / {{ summary.objectiveCount }} 题</span>
              <span v-if="summary.subjectiveCount" class="wb-practice-sub">
                · 主观题 {{ summary.subjectiveCount }} 题请对照参考答案自评
              </span>
            </template>
            <template v-else-if="instant">
              <span class="wb-practice-k">即时判分</span>
              <b class="wb-practice-v">{{ summary.scored }}<em>/ {{ summary.scoredFull }} 分</em></b>
              <span class="wb-practice-sub">答对 {{ summary.right }} / {{ summary.objectiveCount }} 题</span>
              <button v-if="summary.unanswered" type="button" class="wb-practice-warn" @click="jumpToFirstUnanswered">
                还有 {{ summary.unanswered }} 道未作答 · 跳到第一题
              </button>
            </template>
            <template v-else>
              <span class="wb-practice-k">已作答</span>
              <b class="wb-practice-v">{{ summary.answeredObjective }}<em>/ {{ summary.objectiveCount }}</em></b>
              <button
                v-if="summary.unanswered"
                type="button"
                class="wb-practice-warn"
                @click="jumpToFirstUnanswered"
              >
                还有 {{ summary.unanswered }} 道选择题未作答 · 跳到第一题
              </button>
              <span v-else class="wb-practice-ok">选择题已全部作答，可以交卷</span>
            </template>
          </div>
          <div class="wb-practice-actions">
            <span v-if="restored && !submitted" class="wb-practice-restore">已恢复上次作答</span>
            <button
              v-if="!submitted"
              type="button"
              class="wb-practice-toggle"
              :class="{ 'is-on': instant }"
              :aria-pressed="instant"
              title="开启后每选一题立即判对错，不必等到交卷"
              @click="toggleInstant"
            >
              即时判分
            </button>
            <button v-if="submitted && wrongList.length" type="button" class="wb-btn" @click="openMistakeDialog">
              加入错题本（{{ wrongList.length }} 题）
            </button>
            <button v-if="!submitted" type="button" class="wb-btn is-primary" @click="askSubmit">交卷并判分</button>
            <button v-else type="button" class="wb-btn" @click="askRedo">重做本卷</button>
          </div>
        </section>

        <div class="wb-detail-body">
          <!-- 粘性目录：按真实考试板块分组，点击跳题、滚动联动 -->
          <aside class="wb-aside" aria-label="试卷目录">
            <div class="wb-aside-card">
              <p class="wb-aside-title">试卷概况</p>
              <ul class="wb-aside-facts">
                <li><span>题量</span><b>{{ detail.questions.length }} 题</b></li>
                <li><span>总分</span><b>{{ detailScore }} 分</b></li>
                <li><span>客观题</span><b>{{ objectiveCount }} 题</b></li>
                <li v-if="isPractice"><span>已作答</span><b>{{ answered }} / {{ objectiveCount }}</b></li>
                <li v-else><span>已展开</span><b>{{ revealed.size }} / {{ detail.questions.length }}</b></li>
              </ul>
              <div class="wb-aside-track" aria-hidden="true">
                <i :style="{ width: `${progressPercent}%` }" />
              </div>
            </div>

            <nav class="wb-aside-card wb-toc" aria-label="题型导航">
              <p class="wb-aside-title">题型导航</p>
              <section v-for="group in questionGroups" :key="group.label" class="wb-toc-group">
                <p class="wb-toc-label">{{ group.label }}<em>{{ group.items.length }}</em></p>
                <div class="wb-toc-nums">
                  <button
                    v-for="item in group.items"
                    :key="item.question.id"
                    type="button"
                    class="wb-toc-num"
                    :class="{
                      'is-active': activeIndex === item.position,
                      'is-open': !isPractice && revealed.has(item.question.id),
                      'is-picked': tocStateOf(item.question.id) === 'picked',
                      'is-right': tocStateOf(item.question.id) === 'right',
                      'is-wrong': tocStateOf(item.question.id) === 'wrong',
                      'is-subjective': tocStateOf(item.question.id) === 'subjective',
                    }"
                    :title="`第 ${item.number} 题`"
                    @click="scrollToQuestion(item.position)"
                  >
                    {{ item.number }}
                  </button>
                </div>
              </section>
            </nav>
          </aside>

          <div class="wb-questions">
            <article
              v-for="(question, index) in detail.questions"
              :id="`q-anchor-${index}`"
              :key="question.id"
              :data-position="index"
              class="question-card"
              :class="{ 'is-current': activeIndex === index, 'is-graded': isPractice && submitted }"
            >
              <header class="q-head">
                <span class="q-no">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="q-score">{{ question.score }} 分</span>
                <span v-if="isObjective(question)" class="q-tag">客观题</span>
                <span
                  v-if="isPractice && (submitted || Boolean(picks[question.id]))"
                  class="q-verdict"
                  :class="verdictClass(question.id)"
                >
                  {{ verdictLabel(question.id) }}
                </span>
              </header>
              <div v-if="question.passage" class="q-passage md" v-html="renderMarkdown(question.passage)" />
              <div class="q-content md" v-html="renderMarkdown(question.content)" />
              <div v-if="question.options" class="q-options">
                <component
                  :is="isPractice ? 'button' : 'div'"
                  v-for="option in question.options"
                  :key="option.key"
                  class="q-option"
                  :class="optionClass(question, option.key)"
                  :type="isPractice ? 'button' : undefined"
                  :aria-pressed="isPractice ? picks[question.id] === option.key : undefined"
                  :aria-disabled="isPractice && submitted ? 'true' : undefined"
                  @click="isPractice ? onOptionClick(question, option.key) : undefined"
                >
                  <b>{{ option.key }}</b><span v-html="renderInlineMarkdown(option.text)" />
                </component>
              </div>
              <div v-if="!isPractice" class="q-foot">
                <button class="q-toggle" type="button" :aria-expanded="revealed.has(question.id)" @click="toggleAnswer(question.id)">
                  {{ revealed.has(question.id) ? '收起答案' : '查看答案' }}
                </button>
              </div>
              <div
                v-if="isPractice ? submitted : revealed.has(question.id)"
                class="q-answer md"
                v-html="renderMarkdown(answerText(question))"
              />
              <!-- 主观题没有机器判分，交卷后由用户对照参考答案自评 -->
              <div v-if="isPractice && submitted && !isObjective(question)" class="q-self">
                <span class="q-self-k">对照参考答案自评</span>
                <button
                  type="button"
                  class="q-self-btn"
                  :class="{ 'is-on': selfScores[question.id] === 'right' }"
                  :aria-pressed="selfScores[question.id] === 'right'"
                  @click="setSelfScore(question, 'right')"
                >
                  我答对了
                </button>
                <button
                  type="button"
                  class="q-self-btn is-wrong"
                  :class="{ 'is-on': selfScores[question.id] === 'wrong' }"
                  :aria-pressed="selfScores[question.id] === 'wrong'"
                  @click="setSelfScore(question, 'wrong')"
                >
                  我答错了
                </button>
                <span v-if="selfScores[question.id] === 'wrong'" class="q-self-hint">会计入「加入错题本」清单</span>
              </div>
            </article>
            <AppEmptyState v-if="!detail.questions.length" title="这份试卷还没有题目" description="题目录入在移动端「历年真题」页完成。" />
          </div>
        </div>
      </template>
    </template>

    <!-- ⑤ 悬浮切换器：悬停展开、玻璃拟态 -->
    <div ref="fabRef" class="subject-fab" @pointerenter="onFabPointerEnter" @pointerleave="onFabPointerLeave">
      <Transition name="fab-pop">
        <div v-if="fabOpen" class="fab-panel" role="dialog" aria-label="切换科目与历年真题">
          <section class="fab-group">
            <p class="fab-group-title">切换科目</p>
            <button
              v-for="option in subjectOptions"
              :key="option.value"
              type="button"
              class="fab-item"
              :class="{ 'is-active': activeSubject === option.value }"
              @click="switchSubject(option.value)"
            >
              <i class="fab-dot" :style="{ background: option.color }" />
              <span class="fab-item-label">{{ option.label }}</span>
              <span class="fab-item-count">{{ option.count }} 套</span>
            </button>
          </section>

          <section v-if="subjectPapers.length" class="fab-group">
            <p class="fab-group-title">切换试卷 · {{ subjectLabel(activeSubject) }}</p>
            <div class="fab-papers">
              <button
                v-for="paper in subjectPapers"
                :key="paper.id"
                type="button"
                class="fab-paper"
                :class="{ 'is-active': String(paper.id) === String(route.params.paperId) }"
                @click="goToPaper(paper.id)"
              >
                <strong>{{ paper.year }}</strong>
                <span>{{ paper.question_count }} 题</span>
              </button>
            </div>
          </section>

          <section v-else-if="latestPapers.length" class="fab-group">
            <p class="fab-group-title">最新试卷</p>
            <div class="fab-papers">
              <button
                v-for="paper in latestPapers"
                :key="paper.id"
                type="button"
                class="fab-paper"
                :class="{ 'is-active': String(paper.id) === String(route.params.paperId) }"
                @click="goToPaper(paper.id)"
              >
                <strong>{{ paper.year }}</strong>
                <span>{{ subjectLabel(paper.subject) }}</span>
              </button>
            </div>
          </section>
        </div>
      </Transition>

      <button
        class="fab-trigger"
        type="button"
        :aria-expanded="fabOpen"
        aria-label="切换科目与历年真题"
        @click="toggleFab"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5z" />
          <path d="m4 12.5 8 4.5 8-4.5" />
        </svg>
        <span class="fab-text">{{ activeSubjectLabel }}</span>
        <svg class="fab-caret" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 15 6-6 6 6" />
        </svg>
      </button>
    </div>

    <!-- 自绘确认弹窗（PC 端已移除 antd，不用 Modal / confirm） -->
    <Teleport to="body">
      <Transition name="wb-fade">
        <div v-if="confirmKind" class="wb-confirm-mask" @click.self="closeConfirm">
          <div class="wb-confirm" role="dialog" aria-modal="true" aria-labelledby="wb-confirm-title">
            <h2 id="wb-confirm-title">{{ confirmTitle }}</h2>
            <p>{{ confirmText }}</p>
            <div class="wb-confirm-actions">
              <button type="button" class="wb-btn" @click="closeConfirm">{{ confirmCancel }}</button>
              <button type="button" class="wb-btn is-primary" @click="confirmAction">{{ confirmOK }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 错题本入本弹窗：半自动（勾选 + 按 source 去重 + 统一错因） -->
    <Teleport to="body">
      <Transition name="wb-fade">
        <div v-if="mistakeOpen" class="wb-confirm-mask" @click.self="closeMistakeDialog">
          <div class="wb-mistake" role="dialog" aria-modal="true" aria-labelledby="wb-mistake-title">
            <h2 id="wb-mistake-title">把答错的题加入错题本</h2>
            <p class="wb-mistake-desc">
              加入后会进入错题本的复习曲线（掌握度 L0）。已在错题本里的题（按来源判重）会自动跳过，不重复灌入。
            </p>

            <div class="wb-mistake-tools">
              <label class="wb-mistake-reason">
                <span>统一错因</span>
                <select v-model="mistakeReason" class="wb-select">
                  <option v-for="(label, value) in ERROR_REASON_LABELS" :key="value" :value="value">{{ label }}</option>
                </select>
              </label>
              <button type="button" class="wb-mistake-all" @click="toggleAllMistakes">
                {{ allMistakesPicked ? '全不选' : '全选' }}
              </button>
            </div>

            <ul class="wb-mistake-list">
              <li
                v-for="item in wrongList"
                :key="item.question.id"
                :class="{ 'is-duplicated': existingSources.has(mistakeSource(item)) }"
              >
                <label>
                  <input
                    type="checkbox"
                    :checked="mistakeSelected.has(item.question.id)"
                    @change="toggleMistakePick(item.question.id)"
                  />
                  <b>第 {{ item.number }} 题</b>
                  <span class="wb-mistake-answer">
                    你的答案
                    {{ picks[item.question.id] || (selfScores[item.question.id] === 'wrong' ? '未答对' : '未作答') }}
                    · 正确 {{ isObjective(item.question) ? answerKeyOf(item.question) : '见参考答案' }}
                  </span>
                  <em v-if="existingSources.has(mistakeSource(item))">已在错题本</em>
                </label>
                <p class="wb-mistake-excerpt">{{ excerpt(item.question.content) }}</p>
              </li>
            </ul>

            <p v-if="mistakeError" class="wb-alert">{{ mistakeError }}</p>
            <p v-if="mistakeNote" class="wb-mistake-note">{{ mistakeNote }}</p>

            <div class="wb-confirm-actions">
              <span class="wb-mistake-count">
                将加入 <b>{{ mistakePending }}</b> 题<template v-if="mistakeDuplicated">，跳过 {{ mistakeDuplicated }} 题重复</template>
              </span>
              <button type="button" class="wb-btn" @click="closeMistakeDialog">关闭</button>
              <button
                type="button"
                class="wb-btn is-primary"
                :disabled="mistakeBusy || !mistakePending"
                @click="submitMistakes"
              >
                {{ mistakeBusy ? '正在加入…' : '确认加入' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
/* ============ ① 设计令牌 ============
   --wb-* 令牌已上提到 assets/design-system.css 的 :root，全站 PC 页面共用，此处不再重复声明。 */
.papers-page {
  width: min(100%, 1320px);
  padding-bottom: 96px;
}

/* ============ ② Hero ============ */
.wb-hero,
.wb-detail-head {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  overflow: hidden;
  margin-bottom: 20px;
  padding: 34px var(--wb-gutter) 30px;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: var(--wb-surface);
  box-shadow: var(--wb-shadow-sm);
}
.wb-hero-glow {
  position: absolute;
  inset: 0 0 auto;
  height: 132px;
  background: linear-gradient(180deg, rgba(40, 184, 148, 0) 0%, rgba(40, 184, 148, .07) 46%, rgba(40, 184, 148, .13) 72%, rgba(40, 184, 148, 0) 100%);
  pointer-events: none;
}
.wb-hero-copy { position: relative; min-width: 0; flex: 1; }
.wb-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--wb-brand-soft);
  color: var(--wb-brand-deep);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .01em;
}
.wb-eyebrow i { width: 6px; height: 6px; border-radius: 50%; background: var(--wb-brand); }
.wb-hero h1,
.wb-detail-head h1 {
  margin: 0;
  color: var(--wb-ink);
  font-size: clamp(28px, 2.6vw, 40px);
  font-weight: 700;
  letter-spacing: -.02em;
  line-height: 1.16;
}
.wb-hero-desc { margin: 10px 0 0; color: var(--wb-muted); font-size: 14px; line-height: 1.7; }

.wb-metrics {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  margin: 0;
  padding: 4px 0;
  border-left: 1px solid var(--wb-line-soft);
}
.wb-metrics > div { min-width: 104px; padding: 2px 22px; border-right: 1px solid var(--wb-line-soft); }
.wb-metrics > div:last-child { border-right: 0; padding-right: 0; }
.wb-metrics dt { margin-bottom: 6px; color: var(--wb-faint); font-size: 12px; }
.wb-metrics dd {
  margin: 0;
  color: var(--wb-ink);
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -.035em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.wb-metrics dd.is-text { font-size: 21px; letter-spacing: -.02em; }
.wb-metrics dd small { margin-left: 4px; color: var(--wb-faint); font-size: 12px; font-weight: 500; letter-spacing: 0; }

/* ============ ③ 筛选条 ============ */
.wb-toolbar {
  position: sticky;
  top: 56px;
  z-index: 12;
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px 16px;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: rgba(255, 255, 255, .88);
  box-shadow: var(--wb-shadow-sm);
  backdrop-filter: blur(10px) saturate(1.4);
}
.wb-toolbar > * { min-width: 0; }
.wb-toolbar { grid-template-columns: minmax(0, 1fr) auto; }
.wb-toolbar-row { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }

.wb-seg {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--wb-radius);
  background: #f4f5f7;
}
.wb-seg-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--wb-muted);
  font-size: 13px;
  font-weight: 500;
  transition: background var(--wb-dur) var(--wb-ease), color var(--wb-dur) var(--wb-ease);
}
.wb-seg-item i { width: 6px; height: 6px; border-radius: 50%; background: var(--seg-tone, var(--wb-faint)); }
.wb-seg-item em { color: var(--wb-faint); font-size: 11px; font-style: normal; font-variant-numeric: tabular-nums; }
.wb-seg-item:hover { background: rgba(25, 26, 35, .05); color: var(--wb-ink); }
.wb-seg-item.is-active { background: var(--wb-surface); color: var(--wb-ink); font-weight: 600; box-shadow: var(--wb-shadow-sm); }
.wb-seg-item.is-active em { color: var(--seg-tone, var(--wb-brand)); font-weight: 600; }
.wb-seg-item:focus-visible { outline: 3px solid rgba(108, 77, 255, .2); outline-offset: 1px; }

.wb-toolbar-right { display: flex; align-items: center; gap: 8px; }
.wb-search {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  width: clamp(180px, 22vw, 268px);
  padding: 0 10px;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius);
  background: var(--wb-surface);
  color: var(--wb-faint);
  transition: border-color var(--wb-dur) var(--wb-ease), box-shadow var(--wb-dur) var(--wb-ease);
}
.wb-search:focus-within { border-color: var(--wb-brand); color: var(--wb-brand); }
.wb-search input { min-width: 0; flex: 1; border: 0; background: transparent; color: var(--wb-ink); font-size: 13px; outline: none; }
.wb-search input::placeholder { color: var(--wb-faint); }
.wb-search input::-webkit-search-cancel-button { display: none; }
.wb-search-clear { width: 18px; height: 18px; border: 0; border-radius: 50%; background: #eceef1; color: var(--wb-muted); font-size: 13px; line-height: 1; }
.wb-search-clear:hover { background: var(--wb-line); color: var(--wb-ink); }

.wb-years { display: flex; align-items: center; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: thin; }
.wb-year {
  flex: 0 0 auto;
  min-height: 30px;
  padding: 0 11px;
  border: 1px solid var(--wb-line-soft);
  border-radius: 999px;
  background: var(--wb-surface);
  color: var(--wb-muted);
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  transition: border-color var(--wb-dur) var(--wb-ease), background var(--wb-dur) var(--wb-ease), color var(--wb-dur) var(--wb-ease);
}
.wb-year:hover { border-color: var(--wb-brand-bright); color: var(--wb-brand-deep); }
.wb-year.is-active { border-color: var(--wb-brand); background: var(--wb-brand-soft); color: var(--wb-brand-deep); font-weight: 600; }

.wb-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid var(--wb-line);
  border-radius: var(--wb-radius);
  background: var(--wb-surface);
  color: var(--wb-ink-2);
  font-size: 13px;
  font-weight: 600;
  transition: border-color var(--wb-dur) var(--wb-ease), background var(--wb-dur) var(--wb-ease), color var(--wb-dur) var(--wb-ease), transform var(--wb-dur) var(--wb-ease);
}
.wb-btn:hover:not(:disabled) { border-color: var(--wb-brand); color: var(--wb-brand-deep); }
.wb-btn:disabled { color: var(--wb-faint); cursor: not-allowed; opacity: .6; }
.wb-btn.is-solid { border-color: var(--wb-ink); background: var(--wb-ink); color: #fff; }
.wb-btn.is-solid:hover { border-color: var(--wb-brand); background: var(--wb-brand); color: #fff; }
.wb-btn:focus-visible { outline: 3px solid rgba(108, 77, 255, .2); outline-offset: 2px; }

.wb-result { margin: 0 0 20px; padding-left: 2px; color: var(--wb-muted); font-size: 13px; }
.wb-result strong { color: var(--wb-ink); font-weight: 700; font-variant-numeric: tabular-nums; }
.wb-result a { color: var(--wb-brand-deep); font-weight: 600; text-decoration: none; border-bottom: 1px solid rgba(40, 184, 148, .4); }
.wb-result a:hover { border-bottom-color: var(--wb-brand); }

.wb-alert { margin: 0 0 14px; padding: 11px 14px; border: 1px solid #fecaca; border-radius: var(--wb-radius); background: #fef2f2; color: #b42318; font-size: 13px; }

/* ============ ④ 分组与年份卡 ============ */
.wb-groups { display: grid; gap: 34px; }
.wb-group-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--wb-line-soft); }
.wb-group-head h2 { display: inline-flex; align-items: center; gap: 9px; margin: 0; color: var(--wb-ink); font-size: 17px; font-weight: 700; letter-spacing: -.01em; }
.wb-group-head h2 i { width: 8px; height: 8px; border-radius: 50%; background: var(--group-tone); }
.wb-group-head p { display: flex; align-items: center; gap: 7px; margin: 0; color: var(--wb-faint); font-size: 12px; font-variant-numeric: tabular-nums; }
.wb-group-head p b { color: var(--wb-line); font-weight: 400; }

.wb-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(238px, 1fr)); gap: 12px; }
.wb-card {
  position: relative;
  display: grid;
  gap: 8px;
  align-content: start;
  padding: 15px 16px 14px;
  overflow: hidden;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: var(--wb-surface);
  color: var(--wb-ink);
  text-align: left;
  box-shadow: var(--wb-shadow-sm);
  transition: border-color var(--wb-dur) var(--wb-ease), box-shadow var(--wb-dur) var(--wb-ease), transform var(--wb-dur) var(--wb-ease);
}
.wb-card:hover { border-color: var(--wb-brand-bright); box-shadow: var(--wb-shadow); transform: translateY(-2px); }
.wb-card:focus-visible { outline: 3px solid rgba(108, 77, 255, .22); outline-offset: 2px; }
.wb-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.wb-card-year { color: var(--wb-ink); font-size: 20px; font-weight: 700; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
.wb-card:hover .wb-card-year { color: var(--wb-brand-deep); }
.wb-card-dot { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: var(--wb-radius-sm); font-size: 11px; font-weight: 600; }
.wb-card-dot::before { width: 5px; height: 5px; border-radius: 50%; content: ""; background: currentColor; }
.wb-card-dot.is-ok { background: var(--wb-brand-soft); color: var(--wb-brand-deep); }
.wb-card-dot.is-warn { background: #fff7ed; color: #c2410c; }
.wb-card-title { color: var(--wb-ink-2); font-size: 13px; font-weight: 600; line-height: 1.5; }
.wb-card-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 2px; }
.wb-card-count { color: var(--wb-ink); font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.wb-card-src { overflow: hidden; color: var(--wb-faint); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }

/* ============ ⑤ 详情 ============ */
.wb-crumb { display: flex; align-items: center; gap: 9px; margin-bottom: 14px; color: var(--wb-faint); font-size: 12px; }
.wb-crumb > span[aria-hidden] { color: var(--wb-line); }
.wb-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--wb-brand-deep);
  font-size: 12px;
  font-weight: 600;
}
.wb-back:hover { color: var(--wb-ink); }

.wb-detail-head { --head-tone: var(--wb-brand); align-items: flex-end; padding: 30px var(--wb-gutter) 26px; }
.wb-detail-head .wb-hero-glow { background: linear-gradient(180deg, rgba(40, 184, 148, 0) 0%, rgba(40, 184, 148, .06) 42%, rgba(40, 184, 148, .12) 74%, rgba(40, 184, 148, 0) 100%); }
.wb-detail-head h1 { font-size: clamp(24px, 2.1vw, 34px); }
.wb-detail-actions { position: relative; display: flex; flex: 0 0 auto; align-items: center; gap: 8px; }

.wb-source { margin-bottom: 18px; padding: 14px 18px; border: 1px solid var(--wb-line-soft); border-radius: var(--wb-radius-lg); background: var(--wb-surface); box-shadow: var(--wb-shadow-sm); }
.wb-source-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px 24px; }
.wb-source-k { display: block; margin-bottom: 3px; color: var(--wb-faint); font-size: 11px; font-weight: 600; }
.wb-source-v { color: var(--wb-ink-2); font-size: 12px; line-height: 1.6; }
.wb-source-v a { color: var(--wb-brand-deep); font-weight: 600; text-decoration: none; border-bottom: 1px solid rgba(40, 184, 148, .4); }
.wb-verify { margin-top: 12px; padding-top: 11px; border-top: 1px dashed var(--wb-line-soft); }
.wb-verify summary { cursor: pointer; color: var(--wb-brand-deep); font-size: 12px; font-weight: 600; }
.wb-verify p { margin: 9px 0 0; color: var(--wb-muted); font-size: 12px; line-height: 1.8; }

.wb-detail-body { display: grid; grid-template-columns: 232px minmax(0, 1fr); align-items: start; gap: 18px; }
.wb-aside { position: sticky; top: 76px; display: grid; gap: 12px; }
.wb-aside-card { padding: 15px 16px; border: 1px solid var(--wb-line-soft); border-radius: var(--wb-radius-lg); background: var(--wb-surface); box-shadow: var(--wb-shadow-sm); }
.wb-aside-title { margin: 0 0 11px; color: var(--wb-faint); font-size: 11px; font-weight: 700; letter-spacing: .06em; }
.wb-aside-facts { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.wb-aside-facts li { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; }
.wb-aside-facts span { color: var(--wb-muted); }
.wb-aside-facts b { color: var(--wb-ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.wb-aside-track { height: 5px; margin-top: 12px; overflow: hidden; border-radius: 999px; background: #eef0f3; }
.wb-aside-track i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--wb-brand), var(--wb-brand-bright)); transition: width var(--wb-dur) var(--wb-ease); }

.wb-toc { max-height: calc(100vh - 300px); overflow-y: auto; }
.wb-toc-group + .wb-toc-group { margin-top: 13px; padding-top: 12px; border-top: 1px solid var(--wb-line-soft); }
.wb-toc-label { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 0 8px; color: var(--wb-ink-2); font-size: 12px; font-weight: 600; }
.wb-toc-label em { color: var(--wb-faint); font-size: 11px; font-style: normal; }
.wb-toc-nums { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px; }
.wb-toc-num {
  min-height: 26px;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-sm);
  background: var(--wb-surface);
  color: var(--wb-muted);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  transition: border-color var(--wb-dur) var(--wb-ease), background var(--wb-dur) var(--wb-ease), color var(--wb-dur) var(--wb-ease);
}
.wb-toc-num:hover { border-color: var(--wb-brand-bright); color: var(--wb-brand-deep); }
.wb-toc-num.is-open { border-color: rgba(40, 184, 148, .4); background: var(--wb-brand-soft); color: var(--wb-brand-deep); }
.wb-toc-num.is-active { border-color: var(--wb-brand); background: var(--wb-brand); color: #fff; }

.wb-questions { display: grid; min-width: 0; gap: 14px; }
.question-card {
  padding: 20px 22px;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: var(--wb-surface);
  box-shadow: var(--wb-shadow-sm);
  scroll-margin-top: 140px;
  transition: border-color var(--wb-dur) var(--wb-ease), box-shadow var(--wb-dur) var(--wb-ease);
}
.question-card.is-current { border-color: rgba(40, 184, 148, .45); box-shadow: 0 0 0 1px rgba(40, 184, 148, .14); }

.q-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.q-no {
  display: grid;
  place-items: center;
  min-width: 30px;
  height: 24px;
  padding: 0 7px;
  border-radius: var(--wb-radius-sm);
  background: var(--wb-brand-soft);
  color: var(--wb-brand-deep);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.q-score,
.q-tag { display: inline-flex; align-items: center; min-height: 22px; padding: 0 8px; border-radius: var(--wb-radius-sm); background: #f4f5f7; color: var(--wb-muted); font-size: 11px; font-weight: 600; }
.q-tag { background: transparent; color: var(--wb-faint); }
.q-passage { margin-bottom: 13px; padding: 13px 15px; border-left: 3px solid var(--wb-brand); border-radius: 0 var(--wb-radius) var(--wb-radius) 0; background: var(--wb-brand-soft); }
.q-content { color: var(--wb-ink-2); font-size: 14px; line-height: 1.8; }
.q-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 15px; }
.q-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 13px;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius);
  background: var(--wb-surface);
  color: var(--wb-ink-2);
  font-size: 13px;
  line-height: 1.6;
  transition: border-color var(--wb-dur) var(--wb-ease), background var(--wb-dur) var(--wb-ease);
}
.q-option:hover { border-color: var(--wb-line); }
.q-option b { display: grid; place-items: center; width: 20px; height: 20px; flex: 0 0 20px; border-radius: var(--wb-radius-sm); background: #f4f5f7; color: var(--wb-muted); font-size: 11px; font-weight: 700; }
.q-option.is-answer { border-color: rgba(40, 184, 148, .5); background: var(--wb-brand-soft); }
.q-option.is-answer b { background: var(--wb-brand); color: #fff; }
.q-foot { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
.q-toggle {
  min-height: 32px;
  padding: 0 14px;
  border: 1px solid var(--wb-line);
  border-radius: var(--wb-radius);
  background: var(--wb-surface);
  color: var(--wb-ink-2);
  font-size: 12px;
  font-weight: 600;
  transition: border-color var(--wb-dur) var(--wb-ease), background var(--wb-dur) var(--wb-ease), color var(--wb-dur) var(--wb-ease);
}
.q-toggle:hover { border-color: var(--wb-brand); background: var(--wb-brand-soft); color: var(--wb-brand-deep); }
.q-answer { margin-top: 14px; padding: 14px 16px; border-left: 3px solid var(--wb-brand); border-radius: 0 var(--wb-radius) var(--wb-radius) 0; background: var(--wb-brand-soft); color: var(--wb-ink-2); }

/* 详情正文里 Markdown 渲染出的表格 / 代码块跟随新令牌 */
.wb-questions :deep(.md table) { width: 100%; border-collapse: collapse; font-size: 13px; }
.wb-questions :deep(.md th),
.wb-questions :deep(.md td) { padding: 8px 10px; border: 1px solid var(--wb-line-soft); text-align: left; }
.wb-questions :deep(.md th) { background: #f8f9fa; color: var(--wb-ink); font-weight: 600; }
.wb-questions :deep(.md p:first-child) { margin-top: 0; }
.wb-questions :deep(.md p:last-child) { margin-bottom: 0; }
.wb-questions :deep(.md a) { color: var(--wb-brand-deep); }
.wb-questions :deep(.md strong) { color: var(--wb-ink); }
.wb-questions :deep(.md code) { background: var(--wb-brand-soft); color: var(--wb-brand-deep); }
.wb-questions :deep(.md em) { color: var(--wb-muted); }

/* ============ ⑥ 悬浮切换器 ============ */
.subject-fab { position: fixed; z-index: 40; right: 28px; bottom: 28px; display: grid; justify-items: end; gap: 8px; }
.fab-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 13px;
  border: 1px solid rgba(40, 184, 148, .42);
  border-radius: var(--wb-radius);
  background: rgba(40, 184, 148, .82);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(25, 26, 35, .14);
  backdrop-filter: blur(6px);
  transition: background var(--wb-dur) var(--wb-ease), border-color var(--wb-dur) var(--wb-ease);
}
.fab-trigger:hover,
.fab-trigger:focus { border-color: rgba(40, 184, 148, .62); background: rgba(34, 166, 131, .96); color: #fff; }
.fab-trigger:active { background: rgba(29, 141, 111, .98); color: #fff; }
.fab-trigger[aria-expanded="true"] { border-color: rgba(40, 184, 148, .62); background: rgba(34, 166, 131, .96); }
.fab-text { white-space: nowrap; }
.fab-caret { transition: transform .18s var(--wb-ease); }
.fab-trigger[aria-expanded="true"] .fab-caret { transform: rotate(180deg); }

.fab-pop-enter-active,
.fab-pop-leave-active { transition: opacity .13s var(--wb-ease), transform .13s var(--wb-ease); }
.fab-pop-enter-from,
.fab-pop-leave-to { opacity: 0; transform: translateY(6px); }
.fab-pop-leave-active { pointer-events: none; }

.fab-panel {
  width: 270px;
  max-height: min(72vh, 480px);
  overflow-y: auto;
  padding: 8px;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: rgba(255, 255, 255, .96);
  box-shadow: var(--wb-shadow-lg);
  backdrop-filter: blur(12px) saturate(1.4);
}
.fab-group + .fab-group { margin-top: 6px; padding-top: 8px; border-top: 1px solid var(--wb-line-soft); }
.fab-group-title { margin: 4px 8px 6px; color: var(--wb-faint); font-size: 11px; font-weight: 600; }
.fab-item { display: flex; align-items: center; gap: 9px; width: 100%; min-height: 38px; padding: 0 9px; border: 0; border-radius: var(--wb-radius); background: transparent; color: var(--wb-ink-2); font-size: 13px; text-align: left; transition: background var(--wb-dur) var(--wb-ease), color var(--wb-dur) var(--wb-ease); }
.fab-item:hover { background: #f4f5f7; color: var(--wb-ink); }
.fab-item.is-active { background: var(--wb-brand-soft); color: var(--wb-brand-deep); font-weight: 600; }
.fab-dot { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 50%; }
.fab-item-label { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fab-item-count { color: var(--wb-faint); font-size: 11px; font-weight: 400; font-variant-numeric: tabular-nums; }
.fab-item.is-active .fab-item-count { color: var(--wb-brand-deep); }
.fab-papers { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; padding: 0 4px 4px; }
.fab-paper { display: grid; gap: 1px; justify-items: center; padding: 7px 4px; border: 1px solid var(--wb-line-soft); border-radius: var(--wb-radius); background: var(--wb-surface); color: var(--wb-ink-2); transition: border-color var(--wb-dur) var(--wb-ease), background var(--wb-dur) var(--wb-ease), color var(--wb-dur) var(--wb-ease); }
.fab-paper:hover { border-color: var(--wb-brand-bright); }
.fab-paper.is-active { border-color: var(--wb-brand); background: var(--wb-brand-soft); color: var(--wb-brand-deep); }
.fab-paper strong { font-size: 12px; font-weight: 600; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
.fab-paper span { max-width: 100%; overflow: hidden; color: var(--wb-faint); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.fab-paper.is-active span { color: var(--wb-brand-deep); }

/* ============ ⑦ 骨架屏 ============ */
.wb-grid-skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(238px, 1fr)); gap: 12px; }
.wb-grid-skeleton span,
.wb-detail-skeleton span { display: block; border-radius: var(--wb-radius-lg); background: linear-gradient(90deg, #f1f3f5 25%, #f8f9fa 37%, #f1f3f5 63%); background-size: 400% 100%; animation: wb-shimmer 1.4s ease infinite; }
.wb-grid-skeleton span { height: 116px; }
.wb-detail-skeleton { display: grid; gap: 14px; }
.wb-detail-skeleton span { height: 96px; }
.wb-detail-skeleton span.is-block { height: 190px; }
@keyframes wb-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

/* ============ ⑧ 响应式：1600+ / 1280 / 1180 / 1024 ============ */
@media (min-width: 1600px) {
  .papers-page { --wb-gutter: 40px; width: min(100%, 1440px); }
  .wb-cards { grid-template-columns: repeat(auto-fill, minmax(256px, 1fr)); gap: 14px; }
  .wb-detail-body { grid-template-columns: 252px minmax(0, 1fr); gap: 22px; }
  .q-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 1280px) {
  .papers-page { --wb-gutter: 24px; }
  .wb-metrics > div { min-width: 92px; padding: 2px 16px; }
  .wb-metrics dd { font-size: 24px; }
  .wb-metrics dd.is-text { font-size: 18px; }
  .wb-detail-body { grid-template-columns: 208px minmax(0, 1fr); gap: 14px; }
  .wb-toc-nums { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}
@media (max-width: 1180px) {
  .wb-hero,
  .wb-detail-head { flex-direction: column; align-items: stretch; gap: 20px; }
  .wb-metrics { border-left: 0; border-top: 1px solid var(--wb-line-soft); padding-top: 16px; }
  .wb-metrics > div { flex: 1; min-width: 0; padding: 0 14px; }
  .wb-metrics > div:first-child { padding-left: 0; }
  .wb-detail-actions { justify-content: flex-start; }
  /* 目录从左侧粘性栏降级为顶部整卡：两张子卡合成一张，避免把题目顶到屏外 */
  .wb-detail-body { grid-template-columns: minmax(0, 1fr); }
  .wb-aside {
    position: static;
    gap: 0;
    overflow: hidden;
    border: 1px solid var(--wb-line-soft);
    border-radius: var(--wb-radius-lg);
    background: var(--wb-surface);
    box-shadow: var(--wb-shadow-sm);
  }
  .wb-aside-card { border: 0; border-radius: 0; box-shadow: none; }
  .wb-aside-card + .wb-aside-card { border-top: 1px solid var(--wb-line-soft); }
  .wb-aside-facts { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px 16px; }
  .wb-aside-track { grid-column: 1 / -1; }
  .wb-toc { max-height: 236px; overflow-y: auto; }
  .wb-toc-nums { grid-template-columns: repeat(auto-fill, minmax(38px, 1fr)); }
}
@media (max-width: 1024px) {
  .papers-page { --wb-gutter: 20px; }
  .wb-toolbar { grid-template-columns: minmax(0, 1fr); }
  .wb-toolbar-right { justify-content: space-between; }
  .wb-search { width: min(100%, 320px); flex: 1; }
  .wb-seg { overflow-x: auto; }
  .wb-cards { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
  .q-options { grid-template-columns: minmax(0, 1fr); }
  .wb-detail-head .wb-hero-glow { height: 96px; }
}
@media (prefers-reduced-motion: reduce) {
  .papers-page * { transition-duration: .01ms !important; animation-duration: .01ms !important; }
}

/* ============ ⑦ 答题模式（全部作用域在 .is-practice 下，阅读模式零影响） ============ */
.wb-mode-seg { flex: 0 0 auto; }
.wb-mode-seg .wb-seg-item { min-height: 30px; padding: 0 13px; font-size: 12.5px; }

/* 工具条：作答统计 / 交卷 / 结果 */
.wb-practice-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
  padding: 14px 18px;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: var(--wb-surface);
  box-shadow: var(--wb-shadow-sm);
}
.wb-practice-facts { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; min-width: 0; }
.wb-practice-k { color: var(--wb-faint); font-size: 12px; font-weight: 600; }
.wb-practice-v { color: var(--wb-ink); font-size: 22px; font-weight: 600; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.wb-practice-v em { margin-left: 3px; color: var(--wb-faint); font-size: 12px; font-style: normal; font-weight: 500; }
.wb-practice-sub { color: var(--wb-muted); font-size: 12.5px; }
.wb-practice-ok { color: var(--wb-brand-deep); font-size: 12.5px; font-weight: 600; }
.wb-practice-warn {
  padding: 3px 11px;
  border: 1px solid rgba(249, 115, 22, .34);
  border-radius: 999px;
  background: #fff7ed;
  color: #b45309;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  transition: border-color var(--wb-dur) var(--wb-ease), background var(--wb-dur) var(--wb-ease);
}
.wb-practice-warn:hover { border-color: rgba(249, 115, 22, .62); background: #ffedd5; }
.wb-practice-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.wb-practice-restore { color: var(--wb-faint); font-size: 12px; }

/* 目录即答题卡：题号格就地着色，不新开浮层 */
.papers-page.is-practice .wb-toc-num.is-open { border-color: var(--wb-line-soft); background: var(--wb-surface); color: var(--wb-muted); }
.papers-page.is-practice .wb-toc-num.is-active {
  border-color: var(--wb-line);
  background: var(--wb-surface);
  color: var(--wb-ink-2);
  outline: 2px solid rgba(40, 184, 148, .5);
  outline-offset: 1px;
}
.papers-page.is-practice .wb-toc-num.is-picked { border-color: rgba(40, 184, 148, .5); background: var(--wb-brand-soft); color: var(--wb-brand-deep); }
.papers-page.is-practice .wb-toc-num.is-right { border-color: var(--wb-brand); background: var(--wb-brand); color: #fff; }
.papers-page.is-practice .wb-toc-num.is-wrong { border-color: #f09595; background: #fcebeb; color: #b42318; }
.papers-page.is-practice .wb-toc-num.is-subjective { border-style: dashed; color: var(--wb-faint); }

/* 选项：答题模式下是 button（可点选），交卷后锁定并判色 */
.papers-page.is-practice .q-option { width: 100%; text-align: left; font-family: inherit; }
.papers-page.is-practice .q-option.is-choice:not([aria-disabled='true']) { cursor: pointer; }
.papers-page.is-practice .q-option.is-choice:not([aria-disabled='true']):hover {
  border-color: var(--wb-brand-bright);
  background: var(--wb-brand-soft);
}
.papers-page.is-practice .q-option:focus-visible { outline: 3px solid rgba(108, 77, 255, .2); outline-offset: 1px; }
.papers-page.is-practice .q-option.is-picked { border-color: rgba(40, 184, 148, .5); background: var(--wb-brand-soft); }
.papers-page.is-practice .q-option.is-picked b { background: var(--wb-brand); color: #fff; }
.papers-page.is-practice .q-option.is-right { border-color: var(--wb-brand); background: var(--wb-brand-soft); }
.papers-page.is-practice .q-option.is-right b { background: var(--wb-brand); color: #fff; }
.papers-page.is-practice .q-option.is-wrong { border-color: #f09595; background: #fcebeb; }
.papers-page.is-practice .q-option.is-wrong b { background: #d92d20; color: #fff; }
.papers-page.is-practice .q-option[aria-disabled='true'] { cursor: default; opacity: 1; }

/* 题头结果徽标 */
.q-verdict {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  margin-left: auto;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.q-verdict.is-idle { background: #f4f5f7; color: var(--wb-faint); }
.q-verdict.is-picked { background: var(--wb-brand-soft); color: var(--wb-brand-deep); }
.q-verdict.is-right { background: var(--wb-brand); color: #fff; }
.q-verdict.is-wrong { background: #fcebeb; color: #b42318; }
.q-verdict.is-subjective { background: #fff7ed; color: #b45309; }

/* 自绘确认弹窗（Teleport 到 body，scoped 属性仍生效） */
.wb-confirm-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(25, 26, 35, .42);
  backdrop-filter: blur(2px);
}
.wb-confirm {
  width: min(100%, 420px);
  margin: 0;
  padding: 22px 24px 18px;
  border-radius: var(--wb-radius-lg);
  background: var(--wb-surface);
  box-shadow: 0 18px 48px rgba(25, 26, 35, .22);
}
.wb-confirm h2 { margin: 0 0 10px; color: var(--wb-ink); font-size: 16px; font-weight: 700; }
.wb-confirm p { margin: 0 0 18px; color: var(--wb-muted); font-size: 13px; line-height: 1.7; }
.wb-confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }
.wb-fade-enter-active,
.wb-fade-leave-active { transition: opacity .16s var(--wb-ease); }
.wb-fade-enter-from,
.wb-fade-leave-to { opacity: 0; }

/* 即时判分开关 */
.wb-practice-toggle {
  min-height: 32px;
  padding: 0 13px;
  border: 1px solid var(--wb-line);
  border-radius: var(--wb-radius);
  background: var(--wb-surface);
  color: var(--wb-ink-2);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  transition: border-color var(--wb-dur) var(--wb-ease), background var(--wb-dur) var(--wb-ease), color var(--wb-dur) var(--wb-ease);
}
.wb-practice-toggle:hover { border-color: var(--wb-brand); color: var(--wb-brand-deep); }
.wb-practice-toggle.is-on { border-color: var(--wb-brand); background: var(--wb-brand-soft); color: var(--wb-brand-deep); }

/* 主观题自评 */
.q-self {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--wb-line);
}
.q-self-k { color: var(--wb-faint); font-size: 12px; font-weight: 600; }
.q-self-btn {
  min-height: 30px;
  padding: 0 13px;
  border: 1px solid var(--wb-line);
  border-radius: var(--wb-radius);
  background: var(--wb-surface);
  color: var(--wb-ink-2);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  transition: border-color var(--wb-dur) var(--wb-ease), background var(--wb-dur) var(--wb-ease), color var(--wb-dur) var(--wb-ease);
}
.q-self-btn:hover { border-color: var(--wb-brand); background: var(--wb-brand-soft); color: var(--wb-brand-deep); }
.q-self-btn.is-on { border-color: var(--wb-brand); background: var(--wb-brand); color: #fff; }
.q-self-btn.is-wrong:hover { border-color: #f09595; background: #fcebeb; color: #b42318; }
.q-self-btn.is-wrong.is-on { border-color: #d92d20; background: #d92d20; color: #fff; }
.q-self-btn:focus-visible { outline: 3px solid rgba(108, 77, 255, .2); outline-offset: 1px; }
.q-self-hint { color: #b42318; font-size: 12px; }

/* 错题本入本弹窗 */
.wb-mistake {
  display: flex;
  flex-direction: column;
  width: min(100%, 620px);
  max-height: min(82vh, 720px);
  margin: 0;
  padding: 22px 24px 18px;
  border-radius: var(--wb-radius-lg);
  background: var(--wb-surface);
  box-shadow: 0 18px 48px rgba(25, 26, 35, .22);
}
.wb-mistake h2 { margin: 0 0 8px; color: var(--wb-ink); font-size: 16px; font-weight: 700; }
.wb-mistake-desc { margin: 0 0 14px; color: var(--wb-muted); font-size: 12.5px; line-height: 1.7; }
.wb-mistake-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.wb-mistake-reason { display: inline-flex; align-items: center; gap: 8px; color: var(--wb-faint); font-size: 12px; font-weight: 600; }
.wb-mistake-reason .wb-select { width: auto; min-width: 132px; min-height: 30px; font-size: 12px; }
.wb-mistake-all { border: 0; background: transparent; color: var(--wb-brand-deep); font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.wb-mistake-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin: 0 0 12px;
  padding: 0;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius);
  list-style: none;
}
.wb-mistake-list li { padding: 11px 14px; border-bottom: 1px solid var(--wb-line-soft); }
.wb-mistake-list li:last-child { border-bottom: 0; }
.wb-mistake-list li.is-duplicated { background: #fbfcfc; }
.wb-mistake-list label { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; cursor: pointer; }
.wb-mistake-list b { color: var(--wb-ink); font-size: 12.5px; }
.wb-mistake-list em { margin-left: auto; color: var(--wb-faint); font-size: 11px; font-style: normal; }
.wb-mistake-answer { color: var(--wb-muted); font-size: 12px; }
.wb-mistake-excerpt { margin: 5px 0 0 22px; color: var(--wb-faint); font-size: 12px; line-height: 1.6; }
.wb-mistake-note { margin: 0 0 12px; color: var(--wb-brand-deep); font-size: 12.5px; font-weight: 600; }
.wb-confirm-actions .wb-mistake-count { margin-right: auto; color: var(--wb-muted); font-size: 12px; }
.wb-mistake-count b { color: var(--wb-ink); }
</style>
