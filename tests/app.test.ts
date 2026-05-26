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

  it('clears the input and recomputes the deterministic rows', async () => {
    const { user, input } = renderWorkspace();

    await user.type(input, 'abc');
    expect(await screen.findByText('sha256:abc')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(input).toHaveValue('');
      expect(engineMocks.generateDeterministicHash).toHaveBeenLastCalledWith({
        algorithm: 'sha512',
        input: '',
      });
    });
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
