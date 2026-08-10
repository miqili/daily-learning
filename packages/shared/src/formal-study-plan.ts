const DAY_MS = 86_400_000;

export type FormalPlanPhase = '大纲通关' | '专项强化' | '真题实战' | '考前收口';

export interface FormalPlanSubject {
  id: number;
  name: string;
  weight?: number;
}

export interface FormalPlanKnowledge {
  subject: string;
  title: string;
  tags?: string[] | null;
}

export interface FormalPlanTask {
  planDate: string;
  subjectId: number | null;
  title: string;
  description: string;
  taskType: 'STUDY' | 'PRACTICE' | 'REVIEW';
  estimatedMinutes: number;
  phase: FormalPlanPhase;
}

interface DayContext {
  index: number;
  total: number;
  date: Date;
  dateText: string;
  weekend: boolean;
  phase: FormalPlanPhase;
}

type SubjectKind = 'MATH' | 'ENGLISH' | 'POLITICS';

const KIND_PATTERNS: Record<SubjectKind, RegExp> = {
  MATH: /高数|数学|微积分/,
  ENGLISH: /英语|english/i,
  POLITICS: /政治|思政/,
};

const CURRICULUM_ORDER: Record<SubjectKind, RegExp[]> = {
  MATH: [
    /函数（|极限的定义/, /极限/, /连续/, /导数与微分/, /求导公式/, /中值定理/, /洛必达/, /单调性|极值与最值/, /凹凸性/,
    /不定积分/, /积分公式/, /定积分|牛顿/, /定积分应用|积分的几何/, /空间解析几何/, /多元函数微分/, /多元函数极值/,
    /二重积分/, /无穷级数/, /常微分方程/, /选择题/, /失分点/,
  ],
  ENGLISH: [
    /语音/, /名词（/, /冠词/, /代词/, /形容词/, /数词/, /介词/, /时态/, /被动语态/, /情态动词/, /非谓语/,
    /句子结构/, /定语从句/, /名词性从句/, /状语从句/, /虚拟语气/, /倒装句/, /主谓一致/, /词汇/, /完形填空/,
    /阅读理解：细节|阅读理解定位/, /阅读理解：主旨/, /阅读理解：词义/, /补全对话/, /写作|作文/,
  ],
  POLITICS: [
    /哲学与/, /物质与意识/, /世界的物质/, /联系与发展/, /对立统一/, /质量互变/, /否定之否定/, /实践与认识/, /真理/,
    /社会存在/, /社会基本矛盾/, /阶级、国家/, /人民群众/, /毛泽东思想/, /新民主主义/, /社会主义改造/, /社会主义社会矛盾/,
    /邓小平/, /三个代表/, /科学发展观/, /新时代思想核心/, /六个必须坚持/, /党的全面领导/, /以人民为中心/,
    /新发展理念/, /新质生产力/, /五位一体/, /四个全面/, /全过程人民民主/, /依法治国/, /文化自信/, /民生/, /生态文明/,
    /国家安全/, /一国两制/, /大国外交/, /从严治党/, /中国式现代化/, /四中全会/, /两会/, /简答题/, /论述题/, /高频考点/,
  ],
};

