<script setup lang="ts">
/**
 * 错题本（移动端）—— 与 PC 的 MistakesView 完全分离，不共用页面。
 *
 * PC 是「概览条 + 到期复习 + 录入表单 + 全部错题」四段纵向平铺；
 * 手机上改成「分段切换（待复习 / 全部）+ 底部弹层录入」，列表走卡片流 + 右滑删除。
 *
 * 手机适配要点：
 *   1. 分段、筛选胶囊、按钮全部复用 main.css 的 .study-* 全局类（44px 触控、全局令牌）
 *      不另造 .mm-filter / .mm-btn，避免和移动端既有视觉脱节
 *   2. 删除走 van-swipe-cell 右滑，比右上角 28px 的删除按钮好按
 *   3. 颜色一律用 --app-* 令牌，不写裸 hex
 *
 * 数据接口与 PC 完全一致（api/mistakes），错因字典共用 ERROR_REASON_LABELS，
 * 两端录入的错题可互通复习。
 */
import { computed, onMounted, ref } from 'vue';
import { showConfirmDialog, showSuccessToast, showToast } from 'vant';
import { apiError } from '@/api/client';
import {
  ERROR_REASON_LABELS, createMistake, deleteMistake, getReviewQueue, listMistakes, reviewMistake,
  type CreateMistakeInput, type Mistake,
} from '@/api/mistakes';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import MobilePageHeader from '@/components/mobile/MobilePageHeader.vue';

const tab = ref(0);
const subjects = ref<SubjectInfo[]>([]);
const queue = ref<Mistake[]>([]);
const list = ref<Mistake[]>([]);
const busy = ref(true);
const error = ref('');

const filter = ref({ subject_id: undefined as number | undefined, error_reason: '' });
const keyword = ref('');

/** 录入弹层 */
const showForm = ref(false);
const showSubjectPicker = ref(false);
const showReasonPicker = ref(false);
const form = ref<CreateMistakeInput>({
  title: '', content: '', correct_answer: '', user_answer: '', error_reason: 'CONCEPT', subject_id: undefined, source: '',
});

const reasonKeys = Object.keys(ERROR_REASON_LABELS);
const reasonColumns = reasonKeys.map((key) => ({ text: ERROR_REASON_LABELS[key], value: key }));
const subjectColumns = computed(() => [
  { text: '未分类', value: 0 },
  ...subjects.value.map((s) => ({ text: s.name, value: s.id })),
]);

const masteredCount = computed(() => list.value.filter((item) => item.mastery_level >= 4).length);
const learningCount = computed(() => list.value.filter((item) => item.mastery_level > 0 && item.mastery_level < 4).length);

const filteredList = computed(() => {
  const needle = keyword.value.trim().toLowerCase();
  if (!needle) return list.value;
  return list.value.filter((item) =>
    `${item.title} ${item.content}`.toLowerCase().includes(needle),
  );
});

const currentSubjectName = computed(
  () => subjects.value.find((s) => s.id === form.value.subject_id)?.name ?? '未分类',
);

async function loadList() {
  list.value = await listMistakes({
    subject_id: filter.value.subject_id,
    error_reason: filter.value.error_reason || undefined,
    keyword: keyword.value.trim() || undefined,
  });
}

async function loadAll() {
  error.value = '';
  busy.value = true;
  try {
    if (!subjects.value.length) subjects.value = await listSubjects();
    const q = await getReviewQueue();
    queue.value = q.list;
    await loadList();
  } catch (cause) {
    error.value = apiError(cause);
  } finally {
    busy.value = false;
  }
}

async function reloadListOnly() {
  error.value = '';
  try {
    await loadList();
  } catch (cause) {
    error.value = apiError(cause);
  }
}

async function doReview(mistake: Mistake, correct: boolean) {
  error.value = '';
  try {
    await reviewMistake(mistake.id, correct);
    showToast(correct ? '已标记为掌握' : '已安排再次复习');
    await loadAll();
  } catch (cause) {
    showToast(apiError(cause));
  }
}

async function removeMistake(mistake: Mistake) {
  try {
    await showConfirmDialog({ title: '删除错题', message: `确定删除「${mistake.title}」？` });
  } catch {
    return;
  }
  try {
    await deleteMistake(mistake.id);
    showSuccessToast('已删除');
    await loadAll();
  } catch (cause) {
    showToast(apiError(cause));
  }
}

function openForm() {
  form.value = { title: '', content: '', correct_answer: '', user_answer: '', error_reason: 'CONCEPT', subject_id: undefined, source: '' };
  showForm.value = true;
}

async function submitForm() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    showToast('请填写标题和题目内容');
    return;
  }
  try {
    await createMistake({
      ...form.value,
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      subject_id: form.value.subject_id || undefined,
    });
    showSuccessToast('已录入错题');
    showForm.value = false;
    await loadAll();
  } catch (cause) {
    showToast(apiError(cause));
  }
}

function onPickSubject({ selectedOptions }: { selectedOptions: Array<{ text: string; value: number }> }) {
  const value = selectedOptions[0]?.value ?? 0;
  form.value.subject_id = value || undefined;
  showSubjectPicker.value = false;
}

