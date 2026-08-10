<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showSuccessToast, showToast } from 'vant';
import { VOCAB_LEVEL_LABELS } from '@shck/shared';
import { apiError } from '@/api/client';
import {
  listDecks, listWords, reviewWord, todayQueue, updateVocabularySettings, vocabularyStats,
  type Deck, type ProgressItem, type VocabularyStats, type VocabularyWord,
} from '@/api/vocabulary';
import { speak, warmupVoices } from '@/utils/speech';

const stats = ref<VocabularyStats | null>(null);
const queue = ref<ProgressItem[]>([]);
const queueNew = ref(0);
const queueDue = ref(0);
const todayTotal = ref(0);
const decks = ref<Deck[]>([]);
const selectedDeck = ref<number | undefined>(undefined);
const words = ref<VocabularyWord[]>([]);
const revealed = ref(false);
const reviewing = ref(false);
const feedback = ref<{ type: 'know' | 'forget'; text: string } | null>(null);
const dailyTarget = ref(20);
const savingTarget = ref(false);
const error = ref('');
const busy = ref(false);
const deckOpen = ref(false);
const menuOpen = ref(false);
const currentIndex = ref(0);

const current = computed(() => queue.value[currentIndex.value] ?? null);
const todayCompleted = computed(() => Math.max(0, todayTotal.value - queue.value.length));
const todayDenominator = computed(() => Math.max(todayTotal.value, dailyTarget.value, 1));
const todayProgress = computed(() => Math.min(100, Math.round((todayCompleted.value / todayDenominator.value) * 100)));
const remainingToday = computed(() => Math.max(0, queue.value.length - currentIndex.value));

// 词库单词分批展示
const visibleCount = ref(100);
const PAGE_STEP = 100;
const visibleWords = computed(() => words.value.slice(0, visibleCount.value));
function loadMoreWords() { visibleCount.value += PAGE_STEP; }
function resetVisible() { visibleCount.value = PAGE_STEP; }

function levelTag(level: number): string {
  return `${VOCAB_LEVEL_LABELS[level] ?? '高频'}词汇`;
}

