<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { VOCAB_LEVEL_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import AppEmptyState from '@/components/common/AppEmptyState.vue';
import DesktopPageHeader from '@/components/common/DesktopPageHeader.vue';
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

// 分级色与全站科目色同一套语言：薄荷绿 / 紫 / 橙
function levelColor(level: number): string {
  return level === 1 ? '#28b894' : level === 2 ? '#6c4dff' : '#f97316';
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
  <section class="wb-page phrases-page">
    <DesktopPageHeader eyebrow="英语学习" title="短语" description="集中记忆高频搭配和固定表达，与单词形成关联。">
      <template #actions><span class="wb-tag is-plain count-tag">{{ filtered.length }} 条短语</span></template>
    </DesktopPageHeader>
    <p v-if="error" class="wb-alert page-alert">{{ error }}</p>

    <section class="wb-card resource-section phrase-create">
      <header class="wb-card-head section-heading"><div><h2>添加短语</h2><p>补充备考中遇到的固定搭配。</p></div></header>
      <div class="phrase-form">
        <label class="wb-field">
          <span class="wb-label">短语</span>
          <input v-model="form.phrase" class="wb-input" placeholder="如：make a difference" @keyup.enter="addPhrase" />
        </label>
        <label class="wb-field">
          <span class="wb-label">释义</span>
          <input v-model="form.meaning" class="wb-input" placeholder="如：产生影响" @keyup.enter="addPhrase" />
        </label>
        <label class="wb-field">
          <span class="wb-label">分级</span>
          <select v-model="form.level" class="wb-select">
            <option v-for="l in LEVELS" :key="l" :value="l">{{ VOCAB_LEVEL_LABELS[l] }}</option>
          </select>
        </label>
        <label class="wb-field">
          <span class="wb-label">词库（可选）</span>
          <select v-model="form.deck_id" class="wb-select">
            <option :value="undefined">不关联</option>
            <option v-for="d in decks" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </label>
        <button type="button" class="wb-btn is-primary add-btn" @click="addPhrase">添加短语</button>
      </div>
    </section>

    <section class="wb-card resource-section phrase-library">
      <header class="wb-card-head section-heading">
        <div><h2>短语库</h2><p>按记忆级别筛选并快速播放发音。</p></div>
        <span class="head-count">{{ filtered.length }} 条</span>
      </header>
      <div class="resource-filters">
        <div class="wb-seg level-seg">
          <button
            v-for="l in [0, ...LEVELS]"
            :key="l"
            type="button"
            class="wb-seg-item"
            :class="{ 'is-active': levelFilter === l }"
            @click="levelFilter = l; loadList()"
          >
            {{ l === 0 ? '全部' : VOCAB_LEVEL_LABELS[l] }}
          </button>
        </div>
        <div class="wb-search filter-search">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
          <input v-model="keyword" placeholder="搜索短语、释义或关联单词…" @keyup.enter="loadList" />
        </div>
        <button type="button" class="wb-btn" @click="loadList">搜索</button>
      </div>
      <div v-if="filtered.length" class="phrase-list">
        <article v-for="p in filtered" :key="p.id">
          <div>
            <div class="phrase-title">
              <strong>{{ p.phrase }}</strong>
              <span class="level-badge" :style="{ '--level-color': levelColor(p.level) }">{{ VOCAB_LEVEL_LABELS[p.level] ?? '高频' }}</span>
              <button type="button" class="spk-link" title="美式发音" @click="speak(p.phrase)">播放</button>
              <span v-if="p.word" class="phrase-meta">关联单词 {{ p.word.word }}</span>
              <span v-if="p.deck" class="phrase-meta">{{ p.deck.name }}</span>
            </div>
            <p v-if="p.meaning">{{ p.meaning }}</p>
          </div>
          <button type="button" class="wb-btn is-sm is-danger" @click="remove(p.id)">删除</button>
        </article>
      </div>
      <AppEmptyState v-else title="还没有符合条件的短语" description="添加第一条短语，或调整当前筛选条件。" />
    </section>
  </section>
</template>

<style scoped>
.page-alert { margin: 0 0 16px; }
.count-tag { background: var(--wb-brand-soft); color: var(--wb-brand-deep); }

.resource-section { margin-bottom: 16px; overflow: hidden; }
.section-heading { min-height: 68px; padding: 14px 18px; margin-bottom: 0; border-bottom: 1px solid var(--wb-line-soft); }
.section-heading h2 { font-size: 16px; }
.section-heading p { margin: 4px 0 0; color: var(--wb-faint); font-size: 12px; }
.head-count { color: var(--wb-muted); font-size: 12px; font-variant-numeric: tabular-nums; }

.phrase-form { display: grid; grid-template-columns: 1fr 1fr 150px 170px auto; align-items: end; gap: 10px; padding: 18px; }
.add-btn { min-height: 36px; }

.resource-filters { display: grid; grid-template-columns: auto minmax(220px, 1fr) auto; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--wb-line-soft); background: var(--wb-surface-2); }
.level-seg { overflow-x: auto; }
.filter-search { width: 100%; }

.phrase-list { max-height: 720px; overflow: auto; padding: 0 18px; }
.phrase-list article { display: flex; align-items: center; gap: 20px; padding: 16px 0; border-bottom: 1px solid var(--wb-line-soft); }
.phrase-list article:last-child { border-bottom: 0; }
.phrase-list article > div { min-width: 0; flex: 1; }
.phrase-title { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.phrase-title strong { color: var(--wb-ink); font-size: 16px; font-weight: 600; }
.level-badge { padding: 2px 7px; border-radius: var(--wb-radius-sm); background: color-mix(in srgb, var(--level-color) 9%, #fff); color: var(--level-color); font-size: 11px; font-weight: 600; }
.spk-link { border: 0; padding: 0; background: transparent; color: var(--wb-brand-deep); font-size: 12px; font-weight: 600; }
.spk-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.phrase-meta { color: var(--wb-faint); font-size: 11px; }
.phrase-list p { margin: 6px 0 0; color: var(--wb-muted); font-size: 13px; }

@media (max-width: 1100px) {
  .phrase-form { grid-template-columns: 1fr 1fr; }
  .add-btn { justify-self: start; }
}
@media (max-width: 1024px) {
  .resource-filters { grid-template-columns: minmax(0, 1fr) auto; }
  .level-seg { grid-column: 1 / -1; justify-self: start; }
  .filter-search { grid-column: 1; }
}
@media (max-width: 700px) {
  .phrase-form, .resource-filters { grid-template-columns: 1fr; }
  .level-seg { overflow-x: auto; }
  .phrase-list article { align-items: flex-start; }
}
</style>
