<script setup lang="ts">
import { computed } from 'vue';
import katex from 'katex';

const props = defineProps<{ content: string }>();

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
  })[character] ?? character);
}

function render(content: string) {
  const renderMath = (source: string, displayMode: boolean) =>
    katex.renderToString(source, { throwOnError: false, displayMode });
  const blocks: string[] = [];
  const withBlocks = content.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    blocks.push(renderMath(formula.trim(), true));
    return `@@BLOCK_${blocks.length - 1}@@`;
  });
  return escapeHtml(withBlocks)
    .replace(/\$([^$\n]+?)\$/g, (_, formula) => renderMath(formula.trim(), false))
    .replace(/@@BLOCK_(\d+)@@/g, (_, index) => blocks[Number(index)]);
}

const html = computed(() => render(props.content));
</script>

<template><span v-html="html" /></template>
