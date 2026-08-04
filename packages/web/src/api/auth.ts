import { client, unwrap } from './client';

export interface UserProfile {
  id: number;
  username: string;
  role: string;
  exam_date: string;
}

export interface Session {
  token: string;
  user: UserProfile;
}

export const login = (username: string, password: string) =>
  unwrap<Session>(client.post('/auth/login', { username, password }));

export const register = (username: string, password: string, exam_date?: string) =>
  unwrap<Session>(client.post('/auth/register', { username, password, exam_date }));

export const profile = () => unwrap<UserProfile>(client.get('/auth/me'));
