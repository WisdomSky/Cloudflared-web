import { createI18n } from 'vue-i18n'

import en from '@/locales/en'
import zhCN from '@/locales/zh-CN'
import de from '@/locales/de'
import ptBR from '@/locales/pt-BR'
import ru from '@/locales/ru'
import ja from '@/locales/ja'
import fr from '@/locales/fr'
import tr from '@/locales/tr'

const i18n = createI18n({
    locale: localStorage.getItem('locale') || "en",
    fallbackLocale: 'en',
    messages: {
        'en': en,
        'zh-CN': zhCN,
        'de': de,
        'pt-BR': ptBR,
        'ru': ru,
        'ja': ja,
        'fr': fr,
        'tr': tr
    }
})

export default i18n
