// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2025. Licensed under the MIT License.
// NanoMon Frontend - API client for calling the backend NanoMon API
// ----------------------------------------------------------------------------

import { APIClientBase, AuthProvider } from './api-client-base'
import { Monitor, Result } from '../types'

export class APIClient extends APIClientBase {
  constructor(apiEndpoint: string, authProvider: AuthProvider | null) {
    super(apiEndpoint || '/api', {
      delay: 0,
      verbose: false,
      authProvider,
    })
  }

  async getMonitors(): Promise<Monitor[]> {
    return this.request('monitors', 'GET')
  }

  async getMonitor(monitorID: string): Promise<Monitor> {
    return this.request(`monitors/${monitorID}`)
  }

  async deleteMonitor(monitorID: string): Promise<void> {
    return this.request(`monitors/${monitorID}`, 'DELETE', null, true)
  }

  async deleteAllMonitors(): Promise<void> {
    return this.request('monitors', 'DELETE', null, true)
  }

  async deleteAllResults(): Promise<void> {
    return this.request('results', 'DELETE', null, true)
  }

  async getResultsForMonitor(monitorID: string, max = 20): Promise<Result[]> {
    return this.request(`monitors/${monitorID}/results?max=${max}`)
  }

  async getResults(max = 100): Promise<Result[]> {
    return this.request(`results?max=${max}`)
  }

  async importMonitors(monitors: Monitor[]): Promise<void> {
    return this.request('monitors/import', 'POST', monitors, true)
  }
}
