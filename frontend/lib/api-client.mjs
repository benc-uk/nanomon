// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - API client for calling the backend NanoMon API
// ----------------------------------------------------------------------------

import { config } from '../app.mjs'

export class APIClient {
  endpoint = 'http://localhost:8000'
  scopes = []
  msalApp = null

  constructor(endpoint, scopes, msalApp) {
    // Note we trim any trailing slash from the endpoint
    this.endpoint = endpoint.replace(/\/$/, '')

    // Both these are optional
    this.scopes = scopes
    this.msalApp = msalApp
  }

  async getMonitors() {
    return this._baseRequest('monitors')
  }

  async getMonitor(monId) {
    return this._baseRequest(`monitors/${monId}`)
  }

  async getResultsForMonitor(monId, max = 10) {
    return this._baseRequest(`monitors/${monId}/results?max=${max}`)
  }

  async createMonitor(monitor) {
    return this._baseRequest('monitors', 'POST', monitor, true)
  }

  async deleteMonitor(monId) {
    return this._baseRequest(`monitors/${monId}`, 'DELETE', null, true)
  }

  async updateMonitor(monId, monitor) {
    return this._baseRequest(`monitors/${monId}`, 'PUT', monitor, true)
  }

  async getResults(max = 50) {
    return this._baseRequest(`results?max=${max}`)
  }

  async importMonitors(monitors) {
    return this._baseRequest(`monitors/import`, 'POST', monitors, true)
  }

  async deleteAllMonitors() {
    return this._baseRequest(`monitors`, 'DELETE', null, true)
  }

  // All requests go through this method, it handles auth if required
  async _baseRequest(path, method = 'GET', body, authRequest = false) {
    if (config.apiDebug) {
      console.log(`### API request: ${method} ${this.endpoint}/${path}`)
    }

    // This block handles authentication if enabled and the request requires it
    let tokenRes = null
    if (authRequest && this.msalApp) {
      console.log(`### Acquiring access token, with scopes: ${this.scopes}`)
      try {
        tokenRes = await this.msalApp.acquireTokenSilent({
          scopes: this.scopes,
        })
      } catch (e) {
        tokenRes = await this.msalApp.acquireTokenPopup({
          scopes: this.scopes,
        })
      }

      if (!tokenRes) {
        throw new Error('Failed to get auth token')
      }
    }

    const headers = new Headers({ 'Content-Type': 'application/json' })

    // Append the access token to the request if we have one
    if (tokenRes && tokenRes.accessToken) {
      headers.append('Authorization', `Bearer ${tokenRes.accessToken}`)
    }

    const response = await fetch(`${this.endpoint}/${path}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers,
    })

    if (!response.ok) {
      // Check if there is a JSON error message
      let data = null
      try {
        data = await response.json()
      } catch (e) {
        // Not JSON, throw a generic error
        throw new Error(`API error /${path} ${response.status} ${response.statusText}`)
      }

      if (data.title !== undefined) {
        throw new Error(`${data.title}(${data.instance}): ${data.detail}`)
      }

      throw new Error(`API error /${path} ${response.status} ${response.statusText}`)
    }

    // Return unmarshalled object if response is JSON
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.indexOf('application/json') !== -1) {
      return await response.json()
    }

    return await response.text()
  }
}
