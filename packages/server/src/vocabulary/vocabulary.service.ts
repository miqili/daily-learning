import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_DAILY_WORD_TARGET, MASTERY_MAX, VOCAB_LEVELS, reviewIntervalDays } from '@shck/shared';
import { ALL_BUILTIN_VOCABULARY, BUILTIN_DECK_NAME } from '../database/builtin-vocabulary';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { VocabularyDeck } from '../entities/vocabulary-deck.entity';
import { VocabularyPhrase } from '../entities/vocabulary-phrase.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { VocabularyProgress } from '../entities/vocabulary-progress.entity';
import { VocabularyWord } from '../entities/vocabulary-word.entity';
import { StudySession } from '../entities/study-session.entity';
import { AnswerVocabularyDto, CreateDeckDto, CreatePhraseDto, CreateWordDto, ReviewWordDto, UpdatePhraseDto, UpdateVocabularySettingsDto, UpdateWordDto } from './vocabulary.dto';
import { vocabularyMemory } from './vocabulary-memory';

const DAY = 86_400_000;
const SHANGHAI_OFFSET = 8 * 60 * 60 * 1000;

function studyDateString(value = new Date()): string {
  return new Date(value.getTime() + SHANGHAI_OFFSET).toISOString().slice(0, 10);
}

function startOfStudyDay(value = new Date()): Date {
  const [year, month, day] = studyDateString(value).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - SHANGHAI_OFFSET);
}

function startOfNextStudyDay(value = new Date()): Date {
  return new Date(startOfStudyDay(value).getTime() + DAY);
}

@Injectable()
export class VocabularyService {
  constructor(
    @InjectRepository(VocabularyDeck) private readonly decks: Repository<VocabularyDeck>,
    @InjectRepository(VocabularyWord) private readonly words: Repository<VocabularyWord>,
    @InjectRepository(VocabularyPhrase) private readonly phrases: Repository<VocabularyPhrase>,
    @InjectRepository(VocabularyProgress) private readonly progress: Repository<VocabularyProgress>,
    @InjectRepository(UserSettings) private readonly settings: Repository<UserSettings>,
    @InjectRepository(StudySession) private readonly sessions: Repository<StudySession>,
  ) {}

  async listDecks(userId: number) {
    const list = await this.decks.find({ where: { userId }, order: { id: 'ASC' } });
    const result = [];
    for (const deck of list) {
      const wordCount = await this.words.countBy({ deckId: deck.id });
      result.push({ id: deck.id, name: deck.name, description: deck.description, word_count: wordCount });
    }
    return result;
  }

  async createDeck(userId: number, dto: CreateDeckDto) {
    const deck = await this.decks.save(this.decks.create({ userId, name: dto.name.trim(), description: dto.description ?? null }));
    return { id: deck.id, name: deck.name, description: deck.description, word_count: 0 };
  }

  async listWords(userId: number, deckId: number) {
    await this.findOwnedDeck(userId, deckId);
    const list = await this.words.find({ where: { deckId }, order: { sortOrder: 'ASC', id: 'ASC' } });
    const phraseMap = await this.loadPhrasesByWord(list.map((w) => w.id));
    return list.map((w) => this.wordView(w, phraseMap.get(w.id) ?? []));
  }

  async addWord(userId: number, deckId: number, dto: CreateWordDto) {
    await this.findOwnedDeck(userId, deckId);
    const count = await this.words.countBy({ deckId });
    const word = await this.words.save(
      this.words.create({
        deckId,
        word: dto.word.trim(),
        meaning: dto.meaning,
        phonetic: dto.phonetic ?? null,
        exampleSentence: dto.example_sentence ?? null,
        level: this.normalizeLevel(dto.level),
        sortOrder: count,
      }),
    );
    let attached: VocabularyPhrase[] = [];
    if (dto.phrase && dto.phrase.trim()) {
      const phrase = await this.phrases.save(
        this.phrases.create({
          userId,
          deckId,
          wordId: word.id,
          phrase: dto.phrase.trim(),
          meaning: dto.phrase_meaning ?? null,
          level: this.normalizeLevel(dto.level),
        }),
      );
      attached = [phrase];
    }
    return this.wordView(word, attached);
  }

