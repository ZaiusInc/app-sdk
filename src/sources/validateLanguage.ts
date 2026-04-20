import tags from 'language-tags';

export type LanguageValidationResult = {valid: true; normalized: string} | {valid: false; message: string};

export function validateAndNormalizeLanguage(value: unknown): LanguageValidationResult {
  if (typeof value !== 'string') {
    return {valid: false, message: 'Invalid _language: must be a string'};
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return {valid: false, message: 'Invalid _language: must not be empty'};
  }

  // Convert underscores to hyphens (Bynder/Java-style: en_US -> en-US)
  const hyphenated = trimmed.replace(/_/g, '-');

  // Parse and validate against IANA subtag registry
  const parsed = tags(hyphenated);
  if (!parsed.valid()) {
    return {valid: false, message: `Invalid _language: "${value}" is not a valid BCP 47 language tag`};
  }

  const lower = hyphenated.toLowerCase();

  // Reject private-use tags (x-*) and private-use extension subtags (en-x-foo)
  if (lower.startsWith('x-') || lower.includes('-x-')) {
    return {valid: false, message: 'Invalid _language: private-use tags are not supported'};
  }

  // Reject subtags designated as private use (e.g., ZZ, QM-QZ, XA-XZ regions)
  for (const subtag of parsed.subtags()) {
    if (subtag.descriptions().includes('Private use')) {
      return {valid: false, message: `Invalid _language: "${value}" contains a private-use subtag`};
    }
  }

  // Return canonical form with correct casing
  return {valid: true, normalized: parsed.format()};
}
