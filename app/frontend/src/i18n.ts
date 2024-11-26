import { createI18n } from 'vue-i18n'


import en from '@/locales/en'
import zhCN from '@/locales/zh-CN'



const i18n = createI18n({
    locale: localStorage.getItem('locale') || "en",
    fallbackLocale: 'en',
    messages: {
        'en': en,
        'zh-CN': zhCN
    }
})

export default i18n
