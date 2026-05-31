import { generateDeterministicHash } from './hash-engine/deterministic.ts';
import type { DeterministicAlgorithm } from './hash-engine/types.ts';

const DETERMINISTIC_ALGORITHMS = [
  { id: 'md5', label: 'MD5' },
  { id: 'ntlm', label: 'NTLM' },
  { id: 'sha1', label: 'SHA1' },
  { id: 'sha256', label: 'SHA-256' },
  { id: 'sha512', label: 'SHA-512' },
] as const satisfies readonly {
  id: DeterministicAlgorithm;
  label: string;
}[];

const encoder = new TextEncoder();
const THEME_STORAGE_KEY = 'cryptohashes:theme';
const SYSTEM_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

let disposeSystemThemeChangeListener: (() => void) | undefined;

interface DeterministicState {
  loading: boolean;
  error?: string;
  results: Partial<Record<DeterministicAlgorithm, string>>;
}

type Theme = 'dark' | 'light';
type ThemePreference = Theme | 'system';

interface ThemeState {
  preference: ThemePreference;
  effectiveTheme: Theme;
}

export function renderApp(container: HTMLElement): void {
  disposeSystemThemeChangeListener?.();

  const themePreference = getStoredThemePreference();

  container.innerHTML = `
    <main class="app-shell">
      <header class="app-header">
        <div>
          <h1>CryptoHashes</h1>
          <p class="app-subtitle">MD5 · NTLM · SHA1 · SHA-256 · SHA-512</p>
        </div>
        <div class="app-header__actions">
          <button
            id="theme-toggle"
            type="button"
            class="theme-toggle"
            aria-label=""
            aria-pressed="false"
          >
            <span class="theme-toggle__track" aria-hidden="true">
              <span class="theme-toggle__icon theme-toggle__icon--sun">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path
                    d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12H2.75M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23L5.46 5.46"
                  ></path>
                </svg>
              </span>
              <span class="theme-toggle__icon theme-toggle__icon--moon">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M20 15.5A8.5 8.5 0 1 1 12.5 4a6.5 6.5 0 0 0 7.5 11.5Z"
                  ></path>
                </svg>
              </span>
              <span class="theme-toggle__thumb"></span>
            </span>
          </button>
        </div>
      </header>

      <label class="input-field">
        <span class="input-field__label">Input</span>
        <textarea
          id="hash-input"
          class="input-field__control"
          rows="4"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          placeholder="Type or paste text."
        ></textarea>
      </label>

      <div class="meta-row" aria-label="Input statistics">
        <span id="char-count" class="meta-pill">0 characters</span>
        <span id="byte-count" class="meta-pill">0 UTF-8 bytes</span>
      </div>

      <div id="deterministic-status" class="stack-sm" aria-live="polite"></div>
      <section id="deterministic-results" class="results-list" aria-label="Deterministic hashes"></section>

      <footer class="app-footer" aria-label="External links">
        <a
          class="icon-link"
          href="https://x.com/stebets"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="X profile"
          title="X @stebets"
        >
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path
              d="M18.24 2h3.31l-7.23 8.27L23 22h-6.74l-5.28-6.9L4.95 22H1.64l7.73-8.84L1 2h6.91l4.77 6.29L18.24 2Zm-1.16 18h1.84L6.91 3.9H4.94l12.14 16.1Z"
            ></path>
          </svg>
        </a>
        <a
          class="icon-link"
          href="https://github.com/stebet/CryptoHashes"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="GitHub repository"
          title="GitHub repository"
        >
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path
              d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.5 0-.24-.01-1.03-.01-1.87-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.5-1.11-1.5-.9-.64.07-.63.07-.63 1 .07 1.52 1.04 1.52 1.04.88 1.56 2.31 1.11 2.87.84.09-.66.35-1.11.64-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.7.12 2.5.36 1.9-1.33 2.74-1.05 2.74-1.05.56 1.42.21 2.47.11 2.73.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.06.36.31.69.92.69 1.86 0 1.34-.01 2.42-.01 2.75 0 .27.18.6.69.5A10.13 10.13 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
            ></path>
          </svg>
        </a>
      </footer>

      <div id="toast" class="toast" hidden aria-live="polite"></div>
    </main>
  `;

  const state: {
    input: string;
    deterministic: DeterministicState;
    theme: ThemeState;
  } = {
    input: '',
    deterministic: {
      loading: false,
      results: {},
    },
    theme: {
      preference: themePreference,
      effectiveTheme: resolveTheme(themePreference),
    },
  };

  applyTheme(state.theme.effectiveTheme);

  const refs = {
    input: getRequiredElement<HTMLTextAreaElement>(container, '#hash-input'),
    themeToggle: getRequiredElement<HTMLButtonElement>(
      container,
      '#theme-toggle',
    ),
    charCount: getRequiredElement<HTMLElement>(container, '#char-count'),
    byteCount: getRequiredElement<HTMLElement>(container, '#byte-count'),
    deterministicStatus: getRequiredElement<HTMLElement>(
      container,
      '#deterministic-status',
    ),
    deterministicResults: getRequiredElement<HTMLElement>(
      container,
      '#deterministic-results',
    ),
    toast: getRequiredElement<HTMLElement>(container, '#toast'),
  };

  let deterministicTimeout = 0;
  let deterministicRequestToken = 0;
  let toastTimeout = 0;

  refs.input.addEventListener('input', () => {
    state.input = refs.input.value;
    renderInputMeta();
    scheduleRefresh();
  });

  refs.themeToggle.addEventListener('click', () => {
    const nextTheme: Theme =
      state.theme.effectiveTheme === 'dark' ? 'light' : 'dark';

    state.theme.preference = nextTheme;
    state.theme.effectiveTheme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    renderThemeToggle();
  });

  container.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-copy-value]',
    );

    if (!button) {
      return;
    }

    void copyText(
      button.dataset.copyValue ?? '',
      button.dataset.copyLabel ?? 'Value',
    );
  });

  renderInputMeta();
  renderThemeToggle();
  renderDeterministicStatus();
  renderDeterministicRows();
  disposeSystemThemeChangeListener = subscribeToSystemThemeChange(() => {
    if (state.theme.preference !== 'system') {
      return;
    }

    state.theme.effectiveTheme = resolveTheme('system');
    applyTheme(state.theme.effectiveTheme);
    renderThemeToggle();
  });
  scheduleRefresh();
  queueMicrotask(() => {
    refs.input.focus();
  });

  function scheduleRefresh(): void {
    state.deterministic.loading = true;
    state.deterministic.error = undefined;
    renderDeterministicStatus();
    renderDeterministicRows();
    window.clearTimeout(deterministicTimeout);
    deterministicTimeout = window.setTimeout(() => {
      void refreshDeterministicResults();
    }, 120);
  }

  async function refreshDeterministicResults(): Promise<void> {
    const requestToken = deterministicRequestToken + 1;
    deterministicRequestToken = requestToken;

    try {
      const results = await Promise.all(
        DETERMINISTIC_ALGORITHMS.map((algorithm) =>
          generateDeterministicHash({
            algorithm: algorithm.id,
            input: state.input,
          }),
        ),
      );

      if (requestToken !== deterministicRequestToken) {
        return;
      }

      state.deterministic.results = Object.fromEntries(
        results.map((result) => [result.algorithm, result.digest]),
      ) as DeterministicState['results'];
      state.deterministic.error = undefined;
    } catch (error) {
      if (requestToken !== deterministicRequestToken) {
        return;
      }

      state.deterministic.results = {};
      state.deterministic.error = getErrorMessage(error);
    } finally {
      if (requestToken === deterministicRequestToken) {
        state.deterministic.loading = false;
        renderDeterministicStatus();
        renderDeterministicRows();
      }
    }
  }

  function renderInputMeta(): void {
    const byteLength = encoder.encode(state.input).byteLength;

    refs.charCount.textContent = formatCount(state.input.length, 'character');
    refs.byteCount.textContent = formatCount(byteLength, 'UTF-8 byte');
  }

  function renderThemeToggle(): void {
    refs.themeToggle.dataset.theme = state.theme.effectiveTheme;
    refs.themeToggle.title = formatThemeLabel(
      state.theme.preference,
      state.theme.effectiveTheme,
    );
    refs.themeToggle.setAttribute(
      'aria-label',
      `Switch to ${state.theme.effectiveTheme === 'dark' ? 'light' : 'dark'} theme`,
    );
    refs.themeToggle.setAttribute(
      'aria-pressed',
      String(state.theme.effectiveTheme === 'dark'),
    );
  }

  function renderDeterministicStatus(): void {
    refs.deterministicStatus.replaceChildren();

    if (state.deterministic.error) {
      refs.deterministicStatus.append(
        createNotice(state.deterministic.error, 'error'),
      );
      return;
    }
  }

  function renderDeterministicRows(): void {
    const fragment = document.createDocumentFragment();

    for (const algorithm of DETERMINISTIC_ALGORITHMS) {
      const row = document.createElement('article');
      row.className = 'result-row';

      const label = document.createElement('h2');
      label.className = 'result-row__label';
      label.textContent = algorithm.label;

      const output = document.createElement('code');
      output.className = 'result-row__value';

      const digest = state.deterministic.results[algorithm.id];

      if (state.deterministic.error) {
        output.textContent = 'Unavailable';
      } else if (digest) {
        output.textContent = digest;
      } else if (state.deterministic.loading) {
        output.textContent = 'Calculating…';
      } else {
        output.textContent = '';
      }

      const copyButton = createCopyButton(
        digest ?? '',
        `${algorithm.label} digest`,
      );
      copyButton.disabled = !digest;

      row.append(label, output, copyButton);
      fragment.append(row);
    }

    refs.deterministicResults.replaceChildren(fragment);
  }

  async function copyText(value: string, label: string): Promise<void> {
    if (!value) {
      showToast(`No ${label.toLowerCase()} to copy yet.`, 'warning');
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const copyBuffer = document.createElement('textarea');
        copyBuffer.value = value;
        copyBuffer.setAttribute('readonly', '');
        copyBuffer.style.position = 'absolute';
        copyBuffer.style.left = '-9999px';
        document.body.append(copyBuffer);
        copyBuffer.select();
        document.execCommand('copy');
        copyBuffer.remove();
      }

      showToast(`${label} copied.`, 'success');
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  }

  function showToast(message: string, tone: NoticeTone): void {
    refs.toast.textContent = message;
    refs.toast.hidden = false;
    refs.toast.className = `toast toast--${tone}`;
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
      refs.toast.hidden = true;
    }, 2200);
  }
}

