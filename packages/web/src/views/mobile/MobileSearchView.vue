<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { showToast } from 'vant';
import { apiError } from '@/api/client';
import { searchKnowledge, type KnowledgeItem } from '@/api/knowledge';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import MobilePageHeader from '@/components/mobile/MobilePageHeader.vue';
import { renderMarkdown } from '@/utils/markdown';

const subjects = ref<SubjectInfo[]>([]);
const keyword = ref('');
const subjectId = ref<number | 0>(0);
const items = ref<KnowledgeItem[]>([]);
const expanded = ref<number[]>([]);
const error = ref('');
const busy = ref(false);
const searched = ref(false);

async function load() {
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
  } catch (cause) { error.value = apiError(cause); showToast(apiError(cause)); } finally { busy.value = false; }
}

function toggleExpanded(id: number) {
  expanded.value = expanded.value.includes(id) ? expanded.value.filter((itemId) => itemId !== id) : [...expanded.value, id];
}

onMounted(() => { load(); doSearch(); });
</script>

<template>
  <main class="study-page search-page">
    <div class="study-screen">
      <MobilePageHeader title="检索" eyebrow="知识索引" />

      <van-search v-model="keyword" show-action action-text="查找" placeholder="搜索知识点、考点、作文模板…" @search="doSearch" @click-action="doSearch" />

      <div class="study-filter-row" aria-label="科目筛选">
        <button class="study-filter" :class="{ active: subjectId === 0 }" @click="subjectId = 0; doSearch()">全部科目</button>
        <button v-for="subject in subjects" :key="subject.id" class="study-filter" :class="{ active: subjectId === subject.id }" @click="subjectId = subject.id; doSearch()">{{ subject.name }}</button>
      </div>

      <p v-if="error" class="study-error">{{ error }}</p>
      <div v-if="busy" class="study-loading"><van-loading size="24">正在翻阅索引…</van-loading></div>

      <template v-else-if="items.length">
        <div class="study-section-title"><h2>检索结果</h2><span>共 {{ items.length }} 条</span></div>
        <section class="result-list">
          <article v-for="(item, index) in items" :key="item.id" class="result-card" :class="{ open: expanded.includes(item.id) }">
            <button class="result-summary" @click="toggleExpanded(item.id)">
              <span class="result-no">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="result-title"><small v-if="item.subject" :style="{ color: item.subject.color }">{{ item.subject.name }}</small><strong>{{ item.title }}</strong></span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m9 5 7 7-7 7" /></svg>
            </button>
            <div v-if="expanded.includes(item.id)" class="result-content md" v-html="renderMarkdown(item.content)" />
          </article>
        </section>
      </template>
      <div v-else-if="searched" class="study-empty">索引中没有找到相关内容。<br>试试更短的关键词。</div>
    </div>
  </main>
</template>

<style scoped>
.result-list { display: grid; gap: 9px; }.result-card { overflow: hidden; border: 1px solid var(--study-line); border-radius: 12px; background: var(--app-surface); }.result-card.open { background: var(--app-surface); box-shadow: var(--app-shadow-sm); }.result-summary { width: 100%; min-height: 58px; display: grid; grid-template-columns: 28px 1fr 18px; align-items: center; gap: 10px; padding: 14px; border: 0; background: transparent; color: var(--study-text); text-align: left; }.result-no { color: var(--study-accent); font-family: inherit; font-size: 13px; }.result-title { display: grid; gap: 3px; }.result-title small { font-size: 12px; font-weight: 600; }.result-title strong { font-family: inherit; font-size: 14px; line-height: 1.45; }.result-summary svg { color: var(--study-muted); transition: transform .2s ease; }.result-card.open .result-summary svg { transform: rotate(90deg); }.result-content { padding: 14px 17px 17px 52px; border-top: 1px solid var(--app-border); }
</style>
