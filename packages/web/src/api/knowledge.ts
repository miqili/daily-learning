import { client, unwrap } from './client';

export interface KnowledgeItem {
  id: number;
  subject_id: number | null;
  subject: { id: number; name: string; color: string } | null;
  title: string;
  content: string;
  item_type: string;
  tags: string[];
  source: string | null;
  created_at: string;
  updated_at: string;
}

export const searchKnowledge = (params?: { subject_id?: number; keyword?: string; tag?: string }) =>
  unwrap<{ total: number; list: KnowledgeItem[] }>(client.get('/knowledge', { params }));
export const getKnowledge = (id: number) => unwrap<KnowledgeItem>(client.get(`/knowledge/${id}`));
export const createKnowledge = (payload: { title: string; content: string; subject_id?: number }) =>
  unwrap<KnowledgeItem>(client.post('/knowledge', payload));