  async importWords(userId: number, deckId: number, items: CreateWordDto[]) {
    await this.findOwnedDeck(userId, deckId);
    const count = await this.words.countBy({ deckId });
    const entities = items.map((dto, i) =>
      this.words.create({
        deckId,
        word: dto.word.trim(),
        meaning: dto.meaning,
        phonetic: dto.phonetic ?? null,
        exampleSentence: dto.example_sentence ?? null,
        level: this.normalizeLevel(dto.level),
        sortOrder: count + i,
      }),
    );
    const saved = await this.words.save(entities);
    const phraseEntities = saved
      .map((word, i) => {
        const dto = items[i];
        if (!dto.phrase || !dto.phrase.trim()) return null;
        return this.phrases.create({
          userId,
          deckId,
          wordId: word.id,
          phrase: dto.phrase.trim(),
          meaning: dto.phrase_meaning ?? null,
          level: word.level,
        });
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
    if (phraseEntities.length) await this.phrases.save(phraseEntities);
    return { imported: saved.length };
  }

  async updateWord(userId: number, id: number, dto: UpdateWordDto) {
    const word = await this.findOwnedWord(userId, id);
    if (dto.meaning !== undefined) word.meaning = dto.meaning;
    if (dto.phonetic !== undefined) word.phonetic = dto.phonetic;
    if (dto.example_sentence !== undefined) word.exampleSentence = dto.example_sentence;
    if (dto.level !== undefined) word.level = this.normalizeLevel(dto.level);
    await this.words.save(word);
    const phrases = (await this.loadPhrasesByWord([word.id])).get(word.id) ?? [];
    return this.wordView(word, phrases);
  }

  /** 短语库（独立页面） */
  async listPhrases(userId: number, query: { level?: string; keyword?: string; deck_id?: string }) {
    const qb = this.phrases
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.word', 'w')
      .leftJoinAndSelect('p.deck', 'd')
      .where('p.userId = :userId', { userId });
    if (query.level) qb.andWhere('p.level = :level', { level: Number(query.level) });
    if (query.deck_id) qb.andWhere('p.deckId = :deckId', { deckId: Number(query.deck_id) });
    if (query.keyword) qb.andWhere('(p.phrase LIKE :kw OR p.meaning LIKE :kw OR w.word LIKE :kw)', { kw: `%${query.keyword}%` });
    const list = await qb.orderBy('p.level', 'ASC').addOrderBy('p.id', 'ASC').getMany();
    return list.map((p) => this.phraseView(p));
  }

  async createPhrase(userId: number, dto: CreatePhraseDto) {
    if (dto.word_id !== undefined) await this.findOwnedWord(userId, dto.word_id);
    if (dto.deck_id !== undefined) await this.findOwnedDeck(userId, dto.deck_id);
    const phrase = await this.phrases.save(
      this.phrases.create({
        userId,
        wordId: dto.word_id ?? null,
        deckId: dto.deck_id ?? null,
        phrase: dto.phrase.trim(),
        meaning: dto.meaning ?? null,
        level: this.normalizeLevel(dto.level),
      }),
    );
    return this.phraseView(await this.findOnePhrase(userId, phrase.id));
  }

  async updatePhrase(userId: number, id: number, dto: UpdatePhraseDto) {
    const phrase = await this.findOnePhrase(userId, id);
    if (dto.phrase !== undefined) phrase.phrase = dto.phrase.trim();
    if (dto.meaning !== undefined) phrase.meaning = dto.meaning;
    if (dto.level !== undefined) phrase.level = this.normalizeLevel(dto.level);
    if (dto.word_id !== undefined) {
      if (dto.word_id !== null) await this.findOwnedWord(userId, dto.word_id);
      phrase.wordId = dto.word_id;
    }
    if (dto.deck_id !== undefined) {
      if (dto.deck_id !== null) await this.findOwnedDeck(userId, dto.deck_id);
      phrase.deckId = dto.deck_id;
    }
    return this.phraseView(await this.phrases.save(phrase));
  }

  async removePhrase(userId: number, id: number) {
    const phrase = await this.findOnePhrase(userId, id);
    await this.phrases.remove(phrase);
    return { id };
  }

  async importBuiltinDeck(userId: number) {
    const name = BUILTIN_DECK_NAME;
    let deck = await this.decks.findOneBy({ userId, name });
    if (!deck) {
      deck = await this.decks.save(
        this.decks.create({ userId, name, description: '成人本科理工类英语：240 个高频核心词（含音标/短语/分级）' }),
      );
    }
    const existingWords = new Set((await this.words.find({ where: { deckId: deck.id }, select: ['word'] })).map((w) => w.word));
    const toAdd = ALL_BUILTIN_VOCABULARY.filter((item) => !existingWords.has(item.word));
    if (toAdd.length) {
      const wordEntities = toAdd.map((item, i) =>
        this.words.create({
          deckId: deck.id,
          word: item.word,
          meaning: item.meaning,
          phonetic: item.phonetic,
          level: item.level,
          sortOrder: i,
        }),
      );
      const saved = await this.words.save(wordEntities);
      const phraseEntities = saved
        .map((word, i) => {
          const item = toAdd[i];
          if (!item.phrase) return null;
          return this.phrases.create({
            userId,
            deckId: deck.id,
            wordId: word.id,
            phrase: item.phrase,
            meaning: item.phrase_meaning ?? null,
            level: item.level,
          });
        })
        .filter((phrase): phrase is NonNullable<typeof phrase> => phrase !== null);
      if (phraseEntities.length) await this.phrases.save(phraseEntities);
      return { deck_id: deck.id, imported: saved.length, already: false };
    }
    return { deck_id: deck.id, imported: 0, already: true };
  }

  async getSettings(userId: number) {
    const settings = await this.settings.findOneBy({ userId });
    return { daily_target: settings?.dailyWordTarget ?? DEFAULT_DAILY_WORD_TARGET };
  }

  async updateSettings(userId: number, dto: UpdateVocabularySettingsDto) {
    let settings = await this.settings.findOneBy({ userId });
    if (settings) {
      settings.dailyWordTarget = dto.daily_target;
      await this.settings.save(settings);
    } else {
      settings = await this.settings.save(this.settings.create({ userId, dailyWordTarget: dto.daily_target }));
    }
    return { daily_target: settings.dailyWordTarget };
  }

  async todayQueue(userId: number, limit = 60) {
    const settings = await this.settings.findOneBy({ userId });
    const dailyTarget = settings?.dailyWordTarget ?? DEFAULT_DAILY_WORD_TARGET;
    const queueDate = studyDateString();
    let queued = await this.loadDailyQueue(userId, queueDate);

    // 每日队列只在当天第一次进入时生成。此后只读取，不因刷新、退出或后台改目标而换词。
    if (!queued.length) {
      const reviewCapacity = Math.min(60, Math.max(1, Number.isFinite(limit) ? Math.round(limit) : 60));
      const capacity = Math.min(560, dailyTarget + reviewCapacity);
      // 兼容升级当天的旧记录：先把今天已经完成的卡片接入新队列，避免进度从 0 重新显示。
      const reviewedToday = await this.progress.find({
        where: { userId, lastReviewedAt: MoreThanOrEqual(startOfStudyDay()) },
        order: { lastReviewedAt: 'ASC', id: 'ASC' },
        take: capacity,
      });
      let position = 0;
      reviewedToday.forEach((record) => {
        record.queueDate = queueDate;
        record.queueKind = record.reviewCount <= 1 ? 'NEW' : 'REVIEW';
        record.queuePosition = position++;
        record.queueCompletedAt = record.lastReviewedAt;
        record.learningStage = record.queueKind === 'NEW' ? 'TODAY_DONE' : 'REVIEW';
      });
      if (reviewedToday.length) await this.progress.save(reviewedToday);

      const alreadyReviewedDue = reviewedToday.filter((record) => record.queueKind === 'REVIEW').length;
      const dueCapacity = Math.max(0, reviewCapacity - alreadyReviewedDue);
      const due = dueCapacity
        ? await this.progress.find({
            where: { userId, nextReviewAt: LessThan(startOfNextStudyDay()), masteryLevel: LessThan(MASTERY_MAX) },
            order: { nextReviewAt: 'ASC', id: 'ASC' },
            take: dueCapacity,
          })
        : [];

      due.forEach((record) => {
        record.queueDate = queueDate;
        record.queueKind = 'REVIEW';
        record.queuePosition = position++;
        record.queueCompletedAt = null;
        record.learningStage = 'REVIEW';
        record.sameDayAttempts = 0;
        record.sameDayCorrectCount = 0;
      });
      if (due.length) await this.progress.save(due);

      const inferredNewCount = reviewedToday.filter((record) => record.reviewCount <= 1).length
        + due.filter((record) => record.reviewCount === 0).length;
      const requestedNewCount = reviewedToday.length ? Math.max(0, dailyTarget - inferredNewCount) : dailyTarget;
      const newCount = Math.min(requestedNewCount, Math.max(0, capacity - reviewedToday.length - due.length));
      const learnedIds = (await this.progress.find({ where: { userId }, select: ['wordId'] })).map((p) => p.wordId);
      const qb = this.words.createQueryBuilder('w').innerJoin('w.deck', 'd').where('d.userId = :userId', { userId });
      if (learnedIds.length) qb.andWhere('w.id NOT IN (:...learnedIds)', { learnedIds });
      const newWords = newCount > 0 ? await qb.orderBy('w.id', 'ASC').take(newCount).getMany() : [];
      const assignedAt = new Date();
      const newProgress = newWords.map((word) =>
        this.progress.create({
          userId,
          wordId: word.id,
          masteryLevel: 0,
          nextReviewAt: assignedAt,
          reviewCount: 0,
          lastReviewedAt: null,
          queueDate,
          queueKind: 'NEW',
          queuePosition: position++,
          queueCompletedAt: null,
          learningStage: 'INTRO',
          sameDayAttempts: 0,
          sameDayCorrectCount: 0,
          lastGrade: null,
          stableReviewCount: 0,
        }),
      );
      if (newProgress.length) await this.progress.save(newProgress);
      queued = await this.loadDailyQueue(userId, queueDate);
    }

    // 兼容快速模式上线当天：旧版本可能已经固定了“只有复习、没有新词”的队列。
    // 不动已有复习和完成记录，只在队列完全没有 NEW 时补入当天目标数量的新词。
    if (queued.length && queued.every((record) => record.queueKind === 'REVIEW')) {
      const learnedIds = (await this.progress.find({ where: { userId }, select: ['wordId'] })).map((record) => record.wordId);
      const qb = this.words.createQueryBuilder('w').innerJoin('w.deck', 'd').where('d.userId = :userId', { userId });
      if (learnedIds.length) qb.andWhere('w.id NOT IN (:...learnedIds)', { learnedIds });
      const newWords = await qb.orderBy('w.id', 'ASC').take(dailyTarget).getMany();
      const nextPosition = Math.max(-1, ...queued.map((record) => record.queuePosition ?? -1)) + 1;
      const assignedAt = new Date();
      const additions = newWords.map((word, index) =>
        this.progress.create({
          userId,
          wordId: word.id,
          masteryLevel: 0,
          nextReviewAt: assignedAt,
          reviewCount: 0,
          lastReviewedAt: null,
          queueDate,
          queueKind: 'NEW',
          queuePosition: nextPosition + index,
          queueCompletedAt: null,
          learningStage: 'INTRO',
          sameDayAttempts: 0,
          sameDayCorrectCount: 0,
          lastGrade: null,
          stableReviewCount: 0,
        }),
      );
      if (additions.length) {
        await this.progress.save(additions);
        queued = await this.loadDailyQueue(userId, queueDate);
      }
    }

    const unstaged = queued.filter((record) => !record.learningStage);
    for (const record of unstaged) record.learningStage = this.defaultLearningStage(record);
    if (unstaged.length) await this.progress.save(unstaged);

    const newRecords = queued.filter((record) => record.queueKind === 'NEW').sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));
    const newOrder = new Map(newRecords.map((record, index) => [record.id, index]));
    const pending = queued
      .filter((record) => !record.queueCompletedAt && record.learningStage !== 'TODAY_DONE')
      .sort((a, b) => this.learningFlowRank(a, newOrder.get(a.id)) - this.learningFlowRank(b, newOrder.get(b.id)) || a.id - b.id);
    const phraseMap = await this.loadPhrasesByWord(queued.map((record) => record.wordId));
    const groups = [];
    for (let index = 0; index < newRecords.length; index += 5) {
      const records = newRecords.slice(index, index + 5);
      const memories = records.map((record) => vocabularyMemory(record.word, phraseMap.get(record.wordId) ?? []));
      const reviewedFamily = memories.find((memory) => memory.reviewed && memory.family_key)?.family_key;
      groups.push({
        index: groups.length + 1,
        label: reviewedFamily ? `词族 ${reviewedFamily}` : '高频词与常用搭配',
        total: records.length,
        completed: records.filter((record) => Boolean(record.queueCompletedAt)).length,
      });
    }
    const newCompleted = queued.filter((record) => record.queueKind === 'NEW' && record.queueCompletedAt).length;
    const dueCompleted = queued.filter((record) => record.queueKind === 'REVIEW' && record.queueCompletedAt).length;
    return {
      queue_date: queueDate,
      mode: 'RAPID_BEGINNER',
      total: queued.length,
      completed_count: queued.length - pending.length,
      remaining_count: pending.length,
      new_count: newRecords.length,
      new_completed_count: newCompleted,
      new_remaining_count: newRecords.length - newCompleted,
      due_count: queued.filter((record) => record.queueKind === 'REVIEW').length,
      due_completed_count: dueCompleted,
      due_remaining_count: queued.filter((record) => record.queueKind === 'REVIEW').length - dueCompleted,
      once_pass_count: newRecords.filter((record) => record.queueCompletedAt && record.sameDayAttempts <= 1 && record.sameDayCorrectCount > 0).length,
      retry_pass_count: newRecords.filter((record) => record.queueCompletedAt && record.sameDayAttempts >= 2 && record.sameDayCorrectCount > 0).length,
      tomorrow_focus_count: newRecords.filter((record) => record.queueCompletedAt && record.lastGrade === 'AGAIN').length,
      groups,
      list: pending.map((record) => this.progressView(record, phraseMap.get(record.wordId) ?? [])),
    };
  }

