export const fetcher = (...args: Parameters<typeof fetch>) => fetch(...args).then(res => res.json())

export { API_URL } from './config'