<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div class="m-shell">
    <main class="m-main">
      <RouterView />
    </main>
    <nav class="mobile-tabbar" aria-label="主导航">
      <RouterLink :class="{ 'is-active': route.meta.navKey === 'tasks' }" to="/m/tasks" replace>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /></svg>
        <span>今日</span>
      </RouterLink>
      <RouterLink :class="{ 'is-active': route.meta.navKey === 'search' }" to="/m/search" replace>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10.7" cy="10.7" r="6.2"/><path d="m15.2 15.2 4.3 4.3" /></svg>
        <span>检索</span>
      </RouterLink>
      <RouterLink :class="{ 'is-active': route.meta.navKey === 'me' }" to="/m/me" replace>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-4.1 2.8-6.1 6.5-6.1s5.8 2 6.5 6.1" /></svg>
        <span>我的</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.m-shell { min-height: 100vh; min-height: 100dvh; background: var(--app-bg); }
.m-main { min-height: 100vh; min-height: 100dvh; padding-bottom: calc(72px + env(safe-area-inset-bottom)); }
.mobile-tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  min-height: calc(64px + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 7px max(18px, calc((100vw - 620px) / 2)) env(safe-area-inset-bottom);
  border-top: 1px solid var(--app-border);
  background: #fff;
  box-shadow: none;
}
.mobile-tabbar a {
  position: relative;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 2px;
  color: var(--app-faint);
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  transition: color .16s ease;
  min-height: 50px;
  -webkit-tap-highlight-color: transparent;
}
.mobile-tabbar a::before { position: absolute; top: -7px; width: 24px; height: 3px; content: ""; background: transparent; }
.mobile-tabbar svg { width: 22px; height: 22px; }
.mobile-tabbar a.is-active { color: var(--app-primary); font-weight: 700; }
.mobile-tabbar a.is-active::before { background: var(--app-primary); }
</style>
