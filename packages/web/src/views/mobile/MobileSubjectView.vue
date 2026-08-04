<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showSuccessToast, showToast } from 'vant';
import { apiError } from '@/api/client';
import { createKnowledge, searchKnowledge, type KnowledgeItem } from '@/api/knowledge';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import { renderMarkdown } from '@/utils/markdown';

const route = useRoute();
const router = useRouter();
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

onMounted(load);
</script>

<template>
  <div class="m-page">
    <van-nav-bar
      :title="subject?.name ?? '知识点'"
      left-arrow
      fixed
      placeholder
      @click-left="router.back()"
    >
      <template #right>
        <span class="nav-add" @click="showForm = !showForm">{{ showForm ? '收起' : '添加' }}</span>
      </template>
    </van-nav-bar>

    <div class="m-body">
      <p v-if="error" class="m-error">{{ error }}</p>

      <div v-if="showForm" class="form-card">
        <div class="form-title">记一个知识点</div>
        <van-field v-model="form.title" label="标题" placeholder="如：求导公式" maxlength="200" />
        <van-field v-model="form.content" label="内容" type="textarea" rows="4" autosize placeholder="支持 **加粗**、*斜体*、- 列表" />
        <van-button block round type="primary" style="margin-top:12px" @click="addItem">保存</van-button>
      </div>

      <div v-if="busy && !items.length" class="m-loading"><van-loading size="24">加载中…</van-loading></div>
      <template v-else>
        <van-collapse v-model="activeNames">
          <van-collapse-item v-for="item in items" :key="item.id" :name="item.id">
            <template #title>
              <span class="item-title">{{ item.title }}</span>
            </template>
            <div class="md" v-html="renderMarkdown(item.content)" />
          </van-collapse-item>
        </van-collapse>
        <van-empty v-if="!items.length" description="该科目还没有知识点，点右上角「添加」记录第一条" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.m-page { max-width: 640px; margin: 0 auto; min-height: 100vh; background: var(--van-background); }
.nav-add { color: #3b82f6; font-size: 14px; font-weight: 600; }
.m-body { padding: 16px; }
.form-card { background: var(--van-background-2); border-radius: 16px; padding: 16px; margin-bottom: 14px; }
.form-title { font-size: 15px; font-weight: 700; color: var(--van-text-color); margin-bottom: 10px; }
.item-title { font-size: 14.5px; font-weight: 600; color: var(--van-text-color); }
.m-error { color: var(--van-danger-color); font-size: 13px; margin: 12px 4px; }
.m-loading { display: grid; place-items: center; padding: 48px 0; color: var(--van-text-color-3); font-size: 13px; }
</style>