  async reviewWord(userId: number, progressId: number, dto: ReviewWordDto) {
    const record = await this.progress.findOne({ where: { id: progressId, userId }, relations: { word: true } });
    if (!record) throw new NotFoundException('单词记录不存在。');
    record.reviewCount += 1;
    record.lastReviewedAt = new Date();
    const correct = dto.correct !== false;
    if (!correct) {
      record.masteryLevel = 0;
      record.nextReviewAt = new Date(Date.now() + DAY);
      record.lastGrade = 'AGAIN';
      record.stableReviewCount = 0;
    } else {
      record.masteryLevel = Math.min(MASTERY_MAX, record.masteryLevel + 1);
      record.lastGrade = 'GOOD';
      record.stableReviewCount += 1;
      const interval = reviewIntervalDays(record.masteryLevel);
      record.nextReviewAt =
        interval === null ? new Date(Date.now() + 3650 * DAY) : new Date(Date.now() + interval * DAY);
    }
    if (record.queueDate === studyDateString()) {
      record.queueCompletedAt = record.lastReviewedAt;
      record.learningStage = record.queueKind === 'NEW' ? 'TODAY_DONE' : 'REVIEW';
    }
    const saved = await this.progress.save(record);
    const phrases = (await this.loadPhrasesByWord([saved.wordId])).get(saved.wordId) ?? [];
    return this.progressView(saved, phrases);
  }

