<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';

const router = useRouter();
const user = useUserStore();

function signOut() {
  user.logout();
  router.push('/login');
}
</script>

<template>
  <div class="app-canvas shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">70</span><span>70 天备考计划</span></div>
      <nav aria-label="主导航">
        <RouterLink class="nav-link" to="/"><span>◈</span>今日任务</RouterLink>
        <RouterLink class="nav-link" to="/mistakes"><span>▣</span>错题本</RouterLink>
        <RouterLink class="nav-link" to="/vocabulary"><span>Aa</span>单词</RouterLink>
        <RouterLink class="nav-link" to="/phrases"><span>✎</span>短语</RouterLink>
        <RouterLink class="nav-link" to="/essays"><span>✎</span>作文</RouterLink>
        <RouterLink class="nav-link" to="/plan"><span>⚙</span>计划配置</RouterLink>
      </nav>
    </aside>
    <main class="main-area">
      <header class="topbar">
        <div class="caption">成人本科 · 理工类 · 2026 备考</div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="badge blue">{{ user.user?.username ?? '学习者' }}</span>
          <button class="button secondary" style="min-height:32px;padding:0 10px" @click="signOut">退出</button>
        </div>
      </header>
      <RouterView />
    </main>
    <nav class="mobile-nav" aria-label="移动主导航">
      <RouterLink to="/">任务</RouterLink>
      <RouterLink to="/mistakes">错题</RouterLink>
      <RouterLink to="/vocabulary">单词</RouterLink>
      <RouterLink to="/phrases">短语</RouterLink>
      <RouterLink to="/plan">配置</RouterLink>
    </nav>
  </div>
</template>
