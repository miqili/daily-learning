<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiError } from '@/api/client';
import { createSubject, listSubjects, removeSubject, type SubjectInfo } from '@/api/plan';
import { usePlanStore } from '@/stores/usePlanStore';
import { useUserStore } from '@/stores/useUserStore';

const user = useUserStore();
const store = usePlanStore();
const subjects = ref<SubjectInfo[]>([]);
const newName = ref('');
const newColor = ref('#2563eb');
const examDate = ref('2026-10-24');
const error = ref('');
const busy = ref(false);
const generated = ref(false);

async function load() {
  try {
    subjects.value = await listSubjects();
    examDate.value = user.user?.exam_date ?? store.summary?.exam_date ?? '2026-10-24';
  } catch (cause) { error.value = apiError(cause); }
}

async function addSubject() {
  const name = newName.value.trim();
  if (!name) return;
  error.value = '';
  try {
    await createSubject({ name, color: newColor.value });
    newName.value = '';
    await load();
  } catch (cause) { error.value = apiError(cause); }
}

async function remove(id: number) {
  error.value = '';
  try { await removeSubject(id); await load(); } catch (cause) { error.value = apiError(cause); }
}

async function regenerate() {
  error.value = '';
  busy.value = true;
  try {
    await store.initialize(examDate.value);
    generated.value = true;
    await load();
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

onMounted(load);
</script>

<template>
  <section class="page" style="max-width:860px">
    <div class="page-heading">
      <div><h1>计划配置</h1><p class="muted" style="margin:8px 0 0">设定考试日与科目，生成属于你的 70 天计划。</p></div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="card card-pad" style="margin-bottom:24px">
      <h2 style="margin-bottom:16px">考试日期</h2>
      <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap">
        <label style="display:grid;gap:8px;flex:1;min-width:240px"><span class="caption">目标考试日期（将倒推 70 天生成计划）</span><input v-model="examDate" class="input" type="date" /></label>
        <button class="button" :disabled="busy" @click="regenerate">{{ busy ? '生成中…' : '生成 / 重新生成计划' }}</button>
      </div>
      <p v-if="generated" class="notice" style="margin-top:14px">✅ 计划已生成：共 {{ store.summary?.total_tasks ?? 0 }} 条任务，从 {{ store.summary?.plan_start_date }} 到 {{ store.summary?.exam_date }}。</p>
      <p class="caption" style="margin-top:10px">⚠️ 重新生成会清除当前打卡记录与进度。</p>
    </section>

    <section class="card card-pad">
      <h2 style="margin-bottom:16px">我的科目</h2>
      <div class="result-list" style="margin-bottom:20px">
        <div v-for="subject in subjects" :key="subject.id" class="task-row" style="align-items:center">
          <span class="icon-box" :style="{ background: `${subject.color}1a`, color: subject.color }">◈</span>
          <div class="task-content"><strong>{{ subject.name }}</strong><span class="caption" style="margin-left:8px">{{ subject.sort_order + 1 }}</span></div>
          <button class="button danger" style="min-height:30px;padding:0 10px" @click="remove(subject.id)">删除</button>
        </div>
        <div v-if="!subjects.length" class="caption">还没有科目，先添加科目再生成计划。</div>
      </div>
      <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap">
        <label style="display:grid;gap:8px;flex:1;min-width:200px"><span class="caption">科目名称</span><input v-model.trim="newName" class="input" placeholder="如：高等数学（一）" @keyup.enter="addSubject" /></label>
        <label style="display:grid;gap:8px;min-width:120px"><span class="caption">颜色</span><input v-model="newColor" class="input" type="color" style="padding:4px;height:40px" /></label>
        <button class="button secondary" @click="addSubject">添加科目</button>
      </div>
    </section>
  </section>
</template>
