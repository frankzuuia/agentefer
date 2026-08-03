const IDENTIFIER_PUNCTUATION = new Set(["-", "_", ".", ":", "/"]);

function isAsciiLetterOrDigit(character: string): boolean {
  const code = character.charCodeAt(0);

  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

export function isSafeIdentifier(value: string, maximumLength = 128): boolean {
  if (value.length === 0 || value.length > maximumLength) {
    return false;
  }

  for (const character of value) {
    if (!isAsciiLetterOrDigit(character) && !IDENTIFIER_PUNCTUATION.has(character)) {
      return false;
    }
  }

  return true;
}

export function assertSafeIdentifier(
  value: string,
  fieldName: string,
  maximumLength = 128,
): string {
  if (!isSafeIdentifier(value, maximumLength)) {
    throw new TypeError(`${fieldName} is not a safe operational identifier`);
  }

  return value;
}