  async introduceWord(userId: number, progressId: number) {
    const record = await this.findProgress(userId, progressId);
    if (record.queueDate !== studyDateString() || record.queueKind !== 'NEW') {
      throw new BadRequestException('只有今天的新词可以进入首次学习。');
    }
    const stage = record.learningStage ?? this.defaultLearningStage(record);
    if (stage === 'CHECK') return this.progressView(record, await this.phrasesForProgress(record));
    if (stage !== 'INTRO') throw new BadRequestException('该单词当前不在首次学习阶段。');
    record.learningStage = 'CHECK';
    const saved = await this.progress.save(record);
    return this.progressView(saved, await this.phrasesForProgress(saved));
  }

  async answerWord(userId: number, progressId: number, dto: AnswerVocabularyDto) {
    const record = await this.findProgress(userId, progressId);
    if (record.queueDate !== studyDateString() || record.queueKind !== 'NEW') {
      throw new BadRequestException('只有今天的新词可以提交即时检测。');
    }
    const stage = record.learningStage ?? this.defaultLearningStage(record);
    if (stage === 'TODAY_DONE' || record.queueCompletedAt) {
      return this.progressView(record, await this.phrasesForProgress(record));
    }
    if (stage !== 'CHECK' && stage !== 'RETRY') throw new BadRequestException('请先完成首次学习。');

    const now = new Date();
    record.sameDayAttempts += 1;
    record.reviewCount += 1;
    record.lastReviewedAt = now;
    if (dto.correct) {
      record.sameDayCorrectCount += 1;
      record.lastGrade = 'GOOD';
      record.masteryLevel = Math.min(MASTERY_MAX, record.masteryLevel + 1);
      record.stableReviewCount += 1;
      const interval = reviewIntervalDays(record.masteryLevel);
      record.nextReviewAt = interval === null ? new Date(now.getTime() + 3650 * DAY) : new Date(now.getTime() + interval * DAY);
      record.learningStage = 'TODAY_DONE';
      record.queueCompletedAt = now;
    } else if (record.sameDayAttempts < 2) {
      record.lastGrade = 'AGAIN';
      record.masteryLevel = 0;
      record.stableReviewCount = 0;
      record.nextReviewAt = new Date(now.getTime() + DAY);
      record.learningStage = 'RETRY';
    } else {
      record.lastGrade = 'AGAIN';
      record.masteryLevel = 0;
      record.stableReviewCount = 0;
      record.nextReviewAt = new Date(now.getTime() + DAY);
      record.learningStage = 'TODAY_DONE';
      record.queueCompletedAt = now;
    }
    const saved = await this.progress.save(record);
    return this.progressView(saved, await this.phrasesForProgress(saved));
  }

