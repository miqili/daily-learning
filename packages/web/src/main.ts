import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Vant from 'vant';
import 'vant/lib/index.css';
import 'katex/dist/katex.min.css';
import './assets/main.css';
import App from './App.vue';
import router from './router';

createApp(App).use(createPinia()).use(router).use(Vant).mount('#app');
