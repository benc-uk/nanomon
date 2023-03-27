import { config } from '../app.mjs'

export const aboutComponent = (api) => ({
  clientID: config.AUTH_CLIENT_ID,
  apiEndpoint: config.API_ENDPOINT,
  version: config.VERSION,
  buildInfo: config.BUILD_INFO,

  async init() {},
})
