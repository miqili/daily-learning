import { client, unwrap } from './client';

export interface SessionRecord {
  id: number;
  subject: { id: number; name: string; color: string } | null;
  activity_type: string;
  duration_secs: number;
  notes: string | null;
  recorded_at: string;
}

export interface TodaySummary {
  total_secs: number;
  count: number;
  by_subject: Array<{ subject_id: number; name: string; color: string; seconds: number }>;
}

export interface DayStat {
  date: string;
  seconds: number;
}

export interface SessionsSummary {
  days: number;
  total_secs: number;
  list: DayStat[];
}

export const createSession = (payload: { subject_id?: number; activity_type: string; duration_secs: number; notes?: string }) =>
  unwrap<SessionRecord>(client.post('/sessions', payload));
export const getToday = () => unwrap<TodaySummary>(client.get('/sessions/today'));
export const getSummary = (days = 7) => unwrap<SessionsSummary>(client.get('/sessions/summary', { params: { days } }));
