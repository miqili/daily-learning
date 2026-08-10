<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button, Input, Select, SelectOption } from 'ant-design-vue';
import { VOCAB_LEVEL_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import AppEmptyState from '@/components/common/AppEmptyState.vue';
import DesktopPageHeader from '@/components/common/DesktopPageHeader.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
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
  <section class="page phrases-page">
    <DesktopPageHeader eyebrow="英语学习" title="短语" description="集中记忆高频搭配和固定表达，与单词形成关联。">
      <template #actions><StatusBadge tone="info">{{ filtered.length }} 条短语</StatusBadge></template>
    </DesktopPageHeader>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="resource-section phrase-create">
      <header><div><h2>添加短语</h2><p>补充备考中遇到的固定搭配。</p></div></header>
      <div class="phrase-form">
        <label><span>短语</span><Input v-model:value="form.phrase" placeholder="如：make a difference" @press-enter="addPhrase" /></label>
        <label><span>释义</span><Input v-model:value="form.meaning" placeholder="如：产生影响" @press-enter="addPhrase" /></label>
        <label><span>分级</span><Select v-model:value="form.level"><SelectOption v-for="l in LEVELS" :key="l" :value="l">{{ VOCAB_LEVEL_LABELS[l] }}</SelectOption></Select></label>
        <label><span>词库（可选）</span><Select v-model:value="form.deck_id" allow-clear placeholder="不关联"><SelectOption v-for="d in decks" :key="d.id" :value="d.id">{{ d.name }}</SelectOption></Select></label>
        <Button type="primary" @click="addPhrase">添加短语</Button>
      </div>
    </section>

    <section class="resource-section phrase-library">
      <header><div><h2>短语库</h2><p>按记忆级别筛选并快速播放发音。</p></div><span>{{ filtered.length }} 条</span></header>
      <div class="resource-filters">
        <div class="segmented-filters"><button v-for="l in [0, ...LEVELS]" :key="l" :class="{ active: levelFilter === l }" @click="levelFilter = l; loadList()">{{ l === 0 ? '全部' : VOCAB_LEVEL_LABELS[l] }}</button></div>
        <Input v-model:value="keyword" placeholder="搜索短语、释义或关联单词…" @press-enter="loadList" />
        <Button @click="loadList">搜索</Button>
      </div>
      <div v-if="filtered.length" class="phrase-list">
        <article v-for="p in filtered" :key="p.id">
          <div>
            <div class="phrase-title">
              <strong>{{ p.phrase }}</strong>
              <span class="level-badge" :style="{ '--level-color': levelColor(p.level) }">{{ VOCAB_LEVEL_LABELS[p.level] ?? '高频' }}</span>
              <button class="text-button" title="美式发音" @click="speak(p.phrase)">播放</button>
              <span v-if="p.word" class="phrase-meta">关联单词 {{ p.word.word }}</span>
              <span v-if="p.deck" class="phrase-meta">{{ p.deck.name }}</span>
            </div>
            <p v-if="p.meaning">{{ p.meaning }}</p>
          </div>
          <Button class="danger-link" type="text" danger size="small" @click="remove(p.id)">删除</Button>
        </article>
      </div>
      <AppEmptyState v-else title="还没有符合条件的短语" description="添加第一条短语，或调整当前筛选条件。" />
    </section>
  </section>
</template>

<style scoped>
.phrases-page{max-width:1160px}.resource-section{margin-bottom:16px;overflow:hidden;border:1px solid var(--app-border);border-radius:10px;background:#fff;box-shadow:var(--app-shadow-sm)}.resource-section>header{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:68px;padding:14px 18px;border-bottom:1px solid var(--app-border)}.resource-section h2{font-size:16px;font-weight:600}.resource-section header p{margin:4px 0 0;color:var(--app-muted);font-size:12px}.resource-section header>span{color:var(--app-muted);font-size:12px}.phrase-form{display:grid;grid-template-columns:1fr 1fr 150px 170px auto;gap:10px;align-items:end;padding:18px}.phrase-form label{display:grid;gap:6px}.phrase-form label>span{color:var(--app-muted);font-size:12px}.resource-filters{display:grid;grid-template-columns:auto minmax(220px,1fr) auto;gap:10px;padding:14px 18px;border-bottom:1px solid var(--app-border);background:#fafbfc}.segmented-filters{display:flex;gap:3px;padding:3px;border-radius:9px;background:#edf0f4}.segmented-filters button{min-height:34px;border:0;border-radius:7px;padding:0 11px;background:transparent;color:var(--app-muted);font-size:12px}.segmented-filters button.active{background:#fff;color:var(--app-primary);box-shadow:var(--app-shadow-sm);font-weight:600}.phrase-list{padding:0 18px}.phrase-list article{display:flex;align-items:center;gap:20px;padding:16px 0;border-bottom:1px solid var(--app-border)}.phrase-list article:last-child{border-bottom:0}.phrase-list article>div{min-width:0;flex:1}.phrase-title{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.phrase-title strong{font-size:16px;font-weight:600}.level-badge{padding:2px 7px;border-radius:5px;background:color-mix(in srgb,var(--level-color) 9%,#fff);color:var(--level-color);font-size:11px;font-weight:600}.phrase-meta{color:var(--app-faint);font-size:11px}.phrase-list p{margin:6px 0 0;color:var(--app-muted);font-size:13px}.danger-link{border:0;padding:6px;background:transparent;color:var(--app-faint);font-size:11px}.danger-link:hover{color:var(--app-danger)}
.phrase-list{max-height:720px;overflow:auto}
@media(max-width:1100px){.phrase-form{grid-template-columns:1fr 1fr}.phrase-form button{justify-self:start}}@media(max-width:700px){.phrase-form,.resource-filters{grid-template-columns:1fr}.segmented-filters{overflow-x:auto}.phrase-list article{align-items:flex-start}}
</style>
