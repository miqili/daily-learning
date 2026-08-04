<template>
  <div class="m-shell">
    <main class="m-main">
      <RouterView />
    </main>
    <van-tabbar route active-color="#3b82f6" inactive-color="#9ca3af" safe-area-inset-bottom>
      <van-tabbar-item replace to="/m/tasks" icon="todo-list-o">任务</van-tabbar-item>
      <van-tabbar-item replace to="/m/search" icon="search">检索</van-tabbar-item>
      <van-tabbar-item replace to="/m/me" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.m-shell { min-height: 100vh; background: var(--van-background); }
.m-main { padding-bottom: calc(var(--van-tabbar-height) + env(safe-area-inset-bottom)); }
</style>
