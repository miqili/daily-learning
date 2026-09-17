<script setup lang="ts">
import { ref } from 'vue';
import { FORMAL_EXAM_DATE } from '@shck/shared';
import { useRouter } from 'vue-router';
import { apiError } from '@/api/client';
import { useUserStore } from '@/stores/useUserStore';

const router = useRouter();
const user = useUserStore();
const mode = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');
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
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-visual" aria-label="产品介绍">
      <div class="visual-brand">
        <span class="brand-mark">S</span><strong>Study</strong><small>成人本科备考</small>
      </div>
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
          <p>
            {{
              mode === 'login'
                ? '继续今天的学习任务。'
                : '从 8 月 10 日到 10 月 16 日完成正式备考计划。'
            }}
          </p>
        </div>
        <form @submit.prevent="submit">
          <label class="wb-field form-label">
            <span class="wb-label">用户名</span>
            <input
              v-model.trim="username"
              class="wb-input"
              autocomplete="username"
              placeholder="请输入用户名"
              required
              minlength="3"
            />
          </label>
          <label class="wb-field form-label">
            <span class="wb-label">密码</span>
            <input
              v-model="password"
              class="wb-input"
              type="password"
              autocomplete="current-password"
              placeholder="至少 8 位"
              required
              minlength="8"
            />
          </label>
          <label v-if="mode === 'register'" class="wb-field form-label">
            <span class="wb-label">目标考试日期</span>
            <input v-model="examDate" class="wb-input" type="date" required />
          </label>
          <p v-if="error" class="wb-alert form-error">{{ error }}</p>
          <button type="button" class="wb-btn is-primary is-lg submit-button" :disabled="loading" @click="submit">
            {{ loading ? '处理中…' : mode === 'login' ? '登录并继续' : '注册并创建计划' }}
          </button>
        </form>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: minmax(420px, 0.9fr) minmax(460px, 1.1fr);
  min-height: 100vh;
  background: var(--wb-surface);
}
/* 品牌光带与真题页 Hero 同款处理 */
.login-visual {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 40px clamp(40px, 5vw, 76px);
  border-right: 1px solid var(--wb-line-soft);
  background: var(--wb-surface-2);
  color: var(--wb-ink);
}
.login-visual::before {
  position: absolute;
  inset: 0 0 auto 0;
  height: 132px;
  content: "";
  background: linear-gradient(180deg, rgba(40, 184, 148, .16), rgba(40, 184, 148, 0));
  pointer-events: none;
}
.visual-brand,
.mobile-brand { position: relative; display: flex; align-items: center; gap: 11px; font-size: 15px; }
.visual-brand .brand-mark,
.mobile-brand .brand-mark {
  width: 36px;
  height: 36px;
  flex-basis: 36px;
  border-radius: 10px;
  background: var(--wb-brand);
}
.visual-brand strong { color: var(--wb-ink); font-weight: 600; }
.visual-brand small { margin-left: 2px; color: var(--wb-faint); font-size: 11px; font-weight: 400; }
.visual-copy { position: relative; margin: auto 0 36px; }
.visual-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--wb-brand-soft);
  color: var(--wb-brand-deep);
  font-size: 12px;
  font-weight: 600;
}
.visual-eyebrow::before { width: 6px; height: 6px; border-radius: 50%; content: ""; background: var(--wb-brand); }
.visual-copy h1 {
  max-width: 540px;
  margin: 16px 0 0;
  color: var(--wb-ink);
  font-size: clamp(32px, 3.4vw, 46px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.04em;
}
.visual-copy p { max-width: 520px; margin: 18px 0 0; color: var(--wb-muted); font-size: 14px; line-height: 1.75; }
.visual-preview {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: var(--wb-surface);
  box-shadow: var(--wb-shadow-sm);
}
.visual-preview > div { display: grid; grid-template-columns: 110px 1fr; gap: 18px; padding: 14px 16px; border-top: 1px solid var(--wb-line-soft); }
.visual-preview > div:first-child { border-top: 0; }
.visual-preview span { color: var(--wb-faint); font-size: 12px; }
.visual-preview strong { color: var(--wb-ink-2); font-size: 13px; font-weight: 600; }

.login-panel { display: grid; place-items: center; padding: 40px; background: var(--wb-surface); }
.login-card { width: min(100%, 420px); }
.mobile-brand { display: none; margin-bottom: 40px; color: var(--wb-ink); }
.login-heading > span { color: var(--wb-brand-deep); font-size: 12px; font-weight: 600; }
.login-heading h2 { margin: 8px 0 0; color: var(--wb-ink); font-size: 28px; font-weight: 700; letter-spacing: -0.035em; }
.login-heading p { margin: 8px 0 28px; color: var(--wb-muted); font-size: 13px; }

.form-label { margin-bottom: 16px; }
.form-error { margin: 0 0 14px; }
.submit-button { width: 100%; min-height: 46px; margin-top: 4px; }

@media (max-width: 900px) {
  .login-page { grid-template-columns: 1fr; background: var(--wb-surface-2); }
  .login-visual { display: none; }
  .login-panel { padding: 26px 20px; background: var(--wb-surface-2); }
  .login-card {
    padding: 28px 24px;
    border: 1px solid var(--wb-line-soft);
    border-radius: var(--wb-radius-xl);
    background: var(--wb-surface);
    box-shadow: var(--wb-shadow);
  }
  .mobile-brand { display: flex; }
}
@media (max-width: 440px) {
  .login-panel { padding: 18px 14px; }
  .login-card { padding: 25px 20px; }
  .login-heading h2 { font-size: 25px; }
}
</style>
