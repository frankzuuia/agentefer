import { describe, expect, it } from "vitest";

import { normalizeGeneratedDatabaseTypes } from "../src/type-normalizer.js";

const prefix = "export type Json = string | number | boolean | null;\n\nexport type Database = {\n";
const apiSchema = "  api: {\n    Tables: { [_ in never]: never };\n  };\n};\n";

describe("generated database type normalization", () => {
  it("removes only version-coupled Supabase metadata and its generated comments", () => {
    const remoteTypes = `${prefix}  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
${apiSchema}`;

    expect(normalizeGeneratedDatabaseTypes(remoteTypes)).toBe(`${prefix}${apiSchema}`);
  });

  it("normalizes the raw semicolon-free metadata emitted by the Supabase CLI", () => {
    const rawTypes = `${prefix}  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
${apiSchema}`;

    expect(normalizeGeneratedDatabaseTypes(rawTypes)).toBe(`${prefix}${apiSchema}`);
  });

  it("preserves local generated types byte-for-byte when metadata is absent", () => {
    const localTypes = `${prefix}${apiSchema}`.replaceAll("\n", "\r\n");

    expect(normalizeGeneratedDatabaseTypes(localTypes)).toBe(localTypes);
  });

  it("preserves line endings while removing a metadata block without comments", () => {
    const remoteTypes = `${prefix}  __InternalSupabase: {
    PostgrestVersion: "future";
  };
${apiSchema}`.replaceAll("\n", "\r\n");

    expect(normalizeGeneratedDatabaseTypes(remoteTypes)).toBe(
      `${prefix}${apiSchema}`.replaceAll("\n", "\r\n"),
    );
  });

  it("preserves partially matching comments instead of deleting non-generated content", () => {
    const remoteTypes = `${prefix}  // Allows to automatically instantiate createClient with right options
  // retained project documentation
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
${apiSchema}`;

    expect(normalizeGeneratedDatabaseTypes(remoteTypes))
      .toBe(`${prefix}  // Allows to automatically instantiate createClient with right options
  // retained project documentation
${apiSchema}`);
  });

  it("fails closed for duplicate internal metadata blocks", () => {
    const duplicated = `${prefix}  __InternalSupabase: {
  };
  __InternalSupabase: {
  };
${apiSchema}`;

    expect(() => normalizeGeneratedDatabaseTypes(duplicated)).toThrow("duplicate");
  });

  it("fails closed when a root schema brace would otherwise mask an incomplete block", () => {
    const incomplete = `${prefix}  __InternalSupabase: {
    PostgrestVersion: "14.15";
${apiSchema}`;

    expect(() => normalizeGeneratedDatabaseTypes(incomplete)).toThrow("incomplete");
  });

  it("fails closed when internal metadata never closes", () => {
    const incomplete = `${prefix}  __InternalSupabase: {
    PostgrestVersion: "14.15";`;

    expect(() => normalizeGeneratedDatabaseTypes(incomplete)).toThrow(
      "Generated database type metadata block is incomplete",
    );
  });

  it("fails closed when internal metadata has negative brace balance", () => {
    const invalidBalance = `${prefix}  __InternalSupabase: {
  }}`;

    expect(() => normalizeGeneratedDatabaseTypes(invalidBalance)).toThrow(
      "Generated database type metadata has invalid brace balance",
    );
  });
});
