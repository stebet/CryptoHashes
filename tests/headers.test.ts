import headers from '../public/_headers?raw';

describe('_headers', () => {
  it('allows pwned passwords API connections in CSP', () => {
    expect(headers).toContain(
      "connect-src 'self' https://api.pwnedpasswords.com;",
    );
  });
});
