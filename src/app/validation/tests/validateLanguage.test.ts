import {isValidBcp47, isPrivateUseBcp47} from '../validateLanguage';

describe('validateLanguage', () => {
  describe('isValidBcp47', () => {
    it.each([['en'], ['de'], ['en-US'], ['pt-BR'], ['zh-Hant'], ['sr-Cyrl-RS']])('accepts %s', (tag) => {
      expect(isValidBcp47(tag)).toBe(true);
    });

    it.each([['english'], [''], ['de--'], ['xx-yy-zz-aa-bb-cc-dd']])('rejects %s', (tag) => {
      expect(isValidBcp47(tag)).toBe(false);
    });

    it('rejects non-string input', () => {
      expect(isValidBcp47(undefined as any)).toBe(false);
      expect(isValidBcp47(null as any)).toBe(false);
      expect(isValidBcp47(42 as any)).toBe(false);
    });
  });

  describe('isPrivateUseBcp47', () => {
    it('detects wholly-private tags (x-foo)', () => {
      expect(isPrivateUseBcp47('x-private')).toBe(true);
      expect(isPrivateUseBcp47('x-anything')).toBe(true);
    });

    it('detects private-use extension (en-x-foo)', () => {
      expect(isPrivateUseBcp47('en-x-private')).toBe(true);
    });

    it('returns false for normal tags', () => {
      expect(isPrivateUseBcp47('en')).toBe(false);
      expect(isPrivateUseBcp47('pt-BR')).toBe(false);
    });

    it('returns false for invalid input', () => {
      expect(isPrivateUseBcp47('')).toBe(false);
      expect(isPrivateUseBcp47(undefined as any)).toBe(false);
    });
  });
});
