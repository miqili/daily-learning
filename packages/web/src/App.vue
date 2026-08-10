<script setup lang="ts">
import { onMounted } from 'vue';
import { ConfigProvider } from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import { useUserStore } from './stores/useUserStore';
import { antDesignTheme } from './theme/antDesignTheme';

const user = useUserStore();
onMounted(() => user.restore());
</script>

<template>
  <ConfigProvider :locale="zhCN" :theme="antDesignTheme" :auto-insert-space-in-button="false" component-size="middle">
    <RouterView />
  </ConfigProvider>
</template>
