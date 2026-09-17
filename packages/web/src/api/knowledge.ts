import { client, unwrap } from './client';

/** 必背考点卡里的关联真题（政治 / 高等数学一共用同一结构） */
export interface KnowledgeRef {
  qtype: string;
  typeClass: string;
  label: string;
  year: number | null;
  number: number | null;
  score: string;
  stem: string;
  options: { k: string; text: string; correct: boolean }[];
  correct: string | null;
  answerText: string | null;
  /** 高等数学一：官方解析（即逐题解题步骤，含 LaTeX） */
  analysis?: string | null;
}

/** 高等数学一知识点卡的例题（库里没有可对照真题时使用） */
export interface KnowledgeExample {
  label: string;
  stem: string;
  steps: string[];
  answer?: string | null;
}

/** 高等数学一「常用角度三角函数值表」 */
export interface KnowledgeTable {
  head: string[];
  rows: string[][];
  notes: string[];
}

/** extra_json 的结构化附加数据，按科目形态不同 */
export interface KnowledgeExtra {
  origin?: string;
  section?: string | null;
  group?: string | null;
  hero?: boolean;
  chapter?: string;
  /** 章节引导语（HTML 片段，仅「必背清单 / 必背词汇 / 必背公式」三个 list 章有） */
  chapterIntro?: string | null;
  /** 政治哲学章：题面优先级药丸（A 高频必背 / B 基础必懂 / C 可放弃） */
  priority?: { level: string; label: string; tip: string };
  /** 政治 / 数学：关联真题卡 */
  refs?: KnowledgeRef[];
  /** 英语：音标 / 点读文本 / 释义 */
  ipa?: string;
  say?: string;
  cn?: string;
  /** 高等数学一：卡片形态（formula=公式卡 / method=知识点卡 / table=速查表） */
  kind?: 'formula' | 'method' | 'table';
  /** 高等数学一：LaTeX 原串与说明 */
  tex?: string;
  note?: string;
  tail?: string;
  /** 高等数学一知识点卡：说明 / 要点 / 解题步骤 / 所属模块与模块导语 */
  texNote?: string;
  points?: string[];
  steps?: string[];
  module?: string;
  groupIntro?: string;
  /** 该知识点在 11 套卷里题面命中的总题数（展示口径，非人工归类） */
  hitCount?: number;
  /** 无真题可对照时的例题 + 解答 */
  example?: KnowledgeExample | null;
  /** 三角函数值表 */
  table?: KnowledgeTable;
}

export interface KnowledgeItem {
  id: number;
  subject_id: number | null;
  subject: { id: number; name: string; color: string } | null;
  title: string;
  content: string;
  item_type: string;
  tags: string[];
  source: string | null;
  /** 文档顺序，必背考点模块按它排序 */
  sort_order: number | null;
  extra: KnowledgeExtra | null;
  created_at: string;
  updated_at: string;
}

export interface SearchKnowledgeParams {
  subject_id?: number;
  keyword?: string;
  tag?: string;
  item_type?: string;
  order?: 'sort' | 'updated';
  origin?: string;
  limit?: number;
}

export const searchKnowledge = (params?: SearchKnowledgeParams) =>
  unwrap<{ total: number; list: KnowledgeItem[] }>(client.get('/knowledge', { params }));

/** 内置「5 周冲刺保底方案」迁移出的必背考点模块数据来源标记 */
export const MUST_READ_ORIGIN = 'sprint5w';

/**
 * 必背考点模块：按科目取「章节正文 + 卡片」全量条目，按文档顺序返回（章节 → 分组 → 组内）。
 * 用 origin 精确圈定模块内容，用户自己创建的 NOTE / MATERIAL 不会混进来。
 */
export const fetchMustRead = async (subjectId: number) =>
  (
    await searchKnowledge({
      subject_id: subjectId,
      origin: MUST_READ_ORIGIN,
      order: 'sort',
      limit: 500,
    })
  ).list;

/** 只取条数（limit=1 拿 total），用于科目分段控件显示 N 条 */
export const fetchMustReadCount = async (subjectId: number) => {
  const { total } = await searchKnowledge({
    subject_id: subjectId,
    origin: MUST_READ_ORIGIN,
    order: 'sort',
    limit: 1,
  });
  return total;
};

export const getKnowledge = (id: number) => unwrap<KnowledgeItem>(client.get(`/knowledge/${id}`));
export const createKnowledge = (payload: { title: string; content: string; subject_id?: number }) =>
  unwrap<KnowledgeItem>(client.post('/knowledge', payload));
