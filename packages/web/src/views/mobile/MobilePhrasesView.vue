<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showSuccessToast, showToast } from 'vant';
import { VOCAB_LEVEL_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import { createPhrase, deletePhrase, listPhrases, type Phrase } from '@/api/vocabulary';
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

function levelColor(level: number): string {
  return level === 1 ? '#3b82f6' : level === 2 ? '#8b5cf6' : '#f59e0b';
}

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
  <div class="m-page">
    <van-nav-bar title="短语" fixed placeholder>
      <template #right><span class="nav-add" @click="showForm = !showForm">{{ showForm ? '收起' : '添加' }}</span></template>
    </van-nav-bar>

    <div class="m-body">
      <!-- 添加 -->
      <div v-if="showForm" class="form-card">
        <div class="form-title">添加短语</div>
        <van-field v-model="form.phrase" label="短语" placeholder="如：make a difference" maxlength="200" />
        <van-field v-model="form.meaning" label="释义" placeholder="如：产生影响" />
        <div class="level-row">
          <span>分级</span>
          <van-tabs v-model:active="form.level" shrink line-width="20">
            <van-tab v-for="l in LEVELS" :key="l" :name="l" :title="VOCAB_LEVEL_LABELS[l]" />
          </van-tabs>
        </div>
        <van-button block round type="primary" style="margin-top:12px" @click="addPhrase">保存</van-button>
      </div>

      <!-- 筛选 -->
      <div class="filter-row">
        <van-tabs v-model:active="levelFilter" shrink line-width="20" @change="loadAll">
          <van-tab :name="0" title="全部" />
          <van-tab v-for="l in LEVELS" :key="l" :name="l" :title="VOCAB_LEVEL_LABELS[l]" />
        </van-tabs>
        <van-search v-model="keyword" placeholder="搜索短语/释义" shape="round" @search="loadAll" @clear="loadAll" />
      </div>

      <p v-if="error" class="m-error">{{ error }}</p>

      <div v-if="busy && !phrases.length" class="m-loading"><van-loading size="24">加载中…</van-loading></div>
      <div v-else-if="filtered.length" class="phrase-list">
        <div v-for="p in filtered" :key="p.id" class="phrase-card">
          <div class="phrase-top">
            <span class="phrase" @click="speak(p.phrase)">{{ p.phrase }}</span>
            <div class="phrase-right">
              <van-tag round plain :color="levelColor(p.level)">{{ VOCAB_LEVEL_LABELS[p.level] ?? '高频' }}</van-tag>
              <van-icon name="cross" color="#c0c4cc" @click="remove(p.id)" />
            </div>
          </div>
          <p v-if="p.meaning" class="phrase-meaning">{{ p.meaning }}</p>
          <div v-if="p.word || p.deck" class="phrase-meta">
            <van-tag v-if="p.word" round plain color="#3b82f6">来自单词：{{ p.word.word }}</van-tag>
            <van-tag v-if="p.deck" round plain color="#94a3b8">{{ p.deck.name }}</van-tag>
          </div>
        </div>
      </div>
      <van-empty v-else description="还没有短语，点右上角「添加」记录一条" />
    </div>
  </div>
</template>

<style scoped>
.m-page { max-width: 640px; margin: 0 auto; min-height: 100vh; background: var(--van-background); }
.nav-add { color: #3b82f6; font-size: 14px; font-weight: 600; }
.m-body { padding: 16px; }
.form-card { background: var(--van-background-2); border-radius: 16px; padding: 16px; margin-bottom: 14px; }
.form-title { font-size: 15px; font-weight: 700; color: var(--van-text-color); margin-bottom: 10px; }
.level-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; }
.level-row > span { font-size: 13px; color: var(--van-text-color); font-weight: 600; }
.filter-row { margin-bottom: 4px; }
.filter-row .van-search { padding: 8px 0; }
.phrase-list { display: grid; gap: 12px; }
.phrase-card { background: var(--van-background-2); border-radius: 16px; padding: 15px 16px; box-shadow: 0 1px 3px rgba(16,24,40,.04); }
.phrase-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.phrase { font-size: 17px; font-weight: 800; color: var(--van-text-color); cursor: pointer; text-decoration: underline dotted; text-underline-offset: 4px; }
.phrase-right { display: flex; align-items: center; gap: 10px; }
.phrase-meaning { font-size: 13px; color: var(--van-text-color-2); margin-top: 8px; line-height: 1.6; }
.phrase-meta { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
.m-error { color: var(--van-danger-color); font-size: 13px; margin: 12px 4px; }
.m-loading { display: grid; place-items: center; padding: 48px 0; color: var(--van-text-color-3); font-size: 13px; }
</style>
