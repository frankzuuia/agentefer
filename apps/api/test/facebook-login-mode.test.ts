import { describe, expect, it } from "vitest";
import { parseFacebookLoginMode } from "../src/facebook-login-mode.js";

describe("explicit Facebook login modes", () => {
  it.each(["user_page", "business_integration_system_user"])(
    "preserves the exact configured mode %s",
    (mode) => {
      expect(parseFacebookLoginMode(mode)).toBe(mode);
    },
  );
  it.each([undefined, null, "", "USER_PAGE", "automatic", 1, {}, []])(
    "rejects unsupported value %#",
    (mode) => {
      expect(parseFacebookLoginMode(mode)).toBeUndefined();
    },
  );
});
