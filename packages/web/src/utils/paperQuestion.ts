import type { PaperQuestion } from '@/api/papers';

/**
 * 真题的题型推断与答案解析。
 *
 * 题库（exam_questions）**没有题型字段**，但三科结构非常规整：
 * 分值 + 选项数 + 官方题号三者组合即可唯一确定真实考试板块。
 * 已用全库 35 套 1546 题核对过，分组结果与考试结构一致。
 *
 * 各科依据（2014–2025 实测）：
 * - 政治：2 分 4 选项 = 选择；无选项 10 分 = 简答、20 分 = 论述
 * - 英语：1 分题 1–5 = 语音、题 6–20 = 词汇语法；2 分 = 完形；3 分 4 选项 = 阅读；
 *         7–8 选项 = 补全对话；无选项 25 分 = 写作
 * - 高等数学一：有选项 = 选择；无选项且分值 ≤ 选择题分值 = 填空，否则 = 解答
 *   （旧结构 选择/填空各 4 分、解答 6–10 分；2024 起新结构 选择/填空各 7 分、解答 15 分）
 */

export interface NumberedQuestion {
  question: PaperQuestion;
  /** 官方题号（题干开头的「12.」），解析不到时退回录入序号 */
  number: number;
  /** 在试卷中的位置（0 起），用于答题卡跳题 */
  position: number;
}

export interface QuestionGroup {
  label: string;
  items: NumberedQuestion[];
}

/** 题干多以「12. xxx」「12、xxx」开头，即为原卷题号 */
export function officialNumber(content: string, fallback: number): number {
  const matched = /^\s*(\d{1,3})\s*[.、．)）]/.exec(content ?? '');
  return matched ? Number(matched[1]) : fallback;
}

/** 给整套卷编上官方题号与位置 */
export function numberQuestions(questions: PaperQuestion[]): NumberedQuestion[] {
  return questions.map((question, position) => ({
    question,
    number: officialNumber(question.content, position + 1),
    position,
  }));
}

/**
 * 解析正确选项。
 * 答案形如「【答案】D\n【解析】…」，也有裸字母写法。
 * ⚠️ 选项最多到 H：英语补全对话是 A–H 八个选项，只认 A–D 会漏判 31 道题。
 */
export function answerKeyOf(question: PaperQuestion): string {
  const raw = question.answer ?? '';
  const tagged = /【答案】\s*([A-H])\b/.exec(raw);
  if (tagged) return tagged[1].toUpperCase();
  const bare = /^\s*([A-H])(?:\s*[.、．)）]|\s*$)/.exec(raw);
  return bare ? bare[1].toUpperCase() : '';
}

/** 展示时去掉重复的「【答案】」标记，避免出现「答案：【答案】D」 */
export function answerText(question: PaperQuestion): string {
  const raw = (question.answer ?? '').trim();
  if (!raw) return '**答案：**（略）';
  const tagged = raw.match(/^【答案】\s*([^\n]*)\n?([\s\S]*)$/);
  if (tagged) {
    const key = tagged[1].trim();
    const rest = tagged[2].trim();
    return `**答案：**${key}${rest ? `\n\n${rest}` : ''}`;
  }
  return `**答案：**${raw}`;
}

/** 客观题：有选项且能解析出正确选项，才可以自动判对错 */
export function isObjective(question: PaperQuestion): boolean {
  return Boolean(question.options?.length) && answerKeyOf(question) !== '';
}

/** 该卷选择题的分值，用作「填空 vs 解答」的分界基准 */
function choiceScoreOf(questions: PaperQuestion[]): number {
  return questions.find((question) => question.options?.length)?.score ?? 0;
}

function labelOf(subject: string, question: PaperQuestion, number: number, choiceScore: number): string {
  const optionCount = question.options?.length ?? 0;

  if (/英语/.test(subject)) {
    if (!optionCount) return '短文写作';
    if (optionCount >= 6) return '补全对话';
    if (question.score >= 3) return '阅读理解';
    if (question.score >= 2) return '完形填空';
    return number <= 5 ? '语音知识' : '词汇与语法';
  }

  if (/政治/.test(subject)) {
    if (!optionCount) return question.score >= 20 ? '论述题' : '简答题';
    return '单项选择题';
  }

  if (/数学/.test(subject)) {
    if (!optionCount) return question.score > choiceScore ? '解答题' : '填空题';
    return '选择题';
  }

  return optionCount ? '单项选择题' : '问答题';
}

/** 按真实考试板块分组，组内保持原卷题号顺序，组间按首次出现顺序 */
export function buildQuestionGroups(subject: string, items: NumberedQuestion[]): QuestionGroup[] {
  const choiceScore = choiceScoreOf(items.map((item) => item.question));
  const groups: QuestionGroup[] = [];
  const byLabel = new Map<string, QuestionGroup>();

  for (const item of items) {
    const label = labelOf(subject, item.question, item.number, choiceScore);
    let group = byLabel.get(label);
    if (!group) {
      group = { label, items: [] };
      byLabel.set(label, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  return groups;
}

/** 客观题统计：交卷后用 */
export function objectiveTally(questions: PaperQuestion[], picks: Record<number, string>) {
  let right = 0;
  let answered = 0;
  let scored = 0;
  let scoredFull = 0;
  let objectiveCount = 0;
  let subjectiveCount = 0;

  for (const question of questions) {
    if (!isObjective(question)) {
      subjectiveCount += 1;
      continue;
    }
    objectiveCount += 1;
    scoredFull += question.score;
    if (picks[question.id]) answered += 1;
    if (picks[question.id] === answerKeyOf(question)) {
      right += 1;
      scored += question.score;
    }
  }

  return { right, answered, scored, scoredFull, objectiveCount, subjectiveCount };
}
