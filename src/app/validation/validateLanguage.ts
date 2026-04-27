import tags from 'language-tags';

/**
 * Returns true if the given string is a syntactically-valid BCP 47 language tag
 * registered in the IANA registry. Returns false for malformed tags, unregistered
 * subtags, and the empty string.
 */
export function isValidBcp47(tag: string): boolean {
  if (typeof tag !== 'string' || tag.length === 0) {
    return false;
  }
  // Reject empty subtags (e.g. "de--", "-en", "en-").
  if (tag.split('-').some((s) => s.length === 0)) {
    return false;
  }
  return tags.check(tag) === true;
}

/**
 * Returns true if the given string is a private-use BCP 47 tag
 * (primary subtag "x") or a tag carrying a private-use extension subtag (e.g.,
 * "en-x-private"). Used to reject such tags from `locale_config.supported_locales`.
 */
export function isPrivateUseBcp47(tag: string): boolean {
  if (typeof tag !== 'string' || tag.length === 0) {
    return false;
  }
  return tag.split('-').some((subtag) => subtag.toLowerCase() === 'x');
}
