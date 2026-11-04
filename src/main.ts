import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { startJobs } from './services/jobs'
import './assets/main.css'

startJobs()

createApp(App).use(router).mount('#app')
