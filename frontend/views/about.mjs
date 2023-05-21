// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend
// ----------------------------------------------------------------------------

import { config } from '../app.mjs'

export const aboutComponent = () => ({
  clientID: config.AUTH_CLIENT_ID,
  apiEndpoint: config.API_ENDPOINT,
  version: config.VERSION,
  buildInfo: config.BUILD_INFO,

  async init() {},
})
