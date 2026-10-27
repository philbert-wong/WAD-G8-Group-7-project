// Starts the website: loads Bootstrap, creates the Vue app and puts it inside <div id="app"> in index.html
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
// DESIGN PREVIEW: the shared "Cosy Professional" styles (loaded after Bootstrap so they win)
import './assets/cosy.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// Pinia (Week 11): turns on the stores in src/stores/ (auth, shortlist)
app.use(createPinia())
app.use(router)

app.mount('#app')
