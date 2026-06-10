/** Admin/auth configuration (spec §3.3). Injected into the app for testability. */
export interface AdminConfig {
  /** bcrypt hash of the admin password (env ADMIN_PASSWORD). Empty disables login. */
  passwordHash: string;
  /** Secret for signing admin/session JWTs (env JWT_SECRET). */
  jwtSecret: string;
}

export function getAdminConfig(): AdminConfig {
  return {
    passwordHash: process.env.ADMIN_PASSWORD ?? '',
    jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret',
  };
}
