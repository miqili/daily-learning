<script setup lang="ts">
/**
 * 必背考点（PC）
 *
 * 数据来自三份《5 周冲刺保底方案》HTML 的反向抽取（origin=sprint5w），
 * 章节正文 = MATERIAL，必背卡 = MUST_READ，按 sort_order（章节 → 分组 → 组内）排序。
 *
 * 页面形态：科目分段 + 章节 sticky 目录 + 内容流（滚动联动高亮）。
 * 三科卡片形态不同：
 *   政治 = 题面 / 答案 / 证据列 + 关联真题折叠卡（可跳真题页对应题号）
 *   英语 = 单词 / 音标 / 释义 + 点读
 *   数学 = 公式名 + LaTeX 公式（KaTeX）
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchMustRead, fetchMustReadCount, type KnowledgeItem, type KnowledgeRef } from '@/api/knowledge';
import { listPapers, type PaperSummary } from '@/api/papers';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import { apiError } from '@/api/client';
import { speak, warmupVoices } from '@/utils/speech';
import AppEmptyState from '@/components/common/AppEmptyState.vue';
import KatexRenderer from '@/components/common/KatexRenderer.vue';
import KatexHtml from '@/components/common/KatexHtml.vue';
import MustReadRefs from '@/components/common/MustReadRefs.vue';

interface CardGroup {
  name: string;
  items: KnowledgeItem[];
}

type ChapterNode =
  | { kind: 'doc'; key: string; title: string; item: KnowledgeItem; count: number }
  | {
      kind: 'list';
      key: string;
      title: string;
      section: string;
      intro: string | null;
      groups: CardGroup[];
      count: number;
    };

/** 库内名字是「高等数学（一）」，展示口径统一成「高等数学一」 */
const shortName = (name: string) => name.replace(/（一）/g, '一').replace(/\(一\)/g, '一');

const SUBJECT_ORDER = ['政治', '英语', '高等数学一'];
const SUBJECT_TONE: Record<string, string> = {
  政治: '#f97316',
  英语: '#6c4dff',
  高等数学一: '#28b894',
};

const route = useRoute();
const router = useRouter();

const subjects = ref<SubjectInfo[]>([]);
const papers = ref<PaperSummary[]>([]);
const items = ref<KnowledgeItem[]>([]);
const counts = ref<Record<string, number>>({});
const keyword = ref('');
const busy = ref(true);
const error = ref('');
const expanded = ref<Set<number>>(new Set());
const activeIndex = ref(0);

const subjectOptions = computed(() => {
  const byName = new Map(subjects.value.map((s) => [shortName(s.name), s]));
  return SUBJECT_ORDER.filter((name) => byName.has(name)).map((name) => ({
    name,
    id: byName.get(name)!.id,
    total: counts.value[name] ?? 0,
  }));
});

const currentName = computed(() => {
  const raw = typeof route.query.subject === 'string' ? route.query.subject : '';
  return subjectOptions.value.some((option) => option.name === raw)
    ? raw
    : (subjectOptions.value[0]?.name ?? '政治');
});
const currentId = computed(() => subjectOptions.value.find((o) => o.name === currentName.value)?.id ?? null);
const tone = computed(() => SUBJECT_TONE[currentName.value] ?? '#28b894');

