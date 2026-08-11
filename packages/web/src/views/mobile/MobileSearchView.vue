<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RightOutlined, SearchOutlined, UpOutlined } from '@ant-design/icons-vue';
import { showToast } from 'vant';
import { apiError } from '@/api/client';
import { searchKnowledge, type KnowledgeItem } from '@/api/knowledge';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import { renderMarkdown } from '@/utils/markdown';

const subjects = ref<SubjectInfo[]>([]);
const keyword = ref('');
const subjectId = ref<number | 0>(0);
const items = ref<KnowledgeItem[]>([]);
const total = ref(0);
const expanded = ref<number[]>([]);
const error = ref('');
const busy = ref(false);
const searched = ref(false);

async function loadSubjects() {
  subjects.value = await listSubjects();
}

async function doSearch() {
  error.value = '';
  busy.value = true;
  searched.value = true;
  try {
    const result = await searchKnowledge({
      subject_id: subjectId.value || undefined,
      keyword: keyword.value.trim() || undefined,
    });
    items.value = result.list;
    total.value = result.total;
    expanded.value = result.list.length ? [result.list[0].id] : [];
  } catch (cause) {
    const message = apiError(cause);
    error.value = message;
    showToast(message);
  } finally {
    busy.value = false;
  }
}

async function selectSubject(id: number | 0) {
  if (subjectId.value === id || busy.value) return;
  subjectId.value = id;
  await doSearch();
}

function toggleExpanded(id: number) {
  expanded.value = expanded.value.includes(id)
    ? expanded.value.filter((itemId) => itemId !== id)
    : [...expanded.value, id];
}

onMounted(async () => {
  try {
    await loadSubjects();
    await doSearch();
  } catch (cause) {
    error.value = apiError(cause);
  }
});
</script>

<template>
  <main class="search-page">
    <div class="search-screen">
      <header class="search-header"><span>知识索引</span><h1>知识检索</h1></header>

      <form class="search-form" role="search" @submit.prevent="doSearch">
        <label>
          <SearchOutlined aria-hidden="true" />
          <input v-model="keyword" type="search" enterkeyhint="search" placeholder="搜索知识点、考点、作文模板…" aria-label="搜索知识点、考点或作文模板">
        </label>
        <button type="submit" :disabled="busy">{{ busy ? '查找中' : '查找' }}</button>
      </form>

      <div class="subject-filters" aria-label="科目筛选">
        <button :class="{ active: subjectId === 0 }" :aria-pressed="subjectId === 0" @click="selectSubject(0)">全部科目</button>
        <button v-for="subject in subjects" :key="subject.id" :class="{ active: subjectId === subject.id }" :aria-pressed="subjectId === subject.id" @click="selectSubject(subject.id)">{{ subject.name }}</button>
      </div>

      <p v-if="error" class="error-banner">{{ error }}</p>

      <section class="results-section" aria-labelledby="results-title">
        <header class="results-header"><h2 id="results-title">检索结果</h2><span>共 {{ total }} 条结果</span></header>

        <div v-if="busy" class="loading-state"><van-loading size="24">正在检索知识索引…</van-loading></div>

        <div v-else-if="items.length" class="result-list">
          <article v-for="(item, index) in items" :key="item.id" class="result-card" :class="{ open: expanded.includes(item.id) }">
            <button class="result-summary" :aria-expanded="expanded.includes(item.id)" :aria-controls="`knowledge-${item.id}`" @click="toggleExpanded(item.id)">
              <span class="result-no">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="result-title">
                <small v-if="item.subject" :style="{ color: item.subject.color }">{{ item.subject.name }}</small>
                <small v-else>通用知识</small>
                <strong>{{ item.title }}</strong>
              </span>
              <UpOutlined v-if="expanded.includes(item.id)" class="result-arrow open-arrow" aria-hidden="true" />
              <RightOutlined v-else class="result-arrow" aria-hidden="true" />
            </button>

            <div v-if="expanded.includes(item.id)" :id="`knowledge-${item.id}`" class="result-detail">
              <div class="result-content md" v-html="renderMarkdown(item.content)" />
              <button class="collapse-button" @click="toggleExpanded(item.id)">收起 <UpOutlined aria-hidden="true" /></button>
            </div>
          </article>
        </div>

        <div v-else-if="searched" class="empty-state">
          <SearchOutlined aria-hidden="true" />
          <strong>没有找到相关内容</strong>
          <span>试试更短的关键词，或切换到全部科目。</span>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.search-page {
  --search-blue: #1769f6;
  --search-blue-dark: #0e5de9;
  --search-ink: #101b36;
  --search-text: #2a3853;
  --search-muted: #78859d;
  --search-faint: #9eabc0;
  --search-line: #dce5f2;
  min-height: calc(100dvh - 64px);
  background: #f8faff;
  color: var(--search-ink);
}
.search-screen { width: min(100%,680px); min-height: inherit; margin: 0 auto; padding: 24px 22px 42px; }
button,input { font: inherit; }
.search-header { min-height: 105px; }.search-header span { color: var(--search-blue); font-size: 13px; font-weight: 700; letter-spacing: .04em; }.search-header h1 { margin: 8px 0 0; font-size: 32px; line-height: 1; letter-spacing: -.04em; }

