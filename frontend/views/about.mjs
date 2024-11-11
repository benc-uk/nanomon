// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend
// ----------------------------------------------------------------------------

import { config } from '../app.mjs'

export const aboutComponent = (userAccount) => ({
  /** @type string */
  clientID: config.AUTH_CLIENT_ID,

  /** @type string */
  apiEndpoint: config.API_ENDPOINT,

  /** @type string */
  version: config.VERSION,

  /** @type string */
  buildInfo: config.BUILD_INFO,

  /** @type {import('https://cdn.jsdelivr.net/gh/benc-uk/js-library@main/auth-provider-msal.mjs').UserAccount} */
  userAccount: userAccount,

  async init() {
    window.addEventListener('user-changed', (/** @type CustomEvent */ e) => {
      this.userAccount = e.detail
    })
  },
})
