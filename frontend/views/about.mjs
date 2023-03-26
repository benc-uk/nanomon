import { API_ENDPOINT, AUTH_CLIENT_ID, VERSION, BUILD_INFO } from '../app.mjs'

export const aboutComponent = (api) => ({
  clientID: AUTH_CLIENT_ID,
  apiEndpoint: API_ENDPOINT,
  version: VERSION,
  buildInfo: BUILD_INFO,

  async init() {},
})
