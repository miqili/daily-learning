export const ERROR_REASONS = ['CONCEPT', 'CALCULATION', 'CARELESS', 'MEMORY', 'OTHER'] as const;
export type ErrorReason = (typeof ERROR_REASONS)[number];

export const KNOWLEDGE_TYPES = ['NOTE', 'MATERIAL', 'LINK'] as const;
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];

export const TASK_TYPES = ['STUDY', 'REVIEW', 'VOCABULARY', 'PRACTICE'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const ACTIVITY_TYPES = ['READING', 'PRACTICE', 'VOCABULARY', 'REVIEW', 'OTHER'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export const ERROR_REASON_LABELS: Record<ErrorReason, string> = {
  CONCEPT: '概念不清',
  CALCULATION: '计算失误',
  CARELESS: '审题遗漏',
  MEMORY: '记忆混淆',
  OTHER: '其他',
};

export const KNOWLEDGE_TYPE_LABELS: Record<KnowledgeType, string> = {
  NOTE: '笔记',
  MATERIAL: '资料',
  LINK: '链接',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  STUDY: '学习',
  REVIEW: '复习',
  VOCABULARY: '背单词',
  PRACTICE: '练习',
};

/** 错题/单词复习间隔：L0→1天, L1→2天, L2→4天, L3→7天, L4→已掌握 */
export function reviewIntervalDays(masteryLevel: number): number | null {
  const intervals = [1, 2, 4, 7];
  return intervals[masteryLevel] ?? null;
}

export const MASTERY_MAX = 4;

/** 计划核心常量：70 天、默认考试日 */
export const PLAN_DAYS = 70;
export const DEFAULT_EXAM_DATE = '2026-10-24';

/** 计划阶段：基础夯实 → 强化训练 → 真题冲刺 → 错题清零 */
export const PLAN_PHASES = [
  { phase: '基础夯实', dayStart: 1, dayEnd: 20, taskType: 'STUDY' },
  { phase: '强化训练', dayStart: 21, dayEnd: 45, taskType: 'PRACTICE' },
  { phase: '真题冲刺', dayStart: 46, dayEnd: 60, taskType: 'PRACTICE' },
  { phase: '错题清零', dayStart: 61, dayEnd: 70, taskType: 'REVIEW' },
] as const;

export type PlanPhaseName = (typeof PLAN_PHASES)[number]['phase'];

/** 计划生成时传入的科目（可带权重，weight=0 表示不安排该科） */
export interface PlanSubjectInput {
  id: number;
  name: string;
  color: string;
  weight?: number;
}

/** 一天的某科任务模板 */
export interface PlanTaskTemplate {
  dayNumber: number;
  phase: PlanPhaseName;
  taskType: TaskType;
  title: string;
  description: string;
}

export function planPhaseForDay(dayNumber: number) {
  return PLAN_PHASES.find((p) => dayNumber >= p.dayStart && dayNumber <= p.dayEnd) ?? PLAN_PHASES[PLAN_PHASES.length - 1];
}

const SUBJECT_KIND = (name: string): 'MATH' | 'ENGLISH' | 'POLITICS' | 'OTHER' => {
  if (/高数|数学|微积分/.test(name)) return 'MATH';
  if (/英语|english/i.test(name)) return 'ENGLISH';
  if (/政治|思政/.test(name)) return 'POLITICS';
  return 'OTHER';
};

/** 按科目与阶段生成当天任务标题/描述 */
export function buildDailyTask(subjectName: string, dayNumber: number, phase: PlanPhaseName): { title: string; description: string } {
  const kind = SUBJECT_KIND(subjectName);
  const day = dayNumber;

  const titles: Record<string, string> = {
    MATH: '高等数学（一）',
    ENGLISH: '英语',
    POLITICS: '政治',
    OTHER: subjectName,
  };
  const label = titles[kind];

  switch (phase) {
    case '基础夯实':
      if (kind === 'MATH') return { title: `${label}：基础概念与公式`, description: `第 ${day} 天：复习函数、极限、导数基础，整理公式卡片并默写一遍。` };
      if (kind === 'ENGLISH') return { title: `${label}：高频词汇与语法`, description: `第 ${day} 天：背诵高频词汇并完成一组语法练习，记录生词。` };
      if (kind === 'POLITICS') return { title: `${label}：考点梳理`, description: `第 ${day} 天：梳理核心概念与简答要点，建立章节框架。` };
      return { title: `${subjectName}：基础学习`, description: `第 ${day} 天：复习${subjectName}核心概念与基础知识点。` };
    case '强化训练':
      if (kind === 'MATH') return { title: `${label}：导数与积分专项`, description: `第 ${day} 天：完成导数/积分专项练习，标注错因并订正。` };
      if (kind === 'ENGLISH') return { title: `${label}：阅读与长难句`, description: `第 ${day} 天：精读 2 篇阅读，拆解长难句结构并积累表达。` };
      if (kind === 'POLITICS') return { title: `${label}：主观题训练`, description: `第 ${day} 天：练习简答/论述题，按要点框架作答并对照答案。` };
      return { title: `${subjectName}：强化练习`, description: `第 ${day} 天：完成${subjectName}针对性练习，记录薄弱点。` };
    case '真题冲刺':
      if (kind === 'MATH') return { title: `${label}：真题套卷`, description: `第 ${day} 天：限时完成一套${label}真题/模拟卷并订正。` };
      if (kind === 'ENGLISH') return { title: `${label}：真题套卷`, description: `第 ${day} 天：限时完成一套${label}真题，分析错题原因。` };
      if (kind === 'POLITICS') return { title: `${label}：真题套卷`, description: `第 ${day} 天：完成一套${label}真题，背诵简答/论述要点。` };
      return { title: `${subjectName}：真题冲刺`, description: `第 ${day} 天：完成一套${subjectName}真题并订正。` };
    case '错题清零':
    default:
      return { title: `${label}：错题复习`, description: `第 ${day} 天：复习${label}错题队列与薄弱点，重做错题直至掌握。` };
  }
}

/** 某一天的某科任务模板（含科目 ID） */
export type PlanTaskWithSubject = PlanTaskTemplate & { subjectId: number };

/** 生成某一天的（按科目配置）任务模板 */
export function getPlanTasksForDay(dayNumber: number, subjects: PlanSubjectInput[]): PlanTaskWithSubject[] {
  const phase = planPhaseForDay(dayNumber);
  return subjects
    .filter((subject) => (subject.weight ?? 1) > 0)
    .map((subject) => {
      const { title, description } = buildDailyTask(subject.name, dayNumber, phase.phase);
      return { dayNumber, phase: phase.phase, taskType: phase.taskType, title, description, subjectId: subject.id };
    });
}

/** 词汇/短语分级：1 高频 / 2 核心 / 3 拓展 */
export const VOCAB_LEVELS = [1, 2, 3] as const;
export type VocabLevel = (typeof VOCAB_LEVELS)[number];

export const VOCAB_LEVEL_LABELS: Record<number, string> = {
  1: '高频',
  2: '核心',
  3: '拓展',
};

/** 每日新词目标默认值 */
export const DEFAULT_DAILY_WORD_TARGET = 20;

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  READING: '看书',
  PRACTICE: '做题',
  VOCABULARY: '背单词',
  REVIEW: '复习',
  OTHER: '其他',
};

/** 作文类型 */
export const ESSAY_TYPES = ['LETTER', 'ARGUMENT', 'NOTICE', 'APPLICATION'] as const;
export type EssayType = (typeof ESSAY_TYPES)[number];

export const ESSAY_TYPE_LABELS: Record<EssayType, string> = {
  LETTER: '书信',
  ARGUMENT: '议论文',
  NOTICE: '通知',
  APPLICATION: '申请信',
};
