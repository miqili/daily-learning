<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { showToast } from 'vant';
import { apiError } from '@/api/client';
import { searchKnowledge, type KnowledgeItem } from '@/api/knowledge';
import { listSubjects, type SubjectInfo } from '@/api/plan';
import { renderMarkdown } from '@/utils/markdown';

const subjects = ref<SubjectInfo[]>([]);
const keyword = ref('');
const subjectId = ref<number | 0>(0);
const items = ref<KnowledgeItem[]>([]);
const expanded = ref<number[]>([]);
const error = ref('');
const busy = ref(false);
const searched = ref(false);

async function load() {
  subjects.value = await listSubjects();
}

async function doSearch() {
  error.value = '';
  busy.value = true;
  searched.value = true;
  try {
    const result = await searchKnowledge({
      subject_id: subjectId.value || undefined,
      keyword: keyword.value.trim() || undefined,
    });
    items.value = result.list;
  } catch (cause) { error.value = apiError(cause); showToast(apiError(cause)); } finally { busy.value = false; }
}

onMounted(() => { load(); doSearch(); });
</script>

<template>
  <div class="m-page">
    <van-nav-bar title="检索" fixed placeholder />
    <div class="m-body">
      <van-search v-model="keyword" placeholder="搜索知识点、考点、模板…" show-action @search="doSearch">
        <template #action><span class="search-btn" @click="doSearch">搜索</span></template>
      </van-search>

      <van-tabs v-model:active="subjectId" shrink line-width="24" style="margin-top:4px">
        <van-tab :name="0" title="全部科目" />
        <van-tab v-for="s in subjects" :key="s.id" :name="s.id" :title="s.name" />
      </van-tabs>

      <p v-if="error" class="m-error">{{ error }}</p>

      <div v-if="busy" class="m-loading"><van-loading size="24">搜索中…</van-loading></div>
      <template v-else-if="items.length">
        <van-collapse v-model="expanded" style="margin-top:14px">
          <van-collapse-item v-for="item in items" :key="item.id" :name="item.id">
            <template #title>
              <div class="item-title">
                <van-tag v-if="item.subject" round plain :color="item.subject.color">{{ item.subject.name }}</van-tag>
                <span>{{ item.title }}</span>
              </div>
            </template>
            <div class="md" v-html="renderMarkdown(item.content)" />
          </van-collapse-item>
        </van-collapse>
      </template>
      <van-empty v-else-if="searched" description="没有找到相关内容" />
    </div>
  </div>
</template>

<style scoped>
.m-page { max-width: 640px; margin: 0 auto; min-height: 100vh; background: var(--van-background); }
.search-btn { color: #3b82f6; font-size: 14px; font-weight: 600; }
.m-body { padding: 0 16px 16px; }
.item-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 14.5px; font-weight: 600; color: var(--van-text-color); }
.m-error { color: var(--van-danger-color); font-size: 13px; margin: 12px 4px; }
.m-loading { display: grid; place-items: center; padding: 48px 0; color: var(--van-text-color-3); font-size: 13px; }
</style>
