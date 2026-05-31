import robots from '../public/robots.txt?raw';

describe('robots.txt', () => {
  it('allows all bots to access the site without restrictions', () => {
    expect(robots).toBe('User-agent: *\nAllow: /\n');
  });
});
