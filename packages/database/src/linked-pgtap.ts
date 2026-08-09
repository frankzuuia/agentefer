import assert from "node:assert/strict";

const isDollarTagCharacter = (character: string, first: boolean): boolean => {
  const isLetter = (character >= "a" && character <= "z") || (character >= "A" && character <= "Z");
  const isDigit = character >= "0" && character <= "9";
  return isLetter || character === "_" || (!first && isDigit);
};

const readDollarTag = (sql: string, start: number): string | undefined => {
  if (sql[start] !== "$") {
    return undefined;
  }

  let cursor = start + 1;
  if (sql[cursor] === "$") {
    return "$$";
  }

  while (cursor < sql.length && sql[cursor] !== "$") {
    if (!isDollarTagCharacter(sql[cursor] ?? "", cursor === start + 1)) {
      return undefined;
    }
    cursor += 1;
  }

  return cursor < sql.length ? sql.slice(start, cursor + 1) : undefined;
};

export const splitSqlStatements = (sql: string): string[] => {
  const statements: string[] = [];
  let statementStart = 0;
  let cursor = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let blockCommentDepth = 0;
  let dollarTag: string | undefined;

  while (cursor < sql.length) {
    const character = sql[cursor] ?? "";
    const nextCharacter = sql[cursor + 1] ?? "";

    if (inLineComment) {
      if (character === "\n") {
        inLineComment = false;
      }
      cursor += 1;
      continue;
    }

    if (blockCommentDepth > 0) {
      if (character === "/" && nextCharacter === "*") {
        blockCommentDepth += 1;
        cursor += 2;
        continue;
      }
      if (character === "*" && nextCharacter === "/") {
        blockCommentDepth -= 1;
        cursor += 2;
        continue;
      }
      cursor += 1;
      continue;
    }

    if (dollarTag !== undefined) {
      if (sql.startsWith(dollarTag, cursor)) {
        cursor += dollarTag.length;
        dollarTag = undefined;
        continue;
      }
      cursor += 1;
      continue;
    }

    if (inSingleQuote) {
      if (character === "'" && nextCharacter === "'") {
        cursor += 2;
        continue;
      }
      if (character === "'") {
        inSingleQuote = false;
      }
      cursor += 1;
      continue;
    }

    if (inDoubleQuote) {
      if (character === '"' && nextCharacter === '"') {
        cursor += 2;
        continue;
      }
      if (character === '"') {
        inDoubleQuote = false;
      }
      cursor += 1;
      continue;
    }

    if (character === "-" && nextCharacter === "-") {
      inLineComment = true;
      cursor += 2;
      continue;
    }
    if (character === "/" && nextCharacter === "*") {
      blockCommentDepth = 1;
      cursor += 2;
      continue;
    }
    if (character === "'") {
      inSingleQuote = true;
      cursor += 1;
      continue;
    }
    if (character === '"') {
      inDoubleQuote = true;
      cursor += 1;
      continue;
    }
    if (character === "$") {
      const candidateTag = readDollarTag(sql, cursor);
      if (candidateTag !== undefined) {
        dollarTag = candidateTag;
        cursor += candidateTag.length;
        continue;
      }
    }
    if (character === ";") {
      const statement = sql.slice(statementStart, cursor).trim();
      if (statement.length > 0) {
        statements.push(statement);
      }
      statementStart = cursor + 1;
    }

    cursor += 1;
  }

  assert.equal(inSingleQuote, false, "SQL contains an unterminated single-quoted string");
  assert.equal(inDoubleQuote, false, "SQL contains an unterminated quoted identifier");
  assert.equal(blockCommentDepth, 0, "SQL contains an unterminated block comment");
  assert.equal(dollarTag, undefined, "SQL contains an unterminated dollar-quoted block");

  const trailingStatement = sql.slice(statementStart).trim();
  if (trailingStatement.length > 0) {
    statements.push(trailingStatement);
  }

  return statements;
};

const isTapStatement = (statement: string): boolean => {
  let normalized = statement.trimStart();

  while (normalized.startsWith("--") || normalized.startsWith("/*")) {
    if (normalized.startsWith("--")) {
      const commentEnd = normalized.indexOf("\n");
      normalized = commentEnd < 0 ? "" : normalized.slice(commentEnd + 1).trimStart();
      continue;
    }

    let cursor = 2;
    let depth = 1;
    while (cursor < normalized.length && depth > 0) {
      if (normalized.startsWith("/*", cursor)) {
        depth += 1;
        cursor += 2;
      } else if (normalized.startsWith("*/", cursor)) {
        depth -= 1;
        cursor += 2;
      } else {
        cursor += 1;
      }
    }
    normalized = normalized.slice(cursor).trimStart();
  }

  normalized = normalized.toLowerCase();
  return (
    normalized.startsWith("select extensions.plan(") ||
    normalized.startsWith("select extensions.has_") ||
    normalized.startsWith("select extensions.is(") ||
    normalized.startsWith("select extensions.ok(") ||
    normalized.startsWith("select extensions.lives_ok(") ||
    normalized.startsWith("select extensions.throws_ok(") ||
    normalized.startsWith("select pg_temp.throws_sqlstate(") ||
    normalized.startsWith("select * from extensions.finish()")
  );
};

export const buildLinkedPgtapCollector = (sql: string): string => {
  const statements = splitSqlStatements(sql);
  assert.equal(statements[0]?.toLowerCase(), "begin", "linked pgTAP source must start with BEGIN");
  assert.equal(
    statements.at(-1)?.toLowerCase(),
    "rollback",
    "linked pgTAP source must end with ROLLBACK",
  );

  const transformed = [
    "begin",
    "create temp sequence pg_temp.linked_tap_sequence",
    `create temp table pg_temp.linked_tap_results (
      sequence bigint not null default nextval('pg_temp.linked_tap_sequence'),
      result text not null
    ) on commit drop`,
    "grant insert, select on pg_temp.linked_tap_results to anon, authenticated, service_role",
    "grant usage, select on sequence pg_temp.linked_tap_sequence to anon, authenticated, service_role",
  ];

  for (const statement of statements.slice(1, -1)) {
    transformed.push(
      isTapStatement(statement)
        ? `insert into pg_temp.linked_tap_results (result) ${statement}`
        : statement,
    );
  }

  transformed.push("select result from pg_temp.linked_tap_results order by sequence", "rollback");
  return `${transformed.join(";\n\n")};\n`;
};
