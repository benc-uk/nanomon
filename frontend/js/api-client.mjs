export class APIClient {
  apiEndpoint
  apiScopes

  constructor(apiEndpoint, apiScopes) {
    this.apiEndpoint = apiEndpoint.replace(/\/$/, '')
    this.apiScopes = apiScopes
  }

  async getMonitors() {
    return this.baseRequest('monitors')
  }

  async getResultsForMonitor(monId, max = 10) {
    return this.baseRequest(`monitors/${monId}/results?max=${max}`)
  }

  async baseRequest(path, method = 'GET', body, authenticated = false) {
    let tokenRes = null
    if (authenticated) {
      try {
        tokenRes = await msalInstance.acquireTokenSilent({
          scopes: this.apiScopes,
        })
      } catch (e) {
        tokenRes = await msalInstance.acquireTokenPopup({
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
        throw new Error(response.statusText)
      }

      if (data.title !== undefined) {
        throw new Error(`${data.title}(${data.instance}): ${data.detail}`)
      }
      throw new Error(response.statusText)
    }

    // Return unmarshalled object if response is JSON
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.indexOf('application/json') !== -1) {
      return await response.json()
    }

    return await response.text()
  }
}
