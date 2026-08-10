<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { showSuccessToast, showToast } from 'vant';
import { apiError } from '@/api/client';
import { createKnowledge, searchKnowledge, type KnowledgeItem } from '@/api/knowledge';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import MobilePageHeader from '@/components/mobile/MobilePageHeader.vue';
import { renderMarkdown } from '@/utils/markdown';

const route = useRoute();
const subjectId = Number(route.params.subjectId);
const subject = ref<SubjectInfo | null>(null);
const items = ref<KnowledgeItem[]>([]);
const activeNames = ref<number[]>([]);
const showForm = ref(false);
const form = ref({ title: '', content: '' });
const error = ref('');
const busy = ref(false);

async function load() {
  error.value = '';
  busy.value = true;
  try {
    const subjects = await listSubjects();
    subject.value = subjects.find((s) => s.id === subjectId) ?? null;
    const result = await searchKnowledge({ subject_id: subjectId });
    items.value = result.list;
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function addItem() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    showToast('请填写标题和内容');
    return;
  }
  try {
    await createKnowledge({ title: form.value.title.trim(), content: form.value.content, subject_id: subjectId });
    form.value = { title: '', content: '' };
    showForm.value = false;
    showSuccessToast('已保存');
    await load();
  } catch (cause) { showToast(apiError(cause)); }
}

function toggleItem(id: number) {
  activeNames.value = activeNames.value.includes(id) ? activeNames.value.filter((itemId) => itemId !== id) : [...activeNames.value, id];
}

onMounted(load);
</script>

<template>
  <main class="study-page subject-page">
    <div class="study-screen">
      <MobilePageHeader :title="subject?.name ?? '知识点'" eyebrow="科目知识簿" back :action-label="showForm ? '收起' : '添加'" @action="showForm = !showForm" />

      <p v-if="error" class="study-error">{{ error }}</p>

      <div v-if="showForm" class="study-form">
        <h2 class="study-form-title">记一个知识点</h2>
        <van-field v-model="form.title" label="标题" placeholder="如：求导公式" maxlength="200" />
        <van-field v-model="form.content" label="内容" type="textarea" rows="4" autosize placeholder="支持 **加粗**、*斜体*、- 列表" />
        <button class="study-primary form-save" @click="addItem">保存知识点</button>
      </div>

      <div v-if="busy && !items.length" class="study-loading"><van-loading size="24">正在翻阅知识簿…</van-loading></div>
      <template v-else>
        <div class="study-section-title"><h2>知识索引</h2><span>{{ items.length }} 条笔记</span></div>
        <section class="note-list">
          <article v-for="(item, index) in items" :key="item.id" class="note-card" :class="{ open: activeNames.includes(item.id) }">
            <button class="note-summary" @click="toggleItem(item.id)"><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ item.title }}</strong><i>›</i></button>
            <div v-if="activeNames.includes(item.id)" class="note-content md" v-html="renderMarkdown(item.content)" />
          </article>
        </section>
        <div v-if="!items.length" class="study-empty">该科目还没有知识点。<br>点击右上角「添加」记录第一条。</div>
      </template>
    </div>
  </main>
</template>

<style scoped>
.form-save { width: 100%; margin-top: 12px; }
.note-list { display: grid; gap: 9px; }.note-card { overflow: hidden; border: 1px solid var(--study-line); border-radius: 12px; background: var(--app-surface); }.note-card.open { background: var(--app-surface); box-shadow: var(--app-shadow-sm); }.note-summary { width: 100%; min-height:58px; display: grid; grid-template-columns: 28px 1fr 12px; align-items: center; gap: 9px; padding: 14px; border: 0; background: transparent; color: var(--study-text); text-align: left; }.note-summary span { color: var(--study-accent); font-family: inherit; font-size: 12px; }.note-summary strong { font-family: inherit; font-size: 14px; }.note-summary i { color: var(--study-muted); font-style: normal; transition: transform .2s ease; }.note-card.open .note-summary i { transform: rotate(90deg); }.note-content { padding: 14px 17px 17px 51px; border-top: 1px solid var(--app-border); }
</style>
