<script setup lang="ts">
import { useRouter } from 'vue-router';

withDefaults(defineProps<{
  title: string;
  eyebrow?: string;
  back?: boolean;
  actionLabel?: string;
}>(), {
  eyebrow: '',
  back: false,
  actionLabel: '',
});

const emit = defineEmits<{ action: [] }>();
const router = useRouter();
</script>

<template>
  <header class="study-header">
    <button v-if="back" class="study-header-back" aria-label="返回" @click="router.back()">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
    </button>
    <div class="study-header-copy">
      <span v-if="eyebrow" class="study-header-eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
    </div>
    <button v-if="actionLabel" class="study-header-action" @click="emit('action')">{{ actionLabel }}</button>
    <slot name="action" />
  </header>
</template>
