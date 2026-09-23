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
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import renderMathInElement from 'katex/contrib/auto-render';
import { normalizeBareTexSpacing } from '@/utils/texSpacing';

const props = defineProps<{ html: string }>();

const root = ref<HTMLElement | null>(null);

/**
 * 先归一化「数学定界符之外」的裸 LaTeX 间距命令（`\quad` / `\qquad` 等），
 * 再交给 auto-render 处理 `$…$` / `$$…$$`。
 * 少了这一步，章节正文里的 `3.1\quad 先定保底线` 之类会把源码原样显示出来。
 */
const normalizedHtml = computed(() => normalizeBareTexSpacing(props.html));

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

watch(normalizedHtml, () => {
  void nextTick(typeset);
});
</script>

<template><div ref="root" v-html="normalizedHtml" /></template>
