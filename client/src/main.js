import { createApp } from 'vue';
import { createPinia } from 'pinia';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/js/dist/collapse';
import './styles/main.css';
import App from './App.vue';
import { router } from './router.js';

createApp(App).use(createPinia()).use(router).mount('#app');
