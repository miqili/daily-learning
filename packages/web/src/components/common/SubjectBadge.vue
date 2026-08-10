<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ name: string; color?: string }>();
const visualColor = computed(() => {
  if (/高等数学|高数|数学/.test(props.name)) return '#2563EB';
  if (/英语/.test(props.name)) return '#7C3AED';
  if (/政治/.test(props.name)) return '#F97316';
  if (/复习|完成/.test(props.name)) return '#059669';
  return props.color || '#667085';
});
</script>

<template>
  <span class="subject-badge" :style="{ '--subject-color': visualColor }"><i />{{ name }}</span>
</template>
