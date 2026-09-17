import type { PaperQuestion } from '@/api/papers';
import { answerKeyOf, isObjective, objectiveTally } from '@/utils/paperQuestion';

/**
 * PC 端「答题模式」的作答状态与持久化。
 *
 * ⚠️ 存储键与结构**必须**与移动端做题页保持一致（`MobilePaperPracticeView.vue`），
 * 这样同一台机器上「手机答一半 → PC 接着答」才成立。改动这里等于改动两端契约。
 *
 * 判题一律走 `utils/paperQuestion.ts`，本文件只做状态与呈现，不解析答案字母。
 */

/** 作答进度键：与移动端做题页同键 */
export const practiceKey = (paperId: number) => `shck_practice_paper_${paperId}`;

/** 模式偏好键（跨试卷共享，记住用户上次选的模式） */
export const PAPER_MODE_KEY = 'shck_paper_mode';

/** 即时判分开关（跨试卷共享，记住用户的练习习惯） */
export const PAPER_INSTANT_KEY = 'shck_paper_instant';

/**
 * 主观题自评键。
 * ⚠️ 故意**不放进** `shck_practice_paper_{id}`：移动端做题页的 saveProgress 只写
 * `{picks,index,submitted}` 三个字段，放一起会被移动端覆盖丢掉。独立键互不干扰。
 */
export const paperSelfKey = (paperId: number) => `shck_paper_self_${paperId}`;

export type PaperMode = 'read' | 'practice';

/** 主观题自评结论 */
export type SelfVerdict = 'right' | 'wrong';

export interface PracticeProgress {
  /** questionId → 选项字母（A–H） */
  picks: Record<number, string>;
  /** 上次浏览到的题目位置（0 起），用于恢复阅读位置 */
  index: number;
  /** 是否已交卷 */
  submitted: boolean;
}

/** 题目在答题模式下的呈现状态 */
export type QuestionVerdict = 'idle' | 'picked' | 'right' | 'wrong' | 'subjective';

export function emptyProgress(): PracticeProgress {
  return { picks: {}, index: 0, submitted: false };
}

/** 选项字母只可能是 A–H，其余一律丢弃（防止历史脏数据或手工改动带进来） */
function normalizePicks(raw: unknown): Record<number, string> {
  const picks: Record<number, string> = {};
  if (!raw || typeof raw !== 'object') return picks;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(key);
    if (!Number.isInteger(id) || id < 1) continue;
    if (typeof value !== 'string') continue;
    const letter = value.trim().toUpperCase();
    if (!/^[A-H]$/.test(letter)) continue;
    picks[id] = letter;
  }
  return picks;
}

/**
 * 读取作答进度。任何异常（无记录 / JSON 损坏 / 结构不符）都降级为空进度，绝不抛出。
 */
export function loadProgress(paperId: number): PracticeProgress {
  try {
    const raw = localStorage.getItem(practiceKey(paperId));
    if (!raw) return emptyProgress();
    const saved = JSON.parse(raw) as Partial<PracticeProgress>;
    const index = Number(saved.index);
    return {
      picks: normalizePicks(saved.picks),
      index: Number.isInteger(index) && index >= 0 ? index : 0,
      submitted: saved.submitted === true,
    };
  } catch {
    return emptyProgress();
  }
}

/**
 * 写盘用「读-改-写」合并，而不是整体覆盖：两端（PC / 移动端）读写同一个键，
 * 整体覆盖会让对方认识的字段无声消失。
 */
export function saveProgress(paperId: number, progress: PracticeProgress): void {
  try {
    let existing: Record<string, unknown> = {};
    const raw = localStorage.getItem(practiceKey(paperId));
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) existing = parsed as Record<string, unknown>;
    }
    localStorage.setItem(practiceKey(paperId), JSON.stringify({ ...existing, ...progress }));
  } catch {
    // 存储不可用（隐私模式 / 配额满）时静默降级：本次会话仍可作答，只是不持久化
  }
}

export function loadMode(): PaperMode {
  try {
    return localStorage.getItem(PAPER_MODE_KEY) === 'practice' ? 'practice' : 'read';
  } catch {
    return 'read';
  }
}

export function saveMode(mode: PaperMode): void {
  try {
    localStorage.setItem(PAPER_MODE_KEY, mode);
  } catch {
    // 同上
  }
}

export function loadInstant(): boolean {
  try {
    return localStorage.getItem(PAPER_INSTANT_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveInstant(on: boolean): void {
  try {
    localStorage.setItem(PAPER_INSTANT_KEY, on ? '1' : '0');
  } catch {
    // 同上
  }
}

export function loadSelfScores(paperId: number): Record<number, SelfVerdict> {
  const scores: Record<number, SelfVerdict> = {};
  try {
    const raw = localStorage.getItem(paperSelfKey(paperId));
    if (!raw) return scores;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return scores;
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const id = Number(key);
      if (!Number.isInteger(id) || id < 1) continue;
      if (value === 'right' || value === 'wrong') scores[id] = value;
    }
  } catch {
    // 同上
  }
  return scores;
}

export function saveSelfScores(paperId: number, scores: Record<number, SelfVerdict>): void {
  try {
    localStorage.setItem(paperSelfKey(paperId), JSON.stringify(scores));
  } catch {
    // 同上
  }
}

/**
 * 单题呈现状态。
 * - `subjective`：无选项或解析不出答案 → 不参与点选与判分，由用户自评
 * - `picked`：已选但未交卷（不泄露对错）
 * - `right` / `wrong`：交卷后才有
 */
export function verdictOf(question: PaperQuestion, picks: Record<number, string>, graded: boolean): QuestionVerdict {
  if (!isObjective(question)) return 'subjective';
  const picked = picks[question.id];
  if (!graded) return picked ? 'picked' : 'idle';
  if (!picked) return 'idle';
  return picked === answerKeyOf(question) ? 'right' : 'wrong';
}

/** 已作答的客观题数量（主观题不计） */
export function answeredCount(questions: PaperQuestion[], picks: Record<number, string>): number {
  return questions.filter((question) => isObjective(question) && Boolean(picks[question.id])).length;
}

/**
 * 卷面汇总。`objectiveTally` 已提供客观题的对/答/得分，这里补总题数与已答数（含主观题口径）。
 */
export function practiceSummary(questions: PaperQuestion[], picks: Record<number, string>) {
  const tally = objectiveTally(questions, picks);
  return {
    ...tally,
    total: questions.length,
    answeredObjective: answeredCount(questions, picks),
    unanswered: Math.max(0, tally.objectiveCount - tally.answered),
  };
}
