import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});
