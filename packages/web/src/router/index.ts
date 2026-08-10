import { createRouter, createWebHistory } from 'vue-router';
import { isMobileViewport } from '@/utils/isMobile';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import DashboardView from '@/views/DashboardView.vue';
import LoginView from '@/views/LoginView.vue';

const EssaysView = () => import('@/views/EssaysView.vue');
const MistakesView = () => import('@/views/MistakesView.vue');
const PhrasesView = () => import('@/views/PhrasesView.vue');
const PlanSettingsView = () => import('@/views/PlanSettingsView.vue');
const VocabularyView = () => import('@/views/VocabularyView.vue');
const TaskExecutionView = () => import('@/views/TaskExecutionView.vue');
const MobilePhrasesView = () => import('@/views/mobile/MobilePhrasesView.vue');
const MobileEssaysView = () => import('@/views/mobile/MobileEssaysView.vue');
const MobileMeView = () => import('@/views/mobile/MobileMeView.vue');
const MobilePapersView = () => import('@/views/mobile/MobilePapersView.vue');
const MobileSearchView = () => import('@/views/mobile/MobileSearchView.vue');
const MobileSubjectView = () => import('@/views/mobile/MobileSubjectView.vue');
const MobileTasksView = () => import('@/views/mobile/MobileTasksView.vue');
const MobileVocabularyView = () => import('@/views/mobile/MobileVocabularyView.vue');

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 };
  },
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    {
      path: '/',
      component: DefaultLayout,
      children: [
        { path: '', name: 'dashboard', component: DashboardView, meta: { navKey: 'dashboard' } },
        { path: 'task/:taskId', name: 'task-execution', component: TaskExecutionView, meta: { navKey: 'dashboard' } },
        { path: 'plan', name: 'plan', component: PlanSettingsView, meta: { navKey: 'plan' } },
        { path: 'mistakes', name: 'mistakes', component: MistakesView, meta: { navKey: 'mistakes' } },
        { path: 'vocabulary', name: 'vocabulary', component: VocabularyView, meta: { navKey: 'vocabulary' } },
        { path: 'phrases', name: 'phrases', component: PhrasesView, meta: { navKey: 'phrases' } },
        { path: 'essays', name: 'essays', component: EssaysView, meta: { navKey: 'essays' } },
      ],
    },
    {
      path: '/m',
      component: MobileLayout,
      children: [
        { path: '', redirect: '/m/tasks' },
        { path: 'tasks', name: 'm-tasks', component: MobileTasksView, meta: { navKey: 'tasks' } },
        { path: 'task/:taskId', name: 'm-task-execution', component: TaskExecutionView, meta: { navKey: 'tasks' } },
        { path: 'search', name: 'm-search', component: MobileSearchView, meta: { navKey: 'search' } },
        { path: 'me', name: 'm-me', component: MobileMeView, meta: { navKey: 'me' } },
        { path: 'subject/:subjectId', name: 'm-subject', component: MobileSubjectView, meta: { navKey: 'me' } },
        { path: 'vocabulary', name: 'm-vocabulary', component: MobileVocabularyView, meta: { navKey: 'me' } },
        { path: 'phrases', name: 'm-phrases', component: MobilePhrasesView, meta: { navKey: 'me' } },
        { path: 'essays', name: 'm-essays', component: MobileEssaysView, meta: { navKey: 'me' } },
        { path: 'papers', name: 'm-papers', component: MobilePapersView, meta: { navKey: 'me' } },
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
  const isMobilePath = to.path === '/m' || to.path.startsWith('/m/');

  const hasToken = Boolean(localStorage.getItem('shck_token'));
  if (!to.meta.public && !hasToken) return { path: '/login' };
  if (to.path === '/login' && hasToken) return { path: mobile ? '/m/tasks' : '/' };
  if (mobile && !isMobilePath && to.path !== '/login') return { path: '/m/tasks' };
  if (!mobile && isMobilePath) return { path: '/' };
  return true;
});

export default router;
