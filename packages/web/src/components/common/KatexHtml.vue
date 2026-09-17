<script setup lang="ts">
/**
 * HTML 正文 + LaTeX 混排渲染。
 *
 * 与 KatexRenderer 的分工：
 *   KatexRenderer —— 纯文本内容（用 $ / $$ 定界符），内部 escapeHtml 后整体替换，**不接受 HTML**
 *   KatexHtml     —— 内容是**已清洗的 HTML 片段**（章节正文、章节引导语），需要保留标签结构，
 *                    只在文本节点上把 $…$ / $$…$$ 渲染成 KaTeX
 *
 * 用 katex 官方 auto-render：它遍历 DOM 只改文本节点，不碰标签与属性，
 * 因此 <table>/<ul>/<b> 等结构原样保留。
 */
import { nextTick, onMounted, ref, watch } from 'vue';
import renderMathInElement from 'katex/contrib/auto-render';

const props = defineProps<{ html: string }>();

const root = ref<HTMLElement | null>(null);

function typeset() {
  if (!root.value) return;
  renderMathInElement(root.value, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
    throwOnError: false,
  });
}

onMounted(typeset);

watch(
  () => props.html,
  () => {
    void nextTick(typeset);
  },
);
</script>

<template><div ref="root" v-html="html" /></template>
