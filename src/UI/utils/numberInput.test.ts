import { describe, expect, it } from 'vitest';
import { isDecimalInput, parseDecimalInput, parseIntegerInput } from './numberInput';

describe('number input', () => {
  it('accepts dot and comma decimal weights', () => {
    expect(isDecimalInput('72.5')).toBe(true);
    expect(isDecimalInput('72,5')).toBe(true);
    expect(parseDecimalInput('72,5')).toBe(72.5);
  });

  it('rejects malformed weights and decimal repetitions', () => {
    expect(isDecimalInput('7.2.5')).toBe(false);
    expect(parseDecimalInput('7.2.5')).toBeNull();
    expect(parseIntegerInput('8.5')).toBeNull();
  });
});