const PRACTICE_TOPICS: Record<SubjectKind, string[]> = {
  MATH: ['极限与连续', '导数、微分与中值定理', '导数应用：单调、极值、凹凸与渐近线', '不定积分', '定积分及几何应用', '空间解析几何', '多元函数微积分与极值', '二重积分', '无穷级数', '常微分方程'],
  ENGLISH: ['语法与词汇选择', '完形填空', '阅读细节与定位', '阅读主旨、推断与态度', '词义猜测与指代', '补全对话', '应用文写作', '综合阅读与长难句'],
  POLITICS: ['马克思主义哲学选择题', '毛泽东思想与中国特色社会主义理论体系', '习近平新时代中国特色社会主义思想', '2026时政与“十五五”', '简答题分点作答', '论述题：理论联系材料'],
};

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateText(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function kindOf(name: string): SubjectKind | null {
  return (Object.keys(KIND_PATTERNS) as SubjectKind[]).find((kind) => KIND_PATTERNS[kind].test(name)) ?? null;
}

function phaseFor(index: number, total: number): FormalPlanPhase {
  const progress = (index + 1) / total;
  if (progress <= 21 / 68) return '大纲通关';
  if (progress <= 42 / 68) return '专项强化';
  if (progress <= 56 / 68) return '真题实战';
  return '考前收口';
}

function estimatedDescription(minutes: number, detail: string, output: string): string {
  return `预计 ${minutes} 分钟｜${detail}\n完成标准：${output}`;
}

function task(
  context: DayContext,
  subjectId: number | null,
  title: string,
  minutes: number,
  detail: string,
  output: string,
  taskType: FormalPlanTask['taskType'],
): FormalPlanTask {
  return {
    planDate: context.dateText,
    subjectId,
    title,
    description: estimatedDescription(minutes, detail, output),
    taskType,
    estimatedMinutes: minutes,
    phase: context.phase,
  };
}

function curriculumIndex(kind: SubjectKind, title: string): number {
  const found = CURRICULUM_ORDER[kind].findIndex((pattern) => pattern.test(title));
  return found < 0 ? CURRICULUM_ORDER[kind].length : found;
}

function splitEvenly<T>(items: T[], pieces: number): T[][] {
  if (pieces <= 0) return [];
  const result: T[][] = [];
  let cursor = 0;
  for (let piece = 0; piece < pieces; piece += 1) {
    const remainingItems = items.length - cursor;
    const remainingPieces = pieces - piece;
    const size = Math.ceil(remainingItems / remainingPieces);
    result.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  return result;
}

function subjectMap(subjects: FormalPlanSubject[]): Map<SubjectKind, FormalPlanSubject> {
  const result = new Map<SubjectKind, FormalPlanSubject>();
  for (const subject of subjects) {
    if ((subject.weight ?? 1) <= 0) continue;
    const kind = kindOf(subject.name);
    if (kind) result.set(kind, subject);
  }
  return result;
}

function dailyVocabulary(context: DayContext, englishId: number | null): FormalPlanTask {
  const newWords = context.phase === '考前收口' ? 0 : context.weekend ? 50 : 35;
  const detail = newWords
    ? `学习 ${newWords} 个高频/核心词，复习系统到期词；结合 10 个短语或例句。`
    : '停止扩充新词，只复习高频词、易混词、写作词和系统到期词。';
  return task(context, englishId, newWords ? `英语词汇：新词 ${newWords} + 间隔复习` : '英语词汇：考前滚动复习', context.weekend ? 30 : 20, detail, '完成词卡复习；不认识的词进入待复习队列。', 'REVIEW');
}

function reviewTask(context: DayContext, subjectId: number | null, weekend = false): FormalPlanTask {
  return task(
    context,
    subjectId,
    weekend ? '本周闭环：错题、遗留任务与下周重点' : '当日闭环：错题与闭卷回忆',
    weekend ? 45 : 20,
    weekend ? '重做本周错题，清理未完成任务，记录下周三个最薄弱专题。' : '不看笔记回忆当天要点；重做至少 2 道错题或口述一道主观题。',
    weekend ? '形成一页周复盘和下周薄弱点清单。' : '错题写清错因、正确规则和复练日期。',
    'REVIEW',
  );
}

function foundationSlots(days: DayContext[], kinds: SubjectKind[]): Map<string, SubjectKind[]> {
  const result = new Map<string, SubjectKind[]>();
  let weekdayCursor = 0;
  for (const day of days.filter((item) => item.phase === '大纲通关')) {
    if (day.weekend) {
      result.set(day.dateText, [...kinds]);
    } else {
      result.set(day.dateText, [kinds[weekdayCursor % kinds.length]]);
      weekdayCursor += 1;
    }
  }
  return result;
}

function buildFoundation(
  days: DayContext[],
  subjects: Map<SubjectKind, FormalPlanSubject>,
  knowledge: FormalPlanKnowledge[],
): Map<string, FormalPlanTask[]> {
  const kinds = [...subjects.keys()];
  const slots = foundationSlots(days, kinds);
  const slotCount = new Map<SubjectKind, number>(kinds.map((kind) => [kind, 0]));
  for (const dailyKinds of slots.values()) {
    for (const kind of dailyKinds) slotCount.set(kind, (slotCount.get(kind) ?? 0) + 1);
  }

  const chunks = new Map<SubjectKind, FormalPlanKnowledge[][]>();
  for (const kind of kinds) {
    const subject = subjects.get(kind)!;
    const items = knowledge
      .filter((item) => item.subject === subject.name)
      .sort((a, b) => curriculumIndex(kind, a.title) - curriculumIndex(kind, b.title) || a.title.localeCompare(b.title, 'zh-CN'));
    chunks.set(kind, splitEvenly(items, slotCount.get(kind) ?? 1));
  }

  const output = new Map<string, FormalPlanTask[]>();
  for (const day of days.filter((item) => item.phase === '大纲通关')) {
    const daily: FormalPlanTask[] = [dailyVocabulary(day, subjects.get('ENGLISH')?.id ?? null)];
    for (const kind of slots.get(day.dateText) ?? []) {
      const subject = subjects.get(kind)!;
      const titles = chunks.get(kind)?.shift()?.map((item) => item.title) ?? [];
      const minutes = day.weekend ? (kind === 'MATH' ? 90 : kind === 'ENGLISH' ? 75 : 60) : 50;
      daily.push(task(
        day,
        subject.id,
        `${subject.name}：${titles[0] ?? '大纲知识'}${titles.length > 1 ? ` 等 ${titles.length} 项` : ''}`,
        minutes,
        `按顺序学习并口述：${titles.join('；')}。学习后完成对应基础题或自测。`,
        `每个知识点写出“核心结论 + 常见考法 + 1 个易错点”；正确率达到 70%。`,
        'STUDY',
      ));
    }
    daily.push(reviewTask(day, (slots.get(day.dateText)?.[0] && subjects.get(slots.get(day.dateText)![0])?.id) ?? null, day.weekend));
    output.set(day.dateText, daily);
  }
  return output;
}

function mainKindForWeekday(index: number): SubjectKind {
  return (['MATH', 'ENGLISH', 'POLITICS', 'MATH', 'ENGLISH'] as SubjectKind[])[index % 5];
}

function practiceTask(context: DayContext, kind: SubjectKind, subject: FormalPlanSubject, topicIndex: number, minutes: number): FormalPlanTask {
  const topics = PRACTICE_TOPICS[kind];
  const topic = topics[topicIndex % topics.length];
  const detail = kind === 'MATH'
    ? `完成“${topic}”选择/填空基础题与 1 道解答题，所有步骤写全。`
    : kind === 'ENGLISH'
      ? `完成“${topic}”限时训练；阅读和完形必须标定位依据，写作必须检查要点。`
      : `完成“${topic}”选择题或主观题训练，答案使用规范术语并分点。`;
  return task(context, subject.id, `${subject.name}专项：${topic}`, minutes, detail, '订正全部错误并至少重做 2 题；专项正确率达到 75%。', 'PRACTICE');
}

function buildReinforcement(days: DayContext[], subjects: Map<SubjectKind, FormalPlanSubject>): Map<string, FormalPlanTask[]> {
  const output = new Map<string, FormalPlanTask[]>();
  const counters: Record<SubjectKind, number> = { MATH: 0, ENGLISH: 0, POLITICS: 0 };
  let weekdayIndex = 0;
  for (const day of days.filter((item) => item.phase === '专项强化')) {
    const daily: FormalPlanTask[] = [dailyVocabulary(day, subjects.get('ENGLISH')?.id ?? null)];
    if (day.weekend) {
      for (const kind of ['MATH', 'ENGLISH', 'POLITICS'] as SubjectKind[]) {
        const subject = subjects.get(kind);
        if (!subject) continue;
        const minutes = kind === 'MATH' ? 90 : kind === 'ENGLISH' ? 75 : 60;
        daily.push(practiceTask(day, kind, subject, counters[kind]++, minutes));
      }
      daily.push(reviewTask(day, null, true));
    } else {
      const preferred = mainKindForWeekday(weekdayIndex++);
      const kind = subjects.has(preferred) ? preferred : [...subjects.keys()][0];
      const subject = subjects.get(kind)!;
      daily.push(practiceTask(day, kind, subject, counters[kind]++, 50));
      daily.push(reviewTask(day, subject.id));
    }
    output.set(day.dateText, daily);
  }
  return output;
}

function paperFocus(kind: SubjectKind): string {
  if (kind === 'MATH') return '按 150 分钟完成整套高数一真题，先选择填空后解答题；结束后立即标记不确定题。';
  if (kind === 'ENGLISH') return '按 150 分钟完成整套英语真题，严格执行阅读、完形、对话、写作时间分配。';
  return '按 150 分钟完成整套政治真题，选择题限时，简答和论述必须写完整得分点。';
}

function buildPaperPhase(days: DayContext[], subjects: Map<SubjectKind, FormalPlanSubject>): Map<string, FormalPlanTask[]> {
  const output = new Map<string, FormalPlanTask[]>();
  let weekdayIndex = 0;
  let weekendIndex = 0;
  const weekendKinds: SubjectKind[] = ['MATH', 'ENGLISH', 'POLITICS', 'MATH'];
  for (const day of days.filter((item) => item.phase === '真题实战')) {
    const daily: FormalPlanTask[] = [dailyVocabulary(day, subjects.get('ENGLISH')?.id ?? null)];
    if (day.weekend) {
      const requested = weekendKinds[weekendIndex++ % weekendKinds.length];
      const kind = subjects.has(requested) ? requested : [...subjects.keys()][0];
      const subject = subjects.get(kind)!;
      daily.push(task(day, subject.id, `${subject.name}：整套真题限时实战`, 150, paperFocus(kind), '记录原始分数、各题型耗时和三类失分原因。', 'PRACTICE'));
      daily.push(task(day, subject.id, `${subject.name}：整卷订正与二次作答`, 90, '逐题核对答案；不会、会但错、时间不够分别标记；遮住答案重做。', '形成整卷复盘，所有错题进入错题库。', 'REVIEW'));
      const secondary = kind === 'MATH' ? subjects.get('POLITICS') : subjects.get('MATH');
      if (secondary) daily.push(practiceTask(day, kind === 'MATH' ? 'POLITICS' : 'MATH', secondary, weekendIndex, 60));
    } else {
      const preferred = mainKindForWeekday(weekdayIndex++);
      const kind = subjects.has(preferred) ? preferred : [...subjects.keys()][0];
      const subject = subjects.get(kind)!;
      daily.push(practiceTask(day, kind, subject, weekdayIndex + 4, 50));
      daily.push(reviewTask(day, subject.id));
    }
    output.set(day.dateText, daily);
  }
  return output;
}

function buildFinalPhase(days: DayContext[], subjects: Map<SubjectKind, FormalPlanSubject>): Map<string, FormalPlanTask[]> {
  const output = new Map<string, FormalPlanTask[]>();
  let weekdayIndex = 0;
  for (const day of days.filter((item) => item.phase === '考前收口')) {
    const isLastDay = day.index === day.total - 1;
    const daily: FormalPlanTask[] = [dailyVocabulary(day, subjects.get('ENGLISH')?.id ?? null)];
    if (isLastDay) {
      for (const kind of ['MATH', 'ENGLISH', 'POLITICS'] as SubjectKind[]) {
        const subject = subjects.get(kind);
        if (!subject) continue;
        const focus = kind === 'MATH' ? '公式、定义域、易错条件' : kind === 'ENGLISH' ? '写作格式、易混词、答题顺序' : '主观题框架、2026时政数字、规范表述';
        daily.push(task(day, subject.id, `${subject.name}：最后清单`, 15, `只看已经整理好的${focus}，不做新题。`, '能口述关键清单；发现遗忘只做标记，不扩展新内容。', 'REVIEW'));
      }
      daily.push(task(day, null, '考试准备：证件、路线、作息与文具', 20, '确认准考证、身份证、文具、交通路线和出发时间；按考试作息提前休息。', '22:30 前停止学习并保证睡眠。', 'REVIEW'));
    } else if (day.weekend) {
      const math = subjects.get('MATH');
      const english = subjects.get('ENGLISH');
      const politics = subjects.get('POLITICS');
      if (math) daily.push(task(day, math.id, '高数一：错题母题与公式条件清零', 90, '只重做错题库中仍不稳定的母题，覆盖极限、导数、积分、多元、级数和微分方程。', '同类题正确率达到 80%，仍错的压缩进最后清单。', 'REVIEW'));
      if (english) daily.push(task(day, english.id, '英语：阅读完形与写作稳定性', 75, '限时完成阅读/完形组合训练，并写一篇 100—120 词短文。', '完成订正和作文自查，固定答题节奏。', 'PRACTICE'));
      if (politics) daily.push(task(day, politics.id, '政治：选择题与主观题关键词清零', 60, '复练易错选择题，口述 4 道简答和 2 道论述框架，滚动复习2026时政。', '关键词完整、分点清楚，不再扩展陌生材料。', 'REVIEW'));
      daily.push(reviewTask(day, null, true));
    } else {
      const preferred = mainKindForWeekday(weekdayIndex++);
      const kind = subjects.has(preferred) ? preferred : [...subjects.keys()][0];
      const subject = subjects.get(kind)!;
      daily.push(task(day, subject.id, `${subject.name}：薄弱点清零`, 50, `从错题库选择 ${PRACTICE_TOPICS[kind][weekdayIndex % PRACTICE_TOPICS[kind].length]} 薄弱点复练，不接触偏题难题。`, '重做正确并能说明原错因。', 'REVIEW'));
      daily.push(reviewTask(day, subject.id));
    }
    output.set(day.dateText, daily);
  }
  return output;
}

export function buildFormalStudyPlan(input: {
  startDate: string;
  examDate: string;
  subjects: FormalPlanSubject[];
  knowledge: FormalPlanKnowledge[];
}): FormalPlanTask[] {
  const start = parseDate(input.startDate);
  const exam = parseDate(input.examDate);
  const total = Math.round((exam.getTime() - start.getTime()) / DAY_MS);
  if (!Number.isFinite(total) || total < 1) throw new Error('学习开始日期必须早于考试日期。');

  const days: DayContext[] = Array.from({ length: total }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    return {
      index,
      total,
      date,
      dateText: dateText(date),
      weekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
      phase: phaseFor(index, total),
    };
  });
  const subjects = subjectMap(input.subjects);
  if (subjects.size === 0) return [];

  const maps = [
    buildFoundation(days, subjects, input.knowledge),
    buildReinforcement(days, subjects),
    buildPaperPhase(days, subjects),
    buildFinalPhase(days, subjects),
  ];
  return days.flatMap((day) => maps.flatMap((map) => map.get(day.dateText) ?? []));
}
