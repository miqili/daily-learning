import * as dotenv from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { InitialSchema1785715200000 } from './migrations/2026080301-initial-schema';
import { PersonalLearningSystem1785715300000 } from './migrations/2026080302-personal-learning-system';
import { VocabularyLevelsPhrases1785715400000 } from './migrations/2026080303-vocabulary-levels-phrases';
import { Essays1785715500000 } from './migrations/2026080304-essays';
import { Papers1785715600000 } from './migrations/2026080305-papers';
import { PapersPassage1785716400000 } from './migrations/2026080406-papers-passage';
import { EssayTemplate } from '../entities/essay-template.entity';
import { ExamPaper } from '../entities/exam-paper.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { KnowledgeItem } from '../entities/knowledge-item.entity';
import { MyEssay } from '../entities/my-essay.entity';
import { Mistake } from '../entities/mistake.entity';
import { StudyPlan } from '../entities/study-plan.entity';
import { StudySession } from '../entities/study-session.entity';
import { Subject } from '../entities/subject.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { User } from '../entities/user.entity';
import { VocabularyDeck } from '../entities/vocabulary-deck.entity';
import { VocabularyPhrase } from '../entities/vocabulary-phrase.entity';
import { VocabularyProgress } from '../entities/vocabulary-progress.entity';
import { VocabularyWord } from '../entities/vocabulary-word.entity';

dotenv.config({
  path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env'), resolve(__dirname, '../../../../.env')],
});

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'sys',
  entities: [
    User,
    UserSettings,
    Subject,
    EssayTemplate,
    MyEssay,
    ExamPaper,
    ExamQuestion,
    KnowledgeItem,
    Mistake,
    VocabularyDeck,
    VocabularyWord,
    VocabularyPhrase,
    VocabularyProgress,
    StudyPlan,
    StudySession,
  ],
  migrations: [InitialSchema1785715200000, PersonalLearningSystem1785715300000, VocabularyLevelsPhrases1785715400000, Essays1785715500000, Papers1785715600000, PapersPassage1785716400000],
  synchronize: false,
});