type NoticeTone = 'info' | 'warning' | 'error' | 'success';

function createCopyButton(value: string, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button--ghost button--compact';
  button.dataset.copyValue = value;
  button.dataset.copyLabel = label;
  button.textContent = 'Copy';
  return button;
}

function createNotice(message: string, tone: NoticeTone): HTMLElement {
  const notice = document.createElement('p');
  notice.className = `notice notice--${tone}`;
  notice.textContent = message;
  return notice;
}

function formatCount(value: number, noun: string): string {
  return `${value.toLocaleString()} ${noun}${value === 1 ? '' : 's'}`;
}

function getRequiredElement<TElement extends HTMLElement>(
  container: ParentNode,
  selector: string,
): TElement {
  const element = container.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Expected element for selector "${selector}" to exist.`);
  }

  return element;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}

function getStoredThemePreference(): ThemePreference {
  const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedPreference === 'light' || storedPreference === 'dark') {
    return storedPreference;
  }

  return 'system';
}

function resolveTheme(preference: ThemePreference): Theme {
  if (preference !== 'system') {
    return preference;
  }

  return getSystemTheme();
}

function getSystemTheme(): Theme {
  if (typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia(SYSTEM_THEME_MEDIA_QUERY).matches ? 'dark' : 'light';
}

function subscribeToSystemThemeChange(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const mediaQuery = window.matchMedia(SYSTEM_THEME_MEDIA_QUERY);
  const listener = () => {
    onChange();
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener);

    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }

  mediaQuery.addListener(listener);

  return () => {
    mediaQuery.removeListener(listener);
  };
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

function formatThemeLabel(
  preference: ThemePreference,
  effectiveTheme: Theme,
): string {
  if (preference === 'system') {
    return `Theme: System (${capitalizeTheme(effectiveTheme)})`;
  }

  return `Theme: ${capitalizeTheme(effectiveTheme)}`;
}

function capitalizeTheme(theme: Theme): string {
  return `${theme[0].toUpperCase()}${theme.slice(1)}`;
}
