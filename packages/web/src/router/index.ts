import { createRouter, createWebHistory } from 'vue-router';
import { isMobileViewport } from '@/utils/isMobile';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import DashboardView from '@/views/DashboardView.vue';
import EssaysView from '@/views/EssaysView.vue';
import LoginView from '@/views/LoginView.vue';
import MistakesView from '@/views/MistakesView.vue';
import PhrasesView from '@/views/PhrasesView.vue';
import PlanSettingsView from '@/views/PlanSettingsView.vue';
import VocabularyView from '@/views/VocabularyView.vue';
import MobilePhrasesView from '@/views/mobile/MobilePhrasesView.vue';
import MobileEssaysView from '@/views/mobile/MobileEssaysView.vue';
import MobileMeView from '@/views/mobile/MobileMeView.vue';
import MobilePapersView from '@/views/mobile/MobilePapersView.vue';
import MobileSearchView from '@/views/mobile/MobileSearchView.vue';
import MobileSubjectView from '@/views/mobile/MobileSubjectView.vue';
import MobileTasksView from '@/views/mobile/MobileTasksView.vue';
import MobileVocabularyView from '@/views/mobile/MobileVocabularyView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    {
      path: '/',
      component: DefaultLayout,
      children: [
        { path: '', name: 'dashboard', component: DashboardView },
        { path: 'plan', name: 'plan', component: PlanSettingsView },
        { path: 'mistakes', name: 'mistakes', component: MistakesView },
        { path: 'vocabulary', name: 'vocabulary', component: VocabularyView },
        { path: 'phrases', name: 'phrases', component: PhrasesView },
        { path: 'essays', name: 'essays', component: EssaysView },
      ],
    },
    {
      path: '/m',
      component: MobileLayout,
      children: [
        { path: '', redirect: '/m/tasks' },
        { path: 'tasks', name: 'm-tasks', component: MobileTasksView },
        { path: 'search', name: 'm-search', component: MobileSearchView },
        { path: 'me', name: 'm-me', component: MobileMeView },
        { path: 'subject/:subjectId', name: 'm-subject', component: MobileSubjectView },
        { path: 'vocabulary', name: 'm-vocabulary', component: MobileVocabularyView },
        { path: 'phrases', name: 'm-phrases', component: MobilePhrasesView },
        { path: 'essays', name: 'm-essays', component: MobileEssaysView },
        { path: 'papers', name: 'm-papers', component: MobilePapersView },
      ],
    },
  ],
});

router.beforeEach((to) => {
  // 记忆 UI 模式（?mobile=1 / ?desktop=1 可强制切换，并跨页面保持）
  if (to.query.mobile === '1') sessionStorage.setItem('ui-mode', 'mobile');
  if (to.query.desktop === '1') sessionStorage.setItem('ui-mode', 'desktop');
  const stored = sessionStorage.getItem('ui-mode');
  const mobile = stored === 'mobile' ? true : stored === 'desktop' ? false : isMobileViewport();

  const hasToken = Boolean(localStorage.getItem('shck_token'));
  if (!to.meta.public && !hasToken) return { path: '/login' };
  if (to.path === '/login' && hasToken) return { path: mobile ? '/m/tasks' : '/' };
  if (mobile && !to.path.startsWith('/m') && to.path !== '/login') return { path: '/m/tasks' };
  if (!mobile && to.path.startsWith('/m')) return { path: '/' };
  return true;
});

export default router;
