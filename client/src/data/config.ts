// Base URL for the DraftKit data API (the Deno server, used by baseball).
//
// Point this at wherever the baseball server is deployed. Override at build
// time with VITE_API_URL (e.g. in a .env file or the CI environment).
export const API_URL = import.meta.env.VITE_API_URL || 'https://baseball-data.deno.dev';

// Namespace a localStorage key by sport. Baseball keeps the legacy unprefixed
// keys (so existing saved data keeps working); other sports are prefixed.
export function storageKey(sport: string, key: string): string {
    return sport === 'baseball' ? key : `${sport}_${key}`;
}
