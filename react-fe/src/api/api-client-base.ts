// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2024. Licensed under the MIT License.
// Generic API client for calling any REST API
// 2025 - TypeScript version for added sadness
// ----------------------------------------------------------------------------

export interface AuthProvider {
  getAccessToken(): Promise<string>
}

interface SuccessFunction {
  (response: Response): boolean
}

interface APIConfig {
  /** Extra verbose logging */
  verbose?: boolean

  /** Custom headers to add to every request */
  headers?: Headers

  /** Fake network delay in milliseconds */
  delay?: number

  /** Auth provider to use for authentication */
  authProvider?: AuthProvider | null

  /** Success function to determine if a response is considered successful */
  success?: SuccessFunction
}
/**
 * Generic API client for calling any REST API
 */
export class APIClientBase {
  endpoint = '/api'

  // Default config
  config: APIConfig = {
    verbose: false,
    headers: new Headers(),
    delay: 0,
    authProvider: null,

    // Default success function, checks the response status code is 2xx
    success: (response) => response.ok,
  }

  constructor(endpoint: string, config?: APIConfig) {
    // Trim any trailing slash from the endpoint, for consistency
    this.endpoint = endpoint.replace(/\/$/, '')

    this.config = { ...this.config, ...config }

    this.debug(`### API client created for endpoint ${this.endpoint}`)

    if (this.config.authProvider) {
      this.debug(`### API client: auth enabled with ${this.config.authProvider.constructor.name}`)
    }
  }

  // All requests go through this, it handles serialization, auth etc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async request(path: string, method = 'GET', payload: any = '', auth = false, reqHeaders = new Headers()) {
    this.debug(`### API request: ${method} ${this.endpoint}/${path}`)

    const headers = new Headers()
    let body = null as BodyInit | null

    if (payload) {
      try {
        body = JSON.stringify(payload)
        headers.set('Content-Type', 'application/json')
      } catch (err) {
        console.warn('Failed to JSON stringify payload', err)
        // If we can't JSON stringify, just send the raw payload and hope for the best
        body = payload
      }
    }

    // This handles authentication if enabled and the request requires it
    if (auth && this.config.authProvider) {
      let token = null
      try {
        this.debug(`### API client: Getting access token...`)

        // Call the auth provider to get a token
        token = await this.config.authProvider.getAccessToken()
      } catch (_err) {
        throw new Error('Failed to get access token')
      }

      // Append the access token to the request if we have one
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
    }

    // Merge headers together
    if (this.config.headers) {
      for (const [key, value] of this.config.headers.entries()) {
        headers.set(key, value)
      }
    }

    if (reqHeaders) {
      for (const [key, value] of reqHeaders.entries()) {
        headers.set(key, value)
      }
    }

    // Make the actual HTTP request
    const reqOptions = {
      method,
      body,
      headers,
    }

    if (this.config.verbose) {
      for (const [key, value] of headers.entries()) {
        this.debug(`### API request header: ${key}: ${value}`)
      }
    }

    const response = await fetch(`${this.endpoint}/${path}`, reqOptions)

    this.debug(`### API response: ${response.status} ${response.statusText}`)

    // Add a fake delay to simulate network latency
    if (this.config.delay && this.config.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delay))
    }

    // All responses are checked via the success function
    // - check function exists & it returns false
    if (this.config.success !== undefined && !this.config.success(response)) {
      // Check if there is a JSON error object in the response
      let errorData = null
      try {
        errorData = await response.json()
      } catch (_err) {
        throw new Error(`API error /${path} ${response.status} ${response.statusText}`)
      }

      // Support for RFC 7807 / 9457 error messages
      if (errorData.title !== undefined) {
        throw new Error(`${errorData.title} (${errorData.instance}): ${errorData.detail}`)
      }

      throw new Error(`API error /${path} ${response.status} ${response.statusText}`)
    }

    // Return unmarshalled object if response is JSON
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.indexOf('application/json') !== -1) {
      return await response.json()
    }

    // Otherwise return plain text
    return await response.text()
  }

  // Debug logging
  debug(...args: string[]) {
    if (this.config.verbose) {
      console.log(...args)
    }
  }
}
