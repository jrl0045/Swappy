import { createContext, useContext } from 'react';
import { Lang, translations, TranslationKey } from './i18n';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => any;
}

export const LanguageContext = createContext<LanguageContextType>({
  lang: 'es',
  setLang: () => {},
  t: (key: TranslationKey) => translations.es[key],
});

export const useLanguage = () => useContext(LanguageContext);
