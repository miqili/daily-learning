<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ name: string; color?: string }>();
// 科目色与「历年真题」页的 --group-tone 保持一致
const visualColor = computed(() => {
  if (/高等数学|高数|数学/.test(props.name)) return '#28B894';
  if (/英语/.test(props.name)) return '#6C4DFF';
  if (/政治/.test(props.name)) return '#F97316';
  if (/复习|完成/.test(props.name)) return '#22A683';
  return props.color || '#858699';
});
</script>

<template>
  <span class="subject-badge" :style="{ '--subject-color': visualColor }"><i />{{ name }}</span>
</template>
