import * as bcrypt from 'bcryptjs';
import { buildFormalStudyPlan, FORMAL_EXAM_DATE, FORMAL_PLAN_START_DATE } from '@shck/shared';
import { ALL_BUILTIN_VOCABULARY, BUILTIN_DECK_NAME } from './builtin-vocabulary';
import { BUILTIN_ESSAY_TEMPLATES } from './builtin-essay-templates';
import { BUILTIN_KNOWLEDGE } from './builtin-knowledge';
import { syncVerifiedPapers } from './sync-verified-papers';
import { AppDataSource } from './data-source';
import { EssayTemplate } from '../entities/essay-template.entity';
import { ExamPaper } from '../entities/exam-paper.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { KnowledgeItem } from '../entities/knowledge-item.entity';
import { StudyPlan } from '../entities/study-plan.entity';
import { Subject } from '../entities/subject.entity';
import { VocabularyDeck } from '../entities/vocabulary-deck.entity';
import { VocabularyPhrase } from '../entities/vocabulary-phrase.entity';
import { VocabularyWord } from '../entities/vocabulary-word.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { User } from '../entities/user.entity';

const SUBJECTS = [
  { name: '政治', color: '#dc2626', sortOrder: 0 },
  { name: '英语', color: '#2563eb', sortOrder: 1 },
  { name: '高等数学（一）', color: '#16a34a', sortOrder: 2 },
];

async function seed() {
  await AppDataSource.initialize();

  const users = AppDataSource.getRepository(User);
  const settings = AppDataSource.getRepository(UserSettings);
  const subjects = AppDataSource.getRepository(Subject);
  const plans = AppDataSource.getRepository(StudyPlan);
  const decks = AppDataSource.getRepository(VocabularyDeck);
  const vocabWords = AppDataSource.getRepository(VocabularyWord);
  const vocabPhrases = AppDataSource.getRepository(VocabularyPhrase);
  const knowledge = AppDataSource.getRepository(KnowledgeItem);
  const essayTemplates = AppDataSource.getRepository(EssayTemplate);
  const papers = AppDataSource.getRepository(ExamPaper);
  const paperQuestions = AppDataSource.getRepository(ExamQuestion);

  // 1. demo 用户
  let demo = await users.findOneBy({ username: 'demo' });
  if (!demo) {
    demo = await users.save(
      users.create({ username: 'demo', passwordHash: await bcrypt.hash('Study70Days!', 12), role: 'USER' }),
    );
  }

  // 2. 用户设置（考试日）
  if (!(await settings.existsBy({ userId: demo.id }))) {
    await settings.save(settings.create({ userId: demo.id, examDate: FORMAL_EXAM_DATE }));
  }

  // 3. 三科科目（幂等）
  const subjectRows: Subject[] = [];
  for (const item of SUBJECTS) {
    let subject = await subjects.findOneBy({ userId: demo.id, name: item.name });
    if (!subject) {
      subject = await subjects.save(subjects.create({ userId: demo.id, ...item }));
    }
    subjectRows.push(subject);
  }

  // 4. 内置词库（含音标/短语/分级）
  let builtinDeck = await decks.findOneBy({ userId: demo.id, name: BUILTIN_DECK_NAME });
  if (!builtinDeck) {
    builtinDeck = await decks.save(
      decks.create({ userId: demo.id, name: BUILTIN_DECK_NAME, description: '成人本科理工类英语：240 个高频核心词（含音标/短语/分级）' }),
    );
  }
  const existingWords = new Set((await vocabWords.find({ where: { deckId: builtinDeck.id }, select: ['word'] })).map((w) => w.word));
  const toAdd = ALL_BUILTIN_VOCABULARY.filter((item) => !existingWords.has(item.word));
  if (toAdd.length) {
    const savedWords = await vocabWords.save(
      toAdd.map((item, i) =>
        vocabWords.create({
          deckId: builtinDeck.id,
          word: item.word,
          meaning: item.meaning,
          phonetic: item.phonetic,
          level: item.level,
          sortOrder: i,
        }),
      ),
    );
    const phraseRows = savedWords
      .map((word, i) => {
        const item = toAdd[i];
        if (!item.phrase) return null;
        return vocabPhrases.create({
          userId: demo.id,
          deckId: builtinDeck.id,
          wordId: word.id,
          phrase: item.phrase,
          meaning: item.phrase_meaning ?? null,
          level: item.level,
        });
      })
      .filter((phrase): phrase is NonNullable<typeof phrase> => phrase !== null);
    if (phraseRows.length) await vocabPhrases.save(phraseRows);
  }


  // 4.5 三科知识点（手机端"科目 → 知识点"直达内容）
  // 4.5 三科知识点（手机端"科目 → 知识点"直达内容，支持 Markdown + KaTeX）
  for (const item of BUILTIN_KNOWLEDGE) {
    const subjectRow = subjectRows.find((s) => s.name === item.subject);
    if (!subjectRow) continue;
    const existing = await knowledge.findOneBy({ userId: demo.id, title: item.title });
    if (existing) {
      existing.content = item.content;
      existing.subjectId = subjectRow.id;
      existing.tags = item.tags ?? [item.subject];
      existing.source = item.source ?? null;
      await knowledge.save(existing);
    } else {
      await knowledge.save(
        knowledge.create({
          userId: demo.id,
          subjectId: subjectRow.id,
          title: item.title,
          content: item.content,
          itemType: 'NOTE',
          tags: item.tags ?? [item.subject],
          source: item.source ?? null,
        }),
      );
    }
  }

  // 4.7 只同步有明确来源、经过核验的公开回忆版；不再生成“真题”示例占位数据。
  await syncVerifiedPapers(AppDataSource);

  // 5. 生成 demo 的正式计划：2026-08-10 至 2026-10-16，10-17 考试。
  if (await plans.existsBy({ userId: demo.id })) {
    await plans.delete({ userId: demo.id });
  }
  const demoSettings = await settings.findOneBy({ userId: demo.id });
  const examDate = FORMAL_EXAM_DATE;
  if (demoSettings) {
    demoSettings.examDate = examDate;
    await settings.save(demoSettings);
  }
  const inputs = subjectRows.map((s) => ({ id: s.id, name: s.name, color: s.color }));
  const canonicalKnowledge = new Map(BUILTIN_KNOWLEDGE.map((item) => [item.title, item]));
  const templates = buildFormalStudyPlan({
    startDate: FORMAL_PLAN_START_DATE,
    examDate,
    subjects: inputs,
    knowledge: [...canonicalKnowledge.values()].map((item) => ({ subject: item.subject, title: item.title, tags: item.tags })),
  });
  const rows: StudyPlan[] = templates.map((template) =>
    plans.create({
      userId: demo.id,
      planDate: template.planDate,
      subjectId: template.subjectId,
      title: template.title,
      description: template.description,
      taskType: template.taskType,
    }),
  );
  await plans.save(rows);

  const builtinWordCount = await vocabWords.countBy({ deckId: builtinDeck.id });
  const paperCount = await papers.count();
  const questionCount = await paperQuestions.count();
  await AppDataSource.destroy();
  console.log(
    `Seed completed: demo user + ${SUBJECTS.length} subjects + ${rows.length} plan tasks + builtin deck "${BUILTIN_DECK_NAME}" (${builtinWordCount} words) + ${paperCount} papers (${questionCount} questions) (exam ${examDate}).`,
  );
}

seed().catch(async (error: unknown) => {
  console.error(error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
