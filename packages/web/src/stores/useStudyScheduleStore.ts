import { defineStore } from 'pinia';
import type { PlanTask } from '@/api/plan';

export interface StudyAvailability {
  weekdayMinutes: number;
  weekdayMorningMinutes: number;
  saturdayMinutes: number;
  sundayMinutes: number;
  weekdayEveningStart: string;
  weekendStart: string;
  weekendEnd: string;
}

export interface DeferredStudyTask {
  task: PlanTask;
  sourceDate: string;
  targetDate: string;
  deferredAt: string;
  reservedMinutes: number;
}

const AVAILABILITY_KEY = 'shck_study_availability_v2';
const DEFERRED_KEY = 'shck_deferred_tasks_v2';

export const defaultAvailability: StudyAvailability = {
  weekdayMinutes: 90,
  weekdayMorningMinutes: 20,
  saturdayMinutes: 360,
  sundayMinutes: 360,
  weekdayEveningStart: '20:30',
  weekendStart: '09:00',
  weekendEnd: '17:30',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
  } catch {
    return fallback;
  }
}

function readDeferred(): DeferredStudyTask[] {
  try {
    const saved = localStorage.getItem(DEFERRED_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export const useStudyScheduleStore = defineStore('study-schedule', {
  state: () => ({
    availability: readJson(AVAILABILITY_KEY, { ...defaultAvailability }),
    deferred: readDeferred(),
  }),
  getters: {
    weeklyCapacityMinutes: (state) => state.availability.weekdayMinutes * 5
      + state.availability.saturdayMinutes
      + state.availability.sundayMinutes,
  },
  actions: {
    saveAvailability(next: StudyAvailability) {
      this.availability = { ...next };
      localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(this.availability));
    },
    resetAvailability() {
      this.saveAvailability({ ...defaultAvailability });
    },
    capacityForDate(date: string): number {
      const day = new Date(`${date}T12:00:00`).getDay();
      if (day === 6) return this.availability.saturdayMinutes;
      if (day === 0) return this.availability.sundayMinutes;
      return this.availability.weekdayMinutes;
    },
    deferTask(task: PlanTask, sourceDate: string, targetDate: string, reservedMinutes = 60) {
      this.deferred = this.deferred.filter((entry) => entry.task.id !== task.id);
      this.deferred.push({ task, sourceDate, targetDate, deferredAt: new Date().toISOString(), reservedMinutes });
      localStorage.setItem(DEFERRED_KEY, JSON.stringify(this.deferred));
    },
    removeDeferred(taskId: number) {
      this.deferred = this.deferred.filter((entry) => entry.task.id !== taskId);
      localStorage.setItem(DEFERRED_KEY, JSON.stringify(this.deferred));
    },
    deferredFrom(date: string) {
      return this.deferred.filter((entry) => entry.sourceDate === date);
    },
    deferredTo(date: string) {
      return this.deferred.filter((entry) => entry.targetDate === date);
    },
  },
});
