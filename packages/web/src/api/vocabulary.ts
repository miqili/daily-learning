import { client, unwrap } from './client';

export interface Deck {
  id: number;
  name: string;
  description: string | null;
  word_count: number;
}

export interface WordPhrase {
  id: number;
  phrase: string;
  meaning: string | null;
  level: number;
}

export interface VocabularyWord {
  id: number;
  word: string;
  phonetic: string | null;
  meaning: string;
  root: string | null;
  synonyms: string[];
  antonyms: string[];
  collocations: Array<{ phrase: string; meaning?: string }>;
  example_sentence: string | null;
  level: number;
  phrases: WordPhrase[];
  memory: VocabularyMemory;
}

export interface VocabularyMemoryPart {
  text: string;
  type: 'PREFIX' | 'ROOT' | 'SUFFIX' | 'BASE';
  meaning: string;
}

export interface VocabularyMemory {
  strategy: 'MORPHEME' | 'FAMILY' | 'PHRASE';
  family_key: string | null;
  parts: VocabularyMemoryPart[];
  literal_bridge: string | null;
  memory_note: string;
  family_words: Array<{ word: string; meaning: string }>;
  phrase: { text: string; meaning: string | null } | null;
  reviewed: boolean;
}

export interface Phrase {
  id: number;
  phrase: string;
  meaning: string | null;
  level: number;
  word: { id: number; word: string } | null;
  deck: { id: number; name: string } | null;
  created_at: string;
}

export interface ProgressItem {
  id: number;
  mastery_level: number;
  next_review_at: string;
  review_count: number;
  queue_kind: 'NEW' | 'REVIEW' | null;
  queue_position: number | null;
  learning_stage: 'INTRO' | 'CHECK' | 'RETRY' | 'TODAY_DONE' | 'REVIEW';
  same_day_attempts: number;
  same_day_correct_count: number;
  last_grade: 'AGAIN' | 'GOOD' | null;
  word: VocabularyWord;
}

export interface VocabularyStats {
  total_words: number;
  learned: number;
  mastered: number;
  due_today: number;
  total_phrases: number;
  daily_target: number;
  remaining: number;
  estimated_days: number;
  progress_pct: number;
  streak_days: number;
  today_target_done: boolean;
}

export interface WordInput {
  word: string;
  meaning: string;
  phonetic?: string;
  example_sentence?: string;
  level?: number;
  phrase?: string;
  phrase_meaning?: string;
}

export const listDecks = () => unwrap<Deck[]>(client.get('/vocabulary/decks'));
export const createDeck = (payload: { name: string; description?: string }) =>
  unwrap<Deck>(client.post('/vocabulary/decks', payload));
export const listWords = (deckId: number) => unwrap<VocabularyWord[]>(client.get(`/vocabulary/decks/${deckId}/words`));
export const addWord = (deckId: number, payload: WordInput) =>
  unwrap<VocabularyWord>(client.post(`/vocabulary/decks/${deckId}/words`, payload));
export const updateWord = (id: number, payload: Partial<Pick<WordInput, 'meaning' | 'phonetic' | 'example_sentence' | 'level'>>) =>
  unwrap<VocabularyWord>(client.patch(`/vocabulary/words/${id}`, payload));
export const importWords = (deckId: number, words: WordInput[]) =>
  unwrap<{ imported: number }>(client.post(`/vocabulary/decks/${deckId}/import`, { words }));
export interface TodayVocabularyQueue {
  queue_date: string;
  mode: 'RAPID_BEGINNER';
  total: number;
  completed_count: number;
  remaining_count: number;
  new_count: number;
  new_completed_count: number;
  new_remaining_count: number;
  due_count: number;
  due_completed_count: number;
  due_remaining_count: number;
  once_pass_count: number;
  retry_pass_count: number;
  tomorrow_focus_count: number;
  groups: Array<{ index: number; label: string; total: number; completed: number }>;
  list: ProgressItem[];
}

export const todayQueue = () => unwrap<TodayVocabularyQueue>(client.get('/vocabulary/today'));
export const reviewWord = (id: number, correct: boolean) =>
  unwrap<ProgressItem>(client.patch(`/vocabulary/progress/${id}/review`, { correct }));
export const introduceWord = (id: number) =>
  unwrap<ProgressItem>(client.patch(`/vocabulary/progress/${id}/introduce`));
export const answerWord = (id: number, correct: boolean, answer_type = 'MEANING_CHOICE') =>
  unwrap<ProgressItem>(client.patch(`/vocabulary/progress/${id}/answer`, { correct, answer_type }));
export const vocabularyStats = () => unwrap<VocabularyStats>(client.get('/vocabulary/stats'));
export const importBuiltinDeck = () => unwrap<{ deck_id: number; imported: number; already: boolean }>(client.post('/vocabulary/import-builtin'));
export const getVocabularySettings = () => unwrap<{ daily_target: number }>(client.get('/vocabulary/settings'));
export const updateVocabularySettings = (daily_target: number) =>
  unwrap<{ daily_target: number }>(client.patch('/vocabulary/settings', { daily_target }));

export const listPhrases = (params?: { level?: number; keyword?: string; deck_id?: number }) =>
  unwrap<Phrase[]>(client.get('/vocabulary/phrases', { params }));
export const createPhrase = (payload: { phrase: string; meaning?: string; level?: number; word_id?: number; deck_id?: number }) =>
  unwrap<Phrase>(client.post('/vocabulary/phrases', payload));
export const updatePhrase = (id: number, payload: Partial<{ phrase: string; meaning: string; level: number; word_id: number | null; deck_id: number | null }>) =>
  unwrap<Phrase>(client.patch(`/vocabulary/phrases/${id}`, payload));
export const deletePhrase = (id: number) => unwrap<{ id: number }>(client.delete(`/vocabulary/phrases/${id}`));
