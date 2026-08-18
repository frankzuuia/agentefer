export const META_SIGNATURE_PREFIX = "sha256=" as const;

export type MetaChallenge = Readonly<{
  mode: "subscribe";
  verifyToken: string;
  challenge: string;
}>;

const isHexadecimalCharacter = (character: string): boolean => {
  const normalized = character.toLowerCase();
  return (
    (normalized >= "0" && normalized <= "9") ||
    (normalized >= "a" && normalized <= "f")
  );
};

const isCanonicalUuidShape = (value: string): boolean => {
  if (value.length !== 36) {
    return false;
  }

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? "";
    const expectsHyphen = index === 8 || index === 13 || index === 18 || index === 23;

    if (expectsHyphen ? character !== "-" : !isHexadecimalCharacter(character)) {
      return false;
    }
  }

  return true;
};

export function parseMetaEndpointKey(value: unknown): string | undefined {
  return typeof value === "string" && isCanonicalUuidShape(value)
    ? value.toLowerCase()
    : undefined;
}

export function parseMetaSignatureHeader(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith(META_SIGNATURE_PREFIX)) {
    return undefined;
  }

  const signature = value.slice(META_SIGNATURE_PREFIX.length);
  if (signature.length !== 64) {
    return undefined;
  }

  for (const character of signature) {
    if (!isHexadecimalCharacter(character)) {
      return undefined;
    }
  }

  return signature.toLowerCase();
}

const readQueryValue = (
  query: Readonly<Record<string, unknown>>,
  field: string,
  minimumLength: number,
  maximumLength: number,
): string | undefined => {
  const value = query[field];

  return typeof value === "string" && value.length >= minimumLength && value.length <= maximumLength
    ? value
    : undefined;
};

export function parseMetaChallengeQuery(value: unknown): MetaChallenge | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const query = value as Readonly<Record<string, unknown>>;
  const mode = readQueryValue(query, "hub.mode", 1, 32);
  const verifyToken = readQueryValue(query, "hub.verify_token", 16, 512);
  const challenge = readQueryValue(query, "hub.challenge", 1, 1024);

  if (mode !== "subscribe" || verifyToken === undefined || challenge === undefined) {
    return undefined;
  }

  return Object.freeze({ mode, verifyToken, challenge });
}
