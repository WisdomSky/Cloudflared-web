import { createI18n } from 'vue-i18n'

import en from '@/locales/en'
import zhCN from '@/locales/zh-CN'
import de from '@/locales/de'
import esBR from '@/locales/es-BR'
import ru from '@/locales/ru'
import ja from '@/locales/ja'
import fr from '@/locales/fr'

const i18n = createI18n({
    locale: localStorage.getItem('locale') || "en",
    fallbackLocale: 'en',
    messages: {
        'en': en,
        'zh-CN': zhCN,
        'de': de,
        'es-BR': esBR,
        'ru': ru,
        'ja': ja,
        'fr': fr
    }
})

export default i18n
