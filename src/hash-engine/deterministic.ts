import { md4, md5, sha1, sha256, sha512 } from 'hash-wasm';

import type {
  DeterministicAlgorithm,
  DeterministicHashRequest,
  DeterministicHashResult,
} from './types.ts';
import { encodeUtf16Le, normalizeHashInput } from './utils.ts';

type HashFunction = (input: string | Uint8Array) => Promise<string>;

const deterministicHashers: Record<
  Exclude<DeterministicAlgorithm, 'ntlm'>,
  HashFunction
> = {
  md5,
  sha1,
  sha256,
  sha512,
};

export async function generateDeterministicHash(
  request: DeterministicHashRequest,
): Promise<DeterministicHashResult> {
  const digest =
    request.algorithm === 'ntlm'
      ? await generateNtlmHash(request.input)
      : await deterministicHashers[request.algorithm](
          normalizeHashInput(request.input),
        );

  return {
    kind: 'deterministic',
    algorithm: request.algorithm,
    digest: digest.toLowerCase(),
    encoding: 'hex',
    warnings: [],
  };
}

export async function generateNtlmHash(
  input: string | Uint8Array,
): Promise<string> {
  if (typeof input !== 'string') {
    throw new TypeError(
      'NTLM hashing expects text input so it can be encoded as UTF-16LE.',
    );
  }

  return md4(encodeUtf16Le(input));
}
