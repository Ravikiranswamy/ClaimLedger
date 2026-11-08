import { httpApi } from './http'
import { mockApi } from './mock'
import type { Api } from './types'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
export const api: Api = USE_MOCK ? mockApi : httpApi
export { ApiError } from './types'
