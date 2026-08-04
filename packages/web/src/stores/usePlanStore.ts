import { defineStore } from 'pinia';
import { getDay, getSummary, getTodayPlan, initPlan, setTaskCompletion, type DayPlan, type OverdueTask, type PlanSummary } from '@/api/plan';

export const usePlanStore = defineStore('plan', {
  state: () => ({ summary: null as PlanSummary | null, day: null as DayPlan | null, overdue: [] as OverdueTask[], loading: false }),
  actions: {
    async loadSummary() {
      this.summary = await getSummary();
    },
    async loadDay(dayNumber: number) {
      this.day = await getDay(dayNumber);
    },
    async loadToday() {
      const today = await getTodayPlan();
      this.day = { day_number: today.day_number, task_date: today.task_date, tasks: today.tasks };
      this.overdue = today.overdue;
    },
    async initialize(examDate: string) {
      await initPlan(examDate);
      await this.loadSummary();
      await this.loadDay(this.summary?.current_day ?? 1);
    },
    async toggleTask(id: number, completed: boolean) {
      const task = await setTaskCompletion(id, completed);
      if (this.day) {
        const index = this.day.tasks.findIndex((entry) => entry.id === id);
        if (index >= 0) this.day.tasks[index] = task;
      }
      this.overdue = this.overdue.filter((entry) => entry.id !== id || !completed);
      await this.loadSummary();
    },
  },
});
