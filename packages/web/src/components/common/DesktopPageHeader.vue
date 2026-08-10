<script setup lang="ts">
defineProps<{ title: string; description?: string; eyebrow?: string }>();
</script>

<template>
  <header class="desktop-page-header">
    <div>
      <p v-if="eyebrow" class="desktop-page-eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="desktop-page-description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="desktop-page-actions"><slot name="actions" /></div>
  </header>
</template>
