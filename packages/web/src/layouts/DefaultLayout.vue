<script setup lang="ts">
import { computed } from 'vue';
import { Button } from 'ant-design-vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';

const router = useRouter();
const route = useRoute();
const user = useUserStore();
const currentSection = computed(() => ({
  dashboard: '今日计划',
  'task-execution': '任务执行',
  plan: '计划配置',
  mistakes: '错题本',
  vocabulary: '单词',
  phrases: '短语',
  essays: '作文',
}[String(route.name)] ?? '学习工作台'));

function signOut() {
  user.logout();
  router.push('/login');
}
</script>

<template>
  <div class="app-canvas shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">S</span>
        <span class="brand-copy"><strong>Study</strong><span>成人本科备考</span></span>
      </div>
      <div class="nav-section-label">计划</div>
      <nav aria-label="主导航">
        <RouterLink class="nav-link" :class="{ 'is-active': route.meta.navKey === 'dashboard' }" to="/">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h5M8 17h3"/></svg>
          今日与周计划
        </RouterLink>
        <div class="nav-section-label">学习</div>
        <RouterLink class="nav-link" :class="{ 'is-active': route.meta.navKey === 'mistakes' }" to="/mistakes">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h3"/><path d="m16 15 3 3"/></svg>
          错题本
        </RouterLink>
        <RouterLink class="nav-link" :class="{ 'is-active': route.meta.navKey === 'vocabulary' }" to="/vocabulary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H5zM19 4h-2a3 3 0 0 0-3 3"/></svg>
          单词
        </RouterLink>
        <RouterLink class="nav-link" :class="{ 'is-active': route.meta.navKey === 'phrases' }" to="/phrases">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 20 4.5-1L19 8.5 15.5 5 5 15.5 4 20zM13.5 7l3.5 3.5"/></svg>
          短语
        </RouterLink>
        <RouterLink class="nav-link" :class="{ 'is-active': route.meta.navKey === 'essays' }" to="/essays">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l3 3v15H6zM14 3v4h4M9 11h6M9 15h6"/></svg>
          作文
        </RouterLink>
        <div class="nav-section-label">设置</div>
        <RouterLink class="nav-link" :class="{ 'is-active': route.meta.navKey === 'plan' }" to="/plan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1h-4v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1v-4H3A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1v-.1h4V3a1.7 1.7 0 0 0 1.1 1.6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.36.36.7.6 1 .27.3.63.4 1 .4h.1v4H21a1.7 1.7 0 0 0-1.6.6z"/></svg>
          可用时间设置
        </RouterLink>
      </nav>
      <div class="sidebar-footer">
        <small>当前学习策略</small>
        <strong>工作日轻量学习<br />周末深度学习</strong>
        <span>长章节与套题自动优先进入周末容量。</span>
      </div>
    </aside>
    <main class="main-area">
      <header class="topbar">
        <div class="top-context"><span>学习工作台</span><b>/</b><strong>{{ currentSection }}</strong></div>
        <div class="top-actions">
          <span class="user-chip"><span class="user-avatar">{{ (user.user?.username ?? 'U')[0].toUpperCase() }}</span>{{ user.user?.username ?? '学习者' }}</span>
          <Button class="top-action" size="small" @click="signOut">退出</Button>
        </div>
      </header>
      <RouterView />
    </main>
    <nav class="mobile-nav" aria-label="移动主导航">
      <RouterLink :class="{ 'is-active': route.meta.navKey === 'dashboard' }" to="/">任务</RouterLink>
      <RouterLink :class="{ 'is-active': route.meta.navKey === 'mistakes' }" to="/mistakes">错题</RouterLink>
      <RouterLink :class="{ 'is-active': route.meta.navKey === 'vocabulary' }" to="/vocabulary">单词</RouterLink>
      <RouterLink :class="{ 'is-active': route.meta.navKey === 'phrases' }" to="/phrases">短语</RouterLink>
      <RouterLink :class="{ 'is-active': route.meta.navKey === 'plan' }" to="/plan">配置</RouterLink>
    </nav>
  </div>
</template>
