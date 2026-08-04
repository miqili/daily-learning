import { client, unwrap } from './client';

export interface SubjectInfo {
  id: number;
  name: string;
  color: string;
  sort_order: number;
}

export interface PlanTask {
  id: number;
  plan_date: string;
  subject: { id: number; name: string; color: string } | null;
  title: string;
  description: string | null;
  task_type: string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface DayPlan {
  day_number: number;
  task_date: string;
  tasks: PlanTask[];
}

export interface SubjectProgress {
  subject_id: number;
  name: string;
  color: string;
  completed_tasks: number;
  total_tasks: number;
  progress: number;
}

export interface PlanSummary {
  exam_date: string;
  plan_start_date: string;
  current_day: number;
  completed_tasks: number;
  total_tasks: number;
  progress: number;
  days_remaining: number;
  initialized: boolean;
  by_subject: SubjectProgress[];
}

export const initPlan = (exam_date: string, weights?: Record<string, number>) =>
  unwrap<PlanSummary>(client.post('/plan/init', { exam_date, weights }));
export interface OverdueTask extends PlanTask {
  due_day: number;
  overdue_days: number;
}

export interface TodayPlan {
  day_number: number;
  task_date: string;
  overdue: OverdueTask[];
  tasks: PlanTask[];
}

export const getSummary = () => unwrap<PlanSummary>(client.get('/plan/summary'));
export const getTodayPlan = () => unwrap<TodayPlan>(client.get('/plan/today'));
export const getDay = (day: number) => unwrap<DayPlan>(client.get(`/plan/day/${day}`));
export const setTaskCompletion = (id: number, is_completed: boolean) =>
  unwrap<PlanTask>(client.patch(`/plan/${id}/completion`, { is_completed }));

export const listSubjects = () => unwrap<SubjectInfo[]>(client.get('/subjects'));
export const createSubject = (payload: { name: string; color?: string }) =>
  unwrap<SubjectInfo>(client.post('/subjects', payload));
export const updateSubject = (id: number, payload: { name?: string; color?: string }) =>
  unwrap<SubjectInfo>(client.patch(`/subjects/${id}`, payload));
export const removeSubject = (id: number) => unwrap<{ id: number }>(client.delete(`/subjects/${id}`));
