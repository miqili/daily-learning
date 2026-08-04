<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiError } from '@/api/client';
import { useUserStore } from '@/stores/useUserStore';

const router = useRouter();
const user = useUserStore();
const mode = ref<'login' | 'register'>('login');
const username = ref('demo');
const password = ref('Study70Days!');
const examDate = ref('2026-10-24');
const loading = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    if (mode.value === 'login') await user.login(username.value, password.value);
    else await user.register(username.value, password.value, examDate.value);
    await router.push('/');
  } catch (cause) { error.value = apiError(cause); } finally { loading.value = false; }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card card">
      <div class="login-logo"><span class="brand-mark">70</span><strong>70 天备考计划</strong></div>
      <h1>{{ mode === 'login' ? '欢迎回来' : '创建你的备考计划' }}</h1>
      <p class="muted" style="margin:8px 0 24px">70 天倒计时 + 个性化学习计划 + 每日打卡，为 2026 理工类考试做准备。</p>
      <form @submit.prevent="submit">
        <label class="form-label">用户名<input v-model.trim="username" class="input" autocomplete="username" required minlength="3" /></label>
        <label class="form-label">密码<input v-model="password" class="input" type="password" autocomplete="current-password" required minlength="8" /></label>
        <label v-if="mode === 'register'" class="form-label">目标考试日期<input v-model="examDate" class="input" type="date" required /></label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="button" style="width:100%;margin-top:8px" :disabled="loading">{{ loading ? '处理中…' : mode === 'login' ? '登录并开始学习' : '注册并创建计划' }}</button>
      </form>
      <div class="caption" style="margin-top:20px;text-align:center">
        <template v-if="mode === 'login'">没有账号？ <button class="text-button" @click="mode = 'register'">立即注册</button></template>
        <template v-else>已有账号？ <button class="text-button" @click="mode = 'login'">返回登录</button></template>
      </div>
      <p v-if="mode === 'login'" class="demo-tip">本地体验账号已填入：<code>demo</code></p>
    </section>
  </main>
</template>

<style scoped>
.login-page { display:grid; min-height:100vh; place-items:center; padding:24px; background:linear-gradient(145deg,#eff6ff,#f8fafc 50%,#eef2ff); }
.login-card { width:min(100%,440px); padding:32px; }
.login-logo { display:flex; align-items:center; gap:10px; margin-bottom:32px; color:#0f172a; }
.form-label { display:grid; gap:7px; margin-bottom:16px; color:#334155; font-size:14px; font-weight:500; }
.text-button { border:0; padding:0; background:none; color:#2563eb; font-size:12px; }
.demo-tip { margin:24px 0 0; padding:10px; border-radius:8px; background:#eff6ff; color:#475569; text-align:center; font-size:12px; }
@media (prefers-color-scheme:dark) { .login-page { background:#0f172a; } .login-logo,.form-label { color:#e2e8f0; } .demo-tip { background:#1e3a8a; color:#cbd5e1; } }
</style>
