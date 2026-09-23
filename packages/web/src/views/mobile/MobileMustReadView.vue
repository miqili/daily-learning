<script setup lang="ts">
/**
 * 必背考点（移动端）—— 与 PC 的 MustReadView 完全分离，不复用页面也不复用 PC 组件。
 *
 * PC 是「左目录 + 右内容流 + 滚动联动」，手机上没有横向空间，这里按手机重排：
 *   科目分段 → 章节手风琴（vant 单开 + 懒渲染）→ 分组 → 卡片流
 * 卡片交互按背诵习惯分科处理，而不是照搬 PC 的「全部平铺展开」：
 *   政治 = 题面 → 点一下看答案 / 证据列 / 关联真题
 *   英语 = 单词 + 音标 → 点一下看释义（播放按钮常驻，44×44）
 *   数学 = 公式 / 速查表 / 知识点卡，直接展开
 *
 * 手机适配要点：
 *   1. 容器、分段、筛选、按钮一律用 main.css 的 .study-* 全局类（44px 触控、全局令牌）
 *   2. 公式与表格只让自身横向滚动，绝不整卡横滚
 *   3. 数据表不用原生 <table>，改成「首列做标题 + 其余列键值」的卡片（手机横滚表格不可用）
 *   4. 关联真题走移动端专用组件 MobileMustReadRefs，不用 PC 的 MustReadRefs
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchMustRead, fetchMustReadCount, type KnowledgeItem, type KnowledgeRef } from '@/api/knowledge';
import { listPapers, type PaperSummary } from '@/api/papers';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import { apiError } from '@/api/client';
import { speak, warmupVoices } from '@/utils/speech';
import { decorateProse } from '@/utils/prose';
import KatexRenderer from '@/components/common/KatexRenderer.vue';
import KatexHtml from '@/components/common/KatexHtml.vue';
import MobileMustReadRefs from '@/components/mobile/MobileMustReadRefs.vue';
import MobilePageHeader from '@/components/mobile/MobilePageHeader.vue';

interface CardGroup {
  name: string;
  items: KnowledgeItem[];
}

type ChapterNode =
  | { kind: 'doc'; key: string; title: string; item: KnowledgeItem; html: string }
  | {
      kind: 'list';
      key: string;
      title: string;
      intro: string | null;
      introHtml: string;
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

/** 「一、直接回答」→ 序号徽标 + 正文 */
function splitTitle(title: string) {
  const matched = /^([一二三四五六七八九十]+、)\s*(.*)$/.exec(title);
  return matched ? { no: matched[1], text: matched[2] } : { no: '', text: title };
}

/**
 * 数据表在手机上不以表格呈现：首列作标题、次列作副标题，其余列拆成「列名 / 值」键值块。
 * 原生 <table> 在小屏只能横向滚动，读数时行首会滚出视野，不可用。
 */
function tableCells(table: any, row: any[], meta: any) {
  const head: string[] = table?.head ?? [];
  const tag = meta?.tag as string | undefined;
  const cells: Array<{ key: string; label: string; value: string }> = [];
  for (let index = 2; index < row.length; index += 1) {
    const value = String(row[index] ?? '');
    if (!value) continue;
    // 末列若与徽标文案重复（如「必背 · 4 题」），不再重复渲染一次
    if (tag && value.startsWith(tag)) continue;
    cells.push({ key: `${index}`, label: String(head[index] ?? ''), value });
  }
  return cells;
}

const route = useRoute();
const router = useRouter();

const subjects = ref<SubjectInfo[]>([]);
const papers = ref<PaperSummary[]>([]);
const items = ref<KnowledgeItem[]>([]);
const counts = ref<Record<string, number>>({});
const keyword = ref('');
const busy = ref(true);
const error = ref('');