function onPickReason({ selectedOptions }: { selectedOptions: Array<{ text: string; value: string }> }) {
  const value = selectedOptions[0]?.value;
  if (value) form.value.error_reason = value;
  showReasonPicker.value = false;
}

function levelTone(mistake: Mistake): string {
  if (mistake.mastery_level >= 4) return 'is-mastered';
  if (mistake.mastery_level > 0) return 'is-learning';
  return 'is-new';
}

onMounted(loadAll);
</script>

<template>
  <main class="study-page mm-page">
    <div class="study-screen">
      <MobilePageHeader title="错题本" eyebrow="复习工作区" back action-label="录入" @action="openForm" />

      <section class="mm-summary" aria-label="错题概览">
        <div><strong>{{ queue.length }}</strong><span>今日待复习</span></div>
        <div><strong>{{ learningCount }}</strong><span>掌握中</span></div>
        <div><strong>{{ masteredCount }}</strong><span>已掌握</span></div>
      </section>

      <div class="study-segmented">
        <button :class="{ active: tab === 0 }" @click="tab = 0">待复习<em>{{ queue.length }}</em></button>
        <button :class="{ active: tab === 1 }" @click="tab = 1">全部错题<em>{{ list.length }}</em></button>
      </div>

      <p v-if="error" class="study-error">{{ error }}</p>
      <div v-else-if="busy && !queue.length && !list.length" class="mm-loading"><van-loading size="22">正在整理错题…</van-loading></div>

      <!-- 待复习：右滑可删除 -->
      <template v-else-if="tab === 0">
        <div v-if="queue.length" class="mm-list">
          <van-swipe-cell v-for="item in queue" :key="item.id">
            <article class="mm-card is-due">
              <div class="mm-meta">
                <span v-if="item.subject" class="mm-subject" :style="{ background: `${item.subject.color}1a`, color: item.subject.color }">
                  {{ item.subject.name }}
                </span>
                <span class="mm-level" :class="levelTone(item)">L{{ item.mastery_level }}</span>
                <span class="mm-reason">{{ ERROR_REASON_LABELS[item.error_reason] ?? item.error_reason }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p class="mm-content">{{ item.content }}</p>
              <div class="mm-actions">
                <button class="study-secondary" @click="doReview(item, false)">还不会</button>
                <button class="study-primary" @click="doReview(item, true)">已掌握</button>
              </div>
            </article>
            <template #right>
              <button class="mm-swipe-del" @click="removeMistake(item)">删除</button>
            </template>
          </van-swipe-cell>
        </div>
        <div v-else class="study-empty">
          今天没有到期错题。<br>去真题页做一套，错的题可以一键收进这里。
        </div>
      </template>

      <!-- 全部错题 -->
      <template v-else>
        <div class="study-filter-row">
          <button
            class="study-filter"
            :class="{ active: filter.subject_id === undefined }"
            @click="filter.subject_id = undefined; reloadListOnly()"
          >全部科目</button>
          <button
            v-for="s in subjects"
            :key="s.id"
            class="study-filter"
            :class="{ active: filter.subject_id === s.id }"
            @click="filter.subject_id = s.id; reloadListOnly()"
          >{{ s.name }}</button>
        </div>
        <div class="study-filter-row">
          <button
            class="study-filter"
            :class="{ active: filter.error_reason === '' }"
            @click="filter.error_reason = ''; reloadListOnly()"
          >全部错因</button>
          <button
            v-for="key in reasonKeys"
            :key="key"
            class="study-filter"
            :class="{ active: filter.error_reason === key }"
            @click="filter.error_reason = key; reloadListOnly()"
          >{{ ERROR_REASON_LABELS[key] }}</button>
        </div>
        <van-search v-model="keyword" shape="round" placeholder="搜索标题 / 内容…" @search="reloadListOnly" />

        <div v-if="filteredList.length" class="mm-list">
          <van-swipe-cell v-for="item in filteredList" :key="item.id">
            <article class="mm-card">
              <div class="mm-meta">
                <span v-if="item.subject" class="mm-subject" :style="{ background: `${item.subject.color}1a`, color: item.subject.color }">
                  {{ item.subject.name }}
                </span>
                <span class="mm-level" :class="levelTone(item)">L{{ item.mastery_level }}/4</span>
                <span class="mm-reason">{{ ERROR_REASON_LABELS[item.error_reason] ?? item.error_reason }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p class="mm-content">{{ item.content }}</p>
              <p class="mm-foot">已复习 {{ item.review_count }} 次 · 下次 {{ String(item.next_review_at).slice(0, 10) }}</p>
            </article>
            <template #right>
              <button class="mm-swipe-del" @click="removeMistake(item)">删除</button>
            </template>
          </van-swipe-cell>
        </div>
        <div v-else class="study-empty">
          {{ keyword.trim() ? '没有匹配的错题。' : '还没有错题记录。' }}<br>
          在真题页交卷后，可以一键把错题收进错题本。
        </div>
      </template>

      <!-- 录入弹层 -->
      <van-popup v-model:show="showForm" position="bottom" round class="mm-pop" :style="{ maxHeight: '88%' }">
        <div class="mm-pop-head">
          <strong>录入错题</strong>
          <button aria-label="关闭" @click="showForm = false">关闭</button>
        </div>
        <div class="mm-pop-body">
          <van-field v-model="form.title" label="标题" placeholder="如：极限计算错误" maxlength="120" />
          <van-field
            v-model="form.content"
            label="题目"
            type="textarea"
            rows="4"
            autosize
            placeholder="粘贴题目或简要描述…"
          />
          <van-field v-model="form.user_answer" label="我的答案" placeholder="选填" />
          <van-field v-model="form.correct_answer" label="正确答案" placeholder="选填" />
          <van-field
            :model-value="currentSubjectName"
            label="科目"
            is-link
            readonly
            @click="showSubjectPicker = true"
          />
          <van-field
            :model-value="ERROR_REASON_LABELS[form.error_reason ?? 'CONCEPT']"
            label="错因"
            is-link
            readonly
            @click="showReasonPicker = true"
          />
          <div class="mm-pop-foot">
            <button class="study-primary is-block" @click="submitForm">保存错题</button>
          </div>
        </div>
      </van-popup>

      <van-popup v-model:show="showSubjectPicker" position="bottom" round>
        <van-picker :columns="subjectColumns" @confirm="onPickSubject" @cancel="showSubjectPicker = false" />
      </van-popup>
      <van-popup v-model:show="showReasonPicker" position="bottom" round>
        <van-picker :columns="reasonColumns" @confirm="onPickReason" @cancel="showReasonPicker = false" />
      </van-popup>
    </div>
  </main>
</template>

<style scoped>
/* .study-page / .study-screen 的容器、内边距、安全区由全局定义，这里不再重复 */
.mm-page { color: var(--study-text); }

.mm-summary { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 12px; overflow: hidden; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); box-shadow: var(--app-shadow-sm); }
.mm-summary > div { display: grid; gap: 3px; padding: 14px 10px; text-align: center; border-left: 1px solid var(--app-border); }
.mm-summary > div:first-child { border-left: 0; }
.mm-summary strong { color: var(--app-text); font-size: 21px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
.mm-summary span { color: var(--app-muted); font-size: 11.5px; }
.study-segmented button em { margin-left: 4px; font-size: 11px; font-style: normal; opacity: .7; }
.mm-loading { display: grid; min-height: 42vh; place-items: center; color: var(--app-muted); font-size: 13px; }

.mm-list { display: grid; gap: 10px; margin-top: 12px; }
.mm-card { padding: 14px; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface); }
.mm-card.is-due { border-left: 3px solid var(--app-warning); }
.mm-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.mm-subject { padding: 3px 8px; border-radius: 7px; font-size: 11.5px; font-weight: 700; }
.mm-level { padding: 3px 7px; border: 1px solid var(--app-border-strong); border-radius: 7px; color: var(--app-muted); font-size: 11.5px; font-weight: 600; }
.mm-level.is-mastered { border-color: rgba(5, 150, 105, .35); background: rgba(5, 150, 105, .1); color: var(--app-success); }
.mm-level.is-learning { border-color: rgba(37, 99, 235, .3); background: var(--app-primary-soft); color: var(--app-primary); }
.mm-reason { color: var(--app-faint); font-size: 12px; }
.mm-card h3 { margin: 10px 0 0; color: var(--app-text); font-size: 15px; font-weight: 650; line-height: 1.55; }
.mm-content { display: -webkit-box; overflow: hidden; margin: 7px 0 0; color: var(--app-muted); font-size: 13.5px; line-height: 1.75; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.mm-foot { margin: 10px 0 0; color: var(--app-faint); font-size: 12px; }
.mm-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 13px; }
/* 全局 .study-primary / .study-secondary 已是 44px 触控，这里只补圆角与禁用态 */
.mm-actions button { border-radius: 10px; }
.mm-actions button:active { opacity: .82; }

/* 右滑删除：按钮按 44px 触控规范，宽度给足以免误触 */
.mm-swipe-del { width: 76px; height: 100%; border: 0; background: var(--app-danger); color: #fff; font-size: 14px; font-weight: 650; -webkit-tap-highlight-color: transparent; }

.mm-pop-head { display: flex; align-items: center; justify-content: space-between; padding: 15px 16px 10px; }
.mm-pop-head strong { color: var(--app-text); font-size: 16px; font-weight: 680; }
.mm-pop-head button { min-height: 44px; padding: 0 10px; border: 0; background: transparent; color: var(--app-muted); font-size: 13.5px; }
.mm-pop-body { overflow-y: auto; padding: 0 4px; }
.mm-pop-foot { position: sticky; bottom: 0; padding: 12px 12px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid var(--app-border); background: var(--app-surface); }
.study-primary.is-block { width: 100%; border-radius: 10px; }

@media (max-width: 370px) {
  .mm-summary strong { font-size: 19px; }
  .mm-card { padding: 12px; }
  .mm-card h3 { font-size: 14px; }
  .mm-swipe-del { width: 66px; }
}
</style>
