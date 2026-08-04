<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast, showToast } from 'vant';
import { VOCAB_LEVEL_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import {
  listDecks, listWords, reviewWord, todayQueue, updateVocabularySettings, vocabularyStats,
  type Deck, type ProgressItem, type VocabularyStats, type VocabularyWord,
} from '@/api/vocabulary';
import { speak, warmupVoices } from '@/utils/speech';

const router = useRouter();
const stats = ref<VocabularyStats | null>(null);
const queue = ref<ProgressItem[]>([]);
const queueNew = ref(0);
const queueDue = ref(0);
const decks = ref<Deck[]>([]);
const selectedDeck = ref<number | undefined>(undefined);
const words = ref<VocabularyWord[]>([]);
const reveal = ref<Set<number>>(new Set());
const dailyTarget = ref(20);
const savingTarget = ref(false);
const error = ref('');
const busy = ref(false);

const LEVELS = [1, 2, 3];

const filteredWords = computed(() => words.value);
// 词库单词分批展示，避免 3000+ 词一次性渲染卡顿
const visibleCount = ref(100);
const PAGE_STEP = 100;
const visibleWords = computed(() => words.value.slice(0, visibleCount.value));
function loadMoreWords() { visibleCount.value += PAGE_STEP; }
function resetVisible() { visibleCount.value = PAGE_STEP; }

function levelColor(level: number): string {
  return level === 1 ? '#3b82f6' : level === 2 ? '#8b5cf6' : '#f59e0b';
}

async function loadAll() {
  error.value = '';
  busy.value = true;
  try {
    stats.value = await vocabularyStats();
    dailyTarget.value = stats.value.daily_target;
    const q = await todayQueue(30);
    queue.value = q.list;
    queueNew.value = q.new_count;
    queueDue.value = q.due_count;
    decks.value = await listDecks();
    if (selectedDeck.value == null && decks.value.length) selectedDeck.value = decks.value[0].id;
    if (selectedDeck.value != null) words.value = await listWords(selectedDeck.value);
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function selectDeck(id: number) {
  selectedDeck.value = id;
  words.value = await listWords(id);
  resetVisible();
}

async function doReview(item: ProgressItem, correct: boolean) {
  try {
    await reviewWord(item.id, correct);
    reveal.value.delete(item.id);
    showSuccessToast(correct ? '太棒了，继续！' : '没关系，记入待复习');
    await loadAll();
  } catch (cause) { showToast(apiError(cause)); }
}

async function saveTarget() {
  const value = Number(dailyTarget.value);
  if (!Number.isFinite(value) || value < 1 || value > 500) return;
  savingTarget.value = true;
  try {
    await updateVocabularySettings(Math.round(value));
    showSuccessToast('每日目标已更新');
    await loadAll();
  } catch (cause) { showToast(apiError(cause)); } finally { savingTarget.value = false; }
}

onMounted(() => { warmupVoices(); loadAll(); });
</script>

<template>
  <div class="m-page">
    <van-nav-bar title="背单词" fixed placeholder />

    <div class="m-body">
      <!-- 统计 -->
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">{{ stats?.due_today ?? 0 }}</div>
          <div class="stat-label">今日待复习</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ stats?.learned ?? 0 }}</div>
          <div class="stat-label">已学</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ stats?.mastered ?? 0 }}</div>
          <div class="stat-label">已掌握</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ stats?.total_words ?? 0 }}</div>
          <div class="stat-label">总词数</div>
        </div>
      </div>

      <!-- 每日目标 -->
      <div class="target-bar">
        <span>每日新词目标</span>
        <div class="target-edit">
          <van-stepper v-model="dailyTarget" min="1" max="500" integer input-width="44px" button-size="24px" />
          <van-button size="small" round type="primary" :loading="savingTarget" @click="saveTarget">保存</van-button>
        </div>
      </div>

      <p v-if="error" class="m-error">{{ error }}</p>

      <!-- 今日单词 -->
      <div class="section-head">
        <h2>今日单词（新词 {{ queueNew }} + 复习 {{ queueDue }}）</h2>
        <span class="hint">点单词看释义 · 点音标听发音</span>
      </div>
      <div v-if="busy && !queue.length" class="m-loading"><van-loading size="24">加载中…</van-loading></div>
      <div v-else-if="queue.length" class="queue-list">
        <div v-for="item in queue" :key="item.id" class="word-card">
          <div class="word-top">
            <div class="word-main">
              <span class="word" :class="{ revealed: reveal.has(item.id) }" @click="reveal.has(item.id) ? reveal.delete(item.id) : reveal.add(item.id)">{{ item.word.word }}</span>
              <span v-if="item.word.phonetic" class="phonetic" @click="speak(item.word.word)">{{ item.word.phonetic }}</span>
            </div>
            <van-tag round plain :color="levelColor(item.word.level)">{{ VOCAB_LEVEL_LABELS[item.word.level] ?? '高频' }}</van-tag>
          </div>
          <div v-if="reveal.has(item.id)" class="word-meaning">
            <p class="meaning">{{ item.word.meaning }}</p>
            <div v-if="item.word.phrases.length" class="phrases">
              <van-tag v-for="phrase in item.word.phrases" :key="phrase.id" plain type="primary" style="margin:2px 6px 2px 0">{{ phrase.phrase }}<template v-if="phrase.meaning"> · {{ phrase.meaning }}</template></van-tag>
            </div>
            <p v-if="item.word.example_sentence" class="example">{{ item.word.example_sentence }}</p>
          </div>
          <div class="word-buttons">
            <van-button size="small" plain type="success" @click="doReview(item, true)">✔ 认识</van-button>
            <van-button size="small" plain type="danger" @click="doReview(item, false)">✘ 忘了</van-button>
          </div>
        </div>
      </div>
      <van-empty v-else description="今日没有要背的单词" />

      <!-- 词库单词 -->
      <div class="section-head" style="margin-top:24px"><h2>词库单词</h2></div>
      <van-tabs v-model:active="selectedDeck" shrink line-width="24" @change="selectDeck(Number(selectedDeck))">
        <van-tab v-for="deck in decks" :key="deck.id" :name="deck.id" :title="`${deck.name}(${deck.word_count})`" />
      </van-tabs>
      <div v-if="visibleWords.length" class="deck-list">
        <div v-for="w in visibleWords" :key="w.id" class="deck-word">
          <span class="dw-word">{{ w.word }}</span>
          <span v-if="w.phonetic" class="dw-phonetic" @click="speak(w.word)">{{ w.phonetic }}</span>
          <span class="dw-meaning">{{ w.meaning }}</span>
          <van-tag round plain :color="levelColor(w.level)" style="margin-left:auto">{{ VOCAB_LEVEL_LABELS[w.level] ?? '高频' }}</van-tag>
        </div>
      </div>
      <div v-if="visibleWords.length < words.length" class="load-more" @click="loadMoreWords">
  加载更多（已显示 {{ visibleWords.length }} / {{ words.length }}）
