import { expect, test } from 'bun:test';
import { testerCopy } from '../founder';
import { toShareSvg } from '../share';

test('Beta reward share art describes the award instead of capsule odds', () => {
  const svg = toShareSvg('tester', testerCopy(1));
  expect(svg).toContain('Awarded to DLE Club beta testers');
  expect(svg).not.toContain('capsules');
  expect(svg).toContain('print #1');
});
