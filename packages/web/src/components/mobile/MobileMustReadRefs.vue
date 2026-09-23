<script setup lang="ts">
/**
 * 移动端「关联真题」折叠块 —— 与 PC 的 MustReadRefs 不共用。
 *
 * PC 版用 --wb-* 令牌与 wb-btn / wb-tag 等桌面类，行高与点击区都按鼠标设计；
 * 这里按手机重做：折叠头 48px、题目卡堆叠、答案高亮成整行、跳转做成 44px 通栏按钮。
 *
 * 政治走纯文本，数学走 KatexRenderer（题干 / 选项 / 解析都可能含 LaTeX）。
 */
import { computed } from 'vue';
import type { KnowledgeRef } from '@/api/knowledge';
import type { PaperSummary } from '@/api/papers';
import KatexRenderer from '@/components/common/KatexRenderer.vue';

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
  <section class="mrefs">
    <button type="button" class="mrefs-toggle" :aria-expanded="open" @click="emit('toggle')">
      <span class="mrefs-toggle-label">关联真题 {{ refs.length }} 道</span>
      <em>{{ open ? '收起' : '展开' }}</em>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>

    <div v-if="open" class="mrefs-list">
      <article v-for="(reference, index) in refs" :key="index" class="mref">
        <header class="mref-head">
          <span class="mref-type">{{ reference.qtype }}</span>
          <strong>{{ reference.label }}</strong>
          <span v-if="reference.score" class="mref-score">{{ reference.score }}</span>
        </header>

        <p v-if="math" class="mref-stem"><KatexRenderer :content="reference.stem" break-lines /></p>
        <p v-else class="mref-stem">{{ reference.stem }}</p>

        <ul v-if="reference.options.length" class="mref-opts">
          <li v-for="option in reference.options" :key="option.k" :class="{ 'is-answer': option.correct }">
            <b>{{ option.k }}</b>
            <span v-if="math"><KatexRenderer :content="option.text" /></span>
            <template v-else>{{ option.text }}</template>
          </li>
        </ul>
        <p v-else-if="reference.answerText" class="mref-answer">
          <b>答案</b>
          <span v-if="math"><KatexRenderer :content="reference.answerText" break-lines /></span>
          <template v-else>{{ reference.answerText }}</template>
        </p>

        <div v-if="reference.analysis" class="mref-analysis">
          <p class="mref-analysis-title">解析 · 解题步骤</p>
          <p><KatexRenderer :content="reference.analysis" break-lines /></p>
        </div>

        <button
          v-if="paperIdOf(reference)"
          type="button"
          class="mref-jump"
          @click="emit('jump', reference)"
        >去做这道题 ›</button>
        <p v-else class="mref-none">真题库暂无这一年的卷子</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.mrefs { margin-top: 12px; padding-top: 11px; border-top: 1px dashed var(--app-border-strong); }
.mrefs-toggle {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px;
  border: 0;
  background: transparent;
  color: var(--app-primary);
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}
.mrefs-toggle-label { flex: 1; font-size: 13.5px; font-weight: 650; }
.mrefs-toggle em { color: var(--app-faint); font-size: 12px; font-style: normal; }
.mrefs-toggle svg { width: 15px; height: 15px; flex: 0 0 15px; transition: transform .18s ease; }
.mrefs-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
.mrefs-toggle:active { opacity: .6; }

.mrefs-list { display: grid; gap: 10px; margin-top: 4px; }
.mref { padding: 13px 13px 14px; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface-subtle); }
.mref-head { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.mref-type { padding: 3px 8px; border-radius: 6px; background: var(--app-primary-soft); color: var(--app-primary); font-size: 11px; font-weight: 700; }
.mref-head strong { color: var(--app-text); font-size: 13px; font-weight: 650; }
.mref-score { color: var(--app-faint); font-size: 11.5px; }
.mref-stem { margin: 9px 0 0; color: var(--study-text); font-size: 14px; line-height: 1.78; }
.mref-opts { display: grid; gap: 6px; margin: 10px 0 0; padding: 0; list-style: none; }
.mref-opts li {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 8px 11px;
  border: 1px solid var(--app-border);
  border-radius: 9px;
  background: var(--app-surface);
  color: var(--study-text);
  font-size: 13.5px;
  line-height: 1.7;
}
.mref-opts li b { flex: 0 0 auto; color: var(--app-faint); font-weight: 700; }
.mref-opts li.is-answer {
  border-color: rgba(37, 99, 235, .35);
  background: var(--app-primary-soft);
  color: var(--app-primary);
  font-weight: 650;
}
.mref-opts li.is-answer b { color: var(--app-primary); }
.mref-answer {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 10px 0 0;
  padding: 10px 11px;
  border-radius: 9px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
  font-size: 13.5px;
  line-height: 1.75;
}
.mref-answer b { flex: 0 0 auto; font-size: 11.5px; font-weight: 700; }
.mref-analysis { margin-top: 10px; padding: 10px 11px; border: 1px dashed var(--app-border-strong); border-radius: 9px; background: var(--app-surface); }
.mref-analysis-title { margin: 0 0 6px; color: var(--app-faint); font-size: 11.5px; font-weight: 700; letter-spacing: .03em; }
.mref-analysis p { margin: 0; color: var(--study-muted); font-size: 13px; line-height: 1.85; }
.mref-jump {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 11px;
  border: 1px solid var(--app-primary);
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-primary);
  font-size: 13.5px;
  font-weight: 650;
  -webkit-tap-highlight-color: transparent;
}
.mref-jump:active { background: var(--app-primary-soft); }
.mref-none { margin: 10px 0 0; color: var(--app-faint); font-size: 12px; }

@media (max-width: 370px) {
  .mref { padding: 11px 10px 12px; }
  .mref-stem { font-size: 13.5px; }
  .mref-opts li { padding: 7px 9px; font-size: 13px; }
}
</style>
