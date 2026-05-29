import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

const originalMatchMedia = window.matchMedia;
const localStorageMock = createStorageMock();

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: localStorageMock,
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
  localStorageMock.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: originalMatchMedia,
  });
  vi.clearAllMocks();
});

function createStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}
