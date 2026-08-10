<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showSuccessToast, showToast } from 'vant';
import { VOCAB_LEVEL_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import { createPhrase, deletePhrase, listPhrases, type Phrase } from '@/api/vocabulary';
import MobilePageHeader from '@/components/mobile/MobilePageHeader.vue';
import { speak, warmupVoices } from '@/utils/speech';

const LEVELS = [1, 2, 3];
const phrases = ref<Phrase[]>([]);
const levelFilter = ref<number | 0>(0);
const keyword = ref('');
const showForm = ref(false);
const form = ref({ phrase: '', meaning: '', level: 1 });
const error = ref('');
const busy = ref(false);

const filtered = computed(() => phrases.value);

async function loadAll() {
  error.value = '';
  busy.value = true;
  try {
    phrases.value = await listPhrases({ level: levelFilter.value || undefined, keyword: keyword.value.trim() || undefined });
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function addPhrase() {
  if (!form.value.phrase.trim()) { showToast('请填写短语'); return; }
  try {
    await createPhrase({ phrase: form.value.phrase.trim(), meaning: form.value.meaning.trim() || undefined, level: form.value.level });
    form.value = { phrase: '', meaning: '', level: 1 };
    showForm.value = false;
    showSuccessToast('已添加');
    await loadAll();
  } catch (cause) { showToast(apiError(cause)); }
}

async function remove(id: number) {
  try {
    await deletePhrase(id);
    showSuccessToast('已删除');
    await loadAll();
  } catch (cause) { showToast(apiError(cause)); }
}

onMounted(() => { warmupVoices(); loadAll(); });
</script>

<template>
  <main class="study-page phrases-page">
    <div class="study-screen">
      <MobilePageHeader title="短语簿" eyebrow="英语固定表达" back :action-label="showForm ? '收起' : '添加'" @action="showForm = !showForm" />

      <div v-if="showForm" class="study-form">
        <h2 class="study-form-title">添加短语</h2>
        <van-field v-model="form.phrase" label="短语" placeholder="如：make a difference" maxlength="200" />
        <van-field v-model="form.meaning" label="释义" placeholder="如：产生影响" />
        <div class="form-levels">
          <span>分级</span><button v-for="level in LEVELS" :key="level" :class="{ active: form.level === level }" @click="form.level = level">{{ VOCAB_LEVEL_LABELS[level] }}</button>
        </div>
        <button class="study-primary save-phrase" @click="addPhrase">保存短语</button>
      </div>

      <van-search v-model="keyword" show-action action-text="查找" placeholder="搜索短语或释义" @search="loadAll" @click-action="loadAll" />
      <div class="study-filter-row">
        <button class="study-filter" :class="{ active: levelFilter === 0 }" @click="levelFilter = 0; loadAll()">全部</button>
        <button v-for="level in LEVELS" :key="level" class="study-filter" :class="{ active: levelFilter === level }" @click="levelFilter = level; loadAll()">{{ VOCAB_LEVEL_LABELS[level] }}</button>
      </div>

      <p v-if="error" class="study-error">{{ error }}</p>

      <div v-if="busy && !phrases.length" class="study-loading"><van-loading size="24">正在翻阅短语簿…</van-loading></div>
      <div v-else-if="filtered.length" class="phrase-list">
        <article v-for="(p, index) in filtered" :key="p.id" class="phrase-card">
          <div class="phrase-top">
            <span class="phrase-no">{{ String(index + 1).padStart(2, '0') }}</span>
            <button class="phrase" @click="speak(p.phrase)">{{ p.phrase }}</button>
            <button class="phrase-remove" aria-label="删除短语" @click="remove(p.id)">×</button>
          </div>
          <p v-if="p.meaning" class="phrase-meaning">{{ p.meaning }}</p>
          <div class="phrase-foot"><span>{{ VOCAB_LEVEL_LABELS[p.level] ?? '高频' }}</span><span v-if="p.word">源词 {{ p.word.word }}</span><span v-if="p.deck">{{ p.deck.name }}</span></div>
        </article>
      </div>
      <div v-else class="study-empty">还没有短语。<br>点击右上角「添加」记录一条。</div>
    </div>
  </main>
</template>

<style scoped>
.form-levels { display: flex; align-items: center; gap: 7px; padding: 10px 14px; }.form-levels > span { margin-right: 3px; color: var(--study-muted); font-size: 12px; }.form-levels button { min-height:44px; padding: 0 12px; border: 1px solid var(--app-border-strong); border-radius: 99px; background: transparent; color: var(--study-muted); font-size: 12px; }.form-levels button.active { border-color: var(--app-primary); background: var(--app-primary); color: #fff; }.save-phrase { width: 100%; margin-top: 12px; }
.phrase-list { display: grid; gap: 9px; margin-top: 10px; }.phrase-card { padding: 15px 14px 12px; border: 1px solid var(--study-line); border-radius: 12px; background: var(--app-surface); }.phrase-top { display: grid; grid-template-columns: 27px 1fr 44px; align-items: center; gap: 8px; }.phrase-no { color: var(--study-accent); font-family: inherit; font-size: 12px; }.phrase { min-height:44px; padding: 0; border: 0; background: transparent; color: var(--study-ink); text-align: left; font-family: inherit; font-size: 18px; font-weight: 600; }.phrase-remove { width: 44px; height: 44px; border: 0; background: transparent; color: var(--study-faint); font-size: 20px; }.phrase-meaning { margin: 5px 0 0 35px; color: var(--study-muted); font-size: 13px; line-height: 1.6; }.phrase-foot { display: flex; flex-wrap: wrap; gap: 6px 12px; margin: 8px 0 0 35px; padding-top: 9px; border-top: 1px solid var(--app-border); color: var(--study-faint); font-size: 12px; }
</style>
