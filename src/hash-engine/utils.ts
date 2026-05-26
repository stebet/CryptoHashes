import type { HashInput } from './types.ts';

const utf8Encoder = new TextEncoder();

export function normalizeHashInput(input: HashInput): HashInput {
  return typeof input === 'string' ? input : new Uint8Array(input);
}

export function toUtf8Bytes(input: HashInput): Uint8Array {
  return typeof input === 'string'
    ? utf8Encoder.encode(input)
    : new Uint8Array(input);
}

export function encodeUtf16Le(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length * 2);

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    const offset = index * 2;

    bytes[offset] = codeUnit & 0xff;
    bytes[offset + 1] = codeUnit >> 8;
  }

  return bytes;
}
