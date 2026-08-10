import type { DataSource, EntityManager } from 'typeorm';
import { ExamPaper } from '../entities/exam-paper.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { VERIFIED_PAPERS, type PaperSourceType } from './builtin-verified-papers';

interface AuditOverride {
  subject: string;
  year: number;
  sourceType: PaperSourceType;
  isComplete: boolean;
  expectedQuestionCount: number;
  verificationNotes: string;
}

const AUDIT_OVERRIDES: AuditOverride[] = [
  ...[2021, 2022, 2023, 2024, 2025].map((year) => ({
    subject: '政治',
    year,
    sourceType: 'UNVERIFIED' as const,
    isComplete: true,
    expectedQuestionCount: 41,
    verificationNotes: '题量与现行考试结构一致，但数据库没有保留原始来源链接；完整度仅指题量完整，来源仍待逐题回溯核验。',
  })),
  {
    subject: '英语',
    year: 2025,
    sourceType: 'UNVERIFIED',
    isComplete: false,
    expectedQuestionCount: 61,
    verificationNotes: '现有 53 题、126 分；缺少阅读理解第 48—55 题，且原始来源链接未留存，不能标记为完整真题。',
  },
  {
    subject: '高等数学（一）',
    year: 2024,
    sourceType: 'SINGLE_SOURCE_RECALL',
    isComplete: false,
    expectedQuestionCount: 18,
    verificationNotes: '现有 9 题、63 分；公开题库页显示整卷应为 18 题、150 分，当前仅为不完整回忆内容，待原图 OCR 与逐题验算。',
  },
];

async function auditExistingPapers(manager: EntityManager) {
  const papers = manager.getRepository(ExamPaper);
  for (const audit of AUDIT_OVERRIDES) {
    const paper = await papers.findOneBy({ subject: audit.subject, year: audit.year });
    if (!paper) continue;
    paper.sourceType = audit.sourceType;
    paper.isComplete = audit.isComplete;
    paper.expectedQuestionCount = audit.expectedQuestionCount;
    paper.verificationNotes = audit.verificationNotes;
    await papers.save(paper);
  }
}

export async function syncVerifiedPapers(dataSource: DataSource) {
  return dataSource.transaction(async (manager) => {
    const papers = manager.getRepository(ExamPaper);
    const questions = manager.getRepository(ExamQuestion);
    const synced: Array<{ subject: string; year: number; questions: number }> = [];

    await auditExistingPapers(manager);

    for (const item of VERIFIED_PAPERS) {
      let paper = await papers.findOneBy({ subject: item.subject, year: item.year });
      const wasManagedSource = !paper || (
        paper.sourceType === item.sourceType
        && (paper.sourceUrl === item.sourceUrl || paper.source === '示例')
      );
      if (!paper) {
        paper = papers.create({
          subject: item.subject,
          year: item.year,
          title: item.title,
          source: item.source,
          sourceUrl: item.sourceUrl,
          sourceType: item.sourceType,
          isComplete: item.isComplete,
          expectedQuestionCount: item.expectedQuestionCount,
          verificationNotes: item.verificationNotes,
        });
      } else {
        paper.title = item.title;
        paper.source = item.source;
        paper.sourceUrl = item.sourceUrl;
        paper.sourceType = item.sourceType;
        paper.isComplete = item.isComplete;
        paper.expectedQuestionCount = item.expectedQuestionCount;
        paper.verificationNotes = item.verificationNotes;
      }
      paper = await papers.save(paper);

      const existing = await questions.find({ where: { paperId: paper.id }, order: { sortOrder: 'ASC', id: 'ASC' } });
      const mayReplace = existing.length === 0
        || existing.every((question) => question.content.includes('示例'))
        || wasManagedSource;
      if (!mayReplace) {
        throw new Error(`${item.year} 年${item.subject}已有 ${existing.length} 道非内置题，已停止覆盖。`);
      }

      if (existing.length) await questions.delete({ paperId: paper.id });
      await questions.save(
        item.questions.map((question, sortOrder) => questions.create({
          paperId: paper.id,
          sortOrder,
          content: question.content,
          passage: question.passage ?? null,
          optionsJson: question.options ?? null,
          answer: question.answer,
          score: question.score,
        })),
      );
      synced.push({ subject: item.subject, year: item.year, questions: item.questions.length });
    }

    return synced;
  });
}
