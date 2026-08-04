import { client, unwrap } from './client';

export interface PaperSummary {
  id: number;
  subject: string;
  year: number;
  title: string;
  source: string | null;
  question_count: number;
}

export interface PaperQuestion {
  id: number;
  content: string;
  passage: string | null;
  options: { key: string; text: string }[] | null;
  answer: string | null;
  score: number;
}

export interface PaperDetail extends PaperSummary {
  questions: PaperQuestion[];
}

export const listPapers = (params?: { subject?: string; year?: string }) =>
  unwrap<PaperSummary[]>(client.get('/papers', { params }));
export const getPaper = (id: number) => unwrap<PaperDetail>(client.get(`/papers/${id}`));
export const createPaper = (payload: { subject: string; year: number; title?: string }) =>
  unwrap<{ id: number; subject: string; year: number; title: string }>(client.post('/papers', payload));
export const addQuestions = (paperId: number, questions: Array<{ content: string; passage?: string; options?: { key: string; text: string }[]; answer?: string; score?: number }>) =>
  unwrap<{ imported: number }>(client.post(`/papers/${paperId}/questions`, { questions }));
