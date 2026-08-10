import { BUILTIN_KNOWLEDGE_2026 } from './builtin-knowledge-2026';
import { BUILTIN_KNOWLEDGE_SNAPSHOT } from './builtin-knowledge-snapshot';

/** 内置知识点，正文支持 Markdown + KaTeX。 */
export interface BuiltinKnowledge {
  subject: string;
  title: string;
  content: string;
  tags?: string[];
  source?: string | null;
}

/**
 * 先加载已审计的 74 条基线，再加载 2026 补缺项。
 * 同名条目由 seed 按顺序更新，因此补缺文件也可以安全修订旧内容。
 */
export const BUILTIN_KNOWLEDGE: BuiltinKnowledge[] = [
  ...BUILTIN_KNOWLEDGE_SNAPSHOT,
  ...BUILTIN_KNOWLEDGE_2026,
];
