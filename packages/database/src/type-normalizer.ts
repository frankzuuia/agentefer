const internalMetadataHeader = "  __InternalSupabase: {";
const generatedMetadataComments = [
  "  // Allows to automatically instantiate createClient with right options",
  "  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)",
] as const;

export function normalizeGeneratedDatabaseTypes(source: string): string {
  const lineEnding = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  let metadataIndex: number | undefined;

  for (const [index, line] of lines.entries()) {
    if (line === internalMetadataHeader) {
      if (metadataIndex !== undefined) {
        throw new Error("Generated database types contain duplicate internal metadata blocks");
      }
      metadataIndex = index;
    }
  }

  if (metadataIndex === undefined) {
    return source;
  }

  const commentsStart = metadataIndex - generatedMetadataComments.length;
  const hasGeneratedComments = generatedMetadataComments.every(
    (comment, offset) => lines[commentsStart + offset] === comment,
  );
  const removalStart = hasGeneratedComments ? commentsStart : metadataIndex;
  let braceDepth = 0;
  let closing: { readonly index: number; readonly line: string } | undefined;

  for (const [offset, line] of lines.slice(metadataIndex).entries()) {
    for (const character of line) {
      if (character === "{") {
        braceDepth += 1;
      }
      if (character === "}") {
        braceDepth -= 1;
      }
    }
    if (braceDepth < 0) {
      throw new Error("Generated database type metadata has invalid brace balance");
    }
    if (braceDepth === 0) {
      closing = { index: metadataIndex + offset, line };
      break;
    }
  }

  if (closing === undefined || (closing.line !== "  }" && closing.line !== "  };")) {
    throw new Error("Generated database type metadata block is incomplete");
  }

  return [...lines.slice(0, removalStart), ...lines.slice(closing.index + 1)].join(lineEnding);
}