function displayPhonetic(p: string): string {
  // 去掉首尾斜杠，并把词典网风格的重音符 ' 转成标准 IPA ˈ
  const s = p.replace(/^\/|\/$/g, '').trim().replace(/'/g, 'ˈ');
  return `[${s}]`;
}

/** 把例句拆成多行：英文句 + 中文翻译 */
function exampleLines(ex: string): Array<{ en: string; zh: string }> {
  return ex
    .split('\n')
    .map((line) => {
      const zhIdx = line.search(/[\u4e00-\u9fff]/);
      if (zhIdx === -1) return { en: line.trim(), zh: '' };
      return { en: line.slice(0, zhIdx).trim(), zh: line.slice(zhIdx).trim() };
    })
    .filter((l) => l.en || l.zh);
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
    todayTotal.value = q.total;
    currentIndex.value = 0;
    revealed.value = false;
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

function showFeedback(type: 'know' | 'forget') {
  feedback.value =
    type === 'know'
      ? { type, text: '太棒了，又认识一个！' }
      : { type, text: '没关系，待复习再见' };
}

async function doReview(correct: boolean) {
  const item = current.value;
  if (!item || reviewing.value) return;
  reviewing.value = true;
  showFeedback(correct ? 'know' : 'forget');
  try {
    await reviewWord(item.id, correct);
    window.setTimeout(async () => {
      feedback.value = null;
      revealed.value = false;
      reviewing.value = false;
      queue.value = queue.value.filter((x) => x.id !== item.id);
      if (currentIndex.value >= queue.value.length) currentIndex.value = Math.max(0, queue.value.length - 1);
      if (!queue.value.length) {
        await loadAll();
      } else {
        stats.value = await vocabularyStats();
      }
    }, 700);
  } catch (cause) {
    feedback.value = null;
    reviewing.value = false;
    showToast(apiError(cause));
  }
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
  <main class="vocab-page">
    <div class="vocab-screen">
      <header class="vocab-header">
        <h1>背单词</h1>
        <button class="menu-button" aria-label="学习设置" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14" /></svg>
        </button>
      </header>

      <section class="today-rail" aria-label="今日进度">
        <div class="today-metric">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 9h17"/></svg>
          <span>今日 <strong>{{ todayCompleted }}</strong> / {{ todayDenominator }}</span>
        </div>
        <i class="rail-divider" />
        <div class="today-metric">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12.2 2.5c2.4 3 4.8 5.8 4.8 9.3a5 5 0 0 1-10 0c0-2.3 1.2-4.5 3.1-6.7.2 2.6.9 4 2.1 4.8.9-2.3.9-4.8 0-7.4Z"/></svg>
          <span>连续 <strong>{{ stats?.streak_days ?? 0 }}</strong> 天</span>
        </div>
      </section>

      <transition name="settings">
        <section v-if="menuOpen" class="settings-panel">
          <div class="setting-copy">
            <strong>每日新词目标</strong>
            <span>新词 {{ queueNew }} · 复习 {{ queueDue }} · 总进度 {{ stats?.progress_pct ?? 0 }}%</span>
          </div>
          <div class="target-edit">
            <van-stepper v-model="dailyTarget" min="1" max="500" integer input-width="36px" button-size="23px" />
            <button class="save-target" :disabled="savingTarget" @click="saveTarget">{{ savingTarget ? '保存中' : '保存' }}</button>
          </div>
        </section>
      </transition>

      <p v-if="error" class="vocab-error">{{ error }}</p>

      <div v-if="busy && !queue.length" class="vocab-loading"><van-loading size="24">正在整理今日词卡…</van-loading></div>

      <template v-else-if="current">
        <section class="card-stack">
          <article :key="current.id" class="word-card enter" :class="{ revealed }" @click="revealed = !revealed">
            <div class="card-frame">
              <div class="card-kicker">
                <span>{{ levelTag(current.word.level) }}</span>
                <span class="remaining">还剩 {{ remainingToday }} 个</span>
              </div>

              <div class="word-block">
                <h2 class="display-word" @click.stop="speak(current.word.word)">{{ current.word.word }}</h2>
                <button v-if="current.word.phonetic" class="phonetic" @click.stop="speak(current.word.word)">
                  {{ displayPhonetic(current.word.phonetic) }}
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.1-3.8v7.6a4.5 4.5 0 0 0 2.1-3.8Zm-2.1-8v2.1a7 7 0 0 1 0 11.8V20a9 9 0 0 0 0-16Z"/></svg>
                </button>
                <span v-if="!revealed" class="reveal-hint">轻触词卡，查看释义</span>
              </div>

              <transition name="detail">
                <div v-if="revealed" class="card-detail">
                  <p class="meaning">{{ current.word.meaning }}</p>
                  <div class="ornament"><i /></div>

                  <section v-if="current.word.example_sentence" class="detail-section example-section">
                    <h3>例句</h3>
                    <div v-for="(line, i) in exampleLines(current.word.example_sentence)" :key="i" class="example-item">
                      <button class="example-en" @click.stop="speak(line.en)">{{ line.en }}</button>
                      <p v-if="line.zh" class="example-zh">{{ line.zh }}</p>
                    </div>
                  </section>

                  <section v-if="current.word.root" class="detail-section">
                    <h3>词根词缀</h3>
                    <p class="root-text">{{ current.word.root }}</p>
                  </section>

                  <section v-if="current.word.synonyms.length" class="detail-section">
                    <h3>同义词</h3>
                    <div class="word-chips">
                      <button v-for="word in current.word.synonyms" :key="word" class="word-chip" @click.stop="speak(word)">{{ word }}</button>
                    </div>
                  </section>

                  <section v-if="current.word.antonyms.length" class="detail-section">
                    <h3>反义词</h3>
                    <div class="word-chips">
                      <button v-for="word in current.word.antonyms" :key="word" class="word-chip antonym" @click.stop="speak(word)">{{ word }}</button>
                    </div>
                  </section>

                  <section v-if="current.word.collocations.length || current.word.phrases.length" class="detail-section">
                    <h3>词组搭配</h3>
                    <div class="collocation-list">
                      <button v-for="item in current.word.collocations" :key="item.phrase" @click.stop="speak(item.phrase)">
                        <strong>{{ item.phrase }}</strong><span v-if="item.meaning">（{{ item.meaning }}）</span>
                      </button>
                      <button v-for="item in current.word.phrases" :key="item.id" @click.stop="speak(item.phrase)">
                        <strong>{{ item.phrase }}</strong><span v-if="item.meaning">（{{ item.meaning }}）</span>
                      </button>
                    </div>
                  </section>
                </div>
              </transition>

              <div class="review-actions">
                <button class="review-button forget" :disabled="reviewing" @click.stop="doReview(false)">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  不认识
                </button>
                <button class="review-button know" :disabled="reviewing" @click.stop="doReview(true)">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  认识
                </button>
              </div>
            </div>
          </article>

          <transition name="feedback">
            <div v-if="feedback" class="feedback-layer" :class="feedback.type">
              <span class="feedback-mark">{{ feedback.type === 'know' ? '✓' : '↺' }}</span>
              <strong>{{ feedback.text }}</strong>
            </div>
          </transition>
        </section>

        <section class="session-progress" aria-label="卡片进度">
          <div class="progress-copy"><span>{{ todayCompleted }}</span><span>/</span><span>{{ todayDenominator }}</span></div>
          <div class="progress-track"><i :style="{ width: `${todayProgress}%` }" /></div>
        </section>
      </template>

      <section v-else class="finished-state">
        <span class="finished-mark">✓</span>
        <h2>今日词卡已完成</h2>
        <p>休息一下，明天继续。</p>
      </section>

      <section v-if="decks.length" class="library-card" :class="{ open: deckOpen }">
        <button class="library-summary" :aria-expanded="deckOpen" @click="deckOpen = !deckOpen">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5.5 9 3l5 2.5V20l-5-2.5L4 20V5.5Z"/><path d="m14 5.5 3-1.5 3 1.5V20l-3-1.5-3 1.5"/></svg>
          <span>词库 <small>· {{ words.length || decks[0].word_count }} 词</small></span>
          <svg class="library-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 5 7 7-7 7"/></svg>
        </button>

        <div v-if="deckOpen" class="library-content">
          <div v-if="decks.length > 1" class="deck-tabs">
            <button v-for="deck in decks" :key="deck.id" :class="{ active: selectedDeck === deck.id }" @click="selectDeck(deck.id)">{{ deck.name }}</button>
          </div>
          <div class="deck-list">
            <button v-for="word in visibleWords" :key="word.id" class="deck-word" @click="speak(word.word)">
              <strong>{{ word.word }}</strong>
              <span v-if="word.phonetic">{{ displayPhonetic(word.phonetic) }}</span>
              <small>{{ word.meaning }}</small>
            </button>
          </div>
          <button v-if="visibleWords.length < words.length" class="load-more" @click="loadMoreWords">继续加载 · {{ visibleWords.length }} / {{ words.length }}</button>
        </div>
      </section>

      <section v-else-if="!busy" class="library-empty">还没有词库，请到桌面版导入内置词库。</section>
    </div>
  </main>
</template>

<style scoped>
.vocab-page {
  --paper: var(--app-bg);
  --card: var(--app-surface);
  --ink: var(--app-text);
  --text: #344054;
  --muted: var(--app-muted);
  --line: var(--app-border);
  --accent: var(--app-primary);
  min-height: calc(100vh - var(--van-tabbar-height));
  min-height: calc(100dvh - var(--van-tabbar-height));
  background: var(--paper);
  color: var(--ink);
}
.vocab-page::after { display: none; }
.vocab-screen { position: relative; z-index: 1; width: min(100%, 640px); min-height: inherit; margin: 0 auto; padding: 18px 16px 34px; }
button { font: inherit; }
.vocab-header { display: flex; align-items: center; justify-content: space-between; padding: 3px 1px 14px; }
.vocab-header h1 { margin: 0; color: var(--ink); font-family: inherit; font-size: 22px; font-weight: 600; letter-spacing: -.02em; }
.menu-button { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--app-border-strong); border-radius: 10px; background: var(--app-surface); box-shadow: var(--app-shadow-sm); color: var(--ink); }
.today-rail { display: grid; grid-template-columns: 1fr 1px 1fr; align-items: center; gap: 14px; margin-bottom: 12px; padding: 14px; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); }
.today-metric { display: flex; align-items: center; gap: 9px; min-width: 0; font-family: inherit; font-size: 14px; white-space: nowrap; }
.today-metric svg { width: 20px; height: 20px; flex: 0 0 20px; color: var(--app-primary); }
.today-metric strong { color: var(--accent); font-size: 23px; font-weight: 600; line-height: 1; }
.rail-divider { width: 1px; height: 27px; background: var(--line); }
.settings-panel { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 13px; padding: 13px 14px; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); box-shadow: var(--app-shadow-sm); }
.setting-copy { display: grid; gap: 4px; min-width: 0; }
.setting-copy strong { font-family: inherit; font-size: 14px; }
.setting-copy span { overflow: hidden; color: var(--muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.target-edit { display: flex; align-items: center; gap: 7px; }
.save-target { min-height: 44px; padding: 0 13px; border: 0; border-radius: 9px; background: var(--app-primary); color: #fff; font-size: 12px; font-weight: 600; }
.save-target:disabled { opacity: .55; }
.vocab-error { margin: 0 0 12px; padding: 10px 12px; border: 1px solid #fecaca; border-radius: 10px; background: #fef2f2; color: #b42318; font-size: 12px; }
.vocab-loading { display: grid; min-height: 430px; place-items: center; color: var(--muted); font-size: 13px; }
.card-stack { position: relative; margin: 2px 0 0; }
.card-stack::before, .card-stack::after { display: none; }
.word-card { position: relative; z-index: 2; min-height: 454px; overflow: hidden; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); box-shadow: var(--app-shadow-sm); cursor: pointer; }
.word-card.enter { animation: card-in .25s ease both; }
.card-frame { position: relative; min-height: inherit; padding: 25px 22px 92px; }
.card-frame::before { position: absolute; left: 0; top: 0; width: 100%; height: 3px; pointer-events: none; content: ""; background: var(--app-primary); }
.card-kicker { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 16px; color: var(--accent); font-family: inherit; font-size: 12px; font-weight: 600; }
.remaining { color: var(--app-faint); font-family: inherit; font-size: 12px; font-weight: 600; }
.word-block { position: relative; z-index: 1; display: grid; place-items: center; padding: 45px 0 30px; border-bottom: 1px solid var(--app-border); text-align: center; }
.word-card.revealed .word-block { padding: 29px 0 22px; }
.display-word { margin: 0; color: var(--ink); font-family: inherit; font-size: clamp(44px, 14vw, 62px); font-weight: 760; line-height: 1; letter-spacing: -.05em; overflow-wrap: anywhere; }
.phonetic { min-height:44px; display: inline-flex; align-items: center; gap: 8px; margin-top: 16px; padding: 7px 12px; border: 0; border-radius: 999px; background: var(--app-primary-soft); color: var(--app-primary); font-family: inherit; font-size: 14px; }
.reveal-hint { margin-top: 42px; color: var(--app-faint); font-family: inherit; font-size: 12px; }
.card-detail { position: relative; z-index: 1; }
.meaning { margin: 20px 0 0; color: var(--text); text-align: center; font-family: inherit; font-size: 16px; font-weight: 600; line-height: 1.8; }
.ornament { display: flex; align-items: center; gap: 8px; margin: 14px 0 13px; }
.ornament::before, .ornament::after { height: 1px; flex: 1; content: ""; background: var(--app-border); }
.ornament i { width: 5px; height: 5px; border: 0; border-radius: 50%; background: var(--app-primary); }
.detail-section { margin-top: 15px; }
.detail-section h3 { margin: 0 0 7px; color: var(--accent); font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: .04em; }
.example-item + .example-item { margin-top: 9px; padding-top: 9px; border-top: 1px solid var(--app-border); }
.example-en { display: block; width: 100%; padding: 0; border: 0; background: transparent; color: var(--app-text); text-align: left; font-family: inherit; font-size: 16px; line-height: 1.5; }
.example-zh, .root-text { margin: 3px 0 0; color: var(--muted); font-family: inherit; font-size: 13px; line-height: 1.6; }
.word-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.word-chip { padding: 5px 10px; border: 1px solid var(--app-border-strong); border-radius: 99px; background: #fff; color: var(--ink); font-family: inherit; font-size: 12px; }
.word-chip.antonym { border-color: #fecaca; color: var(--app-danger); }
.collocation-list { display: grid; gap: 5px; }
.collocation-list button { padding: 0; border: 0; background: transparent; color: var(--text); text-align: left; font-size: 13px; line-height: 1.55; }
.collocation-list span { color: var(--muted); }
.review-actions { position: absolute; z-index: 3; right: 19px; bottom: 20px; left: 19px; display: grid; grid-template-columns: 1fr 1.08fr; gap: 11px; }
.review-button { height: 52px; display: flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--app-border-strong); border-radius: 11px; background: #fff; color: var(--app-danger); font-family: inherit; font-size: 14px; font-weight: 680; }
.review-button.know { border-color: var(--app-primary); background: var(--app-primary); color: #fff; }
.review-button:disabled { opacity: .58; }
.feedback-layer { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center; align-content: center; gap: 10px; border: 1px solid var(--app-border); border-radius: 12px; background: rgba(255, 255, 255, .97); }
.feedback-layer.forget { background: rgba(255, 251, 250, .96); }
.feedback-mark { width: 64px; height: 64px; display: grid; place-items: center; border: 1px solid currentColor; border-radius: 50%; color: var(--ink); font-family: inherit; font-size: 34px; }
.feedback-layer.forget .feedback-mark { color: var(--accent); }
.feedback-layer strong { color: var(--text); font-family: inherit; font-size: 15px; letter-spacing: .06em; }
.session-progress { padding: 25px 10px 0; text-align: center; }
.progress-copy { display: flex; justify-content: center; gap: 7px; color: var(--ink); font-family: inherit; font-size: 15px; }
.progress-track { height: 6px; overflow: hidden; margin-top: 10px; border-radius: 9px; background: #e5e9f2; }
.progress-track i { display: block; min-width: 5px; height: 100%; border-radius: inherit; background: var(--app-primary); transition: width .25s ease; }
.finished-state { display: grid; min-height: 410px; place-items: center; align-content: center; padding: 36px; text-align: center; }
.finished-mark { width: 62px; height: 62px; display: grid; place-items: center; border: 0; border-radius: 18px; background: #ecfdf3; color: var(--app-success); font-family: inherit; font-size: 30px; }
.finished-state h2 { margin: 18px 0 0; color: var(--ink); font-family: inherit; font-size: 21px; }
.finished-state p { margin: 7px 0 0; color: var(--muted); font-size: 13px; }
.library-card { margin-top: 20px; overflow: hidden; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); box-shadow: var(--app-shadow-sm); }
.library-summary { width: 100%; display: flex; align-items: center; gap: 12px; padding: 15px 14px; border: 0; background: transparent; color: var(--ink); text-align: left; }
.library-summary > span { flex: 1; font-family: inherit; font-size: 16px; font-weight: 700; }
.library-summary small { color: var(--muted); font-size: 13px; font-weight: 500; }
.library-arrow { transition: transform .2s ease; }
.library-card.open .library-arrow { transform: rotate(90deg); }
.library-content { padding: 0 12px 13px; border-top: 1px solid var(--app-border); }
.deck-tabs { display: flex; gap: 7px; padding: 11px 0 4px; overflow-x: auto; }
.deck-tabs button { min-height:44px; flex: 0 0 auto; padding: 0 12px; border: 1px solid var(--app-border-strong); border-radius: 99px; background: #fff; color: var(--muted); font-size: 12px; }
.deck-tabs button.active { border-color: var(--app-primary); background: var(--app-primary); color: #fff; }
.deck-list { display: grid; }
.deck-word { min-height:44px; display: grid; grid-template-columns: auto auto 1fr; align-items: baseline; gap: 7px; padding: 10px 2px; border: 0; border-bottom: 1px solid var(--app-border); background: transparent; color: var(--text); text-align: left; }
.deck-word strong { font-family: inherit; font-size: 15px; }
.deck-word span { color: var(--muted); font-family: inherit; font-size: 11px; }
.deck-word small { overflow: hidden; color: var(--app-muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.load-more { width: 100%; min-height:44px; padding: 12px; border: 0; background: transparent; color: var(--accent); font-size: 12px; }
.library-empty { margin-top: 20px; padding: 16px; border: 1px solid var(--app-border); border-radius: 14px; background: #fff; color: var(--muted); font-size: 12px; text-align: center; }
@keyframes card-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.detail-enter-active, .detail-leave-active { transition: opacity .2s ease, transform .2s ease; }
.detail-enter-from, .detail-leave-to { opacity: 0; transform: translateY(6px); }
.settings-enter-active, .settings-leave-active { transition: opacity .18s ease, transform .18s ease; }
.settings-enter-from, .settings-leave-to { opacity: 0; transform: translateY(-5px); }
.feedback-enter-active, .feedback-leave-active { transition: opacity .2s ease; }
.feedback-enter-from, .feedback-leave-to { opacity: 0; }
@media (max-width: 360px) {
  .vocab-screen { padding-inline: 13px; }
  .today-rail { gap: 9px; }
  .today-metric { gap: 6px; font-size: 13px; }
  .today-metric strong { font-size: 22px; }
  .card-frame { padding-inline: 20px; }
  .settings-panel { align-items: flex-start; flex-direction: column; }
}
</style>
