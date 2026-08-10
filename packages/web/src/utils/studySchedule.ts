import type { PlanTask } from '@/api/plan';
import type { StudyAvailability } from '@/stores/useStudyScheduleStore';

export type ScheduleMode = 'weekday' | 'weekend';
export type TimelineKind = 'task' | 'break' | 'lunch';

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  start: string;
  end: string;
  duration: number;
  title: string;
  subtitle: string;
  subject: string;
  color: string;
  task?: PlanTask;
}

export interface DaySchedule {
  mode: ScheduleMode;
  entries: TimelineEntry[];
  plannedMinutes: number;
  capacityMinutes: number;
  bufferMinutes: number;
  overflow: PlanTask[];
}

export interface WeekCapacityDay {
  key: string;
  date: string;
  weekday: string;
  shortWeekday: string;
  capacityMinutes: number;
  isWeekend: boolean;
  isToday: boolean;
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const SHORT_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function parseLocalDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: string, amount: number): string {
  const next = parseLocalDate(date);
  next.setDate(next.getDate() + amount);
  return toDateString(next);
}

export function isWeekendDate(date: string): boolean {
  const day = parseLocalDate(date).getDay();
  return day === 0 || day === 6;
}

export function nextSunday(date: string): string {
  const day = parseLocalDate(date).getDay();
  const offset = day === 0 ? 7 : 7 - day;
  return addDays(date, offset);
}

export function nextWeekendDate(date: string): string {
  const day = parseLocalDate(date).getDay();
  if (day === 6) return addDays(date, 1);
  if (day === 0) return addDays(date, 6);
  return addDays(date, 6 - day);
}

export function minutesLabel(minutes: number, compact = false): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (compact) return hours ? `${hours}h${rest ? String(rest).padStart(2, '0') + 'm' : ''}` : `${rest}m`;
  if (!hours) return `${rest} 分钟`;
  return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
}