.search-form { display: grid; grid-template-columns: minmax(0,1fr) 74px; gap: 10px; }.search-form label { min-width: 0; min-height: 48px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border: 1px solid #bfcce0; border-radius: 11px; background: #fff; color: #7f8ba0; }.search-form label:focus-within { border-color: #7fabfb; box-shadow: 0 0 0 3px rgba(23,105,246,.09); }.search-form label>.anticon { flex: 0 0 auto; font-size: 21px; }.search-form input { min-width: 0; width: 100%; height: 44px; padding: 0; border: 0; outline: 0; background: transparent; color: var(--search-ink); font-size: 13px; }.search-form input::placeholder { color: #8996aa; }.search-form>button { min-height: 48px; padding: 0 12px; border: 0; border-radius: 11px; background: linear-gradient(135deg,#2174f8,#1760ee); box-shadow: 0 7px 14px rgba(23,105,246,.16); color: #fff; font-size: 14px; font-weight: 700; }.search-form>button:disabled { opacity: .65; }

.subject-filters { display: flex; gap: 9px; overflow-x: auto; margin: 12px 0 0; padding: 0 0 4px; scrollbar-width: none; }.subject-filters::-webkit-scrollbar { display: none; }.subject-filters button { min-height: 42px; flex: 0 0 auto; padding: 0 17px; border: 1px solid #cbd6e6; border-radius: 999px; background: #fff; color: #4b5b76; font-size: 12px; font-weight: 650; white-space: nowrap; }.subject-filters button.active { border-color: var(--search-blue); background: linear-gradient(135deg,#287bff,#1761ef); box-shadow: 0 6px 13px rgba(23,105,246,.14); color: #fff; }
.error-banner { margin: 12px 0 0; padding: 11px 12px; border: 1px solid #f0b6b1; border-radius: 11px; background: #fff4f3; color: #b42318; font-size: 12px; }

.results-section { margin-top: 21px; }.results-header { display: flex; align-items: baseline; justify-content: space-between; gap: 15px; margin-bottom: 10px; }.results-header h2 { margin: 0; font-size: 18px; letter-spacing: -.02em; }.results-header span { color: var(--search-muted); font-size: 11px; }.loading-state { min-height: 260px; display: grid; place-items: center; color: var(--search-muted); }
.result-list { display: grid; gap: 9px; }.result-card { overflow: hidden; border: 1px solid var(--search-line); border-radius: 13px; background: #fff; box-shadow: 0 3px 12px rgba(32,64,112,.035); }.result-card.open { border-color: #c5d9fb; background: #f7faff; box-shadow: 0 6px 18px rgba(34,81,148,.07); }
.result-summary { width: 100%; min-height: 68px; display: grid; grid-template-columns: 40px minmax(0,1fr) 18px; align-items: center; gap: 10px; padding: 12px 14px; border: 0; background: transparent; color: var(--search-text); text-align: left; }.result-no { color: var(--search-blue); font-size: 18px; font-weight: 500; letter-spacing: .02em; }.result-title { min-width: 0; display: grid; gap: 3px; }.result-title small { overflow: hidden; color: var(--search-blue); font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.result-title strong { overflow: hidden; color: var(--search-ink); font-size: 14px; font-weight: 700; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }.result-arrow { justify-self: end; color: #6f7d95; font-size: 14px; }.open-arrow { color: var(--search-blue); }
.result-detail { margin: 0 13px 13px; overflow: hidden; border: 1px solid #e1e7f0; border-radius: 11px; background: #fff; }.result-content { padding: 15px 16px 7px; color: #34425c; font-size: 12px; line-height: 1.7; }.result-content :deep(p),.result-content :deep(ul),.result-content :deep(ol),.result-content :deep(h1),.result-content :deep(h2),.result-content :deep(h3) { padding-bottom: 12px; border-bottom: 1px solid #e7ecf3; }.result-content :deep(p:last-child),.result-content :deep(ul:last-child),.result-content :deep(ol:last-child) { border-bottom: 0; }.result-content :deep(strong) { color: var(--search-ink); font-size: 13px; }.result-content :deep(.katex-display) { margin-inline: -5px; }.collapse-button { min-height: 38px; display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-left: auto; padding: 0 16px; border: 0; background: transparent; color: var(--search-blue); font-size: 11px; font-weight: 700; }
.empty-state { min-height: 260px; display: grid; justify-items: center; align-content: center; padding: 32px; border: 1px solid var(--search-line); border-radius: 13px; background: #fff; color: var(--search-muted); text-align: center; }.empty-state>.anticon { margin-bottom: 12px; color: #9ab9ef; font-size: 30px; }.empty-state strong { color: var(--search-ink); font-size: 14px; }.empty-state span { margin-top: 6px; font-size: 11px; }

@media (max-width: 370px) {
  .search-screen { padding-inline: 14px; }
  .search-form { grid-template-columns: minmax(0,1fr) 66px; gap: 8px; }
  .search-form label { padding-inline: 11px; }
  .subject-filters button { padding-inline: 14px; }
  .result-summary { grid-template-columns: 35px minmax(0,1fr) 16px; padding-inline: 11px; }
}
@media (min-width: 768px) { .search-screen { padding-inline: 30px; } }
</style>
