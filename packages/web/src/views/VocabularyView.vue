<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { VOCAB_LEVEL_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import AppEmptyState from '@/components/common/AppEmptyState.vue';
import DesktopPageHeader from '@/components/common/DesktopPageHeader.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import {
  addWord, createDeck, importBuiltinDeck, importWords, listDecks, listWords, reviewWord, todayQueue, updateVocabularySettings, updateWord, vocabularyStats,
  type Deck, type ProgressItem, type VocabularyStats, type VocabularyWord, type WordInput,
} from '@/api/vocabulary';
import { fetchUsPhonetic } from '@/utils/dictionary';
import { speak, warmupVoices } from '@/utils/speech';

const LEVELS = [1, 2, 3];

const stats = ref<VocabularyStats | null>(null);
const queue = ref<ProgressItem[]>([]);
const queueTotal = ref(0);
const queueNewCount = ref(0);
const queueDueCount = ref(0);
const dailyTargetInput = ref(20);
const savingTarget = ref(false);
const decks = ref<Deck[]>([]);
const selectedDeck = ref<number | null>(null);
const words = ref<VocabularyWord[]>([]);
const levelFilter = ref<number | 0>(0);
const reveal = ref<Set<number>>(new Set());
const newDeckName = ref('');
const newWord = ref<WordInput>({ word: '', meaning: '', phonetic: '', level: 1, phrase: '', phrase_meaning: '' });
const importText = ref('');
const importLevel = ref(1);
const autoPhonetic = ref(true);
const phoneticLoading = ref(false);
const error = ref('');
const busy = ref(false);

const filteredWords = computed(() =>
  levelFilter.value === 0 ? words.value : words.value.filter((w) => w.level === levelFilter.value),
);

// 分级色与全站科目色同一套语言
function levelColor(level: number): string {
  return level === 1 ? '#28b894' : level === 2 ? '#6c4dff' : '#f97316';
}

async function saveDailyTarget() {
  const value = Number(dailyTargetInput.value);
  if (!Number.isFinite(value) || value < 1 || value > 500) return;
  error.value = '';
  savingTarget.value = true;
  try {
    const updated = await updateVocabularySettings(Math.round(value));
    dailyTargetInput.value = updated.daily_target;
    await loadAll();
  } catch (cause) { error.value = apiError(cause); } finally { savingTarget.value = false; }
}

