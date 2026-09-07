export type FacebookLoginMode = "business_integration_system_user" | "user_page";

export function parseFacebookLoginMode(value: unknown): FacebookLoginMode | undefined {
  return value === "business_integration_system_user" || value === "user_page" ? value : undefined;
}
