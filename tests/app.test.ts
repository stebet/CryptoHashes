import { screen, waitFor, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

const engineMocks = vi.hoisted(() => ({
  generateDeterministicHash: vi.fn(),
}));

vi.mock('../src/hash-engine/deterministic.ts', async () => {
  const actual = await vi.importActual<
    typeof import('../src/hash-engine/deterministic.ts')
  >('../src/hash-engine/deterministic.ts');

  return {
    ...actual,
    generateDeterministicHash: engineMocks.generateDeterministicHash,
  };
});

import { renderApp } from '../src/app.ts';

describe('renderApp', () => {
  beforeEach(() => {
    engineMocks.generateDeterministicHash.mockImplementation(
      async ({ algorithm, input }) => ({
        kind: 'deterministic',
        algorithm,
        digest: `${algorithm}:${typeof input === 'string' ? input : 'bytes'}`,
        encoding: 'hex',
        warnings: [],
      }),
    );
  });

  it('uses the system theme by default and follows system theme changes', async () => {
    const systemTheme = mockSystemTheme('dark');

    renderWorkspace();

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toHaveAttribute('title', 'Theme: System (Dark)');

    systemTheme.setTheme('light');

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      expect(
        screen.getByRole('button', { name: 'Switch to dark theme' }),
      ).toHaveAttribute('title', 'Theme: System (Light)');
    });
  });

  it('updates deterministic digests and copies digest values', async () => {
    const { user, input } = renderWorkspace();

    await user.type(input, 'abc');

    expect(screen.getByText('3 characters')).toBeInTheDocument();
    expect(screen.getByText('3 UTF-8 bytes')).toBeInTheDocument();

    const md5Digest = await screen.findByText('md5:abc');
    const md5Row = md5Digest.closest('article');

    if (!md5Row) {
      throw new Error('Expected the MD5 result row to exist.');
    }

    await user.click(within(md5Row).getByRole('button', { name: 'Copy' }));

    expect(await screen.findByText('MD5 digest copied.')).toBeInTheDocument();
  });

  it('persists an explicit theme override and ignores later system changes', async () => {
    const systemTheme = mockSystemTheme('light');
    const { user } = renderWorkspace();

    await user.click(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    );

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem('cryptohashes:theme')).toBe('dark');
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toHaveAttribute('title', 'Theme: Dark');

    systemTheme.setTheme('light');

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
  });

  it('renders clickable footer links for X and GitHub', async () => {
    renderWorkspace();

    await screen.findByText('md5:');

    expect(screen.getByRole('link', { name: 'X profile' })).toHaveAttribute(
      'href',
      'https://x.com/stebets',
    );
    expect(
      screen.getByRole('link', { name: 'GitHub repository' }),
    ).toHaveAttribute('href', 'https://github.com/stebet/CryptoHashes');
  });
});

function renderWorkspace() {
  document.body.innerHTML = '<div id="app"></div>';

  const container = document.querySelector<HTMLElement>('#app');

  if (!container) {
    throw new Error('Expected test container to exist.');
  }

  renderApp(container);

  const input = screen.getByRole<HTMLTextAreaElement>('textbox', {
    name: /^Input$/i,
  });

  return {
    user: userEvent.setup(),
    input,
  };
}

function mockSystemTheme(initialTheme: 'dark' | 'light') {
  let currentTheme = initialTheme;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return currentTheme === 'dark';
      },
      media: query,
      onchange: null,
      addEventListener: (
        eventName: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        if (eventName === 'change') {
          listeners.add(listener);
        }
      },
      removeEventListener: (
        eventName: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        if (eventName === 'change') {
          listeners.delete(listener);
        }
      },
      addListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      removeListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => true,
    })),
  });

  return {
    setTheme(nextTheme: 'dark' | 'light') {
      currentTheme = nextTheme;

      const event = {
        matches: nextTheme === 'dark',
        media: '(prefers-color-scheme: dark)',
      } as MediaQueryListEvent;

      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}
