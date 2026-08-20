import { describe, expect, it } from "vitest";

import {
  parseAdminMetaWhatsAppRegistrationBody,
  parseAdminMetaRegistrationBody,
  parseAdminOrganizationQuery,
  parseBearerAccessToken,
} from "../src/admin-meta-protocol.js";

const organizationId = "b4031000-0000-4000-8000-000000000001";
const appSecret = "meta-app-secret-contract-value";
const verifyToken = "meta-webhook-verify-contract-value";

const validRegistration = () => ({
  organizationId,
  externalAppId: "216409300082702",
  displayName: "Pruebas Frank",
  apiVersion: "v26.0",
  appSecret,
  webhookVerifyToken: verifyToken,
});

describe("admin Meta protocol", () => {
  it("wraps a bounded bearer token without exposing it through serialization", () => {
    const token = "header.payload.signature";
    const parsed = parseBearerAccessToken(`Bearer ${token}`);

    expect(parsed?.reveal()).toBe(token);
    expect(JSON.stringify(parsed)).toBe('"[REDACTED]"');
  });

  it.each(["x", "x".repeat(16_384)])("accepts a bearer token at a supported boundary", (token) => {
    expect(parseBearerAccessToken(`Bearer ${token}`)?.reveal()).toBe(token);
  });

  it.each([
    undefined,
    null,
    42,
    "",
    "bearer lowercase",
    "Bearer ",
    "Bearer two tokens",
    "Bearer token\nnext-header",
    "Bearer token\u007fnext-header",
    `Bearer ${"x".repeat(16_385)}`,
  ])("rejects an invalid authorization value: %j", (authorization) => {
    expect(parseBearerAccessToken(authorization)).toBeUndefined();
  });

  it("normalizes public fields and protects both secrets", () => {
    const parsed = parseAdminMetaRegistrationBody({
      ...validRegistration(),
      externalAppId: " 216409300082702 ",
      displayName: " Pruebas Frank ",
      apiVersion: " v26.0 ",
    });

    expect(parsed).toMatchObject({
      organizationId,
      externalAppId: "216409300082702",
      displayName: "Pruebas Frank",
      apiVersion: "v26.0",
    });
    expect(parsed?.appSecret.reveal()).toBe(appSecret);
    expect(parsed?.webhookVerifyToken.reveal()).toBe(verifyToken);
    expect(JSON.stringify(parsed)).not.toContain(appSecret);
    expect(JSON.stringify(parsed)).not.toContain(verifyToken);
  });

  it("accepts every inclusive registration boundary", () => {
    const registrations = [
      {
        ...validRegistration(),
        externalAppId: "1",
        displayName: "x",
        apiVersion: "v1.0",
        appSecret: "x".repeat(16),
        webhookVerifyToken: "y".repeat(16),
      },
      {
        ...validRegistration(),
        externalAppId: "9".repeat(64),
        displayName: "x".repeat(160),
        apiVersion: `v${"1".repeat(29)}.0`,
        appSecret: "x".repeat(65_536),
        webhookVerifyToken: "y".repeat(65_536),
      },
    ];

    for (const registration of registrations) {
      const parsed = parseAdminMetaRegistrationBody(registration);

      expect(parsed).toBeDefined();
      expect(parsed?.externalAppId).toBe(registration.externalAppId);
      expect(parsed?.displayName).toBe(registration.displayName);
      expect(parsed?.apiVersion).toBe(registration.apiVersion);
      expect(parsed?.appSecret.reveal()).toBe(registration.appSecret);
      expect(parsed?.webhookVerifyToken.reveal()).toBe(registration.webhookVerifyToken);
    }
  });

  it.each([
    undefined,
    null,
    [],
    "registration",
    { ...validRegistration(), unexpected: "field" },
    {
      organizationId,
      externalAppId: "216409300082702",
      displayName: "Pruebas Frank",
      apiVersion: "v26.0",
      webhookVerifyToken: verifyToken,
    },
    { ...validRegistration(), organizationId: "not-a-uuid" },
    { ...validRegistration(), organizationId: 42 },
    { ...validRegistration(), externalAppId: "" },
    { ...validRegistration(), externalAppId: 42 },
    { ...validRegistration(), externalAppId: "app-216409300082702" },
    { ...validRegistration(), externalAppId: "1".repeat(65) },
    { ...validRegistration(), externalAppId: "x".repeat(256) },
    { ...validRegistration(), displayName: "bad\nname" },
    { ...validRegistration(), displayName: "bad\u007fname" },
    { ...validRegistration(), displayName: null },
    { ...validRegistration(), displayName: "x".repeat(161) },
    { ...validRegistration(), apiVersion: "v" },
    { ...validRegistration(), apiVersion: "v26" },
    { ...validRegistration(), apiVersion: "26.0" },
    { ...validRegistration(), apiVersion: "v26.0/path" },
    { ...validRegistration(), apiVersion: [] },
    { ...validRegistration(), apiVersion: "x".repeat(33) },
    { ...validRegistration(), appSecret: "short" },
    { ...validRegistration(), appSecret: 42 },
    { ...validRegistration(), appSecret: "x".repeat(65_537) },
    { ...validRegistration(), webhookVerifyToken: "short" },
    { ...validRegistration(), webhookVerifyToken: null },
    { ...validRegistration(), webhookVerifyToken: "x".repeat(65_537) },
  ])("rejects an invalid registration envelope", (registration) => {
    expect(parseAdminMetaRegistrationBody(registration)).toBeUndefined();
  });

  it("parses only an exact tenant query envelope", () => {
    expect(parseAdminOrganizationQuery({ organizationId })).toEqual({ organizationId });
    expect(parseAdminOrganizationQuery({ organizationId, extra: "blocked" })).toBeUndefined();
    expect(parseAdminOrganizationQuery({ organizationId: "not-a-uuid" })).toBeUndefined();
    expect(parseAdminOrganizationQuery(undefined)).toBeUndefined();
  });

  it("normalizes a WhatsApp channel registration and protects its token", () => {
    const accessToken = "meta-system-user-access-token-contract-value";
    const parsed = parseAdminMetaWhatsAppRegistrationBody({
      organizationId,
      metaApplicationId: "b4031000-0000-4000-8000-000000000002",
      wabaId: " 111111111111111 ",
      phoneNumberId: " 222222222222222 ",
      accessToken,
    });

    expect(parsed).toMatchObject({
      organizationId,
      metaApplicationId: "b4031000-0000-4000-8000-000000000002",
      wabaId: "111111111111111",
      phoneNumberId: "222222222222222",
    });
    expect(parsed?.accessToken.reveal()).toBe(accessToken);
    expect(JSON.stringify(parsed)).not.toContain(accessToken);
  });

  it.each([
    undefined,
    null,
    [],
    {},
    {
      organizationId,
      metaApplicationId: "b4031000-0000-4000-8000-000000000002",
      wabaId: "111111111111111",
      phoneNumberId: "222222222222222",
      accessToken: "meta-system-user-access-token-contract-value",
      extra: "blocked",
    },
    {
      organizationId: "not-a-uuid",
      metaApplicationId: "b4031000-0000-4000-8000-000000000002",
      wabaId: "111111111111111",
      phoneNumberId: "222222222222222",
      accessToken: "meta-system-user-access-token-contract-value",
    },
    {
      organizationId,
      metaApplicationId: "not-a-uuid",
      wabaId: "111111111111111",
      phoneNumberId: "222222222222222",
      accessToken: "meta-system-user-access-token-contract-value",
    },
    {
      organizationId,
      metaApplicationId: "b4031000-0000-4000-8000-000000000002",
      wabaId: "not-a-waba",
      phoneNumberId: "222222222222222",
      accessToken: "meta-system-user-access-token-contract-value",
    },
    {
      organizationId,
      metaApplicationId: "b4031000-0000-4000-8000-000000000002",
      wabaId: "111111111111111",
      phoneNumberId: "phone/id",
      accessToken: "meta-system-user-access-token-contract-value",
    },
    {
      organizationId,
      metaApplicationId: "b4031000-0000-4000-8000-000000000002",
      wabaId: "111111111111111",
      phoneNumberId: "222222222222222",
      accessToken: "short",
    },
  ])("rejects an invalid WhatsApp registration envelope", (registration) => {
    expect(parseAdminMetaWhatsAppRegistrationBody(registration)).toBeUndefined();
  });
});
