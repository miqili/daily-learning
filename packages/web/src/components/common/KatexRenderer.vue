<script setup lang="ts">
import { computed } from 'vue';
import katex from 'katex';
import { normalizeBareTexSpacing } from '@/utils/texSpacing';

const props = defineProps<{ content: string; display?: boolean; breakLines?: boolean }>();

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
  })[character] ?? character);
}

function render(content: string) {
  const renderMath = (source: string, displayMode: boolean) =>
    katex.renderToString(source, { throwOnError: false, displayMode });
  // display=true：内容本身就是**裸 LaTeX**（不含 $ 定界符）的块级公式，例如必背公式卡。
  if (props.display) return renderMath(content, true);

  // 默认（带 $ / $$ 定界符的混合文本）：先按定界符切分，只对**非公式段**做 HTML 转义，
  // 公式段原样交给 KaTeX —— 否则公式里的 `'`（如 y'）、`<`（如 x<1）会被转义破坏。
  // breakLines=true 时只在文本段把换行换成 <br>（KaTeX 输出里的换行绝不能动，
  // 否则会把 <br> 塞进 SVG path 的 d 属性导致渲染错误）。
  // 文本段里的裸间距命令（`\quad` / `\qquad` 等）在转义之后归一化成实体间隔——
  // 顺序不能颠倒，否则新插入的 <span> 会被转义打回字面量。
  const textOf = (raw: string) => {
    const escaped = normalizeBareTexSpacing(escapeHtml(raw));
    return props.breakLines ? escaped.replace(/\n/g, '<br>') : escaped;
  };
  const segments: string[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    if (match.index > last) segments.push(textOf(content.slice(last, match.index)));
    if (match[1] !== undefined) segments.push(renderMath(match[1].trim(), true));
    else segments.push(renderMath(match[2].trim(), false));
    last = match.index + match[0].length;
  }
  if (last < content.length) segments.push(textOf(content.slice(last)));
  return segments.join('');
}

const html = computed(() => render(props.content));
</script>

<template><span v-html="html" /></template>
