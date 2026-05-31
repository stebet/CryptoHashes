import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import './App.css';
import { createHash } from 'crypto';

const algorithms = ['md5', 'sha1', 'sha256', 'sha512'] as const;
const pwnedPasswordsRangeBaseUrl = 'https://api.pwnedpasswords.com/range';

const computeHash = (algorithm: (typeof algorithms)[number], input: string) =>
  createHash(algorithm).update(input).digest('hex');

const computeUtf8Size = (input: string) => new TextEncoder().encode(input).length;

const computeNtlmHash = (input: string) => {
  const leBuffer = Buffer.from(input, 'utf16le');
  return createHash('md4').update(leBuffer).digest('hex');
};

const getPwnedPasswordsRangeUrl = (hash: string, mode?: 'ntlm') => {
  const search = mode === 'ntlm' ? '?mode=ntlm' : '';
  return `${pwnedPasswordsRangeBaseUrl}/${hash.slice(0, 5).toUpperCase()}${search}`;
};

const getPwnedPasswordsCount = (hash: string, responseText: string) => {
  const hashSuffix = hash.slice(5).toUpperCase();
  const matchedLine = responseText
    .split('\n')
    .find((line) => line.toUpperCase().startsWith(`${hashSuffix}:`));

  if (!matchedLine) {
    return 0;
  }

  const count = Number.parseInt(matchedLine.split(':')[1] ?? '0', 10);
  return Number.isNaN(count) ? 0 : count;
};

type PwnedPasswordState =
  | { status: 'idle' | 'checking' | 'error'; count: null }
  | { status: 'safe' | 'pwned'; count: number };

const App = () => {
  const [text, setText] = useState('');
  const [pwnedPasswordState, setPwnedPasswordState] = useState<PwnedPasswordState>({
    status: 'idle',
    count: null,
  });

  const hashes = useMemo(
    () =>
      Object.fromEntries(
        algorithms.map((algorithm) => [algorithm, computeHash(algorithm, text)]),
      ),
    [text],
  );

  const ntlmHash = useMemo(() => computeNtlmHash(text), [text]);
  const textLength = text.length;
  const utf8Size = useMemo(() => computeUtf8Size(text), [text]);
  const sha1RangeUrl = useMemo(() => getPwnedPasswordsRangeUrl(hashes.sha1), [hashes.sha1]);
  const ntlmRangeUrl = useMemo(
    () => getPwnedPasswordsRangeUrl(ntlmHash, 'ntlm'),
    [ntlmHash],
  );

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
  };

  useEffect(() => {
    if (!text) {
      setPwnedPasswordState({ status: 'idle', count: null });
      return;
    }

    const abortController = new AbortController();

    const checkPwnedPassword = async () => {
      setPwnedPasswordState({ status: 'checking', count: null });

      try {
        const response = await fetch(sha1RangeUrl, { signal: abortController.signal });

        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }

        const responseText = await response.text();
        const count = getPwnedPasswordsCount(hashes.sha1, responseText);
        setPwnedPasswordState({ status: count > 0 ? 'pwned' : 'safe', count });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setPwnedPasswordState({ status: 'error', count: null });
      }
    };

    void checkPwnedPassword();

    return () => {
      abortController.abort();
    };
  }, [hashes.sha1, sha1RangeUrl, text]);

  const pwnedPasswordLabel = (() => {
    switch (pwnedPasswordState.status) {
      case 'checking':
        return 'Pwned: checking…';
      case 'safe':
        return `Pwned: ok (${pwnedPasswordState.count.toLocaleString()})`;
      case 'pwned':
        return `Pwned: pwned (${pwnedPasswordState.count.toLocaleString()})`;
      case 'error':
        return 'Pwned: unavailable';
      default:
        return 'Pwned: enter text';
    }
  })();

  return (
    <main className="app">
      <header className="page-header">
        <h1>Cryptographic hashes</h1>
        <p>Enter any text below to instantly calculate common hash digests.</p>
      </header>

      <section className="input-panel" aria-labelledby="input-panel-label">
        <label className="input-panel__label" htmlFor="input-text" id="input-panel-label">
          Input
        </label>
        <textarea
          id="input-text"
          value={text}
          onChange={handleTextChange}
          placeholder="Type or paste text here"
          spellCheck={false}
        />
        <span className="input-panel__meta">
          <span>Characters: {textLength}</span>
          <span>UTF-8 bytes: {utf8Size}</span>
          <span
            aria-live="polite"
            className={`status-pill status-pill--${pwnedPasswordState.status}`}
            role="status"
          >
            {pwnedPasswordLabel}
          </span>
        </span>
        {text ? (
          <span className="input-panel__links">
            <a href={sha1RangeUrl} rel="noreferrer" target="_blank">
              SHA-1 range
            </a>
            <a href={ntlmRangeUrl} rel="noreferrer" target="_blank">
              NTLM range
            </a>
          </span>
        ) : null}
      </section>

      <section className="hash-grid" aria-label="Calculated hashes">
        {algorithms.map((algorithm) => (
          <article className="hash-card" key={algorithm}>
            <h2>{algorithm.toUpperCase()}</h2>
            <p>{hashes[algorithm]}</p>
          </article>
        ))}
        <article className="hash-card">
          <h2>NTLM</h2>
          <p>{ntlmHash}</p>
        </article>
      </section>
    </main>
  );
};

export default App;
