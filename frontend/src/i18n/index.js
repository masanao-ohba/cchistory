import { createI18n } from 'vue-i18n'
import ja from './locales/ja.json'
import en from './locales/en.json'
import zh from './locales/zh.json'
import ko from './locales/ko.json'

const messages = {
  ja,
  en,
  zh,
  ko
}

// ブラウザの言語を取得
const getDefaultLocale = () => {
  const browserLocale = navigator.language.toLowerCase()
  
  // 対応言語のチェック
  if (browserLocale.startsWith('ja')) return 'ja'
  if (browserLocale.startsWith('zh')) return 'zh'
  if (browserLocale.startsWith('ko')) return 'ko'
  
  // デフォルトは英語
  return 'en'
}

// ローカルストレージから言語設定を取得
const getSavedLocale = () => {
  const saved = localStorage.getItem('locale')
  if (saved && messages[saved]) {
    return saved
  }
  return getDefaultLocale()
}

const i18n = createI18n({
  locale: getSavedLocale(),
  fallbackLocale: 'en',
  messages,
  legacy: false
})

export default i18n