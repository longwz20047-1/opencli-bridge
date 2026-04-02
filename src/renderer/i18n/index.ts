import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCommon from './locales/zh-CN/common.json';
import zhNav from './locales/zh-CN/nav.json';
import zhSettings from './locales/zh-CN/settings.json';
import enCommon from './locales/en-US/common.json';
import enNav from './locales/en-US/nav.json';
import enSettings from './locales/en-US/settings.json';

function detectSystemLocale(): 'zh-CN' | 'en-US' {
  const lang = navigator.language || 'en-US';
  return lang.startsWith('zh') ? 'zh-CN' : 'en-US';
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { common: zhCommon, nav: zhNav, settings: zhSettings },
    'en-US': { common: enCommon, nav: enNav, settings: enSettings },
  },
  defaultNS: 'common',
  fallbackLng: 'en-US',
  lng: detectSystemLocale(),
  interpolation: { escapeValue: false },
});

export default i18n;
