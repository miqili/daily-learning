<script setup lang="ts">
/**
 * 考点增补（PC /tradeoff）
 *
 * 页面立场：这是**给学生背的**，不是给记录员看的台账。所以
 *   ① 主体＝按桶分组的背诵卡列表，每条只留「不熟 / 已掌握」两个学习动作；
 *   ② 顶部指标只留学习指标（距考试 / 考点 / 未看 / 不熟 / 已掌握）；
 *   ③ 方案论证数据（题/年损失、可回收、命中率）、补录流程状态流转、编辑删除，
 *      全部收进默认收起的「补录管理」区 —— 它们依然有用，但不该占首屏。
 *
 * 两个维度刻意分开（数据层也是两列）：
 *   - mastery（学习状态）：0 未标记 / 1 不熟 / 2 已掌握 —— 页面主体的主状态
 *   - status（补录流程）：pending / done / verified —— 只在补录管理区出现
 *
 * UI 红线：桶的区分只靠「卡内小色点 + 名称着色」+ --wb-* 令牌，
 * 禁止给 .wb-card 加 border-left 色条。
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import {
  createTradeoffEntry,
  removeTradeoffEntry,
  searchTradeoff,
  updateTradeoffEntry,
  type TradeoffEntry,
  type TradeoffSummary,
} from '@/api/tradeoff';
import { apiError } from '@/api/client';
import AppEmptyState from '@/components/common/AppEmptyState.vue';
import {
  TRADEOFF_BUCKETS,
  TRADEOFF_BUCKET_LABELS,
  TRADEOFF_MASTERY_LABELS,
  TRADEOFF_STATUSES,
  TRADEOFF_STATUS_LABELS,
} from '@shck/shared';
import type { TradeoffBucket, TradeoffMastery, TradeoffStatus } from '@shck/shared';
import {
  DEBUNKED,
  ENTRY_RULES,
  EXAM_DATE,
  EXAM_RULES,
  SCHEDULE,
  STATUS_TONE,
  SZ_WINDOW,
  TRADEOFF_PLAN,
  TRADEOFF_TOTAL,
} from '@/utils/tradeoffPlan';

/** 方案常量覆盖的科目顺序。暂时只有政治。 */
const SUBJECT_ORDER = ['政治'];

/** 学习状态筛选：全部 / 不熟清单 / 已掌握 / 未看 */
const STUDY_MODES = [
  { key: 'all', label: '全部考点' },
  { key: 'unmastered', label: '不熟清单' },
  { key: 'mastered', label: '已掌握' },
  { key: 'unseen', label: '未看' },
] as const;
type StudyMode = (typeof STUDY_MODES)[number]['key'];

const route = useRoute();
const router = useRouter();

const shortName = (name: string) => name.replace(/（一）/g, '一').replace(/\(一\)/g, '一');

const subjects = ref<SubjectInfo[]>([]);
const entries = ref<TradeoffEntry[]>([]);
const allEntries = ref<TradeoffEntry[]>([]);
const summary = ref<TradeoffSummary | null>(null);
const keyword = ref('');
const busy = ref(true);
/** 只有首次加载才用骨架屏。后续筛选若把列表换成骨架屏，DOM 高度会塌陷，
 *  浏览器会把 scrollY 钳到 0 —— 表现就是「一切筛选就跳回顶部」。 */
const firstLoad = ref(true);
const saving = ref(false);
const error = ref('');
const notice = ref('');
const showTactics = ref(false);
const showAdmin = ref(false);
const collapsedGroups = ref<Record<string, boolean>>({});

const subjectOptions = computed(() => {
  const byName = new Map(subjects.value.map((s) => [shortName(s.name), s]));
  return SUBJECT_ORDER.filter((name) => byName.has(name)).map((name) => ({ name, id: byName.get(name)!.id }));
});

const currentName = computed(() => {
  const raw = typeof route.query.subject === 'string' ? route.query.subject : '';
  return subjectOptions.value.some((o) => o.name === raw) ? raw : (subjectOptions.value[0]?.name ?? '政治');
});
const currentId = computed(() => subjectOptions.value.find((o) => o.name === currentName.value)?.id ?? null);

const activeBucket = computed<TradeoffBucket | ''>(() => {
  const raw = typeof route.query.bucket === 'string' ? route.query.bucket : '';
  return (TRADEOFF_BUCKETS as readonly string[]).includes(raw) ? (raw as TradeoffBucket) : '';
});

