// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - API client for calling the backend NanoMon API
// ----------------------------------------------------------------------------

import { APIClient as APIClientBase } from 'https://cdn.jsdelivr.net/gh/benc-uk/js-library@main/api-client.mjs'

/**
 * @type APIClient
 */
export class APIClient extends APIClientBase {
  /**
   * Get all monitors
   * @returns {Promise<Nanomon.Monitor[]>}
   */
  async getMonitors() {
    return this._request('monitors')
  }

  /**
   * Get a single monitor by ID
   * @param {string} monId
   * @returns {Promise<Nanomon.Monitor>}
   */
  async getMonitor(monId) {
    return this._request(`monitors/${monId}`)
  }

  /**
   * Get a set of results for a monitor
   * @param {string} monId
   * @param {number} max
   * @returns {Promise<Nanomon.Result[]>}
   */
  async getResultsForMonitor(monId, max = 10) {
    return this._request(`monitors/${monId}/results?max=${max}`)
  }

  /**
   * Create a new monitor in the system
   * @param {Nanomon.Monitor} monitor
   * @returns {Promise<Nanomon.Monitor>}
   */
  async createMonitor(monitor) {
    return this._request('monitors', 'POST', monitor, true)
  }

  /**
   * Delete a monitor by ID
   * @param {string} monId
   * @returns {Promise<void>}
   */
  async deleteMonitor(monId) {
    return this._request(`monitors/${monId}`, 'DELETE', null, true)
  }

  /**
   * Update an existing monitor
   * @param {string} monId
   * @param {Nanomon.Monitor} monitor
   * @returns {Promise<Nanomon.Monitor>}
   */
  async updateMonitor(monId, monitor) {
    return this._request(`monitors/${monId}`, 'PUT', monitor, true)
  }

  /**
   * Get all results, but limited to a maximum number
   * @param {number} max
   * @returns {Promise<Nanomon.Result[]>}
   */
  async getResults(max = 50) {
    return this._request(`results?max=${max}`)
  }

  /**
   * Import a set of monitors
   * @param {Nanomon.Monitor[]} monitors
   * @returns {Promise<void>}
   */
  async importMonitors(monitors) {
    return this._request(`monitors/import`, 'POST', monitors, true)
  }

  /**
   * Delete all monitors and results
   * @returns {Promise<void>}
   */
  async deleteAllMonitors() {
    return this._request(`monitors`, 'DELETE', null, true)
  }

  /**
   * Delete all results
   * @returns {Promise<void>}
   */
  async deleteAllResults() {
    return this._request(`results`, 'DELETE', null, true)
  }
}
