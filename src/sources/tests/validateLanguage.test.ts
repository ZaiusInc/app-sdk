import {validateAndNormalizeLanguage} from '../validateLanguage';

describe('validateAndNormalizeLanguage', () => {
  // Valid tags -- should return {valid: true, normalized: ...}
  it('normalizes "en" to "en"', () => {
    expect(validateAndNormalizeLanguage('en')).toEqual({valid: true, normalized: 'en'});
  });

  it('normalizes "en-US" to "en-US" (already canonical)', () => {
    expect(validateAndNormalizeLanguage('en-US')).toEqual({valid: true, normalized: 'en-US'});
  });

  it('normalizes "en-us" to "en-US" (Contentstack-style lowercase)', () => {
    expect(validateAndNormalizeLanguage('en-us')).toEqual({valid: true, normalized: 'en-US'});
  });

  it('normalizes "en_US" to "en-US" (Bynder/Java-style underscore)', () => {
    expect(validateAndNormalizeLanguage('en_US')).toEqual({valid: true, normalized: 'en-US'});
  });

  it('normalizes "EN-US" to "en-US" (all uppercase)', () => {
    expect(validateAndNormalizeLanguage('EN-US')).toEqual({valid: true, normalized: 'en-US'});
  });

  it('normalizes "pt-br" to "pt-BR"', () => {
    expect(validateAndNormalizeLanguage('pt-br')).toEqual({valid: true, normalized: 'pt-BR'});
  });

  it('normalizes "zh-Hans" to "zh-Hans" (script subtag)', () => {
    expect(validateAndNormalizeLanguage('zh-Hans')).toEqual({valid: true, normalized: 'zh-Hans'});
  });

  it('normalizes "zh-Hans-CN" to "zh-Hans-CN" (script + region)', () => {
    expect(validateAndNormalizeLanguage('zh-Hans-CN')).toEqual({valid: true, normalized: 'zh-Hans-CN'});
  });

  // Invalid tags -- should return {valid: false, message: ...}
  it('rejects empty string', () => {
    const result = validateAndNormalizeLanguage('');
    expect(result.valid).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    const result = validateAndNormalizeLanguage('  ');
    expect(result.valid).toBe(false);
  });

  it('rejects non-string number', () => {
    const result = validateAndNormalizeLanguage(123);
    expect(result.valid).toBe(false);
  });

  it('rejects non-string boolean', () => {
    const result = validateAndNormalizeLanguage(true);
    expect(result.valid).toBe(false);
  });

  it('rejects null (direct call)', () => {
    const result = validateAndNormalizeLanguage(null);
    expect(result.valid).toBe(false);
  });

  it('rejects "english" (not a valid BCP 47 tag)', () => {
    const result = validateAndNormalizeLanguage('english');
    expect(result.valid).toBe(false);
  });

  it('rejects "e" (too short)', () => {
    const result = validateAndNormalizeLanguage('e');
    expect(result.valid).toBe(false);
  });

  it('rejects "en_US.UTF-8" (POSIX encoding suffix)', () => {
    const result = validateAndNormalizeLanguage('en_US.UTF-8');
    expect(result.valid).toBe(false);
  });

  it('rejects "en-ZZ" (unregistered region)', () => {
    const result = validateAndNormalizeLanguage('en-ZZ');
    expect(result.valid).toBe(false);
  });

  it('rejects "xx" (unregistered language subtag)', () => {
    const result = validateAndNormalizeLanguage('xx');
    expect(result.valid).toBe(false);
  });

  it('rejects "x-private" (private-use tag)', () => {
    const result = validateAndNormalizeLanguage('x-private');
    expect(result.valid).toBe(false);
  });

  it('rejects "en-x-foo" (private-use extension subtag)', () => {
    const result = validateAndNormalizeLanguage('en-x-foo');
    expect(result.valid).toBe(false);
  });
});