const studyMode = computed<StudyMode>(() => {
  if (route.query.unmastered === '1') return 'unmastered';
  const raw = typeof route.query.mastery === 'string' ? route.query.mastery : '';
  if (raw === '2') return 'mastered';
  if (raw === '0') return 'unseen';
  return 'all';
});

// —— 倒计时 ——
const daysToExam = (() => {
  const exam = new Date(`${EXAM_DATE}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((exam.getTime() - today.getTime()) / 86_400_000));
})();

const today = (() => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();

// —— 学习指标（页面主体只读这些）——
const masteryStat = computed(() => summary.value?.byMastery ?? { unseen: 0, weak: 0, mastered: 0 });
const masteredRate = computed(() => {
  const total = summary.value?.total ?? 0;
  if (!total) return 0;
  return Math.round((masteryStat.value.mastered / total) * 100);
});

/** 按桶分组的背诵卡。组内保持接口返回顺序（桶内 sort_order 逻辑序）。 */
const groups = computed(() =>
  TRADEOFF_BUCKETS.filter((bucket) => !activeBucket.value || activeBucket.value === bucket).map((bucket) => {
    const list = entries.value.filter((e) => e.bucket === bucket);
    return {
      bucket,
      list,
      weak: list.filter((e) => e.mastery === 1).length,
      mastered: list.filter((e) => e.mastery === 2).length,
    };
  }).filter((g) => g.list.length > 0),
);

const groupStat = (bucket: TradeoffBucket) => summary.value?.byBucket?.[bucket] ?? null;

// —— 取数 ——
function studyParams(subjectId: number, withStudyFilter: boolean) {
  return {
    subject_id: subjectId,
    bucket: withStudyFilter ? activeBucket.value || undefined : undefined,
    unmastered: withStudyFilter && studyMode.value === 'unmastered' ? ('1' as const) : undefined,
    mastery:
      withStudyFilter && studyMode.value === 'mastered'
        ? ('2' as const)
        : withStudyFilter && studyMode.value === 'unseen'
          ? ('0' as const)
          : undefined,
    keyword: keyword.value.trim() || undefined,
    limit: 1000,
  };
}

async function load() {
  if (!currentId.value) return;
  busy.value = true;
  error.value = '';
  try {
    const [filtered, all] = await Promise.all([
      searchTradeoff(studyParams(currentId.value, true)),
      searchTradeoff(studyParams(currentId.value, false)),
    ]);
    entries.value = filtered.list;
    summary.value = filtered.summary;
    allEntries.value = all.list;
  } catch (e) {
    error.value = apiError(e);
  } finally {
    busy.value = false;
    firstLoad.value = false;
  }
}

function patchQuery(patch: Record<string, string | undefined>) {
  const next = { ...route.query } as Record<string, string | undefined>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === '') delete next[key];
    else next[key] = value;
  }
  router.replace({ query: next });
}

function setStudyMode(mode: StudyMode) {
  // 三种筛选互斥，切换时先把另两个清掉
  patchQuery({
    unmastered: mode === 'unmastered' ? '1' : undefined,
    mastery: mode === 'mastered' ? '2' : mode === 'unseen' ? '0' : undefined,
  });
}

onMounted(async () => {
  try {
    subjects.value = await listSubjects();
  } catch {
    subjects.value = [];
  }
  await load();
});

watch(
  () => [currentId.value, activeBucket.value, studyMode.value],
  () => load(),
);

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(keyword, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(load, 260);
});

// —— 学习动作：只有「不熟 / 已掌握」，再点一次回到未标记 ——
async function setMastery(entry: TradeoffEntry, level: 1 | 2) {
  const next: TradeoffMastery = entry.mastery === level ? 0 : level;
  try {
    await updateTradeoffEntry(entry.id, { mastery: next });
    await load();
  } catch (e) {
    error.value = apiError(e);
  }
}

function toggleGroup(bucket: TradeoffBucket) {
  collapsedGroups.value = { ...collapsedGroups.value, [bucket]: !collapsedGroups.value[bucket] };
}

// —— 补录管理区：状态流转 / 编辑 / 删除 ——
interface DraftForm {
  id: number | null;
  bucket: TradeoffBucket;
  entry_date: string;
  title: string;
  content: string;
  source: string;
  keywords: string;
  status: TradeoffStatus;
}

const draft = ref<DraftForm | null>(null);

function openCreate(bucket: TradeoffBucket = 'xigai') {
  notice.value = '';
  draft.value = {
    id: null,
    bucket,
    entry_date: today,
    title: '',
    content: '',
    source: '',
    keywords: '',
    status: 'done',
  };
}

function openEdit(entry: TradeoffEntry) {
  notice.value = '';
  draft.value = {
    id: entry.id,
    bucket: entry.bucket,
    entry_date: entry.entry_date,
    title: entry.title,
    content: entry.content,
    source: entry.source ?? '',
    keywords: entry.keywords.join(','),
    status: entry.status,
  };
}

function closeDraft() {
  draft.value = null;
}

async function saveDraft() {
  const form = draft.value;
  if (!form || !currentId.value) return;
  if (!form.title.trim()) {
    error.value = '请填写标题。';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      bucket: form.bucket,
      entry_date: form.entry_date,
      title: form.title.trim(),
      content: form.content,
      source: form.source.trim() || null,
      keywords: form.keywords.trim() || null,
      status: form.status,
    };
    if (form.id) {
      await updateTradeoffEntry(form.id, payload);
    } else {
      await createTradeoffEntry({ ...payload, subject_id: currentId.value });
    }
    draft.value = null;
    notice.value = '已保存。';
    await load();
  } catch (e) {
    error.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

/** 补录流程状态流转：pending → done → verified → pending */
async function cycleStatus(entry: TradeoffEntry) {
  const next: TradeoffStatus =
    entry.status === 'pending' ? 'done' : entry.status === 'done' ? 'verified' : 'pending';
  try {
    await updateTradeoffEntry(entry.id, { status: next });
    await load();
  } catch (e) {
    error.value = apiError(e);
  }
}

async function removeEntry(entry: TradeoffEntry) {
  if (!window.confirm(`确定删除「${entry.title}」？该操作不可撤销。`)) return;
  try {
    await removeTradeoffEntry(entry.id);
    notice.value = '已删除。';
    await load();
  } catch (e) {
    error.value = apiError(e);
  }
}

const fmtDate = (value: string) => value.replace(/^\d{2}(\d{2})-(\d{2})-(\d{2})$/, '$1/$2/$3');

const STATE_TONE: Record<TradeoffMastery, string> = { 0: 'is-ink', 1: 'is-warn', 2: 'is-ok' };
</script>

<template>
  <div class="wb-page tradeoff-page">
    <header class="wb-head">
      <div>
        <span class="wb-eyebrow"><i />必背清单之外 · {{ currentName }}</span>
        <h1 class="wb-title">考点增补</h1>
        <p class="wb-desc">
          必背考点清单管「考过、教材里有」的；这一页管「清单没覆盖、但还会考」的那部分 ——
          实测客观题 35 题里每年约 12 题落在这里。按桶分组逐条背诵，背不下来的标「不熟」，
          考前一天只看不熟清单。
        </p>
      </div>
      <div class="wb-head-actions">
        <label class="wb-search">
          <span aria-hidden="true">⌕</span>
          <input v-model="keyword" type="search" placeholder="搜索标题、正文、关键词…" aria-label="搜索考点" />
        </label>
        <div class="wb-seg" role="tablist" aria-label="科目">
          <button
            v-for="option in subjectOptions"
            :key="option.id"
            type="button"
            class="wb-seg-item"
            :class="{ 'is-active': option.name === currentName }"
            role="tab"
            :aria-selected="option.name === currentName"
            :style="{ '--seg-tone': TRADEOFF_PLAN.xigai.tone }"
            @click="patchQuery({ subject: option.name })"
          >
            <i />{{ option.name }}<em>{{ summary?.total ?? 0 }}</em>
          </button>
        </div>
        <button type="button" class="wb-btn" @click="showAdmin = !showAdmin">
          {{ showAdmin ? '收起管理' : '补录管理' }}
        </button>
      </div>
    </header>

    <dl class="wb-metrics">
      <div><dt>距考试</dt><dd>{{ daysToExam }}<small>天</small></dd></div>
      <div><dt>考点</dt><dd>{{ summary?.total ?? 0 }}<small>条</small></dd></div>
      <div><dt>未看</dt><dd>{{ masteryStat.unseen }}<small>条</small></dd></div>
      <div><dt>不熟</dt><dd>{{ masteryStat.weak }}<small>条</small></dd></div>
      <div><dt>已掌握</dt><dd>{{ masteryStat.mastered }}<small>条</small></dd></div>
    </dl>

    <div class="tp-progress">
      <div class="wb-progress"><i class="wb-progress-value" :style="{ width: masteredRate + '%' }" /></div>
      <span>已掌握 {{ masteryStat.mastered }} / {{ summary?.total ?? 0 }} · {{ masteredRate }}%</span>
    </div>

    <p v-if="error" class="wb-alert">{{ error }}</p>
    <p v-if="notice" class="wb-notice">{{ notice }}</p>

    <div class="tp-filters">
      <div class="wb-seg" role="tablist" aria-label="学习状态">
        <button
          v-for="mode in STUDY_MODES"
          :key="mode.key"
          type="button"
          class="wb-seg-item"
          :class="{ 'is-active': studyMode === mode.key }"
          role="tab"
          :aria-selected="studyMode === mode.key"
          @click="setStudyMode(mode.key)"
        >
          {{ mode.label }}<em v-if="mode.key === 'unmastered'">{{ summary?.unmastered ?? 0 }}</em>
        </button>
      </div>
      <div class="wb-seg" role="tablist" aria-label="桶">
        <button type="button" class="wb-seg-item" :class="{ 'is-active': !activeBucket }" @click="patchQuery({ bucket: undefined })">
          全部桶
        </button>
        <button
          v-for="bucket in TRADEOFF_BUCKETS"
          :key="bucket"
          type="button"
          class="wb-seg-item"
          :class="{ 'is-active': activeBucket === bucket }"
          :style="{ '--seg-tone': TRADEOFF_PLAN[bucket].tone }"
          @click="patchQuery({ bucket })"
        >
          <i />{{ TRADEOFF_BUCKET_LABELS[bucket] }}
        </button>
      </div>
      <p v-if="studyMode === 'unmastered'" class="tp-hint">
        不熟清单＝「未看」＋「不熟」，共 {{ summary?.unmastered ?? 0 }} 条；考前一天只看这一份。
      </p>
      <p v-else-if="studyMode === 'unseen'" class="tp-hint">还有 {{ masteryStat.unseen }} 条没看过。</p>
      <p v-else-if="studyMode === 'mastered'" class="tp-hint">
        已掌握 {{ masteryStat.mastered }} 条，可以只做偶尔回看。
      </p>
    </div>

    <div v-if="busy && firstLoad" class="wb-skeleton" aria-busy="true"><span /><span /><span /></div>

    <AppEmptyState
      v-else-if="!busy && !groups.length"
      :title="studyMode === 'all' ? '这一桶还没有考点' : '这个状态下没有条目'"
      :description="
        studyMode === 'all'
          ? '按桶收录官方原文中的新提法与新事件。点右上「补录管理」可以新增。'
          : '换个筛选看看，或把还没背下来的标成「不熟」。'
      "
    />

    <section v-else class="tp-groups" :class="{ 'is-refreshing': busy }">
      <article v-for="group in groups" :key="group.bucket" class="wb-card tp-group">
        <button
          type="button"
          class="tp-group-head"
          :aria-expanded="!collapsedGroups[group.bucket]"
          @click="toggleGroup(group.bucket)"
        >
          <span class="tp-group-name" :style="{ '--tone': TRADEOFF_PLAN[group.bucket].tone }">
            {{ TRADEOFF_BUCKET_LABELS[group.bucket] }}
          </span>
          <span class="tp-group-count">{{ group.list.length }} 条</span>
          <span v-if="group.weak" class="wb-tag is-warn is-plain">不熟 {{ group.weak }}</span>
          <span v-if="group.mastered" class="wb-tag is-ok is-plain">已掌握 {{ group.mastered }}</span>
          <span class="tp-group-when">{{ TRADEOFF_PLAN[group.bucket].window }}</span>
          <svg class="tp-chev" :class="{ 'is-open': !collapsedGroups[group.bucket] }" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div v-show="!collapsedGroups[group.bucket]" class="tp-items">
          <article v-for="entry in group.list" :key="entry.id" class="tp-item">
            <div class="tp-item-head">
              <h3 class="tp-item-title">{{ entry.title }}</h3>
              <span class="wb-tag is-plain" :class="STATE_TONE[entry.mastery]">
                {{ TRADEOFF_MASTERY_LABELS[entry.mastery] }}
              </span>
            </div>
            <p class="tp-item-body">{{ entry.content }}</p>
            <p v-if="entry.source" class="tp-item-source">出处：{{ entry.source }}</p>
            <div class="tp-item-foot">
              <div class="tp-item-kw">
                <span v-for="kw in entry.keywords" :key="kw" class="wb-tag is-plain">{{ kw }}</span>
              </div>
              <div class="tp-item-actions">
                <button
                  type="button"
                  class="wb-btn is-sm tp-btn-weak"
                  :class="{ 'is-on': entry.mastery === 1 }"
                  :aria-pressed="entry.mastery === 1"
                  @click="setMastery(entry, 1)"
                >
                  不熟
                </button>
                <button
                  type="button"
                  class="wb-btn is-sm tp-btn-done"
                  :class="{ 'is-on': entry.mastery === 2 }"
                  :aria-pressed="entry.mastery === 2"
                  @click="setMastery(entry, 2)"
                >
                  已掌握
                </button>
              </div>
            </div>
          </article>
        </div>
      </article>
    </section>

    <div class="wb-card wb-card-pad tp-collapse">
      <button type="button" class="tp-collapse-head" :aria-expanded="showTactics" @click="showTactics = !showTactics">
        <div>
          <h2>考场技巧与 25 天日程</h2>
          <p>排除法用完后仍不确定时按顺序执行 · 4 条规则 + 5 条被否掉的「常识技巧」+ 阶段日程</p>
        </div>
        <svg class="tp-chev" :class="{ 'is-open': showTactics }" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div v-if="showTactics" class="tp-collapse-body">
        <div class="tp-block">
          <h3>考场残余题处理规则</h3>
          <ol class="tp-rules">
            <li v-for="rule in EXAM_RULES" :key="rule.no">
              <span class="tp-rule-no">{{ rule.no }}</span>
              <div>
                <p class="tp-rule-t">{{ rule.title }}</p>
                <p class="tp-rule-d">{{ rule.detail }}</p>
                <span v-if="rule.evidence" class="wb-tag is-ok is-plain">{{ rule.evidence }}</span>
              </div>
            </li>
          </ol>
        </div>

        <div class="tp-block">
          <h3>被实测否掉的「常识技巧」</h3>
          <p class="tp-block-lead">这些口诀在本题库上全部无效，记它们等于负收益。</p>
          <table class="tp-table">
            <thead><tr><th>常见口诀</th><th>实测结果</th><th>判定</th></tr></thead>
            <tbody>
              <tr v-for="item in DEBUNKED" :key="item.claim">
                <td>{{ item.claim }}</td>
                <td>{{ item.result }}</td>
                <td><span class="wb-tag is-danger is-plain">{{ item.verdict }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="tp-block">
          <h3>25 天日程</h3>
          <div class="tp-timeline">
            <article v-for="stage in SCHEDULE" :key="stage.phase" class="tp-stage">
              <header>
                <b>{{ stage.phase }}</b><span>{{ stage.range }}</span><em>{{ stage.days }} 天</em>
              </header>
              <p class="tp-stage-lead">{{ stage.lead }}</p>
              <ul>
                <li v-for="task in stage.tasks" :key="task">{{ task }}</li>
              </ul>
            </article>
          </div>
        </div>
      </div>
    </div>

    <section v-if="showAdmin" class="tp-admin">
      <div class="wb-card wb-card-pad">
        <div class="wb-card-head">
          <h2>补录管理</h2>
          <p>内容录入进度与流程状态 · 页面主体只呈现学习状态</p>
        </div>
        <div class="tp-admin-tools">
          <button type="button" class="wb-btn is-primary" @click="openCreate()">＋ 增补一条</button>
          <span class="tp-admin-note">补录口径：正文只放要背的内容，出处必须可回溯；时政窗口按考纲 {{ SZ_WINDOW }}。</span>
        </div>

        <table class="tp-table">
          <thead>
            <tr><th>桶</th><th>条数</th><th>题/年损失</th><th>可回收</th><th>折合分</th><th>流程状态</th><th>最近补录</th></tr>
          </thead>
          <tbody>
            <tr v-for="bucket in TRADEOFF_BUCKETS" :key="bucket">
              <td>
                <span class="tp-mini-name" :style="{ '--tone': TRADEOFF_PLAN[bucket].tone }">
                  {{ TRADEOFF_BUCKET_LABELS[bucket] }}
                </span>
              </td>
              <td>{{ groupStat(bucket)?.total ?? 0 }}</td>
              <td>{{ TRADEOFF_PLAN[bucket].loss }} 题</td>
              <td>{{ TRADEOFF_PLAN[bucket].recover }} 题</td>
              <td>+{{ TRADEOFF_PLAN[bucket].points }}</td>
              <td>
                <span class="wb-tag is-ok is-plain" v-if="groupStat(bucket)?.done">已录入 {{ groupStat(bucket)?.done }}</span>
                <span class="wb-tag is-warn is-plain" v-if="groupStat(bucket)?.pending">待补 {{ groupStat(bucket)?.pending }}</span>
                <span class="wb-tag is-info is-plain" v-if="groupStat(bucket)?.verified">已复核 {{ groupStat(bucket)?.verified }}</span>
                <span v-if="!groupStat(bucket)?.total" class="tp-muted">—</span>
              </td>
              <td>{{ groupStat(bucket)?.lastEntryDate ? fmtDate(groupStat(bucket)?.lastEntryDate ?? '') : '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p class="tp-admin-lead">
          合计：每年盲区 {{ TRADEOFF_TOTAL.loss }} 题 / {{ TRADEOFF_TOTAL.loss * 2 }} 分，
          本方案可回收 {{ TRADEOFF_TOTAL.recover }} 题 / +{{ TRADEOFF_TOTAL.points }} 分，
          客观题命中 {{ TRADEOFF_TOTAL.hitFrom }} → {{ TRADEOFF_TOTAL.hitTo }} 题。
        </p>
      </div>

      <div class="wb-card wb-card-pad">
        <div class="wb-card-head">
          <h2>条目管理</h2>
          <p>{{ allEntries.length }} 条 · 点状态标签可流转，右侧可编辑 / 删除</p>
        </div>
        <div class="tp-manage-list">
          <article v-for="entry in allEntries" :key="entry.id" class="tp-manage-row">
            <span class="tp-mini-name" :style="{ '--tone': TRADEOFF_PLAN[entry.bucket]?.tone }">
              {{ TRADEOFF_BUCKET_LABELS[entry.bucket] ?? entry.bucket }}
            </span>
            <span class="tp-manage-title">{{ entry.title }}</span>
            <span class="tp-manage-date">{{ fmtDate(entry.entry_date) }}<template v-if="entry.entry_date === today">（今天）</template></span>
            <button
              type="button"
              class="wb-tag"
              :class="STATUS_TONE[entry.status]"
              :title="`点击流转为${TRADEOFF_STATUS_LABELS[entry.status === 'pending' ? 'done' : entry.status === 'done' ? 'verified' : 'pending']}`"
              @click="cycleStatus(entry)"
            >
              {{ TRADEOFF_STATUS_LABELS[entry.status] }}
            </button>
            <span class="tp-manage-actions">
              <button type="button" class="wb-btn is-sm" @click="openEdit(entry)">编辑</button>
              <button type="button" class="wb-btn is-sm is-danger" @click="removeEntry(entry)">删除</button>
            </span>
          </article>
        </div>
      </div>

      <div class="wb-card wb-card-pad">
        <div class="wb-card-head">
          <h2>补录口径</h2>
          <p>方法论放这里，不写回条目正文</p>
        </div>
        <ol class="tp-rules">
          <li v-for="rule in ENTRY_RULES" :key="rule.no">
            <span class="tp-rule-no">{{ rule.no }}</span>
            <div>
              <p class="tp-rule-t">{{ rule.title }}</p>
              <p class="tp-rule-d">{{ rule.detail }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <div v-if="draft" class="tp-draft-backdrop" @click.self="closeDraft">
      <div class="wb-card tp-draft" role="dialog" aria-modal="true" aria-label="条目表单">
        <div class="wb-card-head">
          <h2>{{ draft.id ? '编辑条目' : '增补一条' }}</h2>
          <p>正文写「要背的内容」；出处必须可回溯，不允许写「网上」</p>
        </div>
        <div class="tp-draft-grid">
          <label class="wb-field">
            <span class="wb-label">所属桶</span>
            <select v-model="draft.bucket" class="wb-select">
              <option v-for="bucket in TRADEOFF_BUCKETS" :key="bucket" :value="bucket">
                {{ TRADEOFF_BUCKET_LABELS[bucket] }}
              </option>
            </select>
          </label>
          <label class="wb-field">
            <span class="wb-label">日期</span>
            <input v-model="draft.entry_date" type="date" class="wb-input" />
          </label>
          <label class="wb-field">
            <span class="wb-label">流程状态</span>
            <select v-model="draft.status" class="wb-select">
              <option v-for="status in TRADEOFF_STATUSES" :key="status" :value="status">
                {{ TRADEOFF_STATUS_LABELS[status] }}
              </option>
            </select>
          </label>
        </div>
        <label class="wb-field">
          <span class="wb-label">标题</span>
          <input v-model="draft.title" type="text" class="wb-input" maxlength="200" placeholder="如：经济：中央经济工作会议定调与十五五三项硬指标" />
        </label>
        <label class="wb-field">
          <span class="wb-label">正文（要背的内容）</span>
          <textarea v-model="draft.content" class="wb-textarea" rows="7" placeholder="原文一句话 + 关键要素（时间 / 主体 / 唯一性定语 / 数值）" />
        </label>
        <div class="tp-draft-grid">
          <label class="wb-field">
            <span class="wb-label">出处</span>
            <input v-model="draft.source" type="text" class="wb-input" maxlength="300" placeholder="新华社 2025-09-01 / 会议公报全文" />
          </label>
          <label class="wb-field">
            <span class="wb-label">关键词（英文逗号分隔）</span>
            <input v-model="draft.keywords" type="text" class="wb-input" maxlength="300" placeholder="上合组织,全球治理倡议" />
          </label>
        </div>
        <div class="tp-draft-actions">
          <button type="button" class="wb-btn" @click="closeDraft">取消</button>
          <button type="button" class="wb-btn is-primary" :disabled="saving" @click="saveDraft">
            <span v-if="saving" class="wb-spin" />{{ saving ? '保存中' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tradeoff-page { display: grid; gap: 18px; align-content: start; }
.tradeoff-page .wb-head { margin-bottom: 0; }
.tradeoff-page > .wb-metrics { border-top: 0; }

/* 掌握进度条 */
.tp-progress { display: flex; align-items: center; gap: 12px; margin-top: -6px; }
.tp-progress .wb-progress { flex: 1; max-width: 420px; }
.tp-progress span { color: var(--wb-faint); font-size: 12px; font-variant-numeric: tabular-nums; }

/* 筛选条 */
.tp-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.tp-hint { margin: 0; color: var(--wb-brand-deep); font-size: 12.5px; }

/* ── 主体：按桶分组的背诵卡 ── */
.tp-groups { display: grid; gap: 14px; transition: opacity var(--wb-dur) var(--wb-ease); }
/* 重新取数时只降透明度、不卸载列表：保住 DOM 高度，滚动位置才不会被打回顶部 */
.tp-groups.is-refreshing { opacity: .55; }
.tp-group { overflow: hidden; }
.tp-group-head {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 13px 16px;
  border: 0;
  background: var(--wb-surface-2);
  text-align: left;
  cursor: pointer;
  transition: background var(--wb-dur) var(--wb-ease);
}
.tp-group-head:hover { background: var(--wb-surface-3); }
.tp-group-name { display: inline-flex; align-items: center; gap: 8px; color: var(--tone); font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
.tp-group-name::before { flex: 0 0 auto; width: 9px; height: 9px; border-radius: 50%; background: var(--tone); content: ""; }
.tp-group-count { color: var(--wb-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.tp-group-when { margin-left: auto; color: var(--wb-faint); font-size: 11.5px; }
.tp-chev { flex: 0 0 auto; width: 16px; height: 16px; fill: none; stroke: var(--wb-faint); stroke-width: 2; stroke-linecap: round; transition: transform var(--wb-dur) var(--wb-ease); }
.tp-chev.is-open { transform: rotate(180deg); }

.tp-items { display: grid; }
.tp-item { display: grid; gap: 8px; padding: 15px 16px; border-top: 1px solid var(--wb-line-soft); }
.tp-item-head { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
.tp-item-title { flex: 1; min-width: 200px; margin: 0; color: var(--wb-ink); font-size: 14.5px; font-weight: 650; line-height: 1.5; }
.tp-item-head .wb-tag { flex: 0 0 auto; }
.tp-item-body { margin: 0; color: var(--wb-ink-2); font-size: 13.5px; line-height: 1.85; white-space: pre-wrap; }
.tp-item-source { margin: 0; color: var(--wb-faint); font-size: 11.5px; }
.tp-item-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
.tp-item-kw { display: flex; flex-wrap: wrap; gap: 6px; }
.tp-item-actions { display: flex; gap: 6px; margin-left: auto; }
.tp-btn-weak.is-on { border-color: var(--wb-warn); background: var(--wb-warn-soft); color: var(--wb-warn-ink); }
.tp-btn-done.is-on { border-color: var(--wb-brand); background: var(--wb-brand-soft); color: var(--wb-brand-deep); }

/* ── 折叠区通用 ── */
.tp-collapse { padding: 0; overflow: hidden; }
.tp-collapse-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 17px 20px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.tp-collapse-head h2 { margin: 0; color: var(--wb-ink); font-size: 16px; font-weight: 680; letter-spacing: -.015em; }
.tp-collapse-head p { margin: 5px 0 0; color: var(--wb-faint); font-size: 12px; }
.tp-collapse-body { display: grid; gap: 20px; padding: 0 20px 20px; }
.tp-block h3 { margin: 0 0 10px; color: var(--wb-ink); font-size: 14px; font-weight: 650; }
.tp-block-lead { margin: 0 0 10px; color: var(--wb-faint); font-size: 12px; }

.tp-rules { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.tp-rules li { display: flex; gap: 12px; align-items: flex-start; }
.tp-rule-no { display: grid; place-items: center; flex: 0 0 24px; width: 24px; height: 24px; border-radius: 50%; background: var(--wb-ink); color: #fff; font-size: 12px; font-weight: 700; }
.tp-rule-t { margin: 0; color: var(--wb-ink); font-size: 13.5px; font-weight: 650; line-height: 1.6; }
.tp-rule-d { margin: 3px 0 5px; color: var(--wb-ink-2); font-size: 12.5px; line-height: 1.7; }

.tp-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.tp-table th, .tp-table td { padding: 8px 10px; border-bottom: 1px solid var(--wb-line-soft); text-align: left; vertical-align: top; }
.tp-table th { color: var(--wb-faint); font-size: 12px; font-weight: 600; }
.tp-table td:first-child { color: var(--wb-ink-2); white-space: nowrap; }

.tp-timeline { display: grid; gap: 14px; }
.tp-stage { padding: 12px 14px; border-left: 3px solid var(--wb-brand); border-radius: 0 var(--wb-radius) var(--wb-radius) 0; background: var(--wb-surface-2); }
.tp-stage header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 9px; }
.tp-stage header b { color: var(--wb-ink); font-size: 14px; font-weight: 700; }
.tp-stage header span { color: var(--wb-muted); font-size: 12.5px; font-variant-numeric: tabular-nums; }
.tp-stage header em { color: var(--wb-brand-deep); font-size: 11.5px; font-style: normal; font-weight: 600; }
.tp-stage-lead { margin: 5px 0 6px; color: var(--wb-ink-2); font-size: 12.5px; font-weight: 600; }
.tp-stage ul { margin: 0; padding-left: 18px; color: var(--wb-ink-2); font-size: 12.5px; line-height: 1.75; }
.tp-stage li { margin: 3px 0; }

/* ── 补录管理 ── */
.tp-admin { display: grid; gap: 14px; }
.tp-admin-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 14px; }
.tp-admin-note { color: var(--wb-faint); font-size: 12px; }
.tp-admin-lead { margin: 12px 0 0; color: var(--wb-muted); font-size: 12.5px; line-height: 1.7; }
.tp-muted { color: var(--wb-faint); }

.tp-mini-name { display: inline-flex; align-items: center; gap: 6px; color: var(--tone); font-size: 12px; font-weight: 700; }
.tp-mini-name::before { flex: 0 0 auto; width: 6px; height: 6px; border-radius: 50%; background: var(--tone); content: ""; }

.tp-manage-list { display: grid; }
.tp-manage-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 9px 2px;
  border-bottom: 1px solid var(--wb-line-soft);
}
.tp-manage-row:last-child { border-bottom: 0; }
.tp-manage-title { flex: 1; min-width: 220px; color: var(--wb-ink); font-size: 13px; }
.tp-manage-date { color: var(--wb-faint); font-size: 11.5px; font-variant-numeric: tabular-nums; }
.tp-manage-row .wb-tag { border: 0; font-family: inherit; cursor: pointer; }
.tp-manage-actions { display: flex; gap: 6px; }

/* ── 表单 ── */
.tp-draft-backdrop { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; padding: 24px; background: rgba(25, 26, 35, .42); }
.tp-draft { display: grid; gap: 13px; width: min(720px, 100%); max-height: 86vh; overflow-y: auto; padding: 20px 22px; }
.tp-draft-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
.tp-draft-grid:first-of-type { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.tp-draft-actions { display: flex; justify-content: flex-end; gap: 9px; }

@media (max-width: 1180px) {
  .tp-group-when { margin-left: 0; }
}
@media (max-width: 760px) {
  .tp-draft-grid, .tp-draft-grid:first-of-type { grid-template-columns: minmax(0, 1fr); }
  .tradeoff-page .wb-head-actions { width: 100%; }
  .tp-item-actions { margin-left: 0; }
  .tp-table { font-size: 12px; }
}
</style>
