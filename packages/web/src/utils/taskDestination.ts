import type { PlanTask } from '@/api/plan';

export type TaskResourceKind = 'vocabulary' | 'knowledge' | 'papers' | 'mistakes' | 'essays' | 'checklist';

export interface TaskDestination {
  kind: TaskResourceKind;
  label: string;
  hint: string;
  keyword: string;
  knowledgeTitles: string[];
}

function cleanTopic(value: string): string {
  return value
    .replace(/^(政治|英语|高等数学（一）|高数一)(专项)?[：:]/, '')
    .replace(/\s*等\s*\d+\s*项$/, '')
    .replace(/(专项|薄弱点清零|整套真题限时实战|整卷订正与二次作答|最后清单)$/, '')
    .trim();
}

export function taskDestination(task: PlanTask): TaskDestination {
  const text = `${task.title}\n${task.description ?? ''}`;
  const knowledgeMatch = task.description?.match(/按顺序学习并口述：(.+?)。学习后/);
  const knowledgeTitles = knowledgeMatch?.[1]
    ?.split('；')
    .map((title) => title.trim())
    .filter(Boolean) ?? [];
  const quotedTopic = task.description?.match(/[“"](.+?)[”"]/u)?.[1] ?? '';
  const keyword = knowledgeTitles[0] ?? quotedTopic ?? cleanTopic(task.title);

  if (/考试准备：/.test(task.title)) {
    return { kind: 'checklist', label: '执行考前清单', hint: '按清单逐项确认，无需跳转到其他模块。', keyword: '', knowledgeTitles: [] };
  }
  if (/英语词汇/.test(task.title)) {
    return { kind: 'vocabulary', label: '开始背单词', hint: '进入今日词汇队列，完成新词与到期复习。', keyword: '高频词汇', knowledgeTitles: [] };
  }
  if (task.task_type === 'STUDY' || knowledgeTitles.length) {
    return { kind: 'knowledge', label: '学习对应知识点', hint: '已按本任务的大纲顺序匹配知识库。', keyword, knowledgeTitles };
  }
  if (task.task_type === 'PRACTICE') {
    if (/作文|写作/.test(text) && !/阅读|完形|整套/.test(text)) {
      return { kind: 'essays', label: '进入作文训练', hint: '使用模板完成写作并进行自查。', keyword, knowledgeTitles: [] };
    }
    return { kind: 'papers', label: '开始真题或专项训练', hint: '已按科目筛选可用真题，完成后记录错因。', keyword, knowledgeTitles: [] };
  }
  return { kind: 'mistakes', label: '进入错题复盘', hint: '优先重做当前科目的到期错题和薄弱题。', keyword, knowledgeTitles: [] };
}

export function taskRoute(taskId: number, mobile: boolean) {
  return { name: mobile ? 'm-task-execution' : 'task-execution', params: { taskId } };
}
