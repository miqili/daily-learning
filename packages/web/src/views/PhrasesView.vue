<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { VOCAB_LEVEL_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import { createPhrase, deletePhrase, listDecks, listPhrases, type Deck, type Phrase } from '@/api/vocabulary';
import { speak, warmupVoices } from '@/utils/speech';

const LEVELS = [1, 2, 3];

const phrases = ref<Phrase[]>([]);
const decks = ref<Deck[]>([]);
const levelFilter = ref<number | 0>(0);
const keyword = ref('');
const form = ref({ phrase: '', meaning: '', level: 1, deck_id: undefined as number | undefined });
const error = ref('');
const busy = ref(false);

const filtered = computed(() => phrases.value.filter((p) => {
  if (levelFilter.value !== 0 && p.level !== levelFilter.value) return false;
  if (keyword.value) {
    const kw = keyword.value.toLowerCase();
    const hit = p.phrase.toLowerCase().includes(kw) || (p.meaning ?? '').toLowerCase().includes(kw) || (p.word?.word ?? '').toLowerCase().includes(kw);
    if (!hit) return false;
  }
  return true;
}));

function levelColor(level: number): string {
  return level === 1 ? '#2563eb' : level === 2 ? '#7c3aed' : '#d97706';
}

async function loadAll() {
  error.value = '';
  busy.value = true;
  try {
    decks.value = await listDecks();
    await loadList();
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function loadList() {
  phrases.value = await listPhrases({ level: levelFilter.value || undefined, keyword: keyword.value || undefined });
}

async function addPhrase() {
  const text = form.value.phrase.trim();
  if (!text) return;
  error.value = '';
  try {
    await createPhrase({ phrase: text, meaning: form.value.meaning || undefined, level: form.value.level, deck_id: form.value.deck_id });
    form.value = { phrase: '', meaning: '', level: 1, deck_id: undefined };
    await loadList();
  } catch (cause) { error.value = apiError(cause); }
}

async function remove(id: number) {
  error.value = '';
  try { await deletePhrase(id); await loadList(); }
  catch (cause) { error.value = apiError(cause); }
}

onMounted(() => { warmupVoices(); loadAll(); });
</script>

<template>
  <section class="page" style="max-width:1080px">
    <div class="page-heading">
      <div><h1>短语</h1><p class="muted" style="margin:8px 0 0">高频搭配与固定短语，和单词一起分级记忆。</p></div>
      <div class="badge blue">共 {{ filtered.length }} 条</div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="card card-pad" style="margin-bottom:24px">
      <h2 style="margin-bottom:16px">添加短语</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr 160px 180px;gap:12px;align-items:end">
        <label style="display:grid;gap:6px"><span class="caption">短语</span><input v-model.trim="form.phrase" class="input" placeholder="如：make a difference" @keyup.enter="addPhrase" /></label>
        <label style="display:grid;gap:6px"><span class="caption">释义</span><input v-model="form.meaning" class="input" placeholder="如：产生影响" @keyup.enter="addPhrase" /></label>
        <label style="display:grid;gap:6px"><span class="caption">分级</span><select v-model="form.level" class="select"><option v-for="l in LEVELS" :key="l" :value="l">{{ VOCAB_LEVEL_LABELS[l] }}</option></select></label>
        <label style="display:grid;gap:6px"><span class="caption">词库（可选）</span><select v-model="form.deck_id" class="select"><option :value="undefined">不关联</option><option v-for="d in decks" :key="d.id" :value="d.id">{{ d.name }}</option></select></label>
      </div>
      <button class="button" style="margin-top:12px" @click="addPhrase">添加短语</button>
    </section>

    <section class="card card-pad">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
        <span class="caption">分级筛选：</span>
        <button v-for="l in [0, ...LEVELS]" :key="l" class="button" :class="levelFilter === l ? '' : 'secondary'" style="min-height:28px;padding:0 10px;font-size:12px" @click="levelFilter = l; loadList()">{{ l === 0 ? '全部' : VOCAB_LEVEL_LABELS[l] }}</button>
        <input v-model="keyword" class="input" style="max-width:260px;margin-left:auto" placeholder="搜索短语/释义/关联单词…" @keyup.enter="loadList" />
        <button class="button secondary" @click="loadList">搜索</button>
      </div>
      <div v-if="filtered.length" class="result-list">
        <div v-for="p in filtered" :key="p.id" class="task-row" style="align-items:flex-start">
          <div class="task-content" style="flex:1">
            <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">
              <strong style="font-size:16px">{{ p.phrase }}</strong>
              <span class="badge" :style="{ background: `${levelColor(p.level)}1a`, color: levelColor(p.level) }">{{ VOCAB_LEVEL_LABELS[p.level] ?? '高频' }}</span>
              <button class="text-button" style="font-size:15px" title="美式发音" @click="speak(p.phrase)">🔊</button>
              <span v-if="p.word" class="badge blue">来自单词：{{ p.word.word }}</span>
              <span v-if="p.deck" class="badge">{{ p.deck.name }}</span>
            </div>
            <p v-if="p.meaning" class="muted" style="margin:6px 0 0;font-size:14px">{{ p.meaning }}</p>
          </div>
          <button class="button danger" style="min-height:30px;padding:0 10px" @click="remove(p.id)">删除</button>
        </div>
      </div>
      <div v-else class="caption">还没有短语，先添加一条吧。</div>
    </section>
  </section>
</template>
