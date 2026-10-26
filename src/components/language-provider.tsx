'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyLocale, translate, type Locale } from '@/lib/i18n';

type LanguageContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (text: string) => string };
const LanguageContext = createContext<LanguageContextValue>({ locale: 'ar', setLocale: () => {}, t: text => text });

export function LanguageProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const textSources = useRef(new WeakMap<Text, string>());
  const textOutputs = useRef(new WeakMap<Text, string>());
  const attributeSources = useRef(new WeakMap<Element, Map<string, string>>());
  const attributeOutputs = useRef(new WeakMap<Element, Map<string, string>>());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    applyLocale(next);
  }, []);

  useEffect(() => {
    const translatedAttributes = ['aria-label', 'alt', 'placeholder', 'title'];

    const translateTextNode = (node: Text) => {
      const element = node.parentElement;
      if (!element || element.closest('script,style,noscript,textarea,input,[contenteditable="true"],[translate="no"]')) return;
      const current = node.nodeValue ?? '';
      if (!current.trim()) return;
      const previous = textOutputs.current.get(node);
      if (previous !== current) textSources.current.set(node, current);
      const source = textSources.current.get(node) ?? current;
      const next = translate(source, locale);
      if (next !== current) node.nodeValue = next;
      textOutputs.current.set(node, next);
    };

    const translateElement = (element: Element) => {
      if (element.closest('[translate="no"]')) return;
      for (const attribute of translatedAttributes) {
        const current = element.getAttribute(attribute);
        if (current === null) continue;
        let originals = attributeSources.current.get(element);
        let applied = attributeOutputs.current.get(element);
        if (!originals) { originals = new Map(); attributeSources.current.set(element, originals); }
        if (!applied) { applied = new Map(); attributeOutputs.current.set(element, applied); }
        if (applied.get(attribute) !== current) originals.set(attribute, current);
        const source = originals.get(attribute) ?? current;
        const next = translate(source, locale);
        if (next !== current) element.setAttribute(attribute, next);
        applied.set(attribute, next);
      }
    };

    const visit = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);
      else if (node instanceof Element) {
        translateElement(node);
        node.childNodes.forEach(visit);
      }
    };

    visit(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') translateTextNode(record.target as Text);
        else if (record.type === 'attributes' && record.target instanceof Element) translateElement(record.target);
        else record.addedNodes.forEach(visit);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: translatedAttributes });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t: (text: string) => translate(text, locale) }), [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LocalizedText({ value }: { value: string }) {
  const { t } = useLanguage();
  return <>{t(value)}</>;
}
