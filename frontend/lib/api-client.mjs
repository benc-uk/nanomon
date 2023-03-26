export class APIClient {
  apiEndpoint = 'http://localhost:8000'
  apiScopes = []
  msalApp = null

  constructor(apiEndpoint, apiScopes, msalApp) {
    this.apiEndpoint = apiEndpoint.replace(/\/$/, '')
    this.apiScopes = apiScopes
    this.msalApp = msalApp
  }

  async getMonitors() {
    return this.baseRequest('monitors')
  }

  async getMonitor(monId) {
    return this.baseRequest(`monitors/${monId}`)
  }

  async getResultsForMonitor(monId, max = 10) {
    return this.baseRequest(`monitors/${monId}/results?max=${max}`)
  }

  async createMonitor(monitor) {
    return this.baseRequest('monitors', 'POST', monitor, true)
  }

  async deleteMonitor(monId) {
    return this.baseRequest(`monitors/${monId}`, 'DELETE', null, true)
  }

  async updateMonitor(monId, monitor) {
    return this.baseRequest(`monitors/${monId}`, 'PUT', monitor, true)
  }

  async getResults(max) {
    return this.baseRequest(`results?max=${max}`)
  }

  async baseRequest(path, method = 'GET', body, authRequest = false) {
    let tokenRes = null
    if (authRequest && this.msalApp) {
      console.log('### Getting access token with scopes', this.apiScopes)
      try {
        tokenRes = await this.msalApp.acquireTokenSilent({
          scopes: this.apiScopes,
        })
      } catch (e) {
        tokenRes = await this.msalApp.acquireTokenPopup({
          scopes: this.apiScopes,
        })
      }
      if (!tokenRes) throw new Error('Failed to get auth token')
    }

    const headers = new Headers({ 'Content-Type': 'application/json' })
    if (tokenRes && tokenRes.accessToken) {
      headers.append('Authorization', `Bearer ${tokenRes.accessToken}`)
    }

    const response = await fetch(`${this.apiEndpoint}/${path}`, {
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
