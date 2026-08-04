<script setup lang="ts">
import { onMounted } from 'vue';
import { useUserStore } from './stores/useUserStore';

const user = useUserStore();
onMounted(() => user.restore());
</script>

<template>
  <RouterView />
</template>
