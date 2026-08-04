import { client, unwrap } from './client';

export interface EssayTemplate {
  id: number;
  type: string;
  title: string;
  outline: string | null;
  content: string;
  keywords: string[];
}

export interface MyEssay {
  id: number;
  title: string;
  essay_type: string;
  content: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export const listTemplates = (type?: string) =>
  unwrap<EssayTemplate[]>(client.get('/essays/templates', { params: { type } }));
export const listMyEssays = () => unwrap<MyEssay[]>(client.get('/essays/mine'));
export const createEssay = (payload: { title: string; essay_type: string; content: string }) =>
  unwrap<MyEssay>(client.post('/essays/mine', payload));
export const updateEssay = (
  id: number,
  payload: { title?: string; essay_type?: string; content?: string },
) => unwrap<MyEssay>(client.patch(`/essays/mine/${id}`, payload));
export const deleteEssay = (id: number) =>
  unwrap<{ id: number }>(client.delete(`/essays/mine/${id}`));
