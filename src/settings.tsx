import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { detectBaseUrl, loadBaseUrl, saveBaseUrl } from './api';

type SettingsContextValue = {
  baseUrl: string;
  /** true hasta terminar de cargar la URL guardada. */
  loading: boolean;
  setBaseUrl: (url: string) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue>({
  baseUrl: detectBaseUrl(),
  loading: true,
  setBaseUrl: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [baseUrl, setBaseUrlState] = useState(detectBaseUrl());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadBaseUrl().then((url) => {
      if (active) {
        setBaseUrlState(url);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setBaseUrl = useCallback(async (url: string) => {
    const clean = url.trim().replace(/\/+$/, '');
    if (!clean) return;
    setBaseUrlState(clean);
    await saveBaseUrl(clean);
  }, []);

  return (
    <SettingsContext.Provider value={{ baseUrl, loading, setBaseUrl }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}