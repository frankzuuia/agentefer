import { describe, expect, it } from "vitest";

import {
  buildLinkedMigrationPgtapCollector,
  buildLinkedPgtapCollector,
  splitSqlStatements,
} from "../src/linked-pgtap.js";

describe("linked pgTAP SQL lexer", () => {
  it("splits only semicolons outside SQL quoting and comments", () => {
    const sql = `
      begin;
      select 'a;''b';
      select "quoted;identifier";
      /* outer; /* nested; */ done; */
      create function pg_temp.example() returns text language sql as $body$
        select 'inside;dollar';
      $body$;
      -- line; comment
      rollback;
    `;

    expect(splitSqlStatements(sql)).toEqual([
      "begin",
      "select 'a;''b'",
      'select "quoted;identifier"',
      "/* outer; /* nested; */ done; */\n      create function pg_temp.example() returns text language sql as $body$\n        select 'inside;dollar';\n      $body$",
      "-- line; comment\n      rollback",
    ]);
  });

  it.each([
    "begin; select 'unterminated; rollback;",
    'begin; select "unterminated; rollback;',
    "begin; /* unterminated; rollback;",
    "begin; select $body$unterminated; rollback;",
  ])("rejects malformed lexical input: %s", (sql) => {
    expect(() => splitSqlStatements(sql)).toThrow("unterminated");
  });
});

describe("linked pgTAP collector", () => {
  it("collects every TAP-producing statement and preserves transactional rollback", () => {
    const transformed = buildLinkedPgtapCollector(`
      begin;
      create extension if not exists pgtap with schema extensions;
      select extensions.plan(4);
      -- assertion with leading context
      select extensions.ok(true, 'passes');
      select extensions.col_not_null('public', 'example', 'id', 'id is required');
      select extensions.function_privs_are(
        'public',
        'example',
        ARRAY[]::text[],
        'public',
        ARRAY[]::text[],
        'example is not public'
      );
      select set_config('request.jwt.claim.sub', 'subject', true);
      select pg_temp.throws_sqlstate('select 1', '00000', 'diagnostic');
      select * from extensions.finish();
      rollback;
    `);

    expect(transformed).toContain("create temp table pg_temp.linked_tap_results");
    expect(transformed).toContain("create temp sequence pg_temp.linked_tap_sequence");
    expect(transformed).toContain(
      "grant insert, select on pg_temp.linked_tap_results to anon, authenticated, service_role",
    );
    expect(transformed).toContain(
      "insert into pg_temp.linked_tap_results (result) -- assertion with leading context\n      select extensions.ok",
    );
    expect(transformed).toContain(
      "insert into pg_temp.linked_tap_results (result) select pg_temp.throws_sqlstate",
    );
    expect(transformed).toContain(
      "insert into pg_temp.linked_tap_results (result) select extensions.col_not_null",
    );
    expect(transformed).toContain(
      "insert into pg_temp.linked_tap_results (result) select extensions.function_privs_are",
    );
    expect(transformed).toContain("select set_config");
    expect(transformed).toContain(
      "select result from pg_temp.linked_tap_results order by sequence;\n\nrollback;",
    );
  });

  it("refuses a source that could persist test fixtures", () => {
    expect(() => buildLinkedPgtapCollector("select extensions.ok(true);")).toThrow(
      "linked pgTAP source must start with BEGIN",
    );
    expect(() => buildLinkedPgtapCollector("begin; select extensions.ok(true); commit;")).toThrow(
      "linked pgTAP source must end with ROLLBACK",
    );
  });
});

describe("linked migration pgTAP collector", () => {
  it("rehearses committed migration SQL and pgTAP inside one rolled-back transaction", () => {
    const transformed = buildLinkedMigrationPgtapCollector(
      `
        begin;
        create table public.rehearsal_table (id bigint primary key);
        commit;
      `,
      `
        begin;
        create extension if not exists pgtap with schema extensions;
        select extensions.plan(1);
        select extensions.has_table('public', 'rehearsal_table');
        select * from extensions.finish();
        rollback;
      `,
    );

    expect(transformed).toContain("create table public.rehearsal_table");
    expect(
      splitSqlStatements(transformed).some((statement) => statement.toLowerCase() === "commit"),
    ).toBe(false);
    expect(transformed.match(/\bbegin\b/gi)).toHaveLength(1);
    expect(transformed).toContain(
      "insert into pg_temp.linked_tap_results (result) select extensions.has_table",
    );
    expect(transformed.trimEnd().endsWith("rollback;")).toBe(true);
  });

  it("injects mutation SQL after the migration and preserves rollback", () => {
    const transformed = buildLinkedMigrationPgtapCollector(
      "begin; create table public.target (id bigint); commit;",
      "begin; select extensions.plan(1); select extensions.ok(true, 'runs'); rollback;",
      "alter table public.target add column mutated boolean;",
    );

    expect(transformed.indexOf("create table public.target")).toBeLessThan(
      transformed.indexOf("alter table public.target"),
    );
    expect(transformed.indexOf("alter table public.target")).toBeLessThan(
      transformed.indexOf("select extensions.plan"),
    );
    expect(transformed.trimEnd().endsWith("rollback;")).toBe(true);
  });

  it("rejects mutation SQL that can escape the rehearsal transaction", () => {
    expect(() =>
      buildLinkedMigrationPgtapCollector(
        "begin; select 1; commit;",
        "begin; select extensions.plan(0); rollback;",
        "commit; drop table public.target;",
      ),
    ).toThrow("cannot control the rehearsal transaction");
  });

  it.each([
    ["select 1; commit;", "begin; select extensions.plan(0); rollback;", "must start with BEGIN"],
    [
      "begin; select 1; rollback;",
      "begin; select extensions.plan(0); rollback;",
      "must end with COMMIT",
    ],
    ["begin; select 1; commit;", "select extensions.plan(0); rollback;", "must start with BEGIN"],
    [
      "begin; select 1; commit;",
      "begin; select extensions.plan(0); commit;",
      "must end with ROLLBACK",
    ],
  ])("rejects unsafe transaction boundaries", (migrationSql, pgtapSql, message) => {
    expect(() => buildLinkedMigrationPgtapCollector(migrationSql, pgtapSql)).toThrow(message);
  });
});
