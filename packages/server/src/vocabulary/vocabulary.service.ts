import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_DAILY_WORD_TARGET, MASTERY_MAX, VOCAB_LEVELS, reviewIntervalDays } from '@shck/shared';
import { ALL_BUILTIN_VOCABULARY, BUILTIN_DECK_NAME } from '../database/builtin-vocabulary';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { VocabularyDeck } from '../entities/vocabulary-deck.entity';
import { VocabularyPhrase } from '../entities/vocabulary-phrase.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { VocabularyProgress } from '../entities/vocabulary-progress.entity';
import { VocabularyWord } from '../entities/vocabulary-word.entity';
import { CreateDeckDto, CreatePhraseDto, CreateWordDto, ReviewWordDto, UpdatePhraseDto, UpdateVocabularySettingsDto, UpdateWordDto } from './vocabulary.dto';

const DAY = 86_400_000;

@Injectable()
export class VocabularyService {
  constructor(
    @InjectRepository(VocabularyDeck) private readonly decks: Repository<VocabularyDeck>,
    @InjectRepository(VocabularyWord) private readonly words: Repository<VocabularyWord>,
    @InjectRepository(VocabularyPhrase) private readonly phrases: Repository<VocabularyPhrase>,
    @InjectRepository(VocabularyProgress) private readonly progress: Repository<VocabularyProgress>,
    @InjectRepository(UserSettings) private readonly settings: Repository<UserSettings>,
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

  async todayQueue(userId: number, limit = 50) {
    const settings = await this.settings.findOneBy({ userId });
    const dailyTarget = settings?.dailyWordTarget ?? DEFAULT_DAILY_WORD_TARGET;

    const due = await this.progress.find({
      where: { userId, nextReviewAt: LessThanOrEqual(new Date()), masteryLevel: LessThan(MASTERY_MAX) },
      relations: { word: true },
      order: { nextReviewAt: 'ASC' },
      take: limit,
    });

    // 今日新词 = 每日目标，最多补满 limit
    let newCount = dailyTarget;
    const capacity = limit - due.length;
    if (capacity < newCount) newCount = Math.max(0, capacity);

    const learnedIds = (await this.progress.find({ where: { userId }, select: ['wordId'] })).map((p) => p.wordId);
    const qb = this.words.createQueryBuilder('w').innerJoin('w.deck', 'd').where('d.userId = :userId', { userId });
    if (learnedIds.length) qb.andWhere('w.id NOT IN (:...learnedIds)', { learnedIds });
    const newWords = newCount > 0 ? await qb.orderBy('w.id', 'ASC').take(newCount).getMany() : [];

    const newProgress = newWords.map((word) =>
      this.progress.create({ userId, wordId: word.id, masteryLevel: 0, nextReviewAt: new Date(), reviewCount: 0 }),
    );
    const saved = newProgress.length ? await this.progress.save(newProgress) : [];
    const withWords = saved.length
      ? await this.progress.find({ where: saved.map((p) => ({ id: p.id })), relations: { word: true } })
      : [];

    return {
      total: due.length + withWords.length,
      new_count: withWords.length,
      due_count: due.length,
      list: [...due.map((p) => this.progressView(p)), ...withWords.map((p) => this.progressView(p))],
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
      record.nextReviewAt = new Date();
    } else {
      record.masteryLevel = Math.min(MASTERY_MAX, record.masteryLevel + 1);
      const interval = reviewIntervalDays(record.masteryLevel);
      record.nextReviewAt =
        interval === null ? new Date(Date.now() + 3650 * DAY) : new Date(Date.now() + interval * DAY);
    }
    return this.progressView(await this.progress.save(record));
  }

  async stats(userId: number) {
    const totalWords = await this.words
      .createQueryBuilder('w')
      .innerJoin('w.deck', 'd')
      .where('d.userId = :userId', { userId })
      .getCount();
    const learned = await this.progress.countBy({ userId });
    const mastered = await this.progress.count({ where: { userId, masteryLevel: MASTERY_MAX } });
    const dueToday = await this.progress.count({
      where: { userId, nextReviewAt: LessThanOrEqual(new Date()), masteryLevel: LessThan(MASTERY_MAX) },
    });
    const totalPhrases = await this.phrases.countBy({ userId });
    const settings = await this.settings.findOneBy({ userId });
    const dailyTarget = settings?.dailyWordTarget ?? DEFAULT_DAILY_WORD_TARGET;
    const remaining = Math.max(0, totalWords - learned);
    const estimatedDays = dailyTarget > 0 ? Math.ceil(remaining / dailyTarget) : 0;
    const progressPct = totalWords === 0 ? 0 : Math.round((mastered / totalWords) * 100);
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
    };
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
      example_sentence: word.exampleSentence,
      level: word.level,
      phrases: phrases.map((p) => ({ id: p.id, phrase: p.phrase, meaning: p.meaning, level: p.level })),
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

  private progressView(record: VocabularyProgress) {
    return {
      id: record.id,
      mastery_level: record.masteryLevel,
      next_review_at: record.nextReviewAt,
      review_count: record.reviewCount,
      word: this.wordView(record.word),
    };
  }
}
