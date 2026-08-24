// Base URL for the DraftKit data API (the Deno server).
//
// Point this at wherever the football server is deployed. Override at build
// time with VITE_API_URL (e.g. in a .env file or the CI environment).
export const API_URL = import.meta.env.VITE_API_URL || 'https://football-data.deno.dev';
