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

interface DeterministicState {
  loading: boolean;
  error?: string;
  results: Partial<Record<DeterministicAlgorithm, string>>;
}

export function renderApp(container: HTMLElement): void {
  container.innerHTML = `
    <main class="app-shell">
      <header class="app-header">
        <div>
          <h1>CryptoHashes</h1>
          <p class="app-subtitle">MD5 · NTLM · SHA1 · SHA-256 · SHA-512</p>
        </div>
        <button id="clear-input" type="button" class="button button--ghost">
          Clear
        </button>
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

      <div id="toast" class="toast" hidden aria-live="polite"></div>
    </main>
  `;

  const state: { input: string; deterministic: DeterministicState } = {
    input: '',
    deterministic: {
      loading: false,
      results: {},
    },
  };

  const refs = {
    input: getRequiredElement<HTMLTextAreaElement>(container, '#hash-input'),
    clearInput: getRequiredElement<HTMLButtonElement>(
      container,
      '#clear-input',
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

  refs.clearInput.addEventListener('click', () => {
    refs.input.value = '';
    refs.input.dispatchEvent(new Event('input'));
    refs.input.focus();
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
  renderDeterministicStatus();
  renderDeterministicRows();
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
