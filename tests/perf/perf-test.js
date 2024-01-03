import http from "k6/http";
import { group, check, sleep } from "k6";
import { Trend } from "k6/metrics";

// Import static or environmental test data from a file
import * as data from "./test-data.js";

// Adds reporting
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.3/index.js";

// Top level test parameters & defaults
const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const API_PATH = __ENV.API_PATH || "/api";
const SLEEP_DURATION = parseFloat(__ENV.TEST_SLEEP) || 0.1;

// Execution options for k6 run
export const options = {
  scenarios: {
    constant_load: {
      // See https://k6.io/docs/using-k6/scenarios/#executors
      executor: "constant-vus",

      // common scenario configuration
      startTime: "0s",
      gracefulStop: "5s",

      // executor-specific configuration
      vus: __ENV.TEST_VUS || 1,
      duration: __ENV.TEST_DURATION || "5s",
    },
  },

  // These will need adjusting
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<5000"],
  },
};

// Force the tests to run as a single iteration, no scenario
if (__ENV.TEST_ONE_ITER == "true") {
  delete options.scenarios;
  options.vus = 1;
  options.iterations = 1;
}

// Custom trends allow us to track metrics for individual API calls
let getMonitorsTrend = new Trend("getMonitors");
let getResultsTrend = new Trend("getResults");
let createMonitorsTrend = new Trend("createMonitors");

const endpoint = BASE_URL + API_PATH;

const headers = {
  "Content-Type": "application/json",
};

export default async function () {
  // ==============================================================================
  // Tests for the Monitors API
  // ==============================================================================
  group("Monitor API", () => {
    // ==============================================================================
    // GET to retrieve all monitors
    // ==============================================================================
    let resp = http.get(`${endpoint}/monitors`, { headers });

    check(resp, {
      getMonitors_returns_200: (r) => r.status === 200,
      getMonitors_has_results: (r) => r.json().length > 0,
    });

    getMonitorsTrend.add(resp.timings.duration);

    sleep(SLEEP_DURATION);

    // ==============================================================================
    // POST to create a new monitor
    // ==============================================================================
    let payload = JSON.stringify(data.makeMonitor());
    resp = http.post(`${endpoint}/monitors`, payload, { headers });

    check(resp, {
      createMonitor_returns_200: (r) => r.status === 200,
      createMonitor_has_id: (r) => r.json().id !== undefined,
    });

    createMonitorsTrend.add(resp.timings.duration);

    sleep(SLEEP_DURATION);
  });

  // ==============================================================================
  // Tests for the Results API
  // ==============================================================================
  group("Results API", () => {
    // ==============================================================================
    // GET to retrieve 100 results
    // ==============================================================================
    let resp = http.get(`${endpoint}/results?max=100`, { headers });

    check(resp, {
      getResults_returns_200: (r) => r.status === 200,
      getResults_has_results: (r) => r.json().length > 0,
    });

    getResultsTrend.add(resp.timings.duration);

    sleep(SLEEP_DURATION);
  });
}

// Clean up any test data, deletes ALL monitors, don't run this in production!
export async function teardown() {
  const endpoint = BASE_URL + API_PATH;

  await http.del(`${endpoint}/monitors`, null, { headers });
}

// Generates a HTML report
export function handleSummary(data) {
  return {
    "output/load-test-summary.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
