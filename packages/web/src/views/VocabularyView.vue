<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { VOCAB_LEVEL_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
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

function levelColor(level: number): string {
  return level === 1 ? '#2563eb' : level === 2 ? '#7c3aed' : '#d97706';
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
  <section class="page" style="max-width:1080px">
    <div class="page-heading">
      <div><h1>单词</h1><p class="muted" style="margin:8px 0 0">每日新词 + 间隔复习，美式发音与音标。</p></div>
      <div v-if="stats" class="badge amber">今日待复习 {{ stats.due_today }}</div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="stats" class="stat-grid" style="margin-bottom:24px">
      <div class="stat"><span class="caption">总单词数</span><div class="stat-value">{{ stats.total_words }}</div></div>
      <div class="stat"><span class="caption">已学 / 剩余</span><div class="stat-value">{{ stats.learned }}<small style="font-size:14px;color:#64748b"> / {{ stats.remaining }}</small></div></div>
      <div class="stat"><span class="caption">已掌握</span><div class="stat-value">{{ stats.mastered }}<small style="font-size:14px;color:#64748b">（{{ stats.progress_pct }}%）</small></div></div>
      <div class="stat"><span class="caption">预计完成（当前词库）</span><div class="stat-value">{{ stats.estimated_days }}<small style="font-size:14px;color:#64748b"> 天</small></div></div>
    </div>
    <section v-if="stats" class="card card-pad" style="margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
        <span class="caption">每日新词目标</span>
        <div style="display:flex;gap:8px;align-items:center">
          <input v-model.number="dailyTargetInput" class="input" type="number" min="1" max="500" style="width:90px" />
          <button class="button secondary" style="min-height:32px;padding:0 12px" :disabled="savingTarget" @click="saveDailyTarget">保存</button>
        </div>
      </div>
      <div class="progress-track"><div class="progress-value" :style="{ width: `${stats.progress_pct}%` }" /></div>
      <p class="caption" style="margin-top:8px">按当前目标，每天 {{ stats?.daily_target }} 个新词，约 <strong>{{ stats?.estimated_days }}</strong> 天学完当前词库剩余 {{ stats?.remaining }} 个。成考英语建议覆盖 <strong>1500+ 高频核心词</strong>，词库会继续扩充，也可导入你自己的词表。</p>
    </section>

    <section class="card card-pad" style="margin-bottom:24px">
      <h2 style="margin-bottom:16px">今日单词（新词 {{ queueNewCount }} + 复习 {{ queueDueCount }}）</h2>
      <div v-if="queue.length" class="result-list">
        <div v-for="item in queue" :key="item.id" class="task-row" style="align-items:flex-start">
          <div class="task-content" style="flex:1">
            <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">
              <strong style="font-size:18px">{{ item.word.word }}</strong>
              <span v-if="item.word.phonetic" class="caption" style="font-family:monospace">{{ item.word.phonetic }}</span>
              <span class="badge blue">L{{ item.mastery_level }}</span>
              <span class="badge" :style="{ background: `${levelColor(item.word.level)}1a`, color: levelColor(item.word.level) }">{{ VOCAB_LEVEL_LABELS[item.word.level] ?? '高频' }}</span>
              <button class="text-button" style="font-size:16px" title="美式发音" @click="speak(item.word.word)">🔊</button>
            </div>
            <p v-if="reveal.has(item.id)" class="muted" style="margin:8px 0 0;font-size:14px">{{ item.word.meaning }}</p>
            <div v-if="reveal.has(item.id)" style="margin-top:6px">
              <span v-for="p in item.word.phrases" :key="p.id" class="badge" style="margin:2px 6px 0 0">{{ p.phrase }}<template v-if="p.meaning"> · {{ p.meaning }}</template></span>
            </div>
            <p v-if="reveal.has(item.id) && item.word.example_sentence" class="muted" style="margin:4px 0 0;font-size:13px;font-style:italic">{{ item.word.example_sentence }}</p>
          </div>
          <div style="display:flex;gap:8px;flex:0 0 auto">
            <button class="button secondary" style="min-height:32px;padding:0 12px" @click="reveal.has(item.id) ? reveal.delete(item.id) : reveal.add(item.id)">{{ reveal.has(item.id) ? '隐藏释义' : '显示释义' }}</button>
            <button class="button success" style="min-height:32px;padding:0 12px" @click="doReview(item, true)">✔ 认识</button>
            <button class="button danger" style="min-height:32px;padding:0 12px" @click="doReview(item, false)">✘ 忘了</button>
          </div>
        </div>
      </div>
      <div v-else class="caption">今日没有要学的单词，先添加词库吧。</div>
    </section>

    <section class="card card-pad" style="margin-bottom:24px">
      <h2 style="margin-bottom:16px">词库与单词</h2>
      <div style="display:flex;gap:12px;align-items:end;margin-bottom:16px;flex-wrap:wrap">
        <label style="display:grid;gap:6px;flex:1;min-width:200px"><span class="caption">新建词库</span><input v-model.trim="newDeckName" class="input" placeholder="如：成考高频词" @keyup.enter="addDeck" /></label>
        <button class="button secondary" @click="addDeck">创建词库</button>
        <button class="button" @click="loadBuiltin">{{ importingBuiltin ? '导入中…' : '导入内置词库（120 词·含音标/短语/分级）' }}</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <button v-for="deck in decks" :key="deck.id" class="button" :class="selectedDeck === deck.id ? '' : 'secondary'" style="min-height:32px;padding:0 12px" @click="selectDeck(deck.id)">{{ deck.name }}（{{ deck.word_count }}）</button>
      </div>
      <template v-if="selectedDeck != null">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
          <span class="caption">分级筛选：</span>
          <button v-for="l in [0, ...LEVELS]" :key="l" class="button" :class="levelFilter === l ? '' : 'secondary'" style="min-height:28px;padding:0 10px;font-size:12px" @click="levelFilter = l">{{ l === 0 ? '全部' : VOCAB_LEVEL_LABELS[l] }}</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <label style="display:grid;gap:6px"><span class="caption">单词</span><input v-model.trim="newWord.word" class="input" placeholder="word" @keyup.enter="addNewWord" /></label>
          <label style="display:grid;gap:6px"><span class="caption">释义</span><input v-model="newWord.meaning" class="input" placeholder="中文释义" @keyup.enter="addNewWord" /></label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
          <label style="display:grid;gap:6px"><span class="caption">音标（美式）</span><div style="display:flex;gap:8px"><input v-model="newWord.phonetic" class="input" placeholder="/.../" /><button class="button secondary" style="min-height:40px;padding:0 12px;flex:0 0 auto" :disabled="phoneticLoading" @click="fetchPhoneticForForm">{{ phoneticLoading ? '…' : '自动获取' }}</button></div></label>
          <label style="display:grid;gap:6px"><span class="caption">分级</span><select v-model="newWord.level" class="select"><option v-for="l in LEVELS" :key="l" :value="l">{{ VOCAB_LEVEL_LABELS[l] }}</option></select></label>
          <label style="display:grid;gap:6px"><span class="caption">附带短语</span><input v-model="newWord.phrase" class="input" placeholder="如：give up" /></label>
        </div>
        <label style="display:grid;gap:6px;margin-bottom:12px"><span class="caption">短语释义（可选）</span><input v-model="newWord.phrase_meaning" class="input" placeholder="如：放弃" /></label>
        <button class="button" @click="addNewWord">添加单词</button>

        <details style="margin:16px 0">
          <summary class="caption" style="cursor:pointer">批量导入（每行：单词 | 释义 | 音标 | 短语 | 短语释义；也可简写：单词 释义）</summary>
          <textarea v-model="importText" class="textarea" style="margin-top:8px" placeholder="abandon | 放弃 | /əˈbændən/ | abandon ship | 弃船&#10;ability | 能力 | /əˈbɪləti/" />
          <div style="display:flex;gap:14px;align-items:center;margin-top:8px;flex-wrap:wrap">
            <span class="caption">导入默认分级</span>
            <select v-model="importLevel" class="select" style="width:120px"><option v-for="l in LEVELS" :key="l" :value="l">{{ VOCAB_LEVEL_LABELS[l] }}</option></select>
            <label style="display:flex;gap:6px;align-items:center"><input v-model="autoPhonetic" type="checkbox" class="check" style="width:16px;height:16px" /><span class="caption">自动补音标（联网）</span></label>
            <button class="button secondary" @click="doImport">导入</button>
          </div>
        </details>

        <div v-if="filteredWords.length" class="result-list">
          <div v-for="w in filteredWords" :key="w.id" class="task-row" style="align-items:flex-start">
            <div class="task-content" style="flex:1">
              <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">
                <strong style="font-size:16px">{{ w.word }}</strong>
                <span v-if="w.phonetic" class="caption" style="font-family:monospace">{{ w.phonetic }}</span>
                <span class="badge" :style="{ background: `${levelColor(w.level)}1a`, color: levelColor(w.level) }">{{ VOCAB_LEVEL_LABELS[w.level] ?? '高频' }}</span>
                <button class="text-button" style="font-size:15px" title="美式发音" @click="speak(w.word)">🔊</button>
                <button v-if="!w.phonetic" class="button secondary" style="min-height:26px;padding:0 10px;font-size:12px" @click="patchPhonetic(w)">补音标</button>
              </div>
              <p class="muted" style="margin:6px 0 0;font-size:14px">{{ w.meaning }}</p>
              <div v-if="w.phrases.length" style="margin-top:8px">
                <span v-for="p in w.phrases" :key="p.id" class="badge" style="margin:2px 6px 0 0">{{ p.phrase }}<template v-if="p.meaning"> · {{ p.meaning }}</template></span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="caption">该词库还没有单词。</div>
      </template>
    </section>
  </section>
</template>
