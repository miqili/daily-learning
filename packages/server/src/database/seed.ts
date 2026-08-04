import * as bcrypt from 'bcryptjs';
import { DEFAULT_EXAM_DATE, PLAN_DAYS, getPlanTasksForDay } from '@shck/shared';
import { ALL_BUILTIN_VOCABULARY, BUILTIN_DECK_NAME } from './builtin-vocabulary';
import { BUILTIN_ESSAY_TEMPLATES } from './builtin-essay-templates';
import { BUILTIN_KNOWLEDGE } from './builtin-knowledge';
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
    await settings.save(settings.create({ userId: demo.id, examDate: DEFAULT_EXAM_DATE }));
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
      existing.tags = [item.subject];
      await knowledge.save(existing);
    } else {
      await knowledge.save(
        knowledge.create({
          userId: demo.id,
          subjectId: subjectRow.id,
          title: item.title,
          content: item.content,
          itemType: 'NOTE',
          tags: [item.subject],
        }),
      );
    }
  }

  // 4.7 历年真题（近 9 年，示例题）
  const PAPER_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const PAPER_SUBJECTS = ['政治', '英语', '高等数学（一）'];

  const sampleQuestions: Record<string, Array<{ content: string; options?: { key: string; text: string }[]; answer: string; score: number }>> = {
    政治: [
      { content: '我国社会主义现代化建设的根本保证是（　）。', options: [{ key: 'A', text: '改革开放' }, { key: 'B', text: '党的领导' }, { key: 'C', text: '科技创新' }, { key: 'D', text: '扩大开放' }], answer: 'B', score: 5 },
      { content: '简述中国特色社会主义进入新时代的主要依据。', answer: '可从社会主要矛盾转化、历史性成就、发展阶段变化三方面作答（参考"知识点"答题框架）。', score: 10 },
    ],
    英语: [
      { content: '选择最恰当的选项填空：He _____ to Beijing yesterday. (　)', options: [{ key: 'A', text: 'goes' }, { key: 'B', text: 'went' }, { key: 'C', text: 'has gone' }, { key: 'D', text: 'go' }], answer: 'B', score: 5 },
      { content: '写作：请以"My Favorite Sport"为题，写一篇 100 词左右的短文。', answer: '（参考"作文"模块的议论文模板起笔，写爱好、原因、收获三部分。）', score: 10 },
    ],
    '高等数学（一）': [
      { content: '求极限 $\lim_{x \to 0}\dfrac{\sin x}{x}$ 的值。 (　)', options: [{ key: 'A', text: '0' }, { key: 'B', text: '1/2' }, { key: 'C', text: '1' }, { key: 'D', text: '不存在' }], answer: 'C', score: 5 },
      { content: '求函数 $f(x)=x^3-3x$ 的单调区间与极值。', answer: "令 $f'(x)=3x^2-3=0$，得 $x=\pm 1$；$x<-1$ 增、$-1<x<1$ 减、$x>1$ 增；极大值 $f(-1)=2$，极小值 $f(1)=-2$。", score: 10 },
    ],
  };

  for (const year of PAPER_YEARS) {
    for (const subject of PAPER_SUBJECTS) {
      let paper = await papers.findOneBy({ subject, year });
      if (!paper) {
        paper = await papers.save(
          papers.create({ subject, year, title: `${year} 年${subject} 真题`, source: '示例' }),
        );
      }
      if (await paperQuestions.existsBy({ paperId: paper.id })) continue;
      const items = sampleQuestions[subject] ?? [];
      await paperQuestions.save(
        items.map((q, i) =>
          paperQuestions.create({ paperId: paper.id, sortOrder: i, content: q.content, optionsJson: q.options ?? null, answer: q.answer, score: q.score }),
        ),
      );
    }
  }

  // 5. 生成 demo 的 70 天计划（考试日以用户设置优先）
  if (await plans.existsBy({ userId: demo.id })) {
    await plans.delete({ userId: demo.id });
  }
  const demoSettings = await settings.findOneBy({ userId: demo.id });
  const examDate = demoSettings?.examDate ?? DEFAULT_EXAM_DATE;
  const start = new Date(`${examDate}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - (PLAN_DAYS - 1));
  const inputs = subjectRows.map((s) => ({ id: s.id, name: s.name, color: s.color }));
  const rows: StudyPlan[] = [];
  for (let day = 1; day <= PLAN_DAYS; day += 1) {
    const planDate = new Date(start.getTime() + (day - 1) * 86_400_000);
    for (const template of getPlanTasksForDay(day, inputs)) {
      rows.push(
        plans.create({
          userId: demo.id,
          planDate: planDate.toISOString().slice(0, 10),
          subjectId: template.subjectId,
          title: template.title,
          description: template.description,
          taskType: template.taskType,
        }),
      );
    }
  }
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
