import { defineStore } from 'pinia';
import { login, profile, register, type UserProfile } from '@/api/auth';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as UserProfile | null,
    token: localStorage.getItem('shck_token') ?? '',
  }),
  getters: { isAuthenticated: (state) => Boolean(state.token) },
  actions: {
    async login(username: string, password: string) {
      const session = await login(username, password);
      this.token = session.token;
      this.user = session.user;
      localStorage.setItem('shck_token', session.token);
    },
    async register(username: string, password: string, examDate?: string) {
      const session = await register(username, password, examDate);
      this.token = session.token;
      this.user = session.user;
      localStorage.setItem('shck_token', session.token);
    },
    async restore() {
      if (!this.token) return;
      try { this.user = await profile(); } catch { this.logout(); }
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('shck_token');
    },
  },
});
