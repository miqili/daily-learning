import { client, unwrap } from './client';

export const ERROR_REASON_LABELS: Record<string, string> = {
  CONCEPT: '概念不清',
  CALCULATION: '计算失误',
  CARELESS: '审题遗漏',
  MEMORY: '记忆混淆',
  OTHER: '其他',
};

export interface Mistake {
  id: number;
  subject: { id: number; name: string; color: string } | null;
  title: string;
  content: string;
  correct_answer: string | null;
  user_answer: string | null;
  error_reason: string;
  analysis: string | null;
  mastery_level: number;
  next_review_at: string;
  review_count: number;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMistakeInput {
  title: string;
  content: string;
  correct_answer?: string;
  user_answer?: string;
  error_reason?: string;
  subject_id?: number;
  source?: string;
}

export const listMistakes = (params?: { subject_id?: number; error_reason?: string; keyword?: string; mastered?: string }) =>
  unwrap<Mistake[]>(client.get('/mistakes', { params }));
export const getReviewQueue = () => unwrap<{ total: number; list: Mistake[] }>(client.get('/mistakes/review-queue'));
export const createMistake = (payload: CreateMistakeInput) => unwrap<Mistake>(client.post('/mistakes', payload));
export const updateMistake = (id: number, payload: Partial<CreateMistakeInput>) => unwrap<Mistake>(client.patch(`/mistakes/${id}`, payload));
export const deleteMistake = (id: number) => unwrap<{ id: number }>(client.delete(`/mistakes/${id}`));
export const reviewMistake = (id: number, correct: boolean, notes?: string) =>
  unwrap<Mistake>(client.patch(`/mistakes/${id}/review`, { correct, notes }));