  async stats(userId: number) {
    const totalWords = await this.words
      .createQueryBuilder('w')
      .innerJoin('w.deck', 'd')
      .where('d.userId = :userId', { userId })
      .getCount();
    const learned = await this.progress.countBy({ userId });
    const mastered = await this.progress.count({ where: { userId, masteryLevel: MASTERY_MAX } });
    const queueDate = studyDateString();
    const queuedToday = await this.progress.countBy({ userId, queueDate });
    const dueToday = queuedToday
      ? await this.progress.countBy({ userId, queueDate, queueCompletedAt: IsNull() })
      : await this.progress.count({
          where: { userId, nextReviewAt: LessThan(startOfNextStudyDay()), masteryLevel: LessThan(MASTERY_MAX) },
        });
    const totalPhrases = await this.phrases.countBy({ userId });
    const settings = await this.settings.findOneBy({ userId });
    const dailyTarget = settings?.dailyWordTarget ?? DEFAULT_DAILY_WORD_TARGET;
    const remaining = Math.max(0, totalWords - learned);
    const estimatedDays = dailyTarget > 0 ? Math.ceil(remaining / dailyTarget) : 0;
    const progressPct = totalWords === 0 ? 0 : Math.round((mastered / totalWords) * 100);
    const streakDays = await this.computeStreak(userId);
    const todayTargetDone = queuedToday ? dueToday === 0 : dueToday === 0 && remaining === 0;
    return {
      total_words: totalWords,
      learned,
      mastered,
      due_today: dueToday,
      total_phrases: totalPhrases,
      daily_target: dailyTarget,
      remaining,
      estimated_days: estimatedDays,
      progress_pct: progressPct,
      streak_days: streakDays,
      today_target_done: todayTargetDone,
    };
  }

