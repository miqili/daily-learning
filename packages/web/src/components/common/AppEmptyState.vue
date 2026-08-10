<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <div class="app-empty-state">
    <span class="empty-state-mark" aria-hidden="true">○</span>
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <div v-if="$slots.action" class="empty-state-action"><slot name="action" /></div>
  </div>
</template>
