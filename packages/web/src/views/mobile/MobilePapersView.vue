<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiError } from '@/api/client';
import { listPapers, type PaperSummary } from '@/api/papers';
import { listSubjects, type SubjectInfo } from '@/api/plan';

/**
 * 移动端真题列表。
 * 录题只在别处做，这里只负责挑卷 —— 选中任意一套进入独立的做题页（/m/papers/:paperId）。
 */

const route = useRoute();
const router = useRouter();

const subjects = ref<SubjectInfo[]>([]);
const papers = ref<PaperSummary[]>([]);
const activeSubject = ref('ALL');
const error = ref('');
const busy = ref(false);

const subjectTabs = computed(() => [{ name: 'ALL', label: '全部' }, ...subjects.value.map((s) => ({ name: s.name, label: s.name }))]);

const filteredPapers = computed(() =>
  activeSubject.value === 'ALL' ? papers.value : papers.value.filter((p) => p.subject === activeSubject.value),
);

function subjectColor(name: string): string {
  return subjects.value.find((s) => s.name === name)?.color ?? '#64748b';
}

function sourceLabel(paper: PaperSummary): string {
  if (paper.source_type === 'OFFICIAL') return '官方原卷';
  if (paper.source_type === 'VERIFIED_RECALL') return '多源核验回忆版';
  if (paper.source_type === 'SINGLE_SOURCE_RECALL') return '单源回忆版';
  if (paper.source_type === 'USER_PROVIDED') return '自行录入';
  if (paper.source_type === 'SIMULATION') return '模拟题';
  return '来源待核验';
}

async function load() {
  error.value = '';
  busy.value = true;
  try {
    subjects.value = await listSubjects();
    papers.value = await listPapers();
    // 从做题页返回时会带上 ?subject=，这里恢复原来的科目筛选
    const raw = route.query.subject;
    const value = typeof raw === 'string' ? raw : '';
    if (value && papers.value.some((paper) => paper.subject === value)) activeSubject.value = value;
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

function openPaper(id: number) {
  void router.push({ name: 'm-paper-practice', params: { paperId: String(id) } });
}

onMounted(load);
</script>

<template>
  <main class="study-page papers-page">
    <div class="study-screen">
      <header class="study-header">
        <div class="study-header-copy"><span class="study-header-eyebrow">Past papers</span><h1>历年真题</h1></div>
        <span class="papers-count">{{ papers.length }} 套</span>
      </header>

      <p v-if="error" class="study-error">{{ error }}</p>

      <div class="study-filter-row"><button v-for="tabItem in subjectTabs" :key="tabItem.name" class="study-filter" :class="{ active: activeSubject === tabItem.name }" @click="activeSubject = tabItem.name">{{ tabItem.label }}</button></div>
      <div v-if="busy && !papers.length" class="study-loading"><van-loading size="24">正在加载试卷…</van-loading></div>
      <div v-else class="paper-list">
        <button v-for="paper in filteredPapers" :key="paper.id" class="paper-card" @click="openPaper(paper.id)">
          <span class="paper-year"><strong>{{ paper.year }}</strong><small>YEAR</small></span>
          <div class="paper-meta">
            <strong>{{ paper.title }}</strong>
            <span>{{ paper.subject }} · {{ paper.question_count }}<template v-if="paper.expected_question_count">/{{ paper.expected_question_count }}</template> 题</span>
            <span class="paper-trust" :class="{ verified: paper.source_type === 'OFFICIAL' || paper.source_type === 'VERIFIED_RECALL', incomplete: !paper.is_complete }">{{ sourceLabel(paper) }} · {{ paper.is_complete ? '题量完整' : '内容不全' }}</span>
          </div>
          <i :style="{ background: subjectColor(paper.subject) }" />
          <span class="paper-arrow">›</span>
        </button>
        <div v-if="!filteredPapers.length" class="study-empty">暂无试卷。</div>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({ name: 'MobilePapersView' });
</script>

<style scoped>
.papers-count { flex: 0 0 auto; padding: 4px 10px; border-radius: 8px; background: var(--study-accent-soft); color: var(--study-accent); font-size: 12px; font-weight: 600; }
.paper-list { display: grid; gap: 9px; margin-top: 10px; }.paper-card { width: 100%; min-height:78px; display: grid; grid-template-columns: 54px 1fr 6px 12px; align-items: center; gap: 11px; padding: 14px; border: 1px solid var(--study-line); border-radius: 12px; background: var(--app-surface); color: var(--study-text); text-align: left; }.paper-year { display: grid; gap: 1px; text-align: center; }.paper-year strong { color: var(--study-accent); font-family: inherit; font-size: 20px; font-weight: 600; }.paper-year small { color: var(--study-faint); font-size: 12px; }.paper-meta { display: grid; gap: 4px; min-width: 0; }.paper-meta strong { color: var(--study-ink); font-family: inherit; font-size: 14px; line-height: 1.4; }.paper-meta span { color: var(--study-muted); font-size: 12px; }.paper-meta .paper-trust { width: fit-content; padding: 2px 6px; border-radius: 6px; background: #fff7ed; color: #9a5b13; }.paper-meta .paper-trust.verified { background: #ecfdf3; color: #18794e; }.paper-meta .paper-trust.incomplete { background: #fff1f0; color: #b42318; }.paper-card > i { width: 6px; height: 30px; border-radius: 2px; }.paper-arrow { color: var(--study-muted); }
</style>
