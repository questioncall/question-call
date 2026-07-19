/**
 * Validated server-side environment access.
 *
 * Security-critical env vars must NEVER fall back to a literal default. A
 * fallback like `process.env.NEXTAUTH_SECRET || "default-secret"` fails open:
 * if the var is missing in a deploy environment nothing crashes, but every
 * token gets signed with a publicly-known constant and anyone can forge an
 * admin JWT. Fail fast at module load instead.
 *
 * Import the exported constants rather than reading process.env directly, so
 * the validation cannot be bypassed or drift between call sites.
 */

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Refusing to start with an insecure fallback.`,
    );
  }
  return value;
}

/**
 * Signing key for NextAuth web sessions, mobile access/refresh tokens, and
 * checkout handoff tokens. One secret, one trust domain — do not introduce a
 * second payment- or mobile-specific secret.
 */
export const JWT_SECRET = requireEnv("NEXTAUTH_SECRET");
