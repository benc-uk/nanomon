//
// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2025. Licensed under the MIT License.
// NanoMon Frontend - API client for calling the backend NanoMon API
// ----------------------------------------------------------------------------

import { APIClientBase, AuthProvider } from './api-client-base'
import { Monitor, MonitorFromDB, Result } from '../types'

export class APIClient extends APIClientBase {
  constructor(apiEndpoint: string, authProvider: AuthProvider | null) {
    super(apiEndpoint || '/api', {
      delay: 110,
      verbose: false,
      authProvider,
    })
  }

  async getMonitors(): Promise<MonitorFromDB[]> {
    return this.request('monitors', 'GET') as Promise<MonitorFromDB[]>
  }

  async getMonitor(monitorID: string): Promise<MonitorFromDB> {
    return this.request(`monitors/${monitorID}`) as Promise<MonitorFromDB>
  }

  async deleteMonitor(monitorID: string): Promise<void> {
    return this.request(`monitors/${monitorID}`, 'DELETE', null, true) as Promise<void>
  }

  async deleteAllMonitors(): Promise<void> {
    return this.request('monitors', 'DELETE', null, true) as Promise<void>
  }

  async deleteAllResults(): Promise<void> {
    return this.request('results', 'DELETE', null, true) as Promise<void>
  }

  async getResultsForMonitor(monitorID: string, max = 20): Promise<Result[]> {
    return this.request(`monitors/${monitorID}/results?max=${max}`) as Promise<Result[]>
  }

  async getResults(max = 100): Promise<Result[]> {
    return this.request(`results?max=${max}`) as Promise<Result[]>
  }

  async importMonitors(monitors: Monitor[]): Promise<void> {
    return this.request('monitors/import', 'POST', monitors, true) as Promise<void>
  }

  async createMonitor(monitor: Monitor): Promise<MonitorFromDB> {
    return this.request('monitors', 'POST', monitor, true) as Promise<MonitorFromDB>
  }

  async updateMonitor(monitor: MonitorFromDB): Promise<void> {
    return this.request(`monitors/${monitor.id}`, 'PUT', monitor, true) as Promise<void>
  }
}