  /** 连续学习天数：按 study_sessions 与背单词复习日期统计 */
  private async computeStreak(userId: number): Promise<number> {
    const days = new Set<number>();
    const addDate = (d: Date | null) => {
      if (!d) return;
      const t = new Date(d);
      t.setHours(0, 0, 0, 0);
      days.add(t.getTime());
    };
    const sessions = await this.sessions.find({ where: { userId }, select: ['recordedAt'] });
    sessions.forEach((s) => addDate(s.recordedAt));
    const progresses = await this.progress.find({ where: { userId }, select: ['lastReviewedAt'] });
    progresses.forEach((p) => addDate(p.lastReviewedAt));
    const DAY = 86_400_000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let cursor = new Date(today);
    if (!days.has(cursor.getTime())) cursor = new Date(cursor.getTime() - DAY);
    let streak = 0;
    while (days.has(cursor.getTime())) {
      streak += 1;
      cursor = new Date(cursor.getTime() - DAY);
    }
    return streak;
  }

  private async loadPhrasesByWord(wordIds: number[]): Promise<Map<number, VocabularyPhrase[]>> {
    if (!wordIds.length) return new Map();
    const rows = await this.phrases.find({ where: { wordId: In(wordIds) }, order: { id: 'ASC' } });
    const map = new Map<number, VocabularyPhrase[]>();
    for (const row of rows) {
      const list = map.get(row.wordId!) ?? [];
      list.push(row);
      map.set(row.wordId!, list);
    }
    return map;
  }