</div>
<van-empty v-else-if="!decks.length" description="还没有词库，请到桌面版导入内置词库" />
    </div>
  </div>
</template>

<style scoped>
.m-page { max-width: 640px; margin: 0 auto; min-height: 100vh; background: var(--van-background); }
.m-body { padding: 16px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.stat { display: grid; gap: 3px; text-align: center; padding: 13px 6px; background: var(--van-background-2); border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,.04); }
.stat-value { font-size: 18px; font-weight: 800; color: var(--van-text-color); }
.stat-label { font-size: 11px; color: var(--van-text-color-3); }
.target-bar { display: flex; align-items: center; justify-content: space-between; margin: 14px 0; padding: 12px 14px; background: var(--van-background-2); border-radius: 14px; font-size: 13px; font-weight: 600; color: var(--van-text-color); }
.target-edit { display: flex; align-items: center; gap: 8px; }
.section-head h2 { font-size: 16px; font-weight: 700; color: var(--van-text-color); margin-bottom: 12px; }
.queue-list, .deck-list { display: grid; gap: 12px; margin-top: 12px; }
.word-card { background: var(--van-background-2); border-radius: 16px; padding: 16px; box-shadow: 0 1px 3px rgba(16,24,40,.04), 0 4px 14px rgba(16,24,40,.04); }
.word-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.word-main { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.word { font-size: 22px; font-weight: 800; color: var(--van-text-color); cursor: pointer; }
.word.revealed { color: #3b82f6; }
.phonetic { font-size: 13px; color: var(--van-text-color-3); cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
.hint { font-size: 11px; color: var(--van-text-color-3); }
.word-actions { display: flex; align-items: center; gap: 8px; }
.word-meaning { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--van-border-color); }
.meaning { font-size: 15px; color: var(--van-text-color); line-height: 1.6; }
.phrases { margin-top: 8px; }
.example { font-size: 13px; color: var(--van-text-color-2); font-style: italic; margin-top: 8px; }
.word-buttons { display: flex; gap: 8px; margin-top: 14px; }
.deck-word { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 12px 14px; background: var(--van-background-2); border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,.04); }
.dw-word { font-size: 15px; font-weight: 700; color: var(--van-text-color); }
.dw-phonetic { font-size: 12px; color: var(--van-text-color-3); cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
.dw-meaning { font-size: 13px; color: var(--van-text-color-2); }
.load-more { text-align: center; padding: 14px; color: #3b82f6; font-size: 13px; font-weight: 600; cursor: pointer; }
.m-error { color: var(--van-danger-color); font-size: 13px; margin: 12px 4px; }
.m-loading { display: grid; place-items: center; padding: 48px 0; color: var(--van-text-color-3); font-size: 13px; }
</style>