/** 手风琴：当前展开的章节名（单开，未展开的章节由 vant 懒渲染） */
const openChapter = ref('');
/** 已翻开的卡片（政治看答案 / 英语看释义） */
const revealed = ref<Set<number>>(new Set());
/** 已展开「关联真题」的卡片 */
const expandedRefs = ref<Set<number>>(new Set());

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
  return subjectOptions.value.some((o) => o.name === raw) ? raw : (subjectOptions.value[0]?.name ?? '政治');
});
const currentId = computed(() => subjectOptions.value.find((o) => o.name === currentName.value)?.id ?? null);
const tone = computed(() => SUBJECT_TONE[currentName.value] ?? '#28b894');
const isPolitics = computed(() => currentName.value === '政治');
const isEnglish = computed(() => currentName.value === '英语');

function matches(item: KnowledgeItem, needle: string) {
  const extra = item.extra;
  return [item.title, item.content, item.source ?? '', extra?.group ?? '', extra?.section ?? '',
    extra?.chapter ?? '', extra?.cn ?? '', extra?.say ?? '']
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

const filtered = computed(() => {
  const needle = keyword.value.trim().toLowerCase();
  if (!needle) return items.value;
  return items.value.filter((item) => matches(item, needle));
});

/** 按 extra.chapter 分章，与 PC 同一套分组口径 */
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
          ? { kind: 'doc', key: title, title, item, html: decorateProse(item.content) }
          : {
              kind: 'list',
              key: title,
              title,
              intro: item.extra?.chapterIntro ?? null,
              introHtml: decorateProse(item.extra?.chapterIntro ?? ''),
              groups: [],
              count: 0,
            },
      );
    }
    const node = ordered[at];
    if (node.kind === 'doc') {
      if (item.item_type === 'MATERIAL' && node.item.id !== item.id) node.item = item;
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
    if (!node.intro) {
      const intro = item.extra?.chapterIntro ?? null;
      node.intro = intro;
      node.introHtml = decorateProse(intro ?? '');
    }
  }
  return ordered;
});

const cardItems = computed(() => filtered.value.filter((item) => item.item_type !== 'MATERIAL'));

const metrics = computed(() => ({
  chapters: chapters.value.length,
  cards: cardItems.value.length,
  refs: cardItems.value.reduce((sum, item) => sum + (item.extra?.refs?.length ?? 0), 0),
  sayable: cardItems.value.filter((item) => item.extra?.say).length,
}));
const focusMetric = computed(() => {
  if (isPolitics.value) return { label: '关联真题', value: metrics.value.refs };
  if (isEnglish.value) return { label: '可点读', value: metrics.value.sayable };
  return { label: '考题对照', value: metrics.value.refs };
});

const paperIndex = computed(() => {
  const map = new Map<string, number>();
  for (const paper of papers.value) map.set(`${shortName(paper.subject)}|${paper.year}`, paper.id);
  return map;
});

function paperIdOf(reference: KnowledgeRef) {
  if (!reference.year) return null;
  return paperIndex.value.get(`${currentName.value}|${reference.year}`) ?? null;
}

/** 跳到移动端做题页对应题号（受 ?no= 深链支持） */
function openReference(reference: KnowledgeRef) {
  const paperId = paperIdOf(reference);
  if (!paperId || !reference.number) return;
  void router.push({
    name: 'm-paper-practice',
    params: { paperId: String(paperId) },
    query: { no: String(reference.number) },
  });
}