  private loadDailyQueue(userId: number, queueDate: string) {
    return this.progress.find({
      where: { userId, queueDate },
      relations: { word: true },
      order: { queuePosition: 'ASC', id: 'ASC' },
    });
  }

  private defaultLearningStage(record: VocabularyProgress): NonNullable<VocabularyProgress['learningStage']> {
    if (record.queueCompletedAt) return 'TODAY_DONE';
    return record.queueKind === 'NEW' ? 'INTRO' : 'REVIEW';
  }

  private learningFlowRank(record: VocabularyProgress, newIndex?: number): number {
    if (record.queueKind !== 'NEW') return 100_000 + (record.queuePosition ?? record.id);
    const index = newIndex ?? record.queuePosition ?? 0;
    const group = Math.floor(index / 5);
    const withinGroup = index % 5;
    const stage = record.learningStage ?? this.defaultLearningStage(record);
    if (stage === 'INTRO') return group * 100 + withinGroup;
    if (stage === 'CHECK') return group * 100 + 50 + withinGroup;
    if (stage === 'RETRY') return (group + 1) * 100 + 25 + withinGroup;
    return 90_000 + index;
  }

  private async findProgress(userId: number, progressId: number) {
    const record = await this.progress.findOne({ where: { id: progressId, userId }, relations: { word: true } });
    if (!record) throw new NotFoundException('单词记录不存在。');
    return record;
  }

  private async phrasesForProgress(record: VocabularyProgress) {
    return (await this.loadPhrasesByWord([record.wordId])).get(record.wordId) ?? [];
  }

  private async findOnePhrase(userId: number, id: number) {
    const phrase = await this.phrases.findOne({ where: { id, userId }, relations: { word: true, deck: true } });
    if (!phrase) throw new NotFoundException('短语不存在。');
    return phrase;
  }

  private async findOwnedDeck(userId: number, deckId: number) {
    const deck = await this.decks.findOneBy({ id: deckId, userId });
    if (!deck) throw new NotFoundException('词库不存在。');
    return deck;
  }

  private async findOwnedWord(userId: number, wordId: number) {
    const word = await this.words
      .createQueryBuilder('w')
      .innerJoin('w.deck', 'd')
      .where('w.id = :wordId', { wordId })
      .andWhere('d.userId = :userId', { userId })
      .getOne();
    if (!word) throw new NotFoundException('关联单词不存在。');
    return word;
  }

  private normalizeLevel(level?: number): number {
    if (level && VOCAB_LEVELS.includes(level as (typeof VOCAB_LEVELS)[number])) return level;
    return 1;
  }

  private wordView(word: VocabularyWord, phrases: VocabularyPhrase[] = []) {
    return {
      id: word.id,
      word: word.word,
      phonetic: word.phonetic,
      meaning: word.meaning,
      root: word.root,
      synonyms: word.synonymsJson ?? [],
      antonyms: word.antonymsJson ?? [],
      collocations: word.collocationsJson ?? [],
      example_sentence: word.exampleSentence,
      level: word.level,
      phrases: phrases.map((p) => ({ id: p.id, phrase: p.phrase, meaning: p.meaning, level: p.level })),
      memory: vocabularyMemory(word, phrases),
    };
  }

  private phraseView(phrase: VocabularyPhrase) {
    return {
      id: phrase.id,
      phrase: phrase.phrase,
      meaning: phrase.meaning,
      level: phrase.level,
      word: phrase.word ? { id: phrase.word.id, word: phrase.word.word } : null,
      deck: phrase.deck ? { id: phrase.deck.id, name: phrase.deck.name } : null,
      created_at: phrase.createdAt,
    };
  }

  private progressView(record: VocabularyProgress, phrases: VocabularyPhrase[] = []) {
    return {
      id: record.id,
      mastery_level: record.masteryLevel,
      next_review_at: record.nextReviewAt,
      review_count: record.reviewCount,
      queue_kind: record.queueKind,
      queue_position: record.queuePosition,
      learning_stage: record.learningStage ?? this.defaultLearningStage(record),
      same_day_attempts: record.sameDayAttempts,
      same_day_correct_count: record.sameDayCorrectCount,
      last_grade: record.lastGrade,
      word: this.wordView(record.word, phrases),
    };
  }
}