// —— 搜索过滤 ——
function matches(item: KnowledgeItem, needle: string) {
  const extra = item.extra;
  const haystack = [
    item.title,
    item.content,
    item.source ?? '',
    extra?.group ?? '',
    extra?.section ?? '',
    extra?.chapter ?? '',
    extra?.cn ?? '',
    extra?.say ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

const filtered = computed(() => {
  const needle = keyword.value.trim().toLowerCase();
  if (!needle) return items.value;
  return items.value.filter((item) => matches(item, needle));
});

/** 按 extra.chapter 分章（doc 条目的 chapter 就是它自己的标题，天然一章一条） */
const chapters = computed<ChapterNode[]>(() => {
  const ordered: ChapterNode[] = [];
  const indexByKey = new Map<string, number>();

  for (const item of filtered.value) {
    const title = item.extra?.chapter || item.title;
    let at = indexByKey.get(title);
    if (at === undefined) {
      at = ordered.length;
      indexByKey.set(title, at);
      ordered.push(
        item.item_type === 'MATERIAL'
          ? { kind: 'doc', key: title, title, item, count: 1 }
          : {
              kind: 'list',
              key: title,
              title,
              section: item.extra?.section ?? '',
              intro: item.extra?.chapterIntro ?? null,
              groups: [],
              count: 0,
            },
      );
    }
    const node = ordered[at];
    if (node.kind === 'doc') {
      if (item.item_type === 'MATERIAL' && node.item.id !== item.id) {
        node.count += 1;
        node.item = item; // 同章多段正文：以最后一条为准（当前数据每章仅一条）
      }
      continue;
    }
    if (item.item_type === 'MATERIAL') continue;
    const groupName = item.extra?.group || '未分组';
    let group = node.groups.find((g) => g.name === groupName);
    if (!group) {
      group = { name: groupName, items: [] };
      node.groups.push(group);
    }
    group.items.push(item);
    node.count += 1;
    node.intro = node.intro ?? item.extra?.chapterIntro ?? null;
  }
  return ordered;
});

const cardItems = computed(() => filtered.value.filter((item) => item.item_type !== 'MATERIAL'));
const refCardIds = computed(() =>
  cardItems.value.filter((item) => (item.extra?.refs?.length ?? 0) > 0).map((item) => item.id),
);

const metrics = computed(() => {
  const cards = cardItems.value;
  return {
    chapters: chapters.value.length,
    cards: cards.length,
    groups: chapters.value.reduce((sum, node) => sum + (node.kind === 'list' ? node.groups.length : 0), 0),
    refs: cards.reduce((sum, item) => sum + (item.extra?.refs?.length ?? 0), 0),
    sayable: cards.filter((item) => item.extra?.say).length,
    formulas: cards.filter((item) => item.extra?.tex).length,
  };
});

const focusMetric = computed(() => {
  if (currentName.value === '政治') return { label: '关联真题', value: metrics.value.refs };
  if (currentName.value === '英语') return { label: '可点读', value: metrics.value.sayable };
  return { label: '考题对照', value: metrics.value.refs };
});

const isPolitics = computed(() => currentName.value === '政治');
const isMath = computed(() => currentName.value === '高等数学一');
const allExpanded = computed(
  () => refCardIds.value.length > 0 && refCardIds.value.every((id) => expanded.value.has(id)),
);

/** 「一、直接回答」→ 序号徽标 + 正文；封面章没有序号 */
function splitTitle(title: string) {
  const matched = /^([一二三四五六七八九十]+、)\s*(.*)$/.exec(title);
  return matched ? { no: matched[1], text: matched[2] } : { no: '', text: title };
}

// —— 关联真题 → 真题页定位 ——
/** (科目|年份) → 试卷 id，用于把真题卡跳到对应试卷 */
const paperIndex = computed(() => {
  const map = new Map<string, number>();
  for (const paper of papers.value) map.set(`${shortName(paper.subject)}|${paper.year}`, paper.id);
  return map;
});

function paperIdOf(reference: KnowledgeRef) {
  if (!reference.year) return null;
  return paperIndex.value.get(`${currentName.value}|${reference.year}`) ?? null;
}

function openReference(reference: KnowledgeRef) {
  const paperId = paperIdOf(reference);
  if (!paperId || !reference.number) return;
  void router.push({
    name: 'paper-detail',
    params: { paperId: String(paperId) },
    query: { no: String(reference.number) },
  });
}

function toggleReference(id: number) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

function toggleAllReferences() {
  expanded.value = allExpanded.value ? new Set() : new Set(refCardIds.value);
}

// —— 目录跳转 + 滚动联动（判定线取「顶部越过判定线的最后一章」，不用 IntersectionObserver） ——
function scrollToChapter(index: number) {
  const el = document.getElementById(`mr-chapter-${index}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  activeIndex.value = index;
}

let scrollRaf = 0;

function updateActiveByScroll() {
  const nodes = document.querySelectorAll<HTMLElement>('.must-read-page .mr-chapter');
  if (!nodes.length) return;
  // 判定线 = 粘性工具栏底部（56+58）再留 36px 余量：
  // 取「章节标题顶部已越线」的最后一章，与视觉上的「当前章」一致。
  const line = 150;
  let current = 0;
  nodes.forEach((node) => {
    if (node.getBoundingClientRect().top <= line) current = Number(node.dataset.index ?? 0);
  });
  activeIndex.value = current;
}

function onWindowScroll() {
  if (scrollRaf) return;
  scrollRaf = window.requestAnimationFrame(() => {
    scrollRaf = 0;
    updateActiveByScroll();
  });
}

function bindScrollSpy() {
  unbindScrollSpy();
  window.addEventListener('scroll', onWindowScroll, { passive: true });
  updateActiveByScroll();
}

function unbindScrollSpy() {
  window.removeEventListener('scroll', onWindowScroll);
  if (scrollRaf) {
    window.cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
  }
}

// —— 数据加载 ——
async function loadCounts() {
  const options = subjectOptions.value;
  const pairs = await Promise.all(
    options.map(async (option) => [option.name, await fetchMustReadCount(option.id)] as const),
  );
  counts.value = Object.fromEntries(pairs);
}

async function loadItems() {
  const subjectId = currentId.value;
  if (!subjectId) {
    items.value = [];
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    items.value = await fetchMustRead(subjectId);
    expanded.value = new Set();
    keyword.value = '';
    await nextTick();
    bindScrollSpy();
  } catch (cause) {
    error.value = apiError(cause);
    items.value = [];
  } finally {
    busy.value = false;
  }
}

function switchSubject(name: string) {
  if (name === currentName.value) return;
  void router.replace({ name: 'must-read', query: { subject: name } });
  window.scrollTo({ top: 0 });
}

onMounted(async () => {
  warmupVoices();
  busy.value = true;
  try {
    const [subjectList, paperList] = await Promise.all([listSubjects(), listPapers()]);
    subjects.value = subjectList;
    papers.value = paperList;
    void loadCounts();
    await loadItems();
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
});

onBeforeUnmount(unbindScrollSpy);

watch(
  () => route.query.subject,
  () => {
    if (!subjects.value.length) return;
    void loadItems();
  },
);
</script>

<template>
  <div class="wb-page must-read-page">
    <header class="wb-head">
      <div>
        <p class="wb-eyebrow"><i />冲刺保底方案 · 已迁入</p>
        <h1 class="wb-title">必背考点</h1>
        <p class="wb-desc">
          三份《5 周冲刺保底方案》的完整内容：章节正文 + 必背卡。政治每条考点可展开它对应的真题并跳去原卷；英语词条带音标与点读；数学公式按 LaTeX 渲染。
        </p>
      </div>
      <dl class="wb-metrics">
        <div><dt>章节</dt><dd>{{ metrics.chapters }}</dd></div>
        <div><dt>必背卡</dt><dd>{{ metrics.cards }}</dd></div>
        <div><dt>卡片分组</dt><dd>{{ metrics.groups }}</dd></div>
        <div><dt>{{ focusMetric.label }}</dt><dd>{{ focusMetric.value }}</dd></div>
      </dl>
    </header>

    <div class="mr-bar">
      <div class="wb-seg" role="tablist" aria-label="选择科目">
        <button
          v-for="option in subjectOptions"
          :key="option.name"
          type="button"
          role="tab"
          class="wb-seg-item"
          :class="{ 'is-active': option.name === currentName }"
          :style="{ '--seg-tone': SUBJECT_TONE[option.name] }"
          :aria-selected="option.name === currentName"
          @click="switchSubject(option.name)"
        >
          <i />{{ option.name }}<em v-if="option.total">{{ option.total }}</em>
        </button>
      </div>
      <label class="wb-search mr-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input v-model="keyword" type="search" placeholder="搜考点 / 单词 / 公式…" aria-label="搜索必背内容" />
      </label>
      <div class="mr-bar-right">
        <span v-if="keyword.trim()" class="wb-hint">命中 {{ filtered.length }} 条</span>
        <button
          v-if="(isPolitics || isMath) && refCardIds.length"
          type="button"
          class="wb-btn is-sm"
          @click="toggleAllReferences"
        >
          {{ allExpanded ? '收起全部真题' : '展开全部真题' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="wb-alert mr-alert">{{ error }}</div>

    <div v-else-if="busy && !chapters.length" class="wb-skeleton"><span v-for="n in 3" :key="n" /></div>

    <div v-else-if="!chapters.length" class="wb-card wb-card-pad">
      <AppEmptyState
        :title="keyword.trim() ? '没有匹配的内容' : '该科目暂无必背内容'"
        :description="keyword.trim() ? '换个关键词，或清空搜索看全部内容。' : '请先执行 pnpm db:must-read 把内置必背考点灌入数据库。'"
      >
        <template #action>
          <button v-if="keyword.trim()" type="button" class="wb-btn" @click="keyword = ''">清空搜索</button>
        </template>
      </AppEmptyState>
    </div>

    <div v-else class="mr-body">
      <aside class="mr-aside" aria-label="章节目录">
        <div class="mr-aside-card">
          <p class="mr-aside-title">章节目录 · {{ chapters.length }}</p>
          <nav class="mr-toc">
            <button
              v-for="(chapter, index) in chapters"
              :key="chapter.key"
              type="button"
              class="mr-toc-item"
              :class="{ 'is-active': activeIndex === index }"
              @click="scrollToChapter(index)"
            >
              <span class="mr-toc-no">{{ splitTitle(chapter.title).no || '◆' }}</span>
              <span class="mr-toc-text">{{ splitTitle(chapter.title).text }}</span>
              <em>{{ chapter.count }}</em>
            </button>
          </nav>
        </div>
      </aside>

      <div class="mr-flow">
        <section
          v-for="(chapter, index) in chapters"
          :id="`mr-chapter-${index}`"
          :key="chapter.key"
          class="mr-chapter"
          :data-index="index"
        >
          <header class="mr-chapter-head">
            <h2>
              <span v-if="splitTitle(chapter.title).no" class="mr-chapter-no">{{ splitTitle(chapter.title).no }}</span>
              {{ splitTitle(chapter.title).text }}
            </h2>
            <span class="mr-chapter-meta">
              {{ chapter.kind === 'list' ? `${chapter.count} 条` : '章节正文' }}
            </span>
          </header>

          <template v-if="chapter.kind === 'doc'">
            <article class="mr-prose"><KatexHtml :html="chapter.item.content" /></article>
          </template>

          <template v-else>
            <div v-if="chapter.intro" class="mr-chapter-intro">
              <KatexHtml :html="chapter.intro" />
            </div>

            <div v-for="group in chapter.groups" :key="group.name" class="mr-group">
              <h3 class="mr-group-head">
                {{ group.name }}<em>{{ group.items.length }}</em>
              </h3>

              <div class="mr-cards" :class="`is-${currentName === '政治' ? 'pol' : currentName === '英语' ? 'eng' : 'gs'}`">
                <!-- 政治：题面 / 答案 / 证据列 / 关联真题 -->
                <template v-if="currentName === '政治'">
                  <article v-for="item in group.items" :key="item.id" class="mr-card mr-card--pol">
                    <div class="mr-q">
                      <p class="mr-q-text">{{ item.title }}</p>
                      <span
                        v-if="item.extra?.priority"
                        class="mr-pri"
                        :class="`is-${item.extra.priority.level.toLowerCase()}`"
                        :title="item.extra.priority.tip"
                      >{{ item.extra.priority.label }}</span>
                    </div>
                    <p class="mr-a">{{ item.content }}</p>
                    <p v-if="item.source" class="mr-src">证据列 · {{ item.source }}</p>

                    <MustReadRefs
                      v-if="item.extra?.refs?.length"
                      :refs="item.extra.refs"
                      :open="expanded.has(item.id)"
                      :papers="papers"
                      :subject="currentName"
                      @toggle="toggleReference(item.id)"
                      @jump="openReference"
                    />
                  </article>
                </template>

                <!-- 英语：单词 / 音标 / 点读 / 释义 -->
                <template v-else-if="currentName === '英语'">
                  <article v-for="item in group.items" :key="item.id" class="mr-card mr-card--eng">
                    <div class="mr-word">
                      <strong>{{ item.title }}</strong>
                      <span class="mr-ipa">{{ item.extra?.ipa }}</span>
                    </div>
                    <p class="mr-cn">{{ item.extra?.cn || item.content }}</p>
                    <button
                      type="button"
                      class="wb-btn is-sm mr-say"
                      :aria-label="`朗读 ${item.title}`"
                      @click="speak(item.extra?.say || item.title)"
                    >播放</button>
                  </article>
                </template>

                <!-- 数学：公式卡 / 知识点卡（要点+步骤+考题对照） / 速查表 -->
                <template v-else>
                  <template v-for="item in group.items" :key="item.id">
                    <!-- 公式卡（A–G） -->
                    <article
                      v-if="item.extra?.kind !== 'table' && item.extra?.kind !== 'method'"
                      class="mr-card mr-card--gs"
                    >
                      <h4 class="mr-fml-name">{{ item.title }}</h4>
                      <div class="mr-fml">
                        <KatexRenderer :content="item.extra?.tex || item.content" display />
                      </div>
                      <p v-if="item.extra?.note" class="mr-fml-note">{{ item.extra.note }}</p>
                    </article>

                    <!-- 三角函数值表 -->
                    <article
                      v-else-if="item.extra?.kind === 'table'"
                      class="mr-card mr-card--gs"
                    >
                      <h4 class="mr-fml-name">{{ item.title }}</h4>
                      <p v-if="item.extra?.note" class="mr-fml-note">{{ item.extra.note }}</p>
                      <div v-if="item.extra?.table" class="mr-trig">
                        <table>
                          <thead>
                            <tr>
                              <th v-for="(h, hi) in item.extra.table.head" :key="hi">
                                <KatexRenderer :content="h" />
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="(row, ri) in item.extra.table.rows" :key="ri">
                              <td v-for="(cell, ci) in row" :key="ci">
                                <KatexRenderer :content="cell" />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <ul v-if="item.extra.table.notes.length" class="mr-trig-notes">
                          <li v-for="(n, ni) in item.extra.table.notes" :key="ni">
                            <KatexHtml :html="n" />
                          </li>
                        </ul>
                      </div>
                    </article>

                    <!-- 知识点卡（考点对照 · 解题步骤） -->
                    <article v-else class="mr-card mr-card--gs mr-card--method">
                      <h4 class="mr-fml-name">{{ item.title }}</h4>

                      <div v-if="item.extra?.tex" class="mr-fml">
                        <KatexRenderer :content="item.extra.tex" display />
                      </div>
                      <p v-if="item.extra?.texNote" class="mr-fml-note"><KatexHtml :html="item.extra.texNote" /></p>

                      <div v-if="item.extra?.points?.length" class="mr-points">
                        <p class="mr-block-label">要点</p>
                        <ul>
                          <li v-for="(p, pi) in item.extra.points" :key="pi"><KatexHtml :html="p" /></li>
                        </ul>
                      </div>

                      <div v-if="item.extra?.steps?.length" class="mr-steps">
                        <p class="mr-block-label">解题步骤</p>
                        <ol>
                          <li v-for="(s, si) in item.extra.steps" :key="si"><KatexHtml :html="s" /></li>
                        </ol>
                      </div>

                      <p class="mr-src">{{ item.source }}</p>

                      <MustReadRefs
                        v-if="item.extra?.refs?.length"
                        :refs="item.extra.refs"
                        :open="expanded.has(item.id)"
                        :papers="papers"
                        :subject="currentName"
                        math
                        @toggle="toggleReference(item.id)"
                        @jump="openReference"
                      />

                      <div v-if="item.extra?.example" class="mr-example">
                        <p class="mr-block-label">{{ item.extra.example.label }}</p>
                        <p class="mr-example-stem"><KatexRenderer :content="item.extra.example.stem" break-lines /></p>
                        <ol>
                          <li v-for="(s, si) in item.extra.example.steps" :key="si"><KatexRenderer :content="s" break-lines /></li>
                        </ol>
                        <p v-if="item.extra.example.answer" class="mr-example-answer">
                          答案 <KatexRenderer :content="item.extra.example.answer" break-lines />
                        </p>
                      </div>
                    </article>
                  </template>
                </template>
              </div>
            </div>
          </template>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.must-read-page { --wb-gutter: 32px; }

/* ============ 工具栏（sticky，与真题页筛选条同款观感） ============ */
.mr-bar {
  position: sticky;
  top: 56px;
  z-index: 12;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  padding: 12px 16px;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: rgba(255, 255, 255, .88);
  box-shadow: var(--wb-shadow-sm);
  backdrop-filter: blur(10px) saturate(1.4);
}
.mr-bar > * { min-width: 0; }
.mr-bar-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.mr-search { position: relative; display: flex; align-items: center; gap: 7px; width: clamp(200px, 26vw, 300px); }
.mr-search svg { width: 14px; height: 14px; flex: 0 0 14px; color: var(--wb-faint); }
.mr-search:focus-within svg { color: var(--wb-accent); }
.mr-alert { margin-bottom: 16px; }

/* ============ 主体：232px 粘性目录 + 内容流 ============ */
.mr-body { display: grid; grid-template-columns: 232px minmax(0, 1fr); align-items: start; gap: 18px; }
.mr-aside { position: sticky; top: 128px; }
.mr-aside-card {
  padding: 14px 14px 12px;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: var(--wb-surface);
  box-shadow: var(--wb-shadow-sm);
}
.mr-aside-title { margin: 0 0 10px; color: var(--wb-faint); font-size: 11px; font-weight: 700; letter-spacing: .06em; }
.mr-toc { display: grid; gap: 2px; max-height: calc(100vh - 208px); overflow-y: auto; }
.mr-toc-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 7px;
  padding: 6px 8px;
  border: 0;
  border-radius: var(--wb-radius-sm);
  background: transparent;
  color: var(--wb-muted);
  text-align: left;
  transition: background var(--wb-dur) var(--wb-ease), color var(--wb-dur) var(--wb-ease);
}
.mr-toc-item:hover { background: var(--wb-surface-3); color: var(--wb-ink); }
.mr-toc-item.is-active { background: var(--wb-brand-soft); color: var(--wb-brand-deep); }
.mr-toc-item.is-active .mr-toc-no { color: var(--wb-brand-deep); }
.mr-toc-item.is-active .mr-toc-text { font-weight: 600; }
.mr-toc-item:focus-visible { outline: 3px solid rgba(108, 77, 255, .2); outline-offset: 1px; }
.mr-toc-no { color: var(--wb-faint); font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; }
.mr-toc-text { font-size: 12px; line-height: 1.45; }
.mr-toc-item em { color: var(--wb-faint); font-size: 11px; font-style: normal; font-variant-numeric: tabular-nums; }

/* ============ 章节 ============ */
.mr-flow { display: grid; min-width: 0; gap: 26px; }
.mr-chapter { scroll-margin-top: 132px; min-width: 0; }
.mr-chapter + .mr-chapter { padding-top: 26px; border-top: 1px solid var(--wb-line-soft); }
.mr-chapter-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.mr-chapter-head h2 { margin: 0; color: var(--wb-ink); font-size: 19px; font-weight: 700; letter-spacing: -.02em; line-height: 1.35; }
.mr-chapter-no {
  display: inline-block;
  margin-right: 8px;
  padding: 1px 8px;
  border-radius: var(--wb-radius-sm);
  background: var(--wb-brand-soft);
  color: var(--wb-brand-deep);
  font-size: 13px;
  font-weight: 700;
}
.mr-chapter-meta { color: var(--wb-faint); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.mr-chapter-intro,
.mr-prose {
  margin-bottom: 16px;
  padding: 14px 18px;
  border: 1px solid var(--wb-line-soft);
  border-left: 3px solid var(--wb-brand);
  border-radius: var(--wb-radius);
  background: var(--wb-surface-2);
  color: var(--wb-ink-2);
  font-size: 13px;
  line-height: 1.85;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
}
.mr-chapter-intro :deep(b),
.mr-prose :deep(b),
.mr-chapter-intro :deep(strong),
.mr-prose :deep(strong) { color: var(--wb-ink); }
.mr-chapter-intro :deep(p),
.mr-prose :deep(p) { margin: 0 0 10px; }
.mr-chapter-intro :deep(p:last-child),
.mr-prose :deep(p:last-child) { margin-bottom: 0; }
.mr-chapter-intro :deep(.katex-display),
.mr-prose :deep(.katex-display) { margin: 10px 0; padding: 2px 0; overflow-x: auto; overflow-y: hidden; }
.mr-chapter-intro :deep(.katex),
.mr-prose :deep(.katex) { color: var(--wb-ink); }
.mr-prose :deep(h4) { margin: 16px 0 8px; color: var(--wb-ink); font-size: 14px; font-weight: 700; }
.mr-prose :deep(ul),
.mr-prose :deep(ol) { margin: 8px 0; padding-left: 20px; }
.mr-prose :deep(li) { margin-bottom: 5px; }
.mr-prose :deep(table) { width: 100%; margin: 10px 0; border-collapse: collapse; font-size: 12.5px; }
.mr-prose :deep(th),
.mr-prose :deep(td) { padding: 7px 9px; border: 1px solid var(--wb-line-soft); text-align: left; }
.mr-prose :deep(th) { background: var(--wb-surface-3); color: var(--wb-ink); font-weight: 600; }
.mr-prose :deep(code) { padding: 1px 5px; border-radius: 4px; background: var(--wb-surface-3); font-size: 12px; }

/* ============ 分组 ============ */
.mr-group + .mr-group { margin-top: 20px; }
.mr-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  color: var(--wb-ink-2);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -.01em;
}
.mr-group-head em {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--wb-surface-3);
  color: var(--wb-faint);
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.mr-group-head::after { height: 1px; flex: 1; background: var(--wb-line-soft); content: ""; }

/* ============ 卡片 ============ */
.mr-cards { display: grid; gap: 10px; }
.mr-cards.is-eng { grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); }
.mr-card {
  padding: 14px 16px;
  border: 1px solid var(--wb-line-soft);
  border-radius: var(--wb-radius-lg);
  background: var(--wb-surface);
  box-shadow: var(--wb-shadow-sm);
  min-width: 0;
  transition: border-color var(--wb-dur) var(--wb-ease), box-shadow var(--wb-dur) var(--wb-ease);
}
.mr-card--pol:hover { border-color: rgba(249, 115, 22, .34); }
.mr-card--gs:hover { border-color: rgba(40, 184, 148, .34); }

/* 政治卡 */
.mr-q { display: flex; align-items: flex-start; gap: 9px; }
.mr-q-text { flex: 1; margin: 0; color: var(--wb-ink); font-size: 14px; font-weight: 650; line-height: 1.65; }
.mr-pri {
  flex: 0 0 auto;
  margin-top: 2px;
  padding: 2px 8px;
  border-radius: var(--wb-radius-sm);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.mr-pri.is-a { background: #fef2f2; color: #b42318; }
.mr-pri.is-b { background: var(--wb-warn-soft); color: var(--wb-warn-ink); }
.mr-pri.is-c { background: var(--wb-surface-3); color: var(--wb-faint); }
.mr-a { margin: 8px 0 0; color: var(--wb-brand-deep); font-size: 14px; font-weight: 600; line-height: 1.7; }
.mr-a::before { margin-right: 6px; color: var(--wb-faint); font-size: 12px; font-weight: 600; content: "答"; }
.mr-src { margin: 7px 0 0; color: var(--wb-faint); font-size: 11.5px; line-height: 1.6; }

/* 英语卡 */
.mr-card--eng { display: grid; gap: 6px; align-content: start; }
.mr-word { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
.mr-word strong { color: var(--wb-ink); font-size: 16px; font-weight: 700; letter-spacing: -.01em; }
.mr-ipa { color: var(--wb-accent); font-size: 12px; }
.mr-cn { margin: 0; color: var(--wb-ink-2); font-size: 13px; line-height: 1.6; }
.mr-say { justify-self: start; margin-top: 2px; }

/* 数学卡 */
.mr-fml-name { margin: 0 0 8px; color: var(--wb-ink-2); font-size: 13px; font-weight: 700; }
.mr-fml { overflow-x: auto; padding: 10px 12px; border-radius: var(--wb-radius); background: var(--wb-surface-2); color: var(--wb-ink); font-size: 14px; }
.mr-fml :deep(.katex-display) { margin: 0; }
.mr-fml-note { margin: 8px 0 0; color: var(--wb-muted); font-size: 12px; line-height: 1.7; }
.mr-fml-note :deep(.katex) { color: var(--wb-ink-2); }

/* ============ 数学知识点卡：要点 / 步骤 / 例题 ============ */
.mr-card--method { padding: 16px 18px; }
.mr-block-label {
  margin: 12px 0 6px;
  color: var(--wb-faint);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .05em;
}
.mr-points ul,
.mr-steps ol,
.mr-example ol { margin: 0; padding-left: 18px; }
.mr-points li,
.mr-steps li,
.mr-example li { margin-bottom: 5px; color: var(--wb-ink-2); font-size: 13px; line-height: 1.75; }
.mr-points li :deep(.katex),
.mr-steps li :deep(.katex),
.mr-example :deep(.katex) { color: var(--wb-ink); }
.mr-points li :deep(b),
.mr-steps li :deep(b) { color: var(--wb-ink); }
.mr-example {
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px dashed var(--wb-line);
  border-radius: var(--wb-radius);
  background: var(--wb-surface-2);
}
.mr-example .mr-block-label { margin-top: 0; }
.mr-example-stem { margin: 0 0 6px; color: var(--wb-ink); font-size: 13px; line-height: 1.8; }
.mr-example-answer {
  margin: 10px 0 0;
  padding: 8px 11px;
  border-radius: var(--wb-radius-sm);
  background: var(--wb-brand-soft);
  color: var(--wb-brand-deep);
  font-size: 12.5px;
  line-height: 1.75;
}

/* ============ 三角函数值表 ============ */
.mr-trig { margin-top: 10px; min-width: 0; overflow-x: auto; }
.mr-trig table { width: 100%; border-collapse: collapse; font-size: 13px; }
.mr-trig th,
.mr-trig td { padding: 7px 10px; border: 1px solid var(--wb-line-soft); text-align: center; }
.mr-trig th { background: var(--wb-brand-soft); color: var(--wb-brand-deep); font-weight: 700; }
.mr-trig td:first-child { font-weight: 600; color: var(--wb-ink); }
.mr-trig td .katex { font-size: 13px; }
.mr-trig-notes { margin: 12px 0 0; padding-left: 18px; }
.mr-trig-notes li { margin-bottom: 6px; color: var(--wb-ink-2); font-size: 12.5px; line-height: 1.7; }
.mr-trig-notes li :deep(.katex) { color: var(--wb-ink); }
.mr-trig-notes li :deep(b) { color: var(--wb-ink); }

/* ============ 断点 ============ */
@media (max-width: 1280px) {
  .must-read-page { --wb-gutter: 24px; }
  .mr-body { grid-template-columns: 208px minmax(0, 1fr); gap: 14px; }
}
@media (max-width: 1180px) {
  .mr-body { grid-template-columns: minmax(0, 1fr); }
  .mr-aside { position: static; }
  .mr-toc { max-height: 236px; }
}
@media (max-width: 1024px) {
  .must-read-page { --wb-gutter: 20px; }
  .mr-bar { align-items: stretch; }
  .mr-search { width: 100%; order: 3; }
  .mr-bar-right { margin-left: 0; }
  .mr-cards.is-eng { grid-template-columns: repeat(auto-fill, minmax(184px, 1fr)); }
}
</style>
