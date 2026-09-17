<script setup lang="ts">
/**
 * 必背考点的「关联真题」折叠块 —— 政治与高等数学一共用。
 *
 * 政治：纯文本题干 / 选项（`math=false`）。
 * 数学：题干、选项、解析都含 LaTeX，走 KatexRenderer（`math=true`），
 *      并在选项下方补一段「解析 · 解题步骤」（库内 answer 的【解析】部分）。
 *
 * 跳转真题页需要「科目 + 年份 → 试卷 id」，因此把 papers 传进来自己算，
 * 避免父组件再传一个函数属性。
 */
import { computed } from 'vue';
import type { KnowledgeRef } from '@/api/knowledge';
import type { PaperSummary } from '@/api/papers';
import KatexRenderer from './KatexRenderer.vue';

const props = defineProps<{
  refs: KnowledgeRef[];
  open: boolean;
  papers: PaperSummary[];
  subject: string;
  math?: boolean;
}>();

const emit = defineEmits<{ toggle: []; jump: [reference: KnowledgeRef] }>();

const shortName = (name: string) => name.replace(/（一）/g, '一').replace(/\(一\)/g, '一');

const paperIndex = computed(() => {
  const map = new Map<string, number>();
  for (const paper of props.papers) map.set(`${shortName(paper.subject)}|${paper.year}`, paper.id);
  return map;
});

const paperIdOf = (reference: KnowledgeRef) =>
  reference.year ? (paperIndex.value.get(`${props.subject}|${reference.year}`) ?? null) : null;
</script>

<template>
  <div class="mr-refs">
    <button
      type="button"
      class="mr-refs-toggle"
      :aria-expanded="open"
      @click="emit('toggle')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      关联真题 {{ refs.length }} 道
      <em>{{ open ? '收起' : '展开' }}</em>
    </button>

    <div v-if="open" class="mr-ref-list">
      <div v-for="(reference, ri) in refs" :key="ri" class="mr-ref">
        <div class="mr-ref-head">
          <span class="wb-tag" :class="reference.typeClass === 'p-acc' ? 'is-ok' : 'is-warn'">
            {{ reference.qtype }}
          </span>
          <strong>{{ reference.label }}</strong>
          <span class="mr-ref-score">{{ reference.score }}</span>
          <button
            v-if="paperIdOf(reference)"
            type="button"
            class="wb-btn is-sm"
            @click="emit('jump', reference)"
          >在真题页查看</button>
          <span v-else class="mr-ref-none">真题库无此卷</span>
        </div>

        <p v-if="math" class="mr-ref-stem"><KatexRenderer :content="reference.stem" break-lines /></p>
        <p v-else class="mr-ref-stem">{{ reference.stem }}</p>

        <ul v-if="reference.options.length" class="mr-ref-opts">
          <li
            v-for="option in reference.options"
            :key="option.k"
            :class="{ 'is-answer': option.correct }"
          >
            <b>{{ option.k }}</b>
            <span v-if="math"><KatexRenderer :content="option.text" /></span>
            <template v-else>{{ option.text }}</template>
          </li>
        </ul>

        <p v-else-if="reference.answerText" class="mr-ref-answer">
          <template v-if="math">
            <b>答案</b><KatexRenderer :content="reference.answerText" break-lines />
          </template>
          <template v-else>{{ reference.answerText }}</template>
        </p>

        <div v-if="reference.analysis" class="mr-ref-analysis">
          <p class="mr-ref-analysis-title">解析 · 解题步骤</p>
          <p><KatexRenderer :content="reference.analysis" break-lines /></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mr-refs { margin-top: 11px; padding-top: 10px; border-top: 1px dashed var(--wb-line-soft); }
.mr-refs-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--wb-brand-deep);
  font-size: 12px;
  font-weight: 600;
}
.mr-refs-toggle svg { width: 13px; height: 13px; transition: transform var(--wb-dur) var(--wb-ease); }
.mr-refs-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
.mr-refs-toggle em { color: var(--wb-faint); font-size: 11px; font-style: normal; font-weight: 500; }
.mr-refs-toggle:focus-visible { outline: 3px solid rgba(108, 77, 255, .2); outline-offset: 2px; border-radius: 4px; }

.mr-ref-list { display: grid; gap: 10px; margin-top: 11px; }
.mr-ref { padding: 12px 14px; border: 1px solid var(--wb-line-soft); border-radius: var(--wb-radius); background: var(--wb-surface-2); }
.mr-ref-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
.mr-ref-head strong { color: var(--wb-ink); font-size: 12.5px; font-weight: 650; }
.mr-ref-score { color: var(--wb-faint); font-size: 11.5px; }
.mr-ref-head .wb-btn { margin-left: auto; }
.mr-ref-none { margin-left: auto; color: var(--wb-faint); font-size: 11px; }
.mr-ref-stem { margin: 0; color: var(--wb-ink-2); font-size: 13px; line-height: 1.75; }
.mr-ref-opts { display: grid; gap: 4px; margin: 9px 0 0; padding: 0; list-style: none; }
.mr-ref-opts li {
  display: flex;
  gap: 8px;
  padding: 5px 9px;
  border: 1px solid transparent;
  border-radius: var(--wb-radius-sm);
  color: var(--wb-ink-2);
  font-size: 12.5px;
  line-height: 1.6;
}
.mr-ref-opts li b { flex: 0 0 auto; color: var(--wb-faint); font-weight: 700; }
.mr-ref-opts li.is-answer { border-color: #c8ece3; background: var(--wb-brand-soft); color: var(--wb-brand-deep); font-weight: 600; }
.mr-ref-opts li.is-answer b { color: var(--wb-brand-deep); }
.mr-ref-answer { margin: 9px 0 0; padding: 9px 11px; border-radius: var(--wb-radius-sm); background: var(--wb-brand-soft); color: var(--wb-brand-deep); font-size: 12.5px; line-height: 1.75; }
.mr-ref-answer b { margin-right: 6px; font-size: 11px; font-weight: 700; }

.mr-ref-analysis { margin: 9px 0 0; padding: 9px 11px; border: 1px dashed var(--wb-line-soft); border-radius: var(--wb-radius-sm); background: var(--wb-surface); }
.mr-ref-analysis-title { margin: 0 0 5px; color: var(--wb-faint); font-size: 11px; font-weight: 700; letter-spacing: .04em; }
.mr-ref-analysis p { margin: 0; color: var(--wb-ink-2); font-size: 12.5px; line-height: 1.8; }
</style>
