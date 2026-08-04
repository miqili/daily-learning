<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiError } from '@/api/client';
import {
  ERROR_REASON_LABELS, createMistake, deleteMistake, getReviewQueue, listMistakes, reviewMistake,
  type CreateMistakeInput, type Mistake,
} from '@/api/mistakes';
import { listSubjects, type SubjectInfo } from '@/api/plan';

const subjects = ref<SubjectInfo[]>([]);
const queue = ref<Mistake[]>([]);
const queueTotal = ref(0);
const list = ref<Mistake[]>([]);
const filter = ref({ subject_id: undefined as number | undefined, error_reason: '', keyword: '' });
const error = ref('');
const busy = ref(false);
const showForm = ref(false);
const form = ref<CreateMistakeInput>({
  title: '', content: '', correct_answer: '', user_answer: '', error_reason: 'CONCEPT', subject_id: undefined, source: '',
});

async function loadList() {
  list.value = await listMistakes({
    subject_id: filter.value.subject_id,
    error_reason: filter.value.error_reason || undefined,
    keyword: filter.value.keyword || undefined,
  });
}

async function loadAll() {
  error.value = '';
  busy.value = true;
  try {
    subjects.value = await listSubjects();
    const q = await getReviewQueue();
    queue.value = q.list;
    queueTotal.value = q.total;
    await loadList();
  } catch (cause) { error.value = apiError(cause); } finally { busy.value = false; }
}

async function submitForm() {
  error.value = '';
  try {
    await createMistake(form.value);
    form.value = { title: '', content: '', correct_answer: '', user_answer: '', error_reason: 'CONCEPT', subject_id: undefined, source: '' };
    showForm.value = false;
    await loadAll();
  } catch (cause) { error.value = apiError(cause); }
}

async function doReview(mistake: Mistake, correct: boolean) {
  error.value = '';
  try { await reviewMistake(mistake.id, correct); await loadAll(); }
  catch (cause) { error.value = apiError(cause); }
}

async function removeMistake(id: number) {
  error.value = '';
  try { await deleteMistake(id); await loadAll(); }
  catch (cause) { error.value = apiError(cause); }
}

onMounted(loadAll);
</script>

<template>
  <section class="page" style="max-width:1080px">
    <div class="page-heading">
      <div><h1>错题本</h1><p class="muted" style="margin:8px 0 0">记录错因，按间隔复习，直到真正掌握。</p></div>
      <div class="badge amber" v-if="queueTotal">待复习 {{ queueTotal }} 题</div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="card card-pad" style="margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2>到期复习队列</h2>
        <button class="button" :disabled="showForm" @click="showForm = true">+ 录入错题</button>
      </div>
      <div v-if="queue.length">
        <div v-for="m in queue" :key="m.id" class="task-row" style="align-items:flex-start">
          <div class="task-content" style="flex:1">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span v-if="m.subject" class="badge" :style="{ background: `${m.subject.color}1a`, color: m.subject.color }">{{ m.subject.name }}</span>
              <strong>{{ m.title }}</strong>
              <span class="badge blue">L{{ m.mastery_level }}</span>
              <span class="badge">{{ ERROR_REASON_LABELS[m.error_reason] ?? m.error_reason }}</span>
            </div>
            <p class="muted" style="margin:8px 0 0;font-size:14px">{{ m.content }}</p>
          </div>
          <div style="display:flex;gap:8px;flex:0 0 auto">
            <button class="button success" style="min-height:32px;padding:0 12px" @click="doReview(m, true)">✔ 会了</button>
            <button class="button danger" style="min-height:32px;padding:0 12px" @click="doReview(m, false)">✘ 还不会</button>
          </div>
        </div>
      </div>
      <div v-else class="caption">暂无到期错题，先去记录错题吧。</div>
    </section>

    <section v-if="showForm" class="card card-pad" style="margin-bottom:24px">
      <h2 style="margin-bottom:16px">录入错题</h2>
      <div style="display:grid;gap:12px">
        <label style="display:grid;gap:6px"><span class="caption">科目</span><select v-model="form.subject_id" class="select"><option :value="undefined">未分类</option><option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
        <label style="display:grid;gap:6px"><span class="caption">标题</span><input v-model.trim="form.title" class="input" placeholder="如：极限计算错误" /></label>
        <label style="display:grid;gap:6px"><span class="caption">题目内容</span><textarea v-model="form.content" class="textarea" placeholder="粘贴题目内容或拍照转写…" /></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <label style="display:grid;gap:6px"><span class="caption">我的答案</span><input v-model="form.user_answer" class="input" /></label>
          <label style="display:grid;gap:6px"><span class="caption">正确答案</span><input v-model="form.correct_answer" class="input" /></label>
        </div>
        <label style="display:grid;gap:6px"><span class="caption">错因</span><select v-model="form.error_reason" class="select"><option v-for="(label, key) in ERROR_REASON_LABELS" :key="key" :value="key">{{ label }}</option></select></label>
        <div style="display:flex;gap:10px">
          <button class="button" @click="submitForm">保存错题</button>
          <button class="button secondary" @click="showForm = false">取消</button>
        </div>
      </div>
    </section>

    <section class="card card-pad">
      <h2 style="margin-bottom:16px">全部错题</h2>
      <div class="filter-bar" style="grid-template-columns:180px 180px minmax(0,1fr) auto;margin-bottom:20px">
        <select v-model="filter.subject_id" class="select" @change="loadList"><option :value="undefined">全部科目</option><option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option></select>
        <select v-model="filter.error_reason" class="select" @change="loadList"><option value="">全部错因</option><option v-for="(label, key) in ERROR_REASON_LABELS" :key="key" :value="key">{{ label }}</option></select>
        <input v-model="filter.keyword" class="input" placeholder="搜索标题/内容…" @keyup.enter="loadList" />
        <button class="button secondary" @click="loadList">搜索</button>
      </div>
      <div v-if="list.length">
        <div v-for="m in list" :key="m.id" class="task-row" style="align-items:flex-start">
          <div class="task-content" style="flex:1">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span v-if="m.subject" class="badge" :style="{ background: `${m.subject.color}1a`, color: m.subject.color }">{{ m.subject.name }}</span>
              <strong>{{ m.title }}</strong>
              <span class="badge blue">L{{ m.mastery_level }}/4</span>
              <span class="badge">{{ ERROR_REASON_LABELS[m.error_reason] ?? m.error_reason }}</span>
            </div>
            <p class="muted" style="margin:8px 0 0;font-size:14px">{{ m.content }}</p>
            <span class="caption" style="margin-top:6px">复习 {{ m.review_count }} 次 · 下次 {{ String(m.next_review_at).slice(0, 10) }}</span>
          </div>
          <button class="button danger" style="min-height:30px;padding:0 10px" @click="removeMistake(m.id)">删除</button>
        </div>
      </div>
      <div v-else class="caption">还没有错题记录。</div>
    </section>
  </section>
</template>
