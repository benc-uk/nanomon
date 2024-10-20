// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - API client for calling the backend NanoMon API
// ----------------------------------------------------------------------------

// Extend the base APIClient class to add our specific API calls
import { APIClient as APIClientBase } from 'https://cdn.jsdelivr.net/gh/benc-uk/js-library@main/api-client.mjs'

export class APIClient extends APIClientBase {
  async getMonitors() {
    return this._request('monitors')
  }

  async getMonitor(monId) {
    return this._request(`monitors/${monId}`)
  }

  async getResultsForMonitor(monId, max = 10) {
    return this._request(`monitors/${monId}/results?max=${max}`)
  }

  async createMonitor(monitor) {
    return this._request('monitors', 'POST', monitor, true)
  }

  async deleteMonitor(monId) {
    return this._request(`monitors/${monId}`, 'DELETE', null, true)
  }

  async updateMonitor(monId, monitor) {
    return this._request(`monitors/${monId}`, 'PUT', monitor, true)
  }

  async getResults(max = 50) {
    return this._request(`results?max=${max}`)
  }

  async importMonitors(monitors) {
    return this._request(`monitors/import`, 'POST', monitors, true)
  }

  async deleteAllMonitors() {
    return this._request(`monitors`, 'DELETE', null, true)
  }

  async deleteAllResults() {
    return this._request(`results`, 'DELETE', null, true)
  }
}
