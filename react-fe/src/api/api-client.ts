// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2025. Licensed under the MIT License.
// NanoMon Frontend - API client for calling the backend NanoMon API
// ----------------------------------------------------------------------------

import { APIClientBase } from './api-client-base'
import { Monitor, Result } from '../types'

export class APIClient extends APIClientBase {
  constructor(apiEndpoint: string) {
    super(apiEndpoint || '/api', {
      delay: 0,
      verbose: true,
    })
  }

  async getMonitors(): Promise<Monitor[]> {
    return this.request('monitors')
  }

  async getMonitor(monitorID: string): Promise<Monitor> {
    return this.request(`monitors/${monitorID}`)
  }

  async deleteMonitor(monitorID: string): Promise<void> {
    return this.request(`monitors/${monitorID}`, 'DELETE')
  }

  async getResultsForMonitor(monitorID: string, max = 10): Promise<Result[]> {
    return this.request(`monitors/${monitorID}/results?max=${max}`)
  }
}
