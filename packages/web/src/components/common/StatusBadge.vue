<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }>(), { tone: 'neutral' });
</script>

<template><span :class="['status-pill', `is-${tone}`]"><slot /></span></template>