async function loadAll() {
  error.value = '';
  busy.value = true;
  try {
    stats.value = await vocabularyStats();
    dailyTargetInput.value = stats.value.daily_target;
    const q = await todayQueue();
    queue.value = q.list;
    queueTotal.value = q.total;
    queueNewCount.value = q.new_count;
    queueDueCount.value = q.due_count;
    decks.value = await listDecks();
    if (selectedDeck.value == null && decks.value.length) selectedDeck.value = decks.value[0].id;
    if (selectedDeck.value != null) words.value = await listWords(selectedDeck.value);
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function selectDeck(id: number) {
  selectedDeck.value = id;
  words.value = await listWords(id);
}

const importingBuiltin = ref(false);

async function loadBuiltin() {
  error.value = '';
  importingBuiltin.value = true;
  try {
    const result = await importBuiltinDeck();
    if (result.already) error.value = '内置词库已导入过，无需重复导入。';
    selectedDeck.value = result.deck_id;
    await loadAll();
  } catch (cause) { error.value = apiError(cause); } finally { importingBuiltin.value = false; }
}

async function addDeck() {
  const name = newDeckName.value.trim();
  if (!name) return;
  error.value = '';
  try {
    await createDeck({ name });
    newDeckName.value = '';
    await loadAll();
  } catch (cause) { error.value = apiError(cause); }
}

/** 为输入框中的单词自动获取美式音标 */
async function fetchPhoneticForForm() {
  const word = newWord.value.word.trim();
  if (!word) return;
  phoneticLoading.value = true;
  error.value = '';
  try {
    const ph = await fetchUsPhonetic(word);
    newWord.value.phonetic = ph ?? newWord.value.phonetic;
    if (!ph) error.value = '未找到该单词音标（可能拼写有误或词典无收录），可手动填写。';
  } finally { phoneticLoading.value = false; }
}

async function addNewWord() {
  const w = newWord.value.word.trim();
  if (!w || !newWord.value.meaning || selectedDeck.value == null) return;
  error.value = '';
  try {
    const payload = { ...newWord.value };
    if (autoPhonetic.value && !payload.phonetic) {
      const ph = await fetchUsPhonetic(w);
      if (ph) payload.phonetic = ph;
    }
    await addWord(selectedDeck.value, payload);
    newWord.value = { word: '', meaning: '', phonetic: '', level: 1, phrase: '', phrase_meaning: '' };
    await loadAll();
  } catch (cause) { error.value = apiError(cause); }
}

/** 导入格式：每行 “单词 | 释义 | 音标 | 短语 | 短语释义”，或简写 “单词 释义” */
function parseImportLine(line: string): WordInput {
  const parts = line.split('|').map((s) => s.trim());
  if (parts.length >= 2) {
    return {
      word: parts[0],
      meaning: parts[1],
      phonetic: parts[2] || undefined,
      phrase: parts[3] || undefined,
      phrase_meaning: parts[4] || undefined,
      level: importLevel.value,
    };
  }
  const [word, ...rest] = parts[0].split(/\s+/);
  return { word, meaning: rest.join(' ') || word, level: importLevel.value };
}

async function doImport() {
  if (selectedDeck.value == null) return;
  let items: WordInput[] = importText.value.split('\n').map((line) => line.trim()).filter(Boolean).map(parseImportLine);
  if (!items.length) return;
  error.value = '';
  busy.value = true;
  try {
    if (autoPhonetic.value) {
      for (const item of items) {
        if (!item.phonetic) {
          const ph = await fetchUsPhonetic(item.word);
          if (ph) item.phonetic = ph;
        }
      }
    }
    await importWords(selectedDeck.value, items);
    importText.value = '';
    await loadAll();
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

/** 给单个单词补音标 */
async function patchPhonetic(word: VocabularyWord) {
  error.value = '';
  try {
    const ph = await fetchUsPhonetic(word.word);
    if (!ph) { error.value = `未找到「${word.word}」的音标，可手动编辑。`; return; }
    const updated = await updateWord(word.id, { phonetic: ph });
    const index = words.value.findIndex((w) => w.id === word.id);
    if (index >= 0) words.value[index] = updated;
  } catch (cause) { error.value = apiError(cause); }
}

async function doReview(item: ProgressItem, correct: boolean) {
  error.value = '';
  try { await reviewWord(item.id, correct); reveal.value.delete(item.id); await loadAll(); }
  catch (cause) { error.value = apiError(cause); }
}

onMounted(() => { warmupVoices(); loadAll(); });
</script>

<template>
  <section class="wb-page vocabulary-page">
    <DesktopPageHeader eyebrow="英语学习" title="单词" description="通过每日新词和间隔复习，稳定积累成人本科英语核心词汇。">
      <template #actions><StatusBadge v-if="stats" tone="warning">今日待复习 {{ stats.due_today }}</StatusBadge></template>
    </DesktopPageHeader>
    <p v-if="error" class="wb-alert page-alert">{{ error }}</p>

    <section v-if="stats" class="vocab-summary">
      <div><span>总单词数</span><strong>{{ stats.total_words }}</strong></div>
      <div><span>已学 / 剩余</span><strong>{{ stats.learned }}<small> / {{ stats.remaining }}</small></strong></div>
      <div><span>已掌握</span><strong>{{ stats.mastered }}<small>（{{ stats.progress_pct }}%）</small></strong></div>
      <div><span>预计完成（当前词库）</span><strong>{{ stats.estimated_days }}<small> 天</small></strong></div>
    </section>

    <section v-if="stats" class="wb-card vocab-goal">
      <div class="goal-head">
        <span class="wb-label">每日新词目标</span>
        <div class="goal-actions">
          <input v-model.number="dailyTargetInput" class="wb-input target-input" type="number" min="1" max="500" />
          <button type="button" class="wb-btn" :disabled="savingTarget" @click="saveDailyTarget">
            <span v-if="savingTarget" class="wb-spin" aria-hidden="true" />
            保存
          </button>
        </div>
      </div>
      <div class="wb-progress"><div class="wb-progress-value" :style="{ width: `${stats.progress_pct}%` }" /></div>
      <p class="goal-note">按当前目标，每天最多安排 {{ stats?.daily_target }} 个新词，约 <strong>{{ stats?.estimated_days }}</strong> 天学完当前词库剩余 {{ stats?.remaining }} 个。目标调整从次日词单开始生效，当日词单不会刷新。</p>
    </section>

    <section class="wb-card vocab-section today-vocabulary">
      <header class="wb-card-head section-heading">
        <div><h2>今日单词</h2><p>固定词单 · 新词 {{ queueNewCount }} · 到期复习 {{ queueDueCount }}</p></div>
        <span class="head-count">{{ queue.length }} / {{ queueTotal }} 待完成</span>
      </header>
      <div v-if="queue.length" class="vocab-list">
        <article v-for="item in queue" :key="item.id" class="vocab-row">
          <div class="vocab-copy">
            <div class="vocab-line">
              <strong>{{ item.word.word }}</strong>
              <span v-if="item.word.phonetic" class="phonetic">{{ item.word.phonetic }}</span>
              <span class="wb-tag is-info is-plain">L{{ item.mastery_level }}</span>
              <span class="wb-tag is-plain" :style="{ background: `${levelColor(item.word.level)}1a`, color: levelColor(item.word.level) }">{{ VOCAB_LEVEL_LABELS[item.word.level] ?? '高频' }}</span>
              <button type="button" class="spk-link" title="美式发音" @click="speak(item.word.word)">播放</button>
            </div>
            <p v-if="reveal.has(item.id)" class="meaning">{{ item.word.meaning }}</p>
            <div v-if="reveal.has(item.id) && item.word.phrases.length" class="phrase-tags">
              <span v-for="p in item.word.phrases" :key="p.id" class="wb-tag is-ink is-plain">{{ p.phrase }}<template v-if="p.meaning"> · {{ p.meaning }}</template></span>
            </div>
            <p v-if="reveal.has(item.id) && item.word.example_sentence" class="example">{{ item.word.example_sentence }}</p>
          </div>
          <div class="vocab-actions">
            <button type="button" class="wb-btn" @click="reveal.has(item.id) ? reveal.delete(item.id) : reveal.add(item.id)">{{ reveal.has(item.id) ? '隐藏释义' : '显示释义' }}</button>
            <button type="button" class="wb-btn is-primary" @click="doReview(item, true)">认识</button>
            <button type="button" class="wb-btn is-danger" @click="doReview(item, false)">忘了</button>
          </div>
        </article>
      </div>
      <AppEmptyState v-else title="今日单词已完成" description="当前没有需要学习或复习的单词，可以继续其他学习任务。" />
    </section>

    <section class="wb-card vocab-section word-library">
      <header class="wb-card-head section-heading">
        <div><h2>词库与单词</h2><p>管理内置词库和你自己的备考词表。</p></div>
        <span class="head-count">{{ words.length }} 个单词</span>
      </header>

      <div class="library-body">
        <div class="deck-create">
          <label class="wb-field deck-name-field">
            <span class="wb-label">新建词库</span>
            <input v-model="newDeckName" class="wb-input" placeholder="如：成考高频词" @keyup.enter="addDeck" />
          </label>
          <button type="button" class="wb-btn" @click="addDeck">创建词库</button>
          <button type="button" class="wb-btn is-primary" :disabled="importingBuiltin" @click="loadBuiltin">
            <span v-if="importingBuiltin" class="wb-spin" aria-hidden="true" />
            {{ importingBuiltin ? '导入中…' : '导入内置词库（120 词·含音标/短语/分级）' }}
          </button>
        </div>

        <div class="deck-tabs">
          <button
            v-for="deck in decks"
            :key="deck.id"
            type="button"
            class="wb-btn is-sm"
            :class="{ 'is-solid': selectedDeck === deck.id }"
            @click="selectDeck(deck.id)"
          >{{ deck.name }}（{{ deck.word_count }}）</button>
        </div>

        <template v-if="selectedDeck != null">
          <div class="level-filter">
            <span class="wb-label">分级筛选：</span>
            <div class="wb-seg">
              <button
                v-for="l in [0, ...LEVELS]"
                :key="l"
                type="button"
                class="wb-seg-item"
                :class="{ 'is-active': levelFilter === l }"
                @click="levelFilter = l"
              >{{ l === 0 ? '全部' : VOCAB_LEVEL_LABELS[l] }}</button>
            </div>
          </div>

          <div class="word-form-row">
            <label class="wb-field">
              <span class="wb-label">单词</span>
              <input v-model="newWord.word" class="wb-input" placeholder="word" @keyup.enter="addNewWord" />
            </label>
            <label class="wb-field">
              <span class="wb-label">释义</span>
              <input v-model="newWord.meaning" class="wb-input" placeholder="中文释义" @keyup.enter="addNewWord" />
            </label>
          </div>

          <div class="word-form-row is-three">
            <label class="wb-field">
              <span class="wb-label">音标（美式）</span>
              <div class="phonetic-row">
                <input v-model="newWord.phonetic" class="wb-input" placeholder="/.../" />
                <button type="button" class="wb-btn auto-btn" :disabled="phoneticLoading" @click="fetchPhoneticForForm">
                  <span v-if="phoneticLoading" class="wb-spin" aria-hidden="true" />
                  自动获取
                </button>
              </div>
            </label>
            <label class="wb-field">
              <span class="wb-label">分级</span>
              <select v-model="newWord.level" class="wb-select">
                <option v-for="l in LEVELS" :key="l" :value="l">{{ VOCAB_LEVEL_LABELS[l] }}</option>
              </select>
            </label>
            <label class="wb-field">
              <span class="wb-label">附带短语</span>
              <input v-model="newWord.phrase" class="wb-input" placeholder="如：give up" />
            </label>
          </div>

          <label class="wb-field phrase-meaning-field">
            <span class="wb-label">短语释义（可选）</span>
            <input v-model="newWord.phrase_meaning" class="wb-input" placeholder="如：放弃" />
          </label>

          <button type="button" class="wb-btn is-primary" @click="addNewWord">添加单词</button>

          <details class="import-block">
            <summary>批量导入（每行：单词 | 释义 | 音标 | 短语 | 短语释义；也可简写：单词 释义）</summary>
            <textarea v-model="importText" class="wb-textarea import-area" rows="5" placeholder="abandon | 放弃 | /əˈbændən/ | abandon ship | 弃船&#10;ability | 能力 | /əˈbɪləti/"></textarea>
            <div class="import-actions">
              <span class="wb-label">导入默认分级</span>
              <select v-model="importLevel" class="wb-select import-level">
                <option v-for="l in LEVELS" :key="l" :value="l">{{ VOCAB_LEVEL_LABELS[l] }}</option>
              </select>
              <label class="auto-phonetic">
                <input v-model="autoPhonetic" type="checkbox" />
                <span>自动补音标（联网）</span>
              </label>
              <button type="button" class="wb-btn" @click="doImport">导入</button>
            </div>
          </details>

          <div v-if="filteredWords.length" class="vocab-list word-list">
            <article v-for="w in filteredWords" :key="w.id" class="vocab-row">
              <div class="vocab-copy">
                <div class="vocab-line">
                  <strong>{{ w.word }}</strong>
                  <span v-if="w.phonetic" class="phonetic">{{ w.phonetic }}</span>
                  <span class="wb-tag is-plain" :style="{ background: `${levelColor(w.level)}1a`, color: levelColor(w.level) }">{{ VOCAB_LEVEL_LABELS[w.level] ?? '高频' }}</span>
                  <button type="button" class="spk-link" title="美式发音" @click="speak(w.word)">播放</button>
                  <button v-if="!w.phonetic" type="button" class="wb-btn is-sm" @click="patchPhonetic(w)">补音标</button>
                </div>
                <p class="meaning">{{ w.meaning }}</p>
                <div v-if="w.phrases.length" class="phrase-tags">
                  <span v-for="p in w.phrases" :key="p.id" class="wb-tag is-ink is-plain">{{ p.phrase }}<template v-if="p.meaning"> · {{ p.meaning }}</template></span>
                </div>
              </div>
            </article>
          </div>
          <AppEmptyState v-else title="这个词库还没有单词" description="可以添加单词或使用批量导入。" />
        </template>
      </div>
    </section>
  </section>
</template>

<style scoped>
.page-alert { margin: 0 0 16px; }

/* 概览条：与错题本、真题页统计面板同一套层级 */
.vocab-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: var(--wb-surface);
  box-shadow: var(--wb-shadow-sm);
}
.vocab-summary > div { padding: 17px 20px; border-left: 1px solid var(--wb-line-soft); }
.vocab-summary > div:first-child { border-left: 0; }
.vocab-summary span { display: block; margin-bottom: 6px; color: var(--wb-faint); font-size: 12px; }
.vocab-summary strong { color: var(--wb-ink); font-size: 26px; font-weight: 700; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
.vocab-summary small { color: var(--wb-muted); font-size: 13px; font-weight: 500; }

.vocab-goal { margin-bottom: 16px; padding: 17px 18px; }
.goal-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.goal-actions { display: flex; align-items: center; gap: 8px; }
.target-input { width: 90px; min-height: 34px; font-variant-numeric: tabular-nums; }
.goal-note { margin: 8px 0 0; color: var(--wb-muted); font-size: 12px; line-height: 1.7; }
.goal-note strong { color: var(--wb-brand-deep); }

.vocab-section { margin-bottom: 16px; overflow: hidden; }
.section-heading { min-height: 68px; padding: 14px 18px; margin-bottom: 0; border-bottom: 1px solid var(--wb-line-soft); }
.section-heading h2 { font-size: 16px; }
.section-heading p { margin: 4px 0 0; color: var(--wb-faint); font-size: 12px; }
.head-count { color: var(--wb-muted); font-size: 12px; font-variant-numeric: tabular-nums; }

.vocab-list { padding: 0 18px; }
.vocab-row { display: flex; align-items: flex-start; gap: 18px; padding: 15px 0; border-bottom: 1px solid var(--wb-line-soft); }
.vocab-row:last-child { border-bottom: 0; }
.vocab-copy { min-width: 0; flex: 1; }
.vocab-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; }
.vocab-line strong { color: var(--wb-ink); font-size: 18px; font-weight: 600; }
.word-list .vocab-line strong { font-size: 16px; }
.phonetic { color: var(--wb-muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
.spk-link { border: 0; padding: 0; background: transparent; color: var(--wb-brand-deep); font-size: 13px; font-weight: 600; }
.spk-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.meaning { margin: 8px 0 0; color: var(--wb-ink-2); font-size: 14px; }
.word-list .meaning { margin-top: 6px; }
.phrase-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.example { margin: 6px 0 0; color: var(--wb-muted); font-size: 13px; font-style: italic; }
.vocab-actions { display: flex; flex: 0 0 auto; flex-wrap: wrap; gap: 8px; }

.library-body { padding: 16px 18px 18px; }
.deck-create { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; margin-bottom: 16px; }
.deck-name-field { min-width: 200px; flex: 1; }
.deck-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.level-filter { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }

.word-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.word-form-row.is-three { grid-template-columns: 1fr 1fr 1fr; }
.phonetic-row { display: flex; gap: 8px; }
.auto-btn { flex: 0 0 auto; }
.phrase-meaning-field { margin-bottom: 12px; }

.import-block { margin: 16px 0; padding: 14px 0; border-top: 1px solid var(--wb-line-soft); border-bottom: 1px solid var(--wb-line-soft); }
.import-block summary { color: var(--wb-brand-deep); font-size: 12px; font-weight: 600; cursor: pointer; }
.import-area { margin-top: 8px; }
.import-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 8px; }
.import-level { width: 120px; }
.auto-phonetic { display: inline-flex; align-items: center; gap: 7px; color: var(--wb-ink-2); font-size: 12px; cursor: pointer; }
.auto-phonetic input { accent-color: var(--wb-brand); }

.word-list { max-height: 720px; overflow: auto; padding: 0 18px; }

@media (max-width: 1024px) {
  .vocab-summary { grid-template-columns: 1fr 1fr; }
  .vocab-summary > div:nth-child(3) { border-left: 0; }
  .vocab-summary > div:nth-child(n + 3) { border-top: 1px solid var(--wb-line-soft); }
  .word-form-row.is-three { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 900px) {
  .vocab-row { flex-direction: column; }
  .vocab-actions { width: 100%; }
  .vocab-actions button { flex: 1; }
  .word-form-row, .word-form-row.is-three { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .vocab-summary { grid-template-columns: 1fr; }
  .vocab-summary > div { border-top: 1px solid var(--wb-line-soft); border-left: 0; }
  .vocab-summary > div:first-child { border-top: 0; }
}
</style>
