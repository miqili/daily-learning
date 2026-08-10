<script setup lang="ts">
import { ref } from 'vue';
import { FORMAL_EXAM_DATE } from '@shck/shared';
import { useRouter } from 'vue-router';
import { apiError } from '@/api/client';
import { useUserStore } from '@/stores/useUserStore';

const router = useRouter();
const user = useUserStore();
const mode = ref<'login' | 'register'>('login');
const username = ref('demo');
const password = ref('Study70Days!');
const examDate = ref(FORMAL_EXAM_DATE);
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
    <section class="login-visual" aria-label="产品介绍">
      <div class="visual-brand"><span class="brand-mark">S</span><strong>Study</strong><small>成人本科备考</small></div>
      <div class="visual-copy">
        <span class="visual-eyebrow">2026 成人本科考试</span>
        <h1>有限时间，也能建立稳定的备考节奏。</h1>
        <p>工作日轻量推进，周末完成深度学习。每天只关注下一项应该完成的任务。</p>
      </div>
      <div class="visual-preview">
        <div><span>工作日</span><strong>早间 20 分钟 · 晚间 70 分钟</strong></div>
        <div><span>周六 / 周日</span><strong>集中完成深度任务与真题</strong></div>
        <div><span>考试日期</span><strong>2026 年 10 月 17 日</strong></div>
      </div>
    </section>

    <section class="login-panel">
      <div class="login-card">
        <div class="mobile-brand"><span class="brand-mark">S</span><strong>Study</strong></div>
        <div class="login-heading">
          <span>{{ mode === 'login' ? '欢迎回来' : '开始你的计划' }}</span>
          <h2>{{ mode === 'login' ? '登录学习空间' : '创建备考账号' }}</h2>
          <p>{{ mode === 'login' ? '继续今天的学习任务。' : '从 8 月 10 日到 10 月 16 日完成正式备考计划。' }}</p>
        </div>
        <form @submit.prevent="submit">
          <label class="form-label">用户名<input v-model.trim="username" class="input" autocomplete="username" placeholder="请输入用户名" required minlength="3" /></label>
          <label class="form-label">密码<input v-model="password" class="input" type="password" autocomplete="current-password" placeholder="至少 8 位" required minlength="8" /></label>
          <label v-if="mode === 'register'" class="form-label">目标考试日期<input v-model="examDate" class="input" type="date" required /></label>
          <p v-if="error" class="error">{{ error }}</p>
          <button class="button submit-button" :disabled="loading">{{ loading ? '处理中…' : mode === 'login' ? '登录并继续' : '注册并创建计划' }}</button>
        </form>
        <div class="switch-mode">
          <template v-if="mode === 'login'">还没有账号？ <button class="text-button" @click="mode = 'register'">立即注册</button></template>
          <template v-else>已有账号？ <button class="text-button" @click="mode = 'login'">返回登录</button></template>
        </div>
        <div v-if="mode === 'login'" class="demo-tip"><span>体验账号</span><code>demo</code><small>已自动填入</small></div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page { display: grid; grid-template-columns: minmax(420px,.9fr) minmax(460px,1.1fr); min-height: 100vh; background: #fff; }
.login-visual { display: flex; flex-direction: column; padding: 40px clamp(40px,5vw,76px); border-right: 1px solid var(--app-border); background: var(--app-bg); color: var(--app-text); }
.visual-brand,.mobile-brand { display: flex; align-items: center; gap: 11px; font-size: 15px; }
.visual-brand .brand-mark,.mobile-brand .brand-mark { width: 36px; height: 36px; flex-basis:36px; border-radius:9px; background:var(--app-primary); }
.visual-brand small{margin-left:2px;color:var(--app-muted);font-size:11px;font-weight:400}
.visual-copy { margin: auto 0 36px; }
.visual-eyebrow { color: var(--app-primary); font-size: 12px; font-weight: 600; }
.visual-copy h1 { max-width: 540px; margin-top: 14px; color: var(--app-text); font-size: clamp(34px,3.5vw,48px); font-weight:600; line-height: 1.2; letter-spacing: -.04em; }
.visual-copy p { max-width: 520px; margin: 18px 0 0; color: var(--app-muted); font-size: 14px; line-height: 1.75; }
.visual-preview { overflow:hidden;border:1px solid var(--app-border);border-radius:10px;background:#fff;box-shadow:var(--app-shadow-sm) }
.visual-preview>div{display:grid;grid-template-columns:110px 1fr;gap:18px;padding:14px 16px;border-top:1px solid var(--app-border)}.visual-preview>div:first-child{border-top:0}.visual-preview span{color:var(--app-muted);font-size:12px}.visual-preview strong{font-size:13px;font-weight:600}
.login-panel { display: grid; place-items: center; padding: 40px; background: #fff; }
.login-card { width: min(100%, 420px); }
.mobile-brand { display: none; margin-bottom: 40px; color: var(--app-text); }
.login-heading > span { color: var(--app-primary); font-size: 12px; font-weight: 600; }
.login-heading h2 { margin-top: 8px; font-size: 28px; font-weight:600; letter-spacing: -.035em; }.login-heading p { margin: 8px 0 28px; color: var(--app-muted); font-size: 13px; }
.form-label { display: grid; gap: 7px; margin-bottom: 16px; color: #344054; font-size: 12px; font-weight: 650; }
.submit-button { width: 100%; min-height: 46px; margin-top: 4px; }
.switch-mode { margin-top: 21px; color: var(--app-muted); text-align: center; font-size: 12px; }
.demo-tip { display: flex; align-items: center; gap: 9px; margin-top: 25px; padding: 11px 12px; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-surface-subtle); color: var(--app-muted); font-size: 11px; }.demo-tip span { font-weight: 650; }.demo-tip code { color: var(--app-primary); font-weight: 750; }.demo-tip small { margin-left: auto; color: var(--app-faint); }
@media (max-width: 900px) { .login-page { grid-template-columns: 1fr; background: var(--app-bg); }.login-visual { display: none; }.login-panel { padding: 26px 20px; background: var(--app-bg); }.login-card { padding: 28px 24px; border: 1px solid var(--app-border); border-radius: 20px; background: #fff; box-shadow: var(--app-shadow); }.mobile-brand { display: flex; } }
@media (max-width: 440px) { .login-panel { padding: 18px 14px; }.login-card { padding: 25px 20px; }.login-heading h2 { font-size: 25px; } }
</style>