function toggleRevealed(id: number) {
  const next = new Set(revealed.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  revealed.value = next;
}

function toggleRefs(id: number) {
  const next = new Set(expandedRefs.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedRefs.value = next;
}

function isMathCard(item: KnowledgeItem) {
  return item.extra?.kind === 'method';
}
function isTableCard(item: KnowledgeItem) {
  return item.extra?.kind === 'table';
}

async function loadCounts() {
  const pairs = await Promise.all(
    subjectOptions.value.map(async (o) => [o.name, await fetchMustReadCount(o.id)] as const),
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
    revealed.value = new Set();
    expandedRefs.value = new Set();
    keyword.value = '';
    // 默认展开第一章，进去就有内容；其余章节交给 vant 懒渲染
    openChapter.value = chapters.value[0]?.key ?? '';
  } catch (cause) {
    error.value = apiError(cause);
    items.value = [];
  } finally {
    busy.value = false;
  }
}

function switchSubject(name: string) {
  if (name === currentName.value) return;
  void router.replace({ name: 'm-must-read', query: { subject: name } });
  keyword.value = '';
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

watch(
  () => route.query.subject,
  () => {
    if (!subjects.value.length) return;
    void loadItems();
  },
);
</script>

<template>
  <main class="study-page mmr-page" :style="{ '--mmr-tone': tone }">
    <div class="study-screen">
      <MobilePageHeader title="必背考点" eyebrow="冲刺保底方案" back />

      <div class="study-segmented">
        <button
          v-for="option in subjectOptions"
          :key="option.name"
          :class="{ active: option.name === currentName }"
          @click="switchSubject(option.name)"
        >
          {{ option.name }}<em v-if="option.total">{{ option.total }}</em>
        </button>
      </div>

      <van-search v-model="keyword" shape="round" placeholder="搜考点 / 单词 / 公式…" />

      <section class="mmr-metrics" aria-label="必背内容概览">
        <div><strong>{{ metrics.chapters }}</strong><span>章节</span></div>
        <div><strong>{{ metrics.cards }}</strong><span>必背卡</span></div>
        <div><strong>{{ focusMetric.value }}</strong><span>{{ focusMetric.label }}</span></div>
      </section>

      <p v-if="error" class="study-error">{{ error }}</p>
      <div v-else-if="busy && !chapters.length" class="mmr-loading"><van-loading size="22">正在整理必背内容…</van-loading></div>
      <div v-else-if="!chapters.length" class="study-empty">
        {{ keyword.trim() ? '没有匹配的内容，换个关键词试试。' : '该科目暂无必背内容。' }}
      </div>

      <van-collapse v-else v-model="openChapter" accordion class="mmr-collapse">
        <van-collapse-item
          v-for="chapter in chapters"
          :key="chapter.key"
          :name="chapter.key"
          :title="splitTitle(chapter.title).text"
        >
          <template #title>
            <span class="mmr-ch-title">
              <i v-if="splitTitle(chapter.title).no" class="mmr-ch-no">{{ splitTitle(chapter.title).no.replace('、', '') }}</i>
              <b>{{ splitTitle(chapter.title).text }}</b>
              <em>{{ chapter.kind === 'list' ? `${chapter.count} 条` : '正文' }}</em>
            </span>
          </template>

          <!-- 章节正文 -->
          <article v-if="chapter.kind === 'doc'" class="mmr-prose mmr-rich">
            <KatexHtml :html="chapter.html" />
          </article>

          <!-- 章节下的卡片分组 -->
          <template v-else>
            <div v-if="chapter.introHtml" class="mmr-intro mmr-rich"><KatexHtml :html="chapter.introHtml" /></div>

            <section v-for="group in chapter.groups" :key="group.name" class="mmr-group">
              <h3 class="mmr-group-head">
                <KatexRenderer :content="group.name" /><em>{{ group.items.length }}</em>
              </h3>

              <!-- 政治：题面 → 点开看答案 -->
              <template v-if="isPolitics">
                <article
                  v-for="item in group.items"
                  :key="item.id"
                  class="mmr-card is-tappable"
                  :class="{ 'is-open': revealed.has(item.id) }"
                  role="button"
                  :aria-expanded="revealed.has(item.id)"
                  @click="toggleRevealed(item.id)"
                >
                  <div class="mmr-q">
                    <p>{{ item.title }}</p>
                    <span
                      v-if="item.extra?.priority"
                      class="mmr-pri"
                      :class="`is-${item.extra.priority.level.toLowerCase()}`"
                    >{{ item.extra.priority.label }}</span>
                  </div>
                  <span v-if="!revealed.has(item.id)" class="mmr-tap">点一下看答案</span>
                  <div v-else class="mmr-reveal">
                    <p class="mmr-a">{{ item.content }}</p>
                    <p v-if="item.source" class="mmr-src">证据列 · {{ item.source }}</p>
                    <MobileMustReadRefs
                      v-if="item.extra?.refs?.length"
                      :refs="item.extra.refs"
                      :open="expandedRefs.has(item.id)"
                      :papers="papers"
                      :subject="currentName"
                      @toggle="toggleRefs(item.id)"
                      @jump="openReference"
                    />
                  </div>
                </article>
              </template>

              <!-- 英语：单词 + 音标 → 点开看释义 -->
              <template v-else-if="isEnglish">
                <article v-for="item in group.items" :key="item.id" class="mmr-card">
                  <div
                    class="mmr-word is-tappable"
                    role="button"
                    :aria-expanded="revealed.has(item.id)"
                    @click="toggleRevealed(item.id)"
                  >
                    <div class="mmr-word-left">
                      <strong>{{ item.title }}</strong>
                      <span v-if="item.extra?.ipa" class="mmr-ipa">{{ item.extra.ipa }}</span>
                    </div>
                    <button
                      class="mmr-say"
                      :aria-label="`朗读 ${item.title}`"
                      @click.stop="speak(item.extra?.say || item.title)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 9v6h3.5L13 19V5L7.5 9H4Z" /><path d="M16.5 8.5a4.5 4.5 0 0 1 0 7" /></svg>
                    </button>
                  </div>
                  <p v-if="revealed.has(item.id)" class="mmr-cn">{{ item.extra?.cn || item.content }}</p>
                  <span v-else class="mmr-tap">点一下看释义</span>
                </article>
              </template>

              <!-- 数学：公式卡 / 速查表 / 知识点卡 -->
              <template v-else>
                <template v-for="item in group.items" :key="item.id">
                  <!-- 速查表：手机上改成「首列标题 + 键值块」，不用原生表格 -->
                  <article v-if="isTableCard(item)" class="mmr-card">
                    <h4 class="mmr-card-title"><KatexRenderer :content="item.title" /></h4>
                    <p v-if="item.extra?.note" class="mmr-note"><KatexRenderer :content="item.extra.note" /></p>

                    <div v-if="item.extra?.table" class="mmr-table">
                      <div
                        v-for="(row, ri) in item.extra.table.rows"
                        :key="ri"
                        class="mmr-trow"
                        :class="item.extra.table.rowMeta?.[ri]?.level ? `is-${item.extra.table.rowMeta[ri].level}` : ''"
                      >
                        <header class="mmr-trow-head">
                          <strong><KatexRenderer :content="String(row[0] ?? '')" /></strong>
                          <span v-if="row[1]"><KatexRenderer :content="String(row[1])" /></span>
                          <em v-if="item.extra.table.rowMeta?.[ri]?.tag">{{ item.extra.table.rowMeta[ri].tag }}</em>
                        </header>
                        <div class="mmr-tcells">
                          <p v-for="cell in tableCells(item.extra.table, row, item.extra.table.rowMeta?.[ri])" :key="cell.key">
                            <span class="mmr-tk"><KatexRenderer :content="cell.label" /></span>
                            <span class="mmr-tv"><KatexRenderer :content="cell.value" /></span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <ul v-if="item.extra?.table?.notes?.length" class="mmr-notes">
                      <li v-for="(note, ni) in item.extra.table.notes" :key="ni"><KatexHtml :html="note" /></li>
                    </ul>
                  </article>

                  <!-- 知识点卡 -->
                  <article v-else-if="isMathCard(item)" class="mmr-card">
                    <h4 class="mmr-card-title"><KatexRenderer :content="item.title" /></h4>
                    <div v-if="item.extra?.tex" class="mmr-formula"><KatexRenderer :content="item.extra.tex" display /></div>
                    <p v-if="item.extra?.texNote" class="mmr-note"><KatexHtml :html="item.extra.texNote" /></p>
                    <div v-if="item.extra?.points?.length" class="mmr-block">
                      <p class="mmr-block-label">要点</p>
                      <ul><li v-for="(point, pi) in item.extra.points" :key="pi"><KatexHtml :html="point" /></li></ul>
                    </div>
                    <div v-if="item.extra?.steps?.length" class="mmr-block">
                      <p class="mmr-block-label">解题步骤</p>
                      <ol><li v-for="(step, si) in item.extra.steps" :key="si"><KatexHtml :html="step" /></li></ol>
                    </div>
                    <p v-if="item.source" class="mmr-src">{{ item.source }}</p>
                    <MobileMustReadRefs
                      v-if="item.extra?.refs?.length"
                      :refs="item.extra.refs"
                      :open="expandedRefs.has(item.id)"
                      :papers="papers"
                      :subject="currentName"
                      math
                      @toggle="toggleRefs(item.id)"
                      @jump="openReference"
                    />
                    <div v-if="item.extra?.example" class="mmr-example">
                      <p class="mmr-block-label">{{ item.extra.example.label }}</p>
                      <p class="mmr-example-stem"><KatexRenderer :content="item.extra.example.stem" break-lines /></p>
                      <ol><li v-for="(step, si) in item.extra.example.steps" :key="si"><KatexRenderer :content="step" break-lines /></li></ol>
                      <p v-if="item.extra.example.answer" class="mmr-example-answer">
                        答案 <KatexRenderer :content="item.extra.example.answer" break-lines />
                      </p>
                    </div>
                  </article>

                  <!-- 公式卡 -->
                  <article v-else class="mmr-card">
                    <h4 class="mmr-card-title"><KatexRenderer :content="item.title" /></h4>
                    <div class="mmr-formula"><KatexRenderer :content="item.extra?.tex || item.content" display /></div>
                    <p v-if="item.extra?.note" class="mmr-note"><KatexRenderer :content="item.extra.note" /></p>
                  </article>
                </template>
              </template>
            </section>
          </template>
        </van-collapse-item>
      </van-collapse>
    </div>
  </main>
</template>

<style scoped>
/* 容器与内边距沿用 .study-page / .study-screen 全局定义，这里只补主题色 */
.mmr-page { color: var(--study-text); }

.study-segmented button em { margin-left: 4px; font-size: 11px; font-style: normal; opacity: .7; }

.mmr-metrics { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 12px; overflow: hidden; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); box-shadow: var(--app-shadow-sm); }
.mmr-metrics > div { display: grid; gap: 3px; padding: 13px 10px; text-align: center; border-left: 1px solid var(--app-border); }
.mmr-metrics > div:first-child { border-left: 0; }
.mmr-metrics strong { color: var(--app-text); font-size: 20px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
.mmr-metrics span { color: var(--app-muted); font-size: 11.5px; }
.mmr-loading { display: grid; min-height: 42vh; place-items: center; color: var(--app-muted); font-size: 13px; }

/* 章节折叠：单开 + 懒渲染，避免一次渲染上百张卡 */
.mmr-collapse { margin-top: 12px; overflow: hidden; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); }
:deep(.van-collapse-item__title) { align-items: center; }
:deep(.van-cell) { padding: 13px 15px; }
:deep(.van-collapse-item__content) { padding: 0 15px 16px; }
.mmr-ch-title { display: flex; align-items: center; gap: 7px; min-width: 0; }
.mmr-ch-no { flex: 0 0 auto; display: inline-grid; place-items: center; min-width: 21px; height: 21px; padding: 0 5px; border-radius: 7px; background: var(--mmr-tone); color: #fff; font-size: 11px; font-style: normal; font-weight: 700; }
.mmr-ch-title b { overflow: hidden; color: var(--app-text); font-size: 14.5px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.mmr-ch-title em { flex: 0 0 auto; margin-left: auto; color: var(--app-faint); font-size: 11.5px; font-style: normal; }

/* 章节正文：承接 PC 的标签契约（h4 小标题 + mr-step 徽标 + mr-no 列表序号），字号按手机放大
   块级分层复用 utils/prose.ts 打出的 .p-* 类，与 PC 同一套语义，只是样式按手机重排 */
.mmr-rich { color: var(--study-text); font-size: 14.5px; line-height: 1.85; }
.mmr-rich :deep(strong), .mmr-rich :deep(b) { color: var(--app-text); font-weight: 700; }
.mmr-rich :deep(p) { margin: 0 0 10px; }
.mmr-rich :deep(.p-p:last-child) { margin-bottom: 0; }
.mmr-rich :deep(ul), .mmr-rich :deep(ol) { margin: 8px 0; padding-left: 21px; }
.mmr-rich :deep(.p-list) { margin: 0 0 11px; }
.mmr-rich :deep(li) { margin-bottom: 6px; }
/* 只让公式自己横向滚动，正文保持纵向阅读 */
.mmr-rich :deep(.katex-display) { overflow-x: auto; overflow-y: hidden; padding: 3px 0; -webkit-overflow-scrolling: touch; }

/* 小标题 */
.mmr-rich :deep(.p-h) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin: 20px 0 10px;
  padding-left: 10px;
  border-left: 3px solid var(--mmr-tone);
  color: var(--app-text);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
}
.mmr-rich :deep(.p-sec > .p-h:first-child) { margin-top: 0; }
.mmr-rich :deep(.mr-step) { flex: 0 0 auto; display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: var(--mmr-tone); color: #fff; font-size: 11.5px; font-weight: 700; }
.mmr-rich :deep(.mr-no) { flex: 0 0 auto; display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border: 1px solid var(--app-border-strong); border-radius: 6px; background: var(--app-bg); color: var(--app-muted); font-size: 11px; font-weight: 700; }

/* 小节 / 普通块 / 公式块 */
.mmr-rich :deep(.p-sec) { margin: 0 0 13px; padding: 13px 14px 12px; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); }
.mmr-rich :deep(.p-sec > .p-sub) { margin: 0 0 9px; }
.mmr-rich :deep(.p-sec > *:last-child) { margin-bottom: 0; }
.mmr-rich :deep(.p-box) { margin: 0 0 11px; padding: 12px 13px; border-radius: 10px; background: var(--app-surface-subtle); }
.mmr-rich :deep(.p-box.is-pre) { white-space: pre-line; }
.mmr-rich :deep(.p-box > *:last-child) { margin-bottom: 0; }
.mmr-rich :deep(.p-formula) { margin: 0 0 11px; padding: 10px 12px; border-radius: 10px; background: var(--app-surface-subtle); overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; }

/* 指标网格（原数值卡） */
.mmr-rich :deep(.p-stats) { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 9px; margin: 0 0 12px; }
.mmr-rich :deep(.p-stat) { padding: 11px 12px; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-surface); }
.mmr-rich :deep(.p-stat-k) { color: var(--app-faint); font-size: 11.5px; font-weight: 600; }
.mmr-rich :deep(.p-stat-v) { margin-top: 3px; color: var(--app-text); font-size: 21px; font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums; }
.mmr-rich :deep(.p-stat-v small) { margin-left: 3px; color: var(--app-muted); font-size: 11.5px; font-weight: 500; }
.mmr-rich :deep(.p-stat-n) { margin-top: 4px; color: var(--app-muted); font-size: 11.5px; line-height: 1.6; }
.mmr-rich :deep(.p-stat-x) { grid-column: 1 / -1; color: var(--app-muted); font-size: 12.5px; }

/* 行列表（原周计划） */
.mmr-rich :deep(.p-rows) { display: grid; gap: 9px; margin: 0 0 12px; }
.mmr-rich :deep(.p-row) { position: relative; padding: 11px 13px 12px 15px; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-surface); overflow: hidden; }
.mmr-rich :deep(.p-row)::before { position: absolute; top: 9px; bottom: 9px; left: 0; width: 3px; border-radius: 0 3px 3px 0; background: var(--mmr-tone); content: ""; }
.mmr-rich :deep(.p-row-t) { color: var(--app-text); font-size: 13.5px; font-weight: 700; line-height: 1.55; }
.mmr-rich :deep(.p-row-d) { margin-top: 4px; color: var(--app-muted); font-size: 13px; line-height: 1.8; }
.mmr-rich :deep(.p-row-x) { color: var(--app-muted); font-size: 13px; }

/* 表格：手机上只让表格自己横向滚动，卡片与页面不滚 */
.mmr-rich :deep(.p-table) { margin: 0 0 12px; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-surface); overflow-x: auto; -webkit-overflow-scrolling: touch; }
.mmr-rich :deep(.p-table table) { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.mmr-rich :deep(.p-table th), .mmr-rich :deep(.p-table td) { padding: 8px 10px; border-bottom: 1px solid var(--app-border); text-align: left; vertical-align: top; }
.mmr-rich :deep(.p-table th) { background: var(--app-bg); color: var(--app-text); font-weight: 700; white-space: nowrap; }
.mmr-rich :deep(.p-table tr:last-child td), .mmr-rich :deep(.p-table tr:last-child th) { border-bottom: 0; }

.mmr-intro { margin-bottom: 12px; padding: 2px 0 2px 11px; border-left: 3px solid var(--mmr-tone); color: var(--study-muted); font-size: 13.5px; line-height: 1.78; }

.mmr-group { margin-top: 16px; }
.mmr-group-head { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; padding-bottom: 7px; border-bottom: 1px dashed var(--app-border-strong); color: var(--app-text); font-size: 13.5px; font-weight: 700; }
.mmr-group-head em { padding: 2px 7px; border-radius: 9px; background: var(--app-bg); color: var(--app-muted); font-size: 11.5px; font-style: normal; font-weight: 600; }

/* 卡片：触控目标与点击反馈按手机规范 */
.mmr-card { margin-bottom: 10px; padding: 14px 14px 15px; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); }
.mmr-card.is-open { border-color: var(--mmr-tone); }
.is-tappable { -webkit-tap-highlight-color: transparent; }
.is-tappable:active { background: var(--app-surface-subtle); }
.mmr-q { display: flex; align-items: flex-start; gap: 9px; }
.mmr-q p { flex: 1; min-width: 0; margin: 0; color: var(--app-text); font-size: 14.5px; font-weight: 650; line-height: 1.7; }
.mmr-pri { flex: 0 0 auto; padding: 3px 8px; border-radius: 9px; font-size: 11px; font-weight: 700; }
.mmr-pri.is-a { background: #fee2e2; color: #b42318; }
.mmr-pri.is-b { background: #fef3c7; color: #92400e; }
.mmr-pri.is-c { background: #f1f5f9; color: #64748b; }
.mmr-reveal { margin-top: 11px; padding-top: 11px; border-top: 1px dashed var(--app-border-strong); }
.mmr-a { margin: 0; color: var(--study-text); font-size: 14px; line-height: 1.85; }
.mmr-src { margin: 10px 0 0; color: var(--app-faint); font-size: 12px; }
.mmr-tap { display: block; margin-top: 9px; color: var(--app-primary); font-size: 12.5px; font-weight: 600; }

.mmr-word { display: flex; align-items: center; gap: 10px; padding: 2px 0; border-radius: 8px; }
.mmr-word-left { flex: 1; min-width: 0; display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; }
.mmr-word strong { color: var(--app-text); font-size: 17px; font-weight: 700; }
.mmr-ipa { color: var(--app-muted); font-size: 12.5px; }
.mmr-say { flex: 0 0 44px; width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--app-border-strong); border-radius: 12px; background: var(--app-primary-soft); color: var(--app-primary); -webkit-tap-highlight-color: transparent; }
.mmr-say svg { width: 21px; height: 21px; }
.mmr-say:active { background: #e0eaff; }
.mmr-cn { margin: 11px 0 0; padding-top: 11px; border-top: 1px dashed var(--app-border-strong); color: var(--study-text); font-size: 14px; line-height: 1.8; }

/* 数学卡：公式单独滚动，卡片本身不滚 */
.mmr-card-title { margin: 0 0 9px; color: var(--app-text); font-size: 14.5px; font-weight: 700; }
.mmr-formula { overflow-x: auto; overflow-y: hidden; padding: 6px 0 8px; -webkit-overflow-scrolling: touch; }
.mmr-note { margin: 9px 0 0; color: var(--app-muted); font-size: 13px; line-height: 1.85; }
.mmr-block-label { margin: 12px 0 6px; color: var(--app-primary); font-size: 12px; font-weight: 700; letter-spacing: .02em; }
.mmr-block ul, .mmr-block ol, .mmr-example ol { margin: 0; padding-left: 19px; }
.mmr-block li, .mmr-example li { margin-bottom: 6px; color: var(--study-text); font-size: 13.5px; line-height: 1.85; }
.mmr-example { margin-top: 12px; padding-top: 11px; border-top: 1px dashed var(--app-border-strong); }
.mmr-example-stem { margin: 0 0 7px; color: var(--app-text); font-size: 14px; line-height: 1.85; }
.mmr-example-answer { margin: 9px 0 0; padding: 9px 11px; border-radius: 10px; background: var(--app-primary-soft); color: var(--app-primary); font-size: 13.5px; line-height: 1.8; }

/* 数据表 → 卡片式键值块（手机横滚表格不可用） */
.mmr-table { display: grid; gap: 8px; margin-top: 11px; }
.mmr-trow { padding: 11px 12px; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-surface-subtle); }
.mmr-trow.is-hot { border-color: rgba(40, 184, 148, .45); background: rgba(40, 184, 148, .09); }
.mmr-trow.is-mid { border-color: rgba(249, 115, 22, .32); background: rgba(249, 115, 22, .07); }
.mmr-trow-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; }
.mmr-trow-head strong { color: var(--app-text); font-size: 15.5px; font-weight: 700; }
.mmr-trow-head span { color: var(--app-muted); font-size: 13px; }
.mmr-trow-head em { margin-left: auto; padding: 2px 8px; border-radius: 9px; background: var(--app-surface); color: var(--app-muted); font-size: 11px; font-style: normal; font-weight: 700; }
.mmr-trow.is-hot .mmr-trow-head em { background: #28b894; color: #fff; }
.mmr-tcells { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 10px; margin-top: 9px; }
.mmr-tcells p { display: flex; align-items: baseline; gap: 7px; margin: 0; min-width: 0; }
.mmr-tk { flex: 0 0 auto; color: var(--app-faint); font-size: 11.5px; }
.mmr-tv { min-width: 0; color: var(--study-text); font-size: 13.5px; overflow-x: auto; }
.mmr-notes { margin: 11px 0 0; padding-left: 19px; color: var(--app-muted); font-size: 12.5px; line-height: 1.8; }
.mmr-notes li { margin-bottom: 5px; }

@media (max-width: 370px) {
  .mmr-metrics strong { font-size: 18px; }
  .mmr-card { padding: 12px 11px 13px; }
  .mmr-word strong { font-size: 16px; }
  .mmr-say { flex-basis: 40px; width: 40px; height: 40px; }
  .mmr-tcells { grid-template-columns: 1fr; }
  .mmr-trow-head strong { font-size: 14.5px; }
}
</style>
