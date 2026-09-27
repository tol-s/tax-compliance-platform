import "server-only"

/** Server-only configuration. Never import from client components. */
function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}

export const serverEnv = {
  /** Base URL of the Laravel API as reachable from the Next.js server. */
  get apiUrl() {
    return required("API_URL").replace(/\/$/, "")
  },
  /** 32+ byte secret used to encrypt the session cookie. */
  get sessionSecret() {
    const secret = required("SESSION_SECRET")
    if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters")
    return secret
  },
  get isProduction() {
    return process.env.NODE_ENV === "production"
  },
}
