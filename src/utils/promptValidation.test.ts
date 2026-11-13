import { describe, expect, it } from 'vitest';
import { isPromptLengthValid } from './promptValidation';

describe('isPromptLengthValid', () => {
  it('500자까지 허용한다', () => {
    expect(isPromptLengthValid('가'.repeat(500))).toBe(true);
  });
  it('501자는 허용하지 않는다', () => {
    expect(isPromptLengthValid('가'.repeat(501))).toBe(false);
  });
  it('앞뒤 공백도 입력 길이에 포함한다', () => {
    expect(isPromptLengthValid(' ' + '가'.repeat(499) + ' ')).toBe(false);
  });
  it('빈 문자열은 길이 제한을 충족한다', () => {
    expect(isPromptLengthValid('')).toBe(true);
  });
});
