import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createHash } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const computeHash = (algorithm: string, input: string) =>
  createHash(algorithm).update(input).digest('hex');

const computeNtlmHash = (input: string) => {
  const buffer = Buffer.from(input, 'utf16le');
  return createHash('md4').update(buffer).digest('hex');
};

const getPwnedPasswordsRangeUrl = (hash: string, mode?: 'ntlm') => {
  const search = mode === 'ntlm' ? '?mode=ntlm' : '';
  return `https://api.pwnedpasswords.com/range/${hash.slice(0, 5).toUpperCase()}${search}`;
};

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders hashes, pwned password status, and range links for typed input', async () => {
    const text = 'hello';
    const sha1Hash = computeHash('sha1', text);
    const ntlmHash = computeNtlmHash(text);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        const body =
          url === getPwnedPasswordsRangeUrl(sha1Hash)
            ? `${sha1Hash.slice(5).toUpperCase()}:42\nABCDEF:1`
            : '';

        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }),
    );

    render(<App />);

    const input = screen.getByLabelText(/input/i);
    await userEvent.type(input, text);

    expect(screen.getByText('Characters: 5')).toBeInTheDocument();
    expect(screen.getByText('UTF-8 bytes: 5')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Pwned: pwned (42)')).toBeInTheDocument();
      expect(screen.getByText(computeHash('md5', text))).toBeInTheDocument();
      expect(screen.getByText(computeHash('sha1', text))).toBeInTheDocument();
      expect(screen.getByText(computeHash('sha256', text))).toBeInTheDocument();
      expect(screen.getByText(computeHash('sha512', text))).toBeInTheDocument();
      expect(screen.getByText(ntlmHash)).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'SHA-1 range' })).toHaveAttribute(
      'href',
      getPwnedPasswordsRangeUrl(sha1Hash),
    );
    expect(screen.getByRole('link', { name: 'NTLM range' })).toHaveAttribute(
      'href',
      getPwnedPasswordsRangeUrl(ntlmHash, 'ntlm'),
    );
  });

  it('counts utf-8 bytes for multibyte characters and shows a safe status when not found', async () => {
    render(<App />);

    const input = screen.getByLabelText(/input/i);
    await userEvent.type(input, '😀');

    expect(screen.getByText('Characters: 2')).toBeInTheDocument();
    expect(screen.getByText('UTF-8 bytes: 4')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Pwned: ok (0)')).toBeInTheDocument();
    });
  });
});
