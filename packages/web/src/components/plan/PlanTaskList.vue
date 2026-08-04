<script setup lang="ts">
import type { PlanTask } from '@/api/plan';

const props = defineProps<{ subject: NonNullable<PlanTask['subject']>; tasks: PlanTask[] }>();
const emit = defineEmits<{ toggle: [task: PlanTask, completed: boolean] }>();

function icon(name: string): string {
  if (/高数|数学/.test(name)) return '∑';
  if (/英语|english/i.test(name)) return 'Aa';
  if (/政治|思政/.test(name)) return '◐';
  return '◇';
}
</script>

<template>
  <section class="card card-pad">
    <div class="subject-title">
      <span class="icon-box" :style="{ background: `${props.subject.color}1a`, color: props.subject.color }">{{ icon(props.subject.name) }}</span>
      <div><h2>{{ props.subject.name }}</h2><span class="caption">今日任务</span></div>
    </div>
    <div v-if="tasks.length">
      <div v-for="task in tasks" :key="task.id" class="task-row">
        <input class="check" type="checkbox" :checked="task.is_completed" :aria-label="`完成：${task.title}`" @change="emit('toggle', task, !task.is_completed)" />
        <div class="task-content">
          <div :style="task.is_completed ? 'text-decoration:line-through;color:#64748b' : ''">{{ task.title }}</div>
          <p v-if="task.description" class="muted" style="margin:6px 0 0;font-size:13px;line-height:1.6">{{ task.description }}</p>
          <span class="badge" style="margin-top:8px" :style="{ background: `${props.subject.color}1a`, color: props.subject.color }">{{ task.task_type }}</span>
        </div>
      </div>
    </div>
    <div v-else class="caption">本日暂无该科任务。</div>
  </section>
</template>