export function clockLabel(minutesFromMidnight: number): string {
  const normalized = ((minutesFromMidnight % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function clockMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function taskPriority(task: PlanTask): number {
  const text = `${task.title} ${task.description ?? ''} ${task.task_type}`;
  if (/高数|数学|真题|套题|模拟|综合训练/.test(text)) return 1;
  if (/错题|复盘|框架/.test(text)) return 2;
  return 3;
}

function preferredMinutes(task: PlanTask, mode: ScheduleMode): number {
  const text = `${task.title} ${task.description ?? ''} ${task.task_type}`;
  const explicit = text.match(/预计\s*(\d+)\s*分钟/);
  if (explicit) return Math.max(5, Number(explicit[1]));
  if (mode === 'weekday') {
    if (/单词|词汇|短语|背诵|政治/.test(text)) return 20;
    if (/错题|复盘/.test(text)) return 35;
    return 70;
  }
  if (/真题|套题|模拟|高数|数学|综合训练|章节/.test(text)) return 90;
  if (/错题|复盘|框架/.test(text)) return 60;
  if (/单词|词汇|短语|背诵/.test(text)) return 30;
  return 60;
}

function balanceWeekendTasks(tasks: PlanTask[]): PlanTask[] {
  const groups = new Map<string, PlanTask[]>();
  for (const task of tasks) {
    const key = task.subject?.name ?? '综合';
    const group = groups.get(key) ?? [];
    group.push(task);
    groups.set(key, group);
  }
  for (const group of groups.values()) group.sort((a, b) => taskPriority(a) - taskPriority(b));
  const result: PlanTask[] = [];
  let hasNext = true;
  while (hasNext) {
    hasNext = false;
    for (const group of groups.values()) {
      const next = group.shift();
      if (!next) continue;
      result.push(next);
      hasNext = true;
    }
  }
  return result;
}

function entry(task: PlanTask, start: number, duration: number): TimelineEntry {
  return {
    id: `task-${task.id}`,
    kind: 'task',
    start: clockLabel(start),
    end: clockLabel(start + duration),
    duration,
    title: task.title,
    subtitle: task.description ?? (duration >= 75 ? '周末集中完成的深度任务' : '按当前节奏完成本项'),
    subject: task.subject?.name ?? '综合',
    color: task.subject?.color ?? '#2f6cf6',
    task,
  };
}

function restEntry(id: string, kind: 'break' | 'lunch', start: number, duration: number): TimelineEntry {
  return {
    id,
    kind,
    start: clockLabel(start),
    end: clockLabel(start + duration),
    duration,
    title: kind === 'lunch' ? '午餐与休息' : '短休 · 走动与补水',
    subtitle: kind === 'lunch' ? '不安排记忆任务，让注意力恢复' : '离开屏幕，放松眼睛',
    subject: kind === 'lunch' ? '午餐' : '休息',
    color: '#aeb5c2',
  };
}

export function buildDaySchedule(tasks: PlanTask[], date: string, availability: StudyAvailability, reservedMinutes = 0): DaySchedule {
  const weekend = isWeekendDate(date);
  const mode: ScheduleMode = weekend ? 'weekend' : 'weekday';
  const day = parseLocalDate(date).getDay();
  const capacityMinutes = day === 6
    ? availability.saturdayMinutes
    : day === 0
      ? availability.sundayMinutes
      : availability.weekdayMinutes;
  const sorted = mode === 'weekday'
    ? [...tasks].sort((a, b) => preferredMinutes(a, mode) - preferredMinutes(b, mode))
    : balanceWeekendTasks(tasks);
  const selected: Array<{ task: PlanTask; duration: number }> = [];
  const overflow: PlanTask[] = [];
  let plannedMinutes = 0;
  const planningLimit = Math.max(0, capacityMinutes - reservedMinutes);

  for (const task of sorted) {
    const duration = preferredMinutes(task, mode);
    if (plannedMinutes + duration <= planningLimit || selected.length === 0) {
      selected.push({ task, duration });
      plannedMinutes += duration;
    } else {
      overflow.push(task);
    }
  }

  const entries: TimelineEntry[] = [];
  let clockBufferMinutes = 0;
  if (mode === 'weekday') {
    const morning = selected[0] && selected[0].duration <= availability.weekdayMorningMinutes
      ? selected[0].duration
      : 0;
    if (selected[0] && morning) entries.push(entry(selected[0].task, 7 * 60 + 20, morning));
    let current = clockMinutes(availability.weekdayEveningStart);
    const eveningTasks = selected.slice(morning ? 1 : 0);
    for (const item of eveningTasks) {
      const available = Math.max(0, capacityMinutes - entries.reduce((sum, item) => sum + (item.kind === 'task' ? item.duration : 0), 0));
      const duration = Math.min(item.duration, available);
      if (!duration) break;
      entries.push(entry(item.task, current, duration));
      current += duration + 10;
    }
  } else {
    let current = clockMinutes(availability.weekendStart);
    let lunchTaken = false;
    for (const item of selected) {
      if (!lunchTaken && current >= 11 * 60 + 45 && current < 13 * 60 + 15) {
        const lunch = restEntry(`lunch-${current}`, 'lunch', current, 60);
        entries.push(lunch);
        current += 60;
        lunchTaken = true;
      }
      entries.push(entry(item.task, current, item.duration));
      current += item.duration;
      if (item !== selected[selected.length - 1]) {
        if (!lunchTaken && current >= 11 * 60 + 45 && current < 13 * 60 + 15) {
          const lunch = restEntry(`lunch-${current}`, 'lunch', current, 60);
          entries.push(lunch);
          current += 60;
          lunchTaken = true;
        } else {
          const pause = restEntry(`break-${current}`, 'break', current, 15);
          entries.push(pause);
          current += 15;
        }
      }
    }
    clockBufferMinutes = Math.max(0, clockMinutes(availability.weekendEnd) - current);
  }

  return {
    mode,
    entries,
    plannedMinutes,
    capacityMinutes,
    bufferMinutes: Math.max(0, capacityMinutes - plannedMinutes, clockBufferMinutes),
    overflow,
  };
}

export function weekCapacityDays(anchorDate: string, availability: StudyAvailability): WeekCapacityDay[] {
  const anchor = parseLocalDate(anchorDate);
  const offsetToMonday = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - offsetToMonday);
  const today = toDateString(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const dateValue = new Date(monday);
    dateValue.setDate(monday.getDate() + index);
    const date = toDateString(dateValue);
    const day = dateValue.getDay();
    const capacityMinutes = day === 6
      ? availability.saturdayMinutes
      : day === 0
        ? availability.sundayMinutes
        : availability.weekdayMinutes;
    return {
      key: date,
      date,
      weekday: WEEKDAYS[day],
      shortWeekday: SHORT_WEEKDAYS[day],
      capacityMinutes,
      isWeekend: day === 0 || day === 6,
      isToday: date === today,
    };
  });
}

export function weekRangeLabel(days: WeekCapacityDay[]): string {
  if (!days.length) return '';
  const start = parseLocalDate(days[0].date);
  const end = parseLocalDate(days[days.length - 1].date);
  return `${start.getFullYear()} 年 ${start.getMonth() + 1} 月 ${start.getDate()} 日 – ${end.getMonth() + 1} 月 ${end.getDate()} 日`;
}
