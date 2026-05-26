import { generateDeterministicHash } from '../src/hash-engine/deterministic.ts';

describe('hash engine layer', () => {
  it('matches known deterministic vectors for every supported algorithm', async () => {
    const results = await Promise.all([
      generateDeterministicHash({ algorithm: 'md5', input: 'abc' }),
      generateDeterministicHash({ algorithm: 'sha1', input: 'abc' }),
      generateDeterministicHash({ algorithm: 'sha256', input: 'abc' }),
      generateDeterministicHash({ algorithm: 'sha512', input: 'abc' }),
      generateDeterministicHash({ algorithm: 'ntlm', input: 'password' }),
    ]);

    expect(results).toEqual([
      expect.objectContaining({
        algorithm: 'md5',
        digest: '900150983cd24fb0d6963f7d28e17f72',
      }),
      expect.objectContaining({
        algorithm: 'sha1',
        digest: 'a9993e364706816aba3e25717850c26c9cd0d89d',
      }),
      expect.objectContaining({
        algorithm: 'sha256',
        digest:
          'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      }),
      expect.objectContaining({
        algorithm: 'sha512',
        digest:
          'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a' +
          '2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
      }),
      expect.objectContaining({
        algorithm: 'ntlm',
        digest: '8846f7eaee8fb117ad06bdd830b7586c',
      }),
    ]);
  });

  it('rejects NTLM byte input because it must encode UTF-16LE text first', async () => {
    await expect(
      generateDeterministicHash({
        algorithm: 'ntlm',
        input: new Uint8Array([0x61, 0x62, 0x63]),
      }),
    ).rejects.toThrow(/NTLM hashing expects text input/i);
  });
});
