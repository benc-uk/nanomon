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

// Uncomment if we need an auth token
/*if (!__ENV.AUTH_TOKEN) {
	throw new Error('Please provide a valid AUTH_TOKEN');
}
const AUTH_TOKEN = __ENV.AUTH_TOKEN;
*/

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
      vus: __ENV.TEST_VUS || 10,
      duration: __ENV.TEST_DURATION || "10s",
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
let customTrend = new Trend("customTrend");

export default function () {
  const endpoint = BASE_URL + API_PATH;

  const headers = {
    "Content-Type": "application/json",
    // Authorization: `Bearer ${AUTH_TOKEN}`,  // Uncomment if we need auth
  };

  //
  // Tests for the Monitors API
  //
  group("Monitor API", () => {
    //
    // Call Monitors API
    //
    let resp = http.get(`${endpoint}/monitors`, { headers });

    check(resp, {
      getMonitors_returns_200: (r) => r.status === 200,
      getMonitors_has_results: (r) => r.json().length > 0,
    });

    customTrend.add(resp.timings.duration);

    sleep(SLEEP_DURATION);
  });
}

// Generates a HTML report
export function handleSummary(data) {
  return {
    "output/load-test-summary.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
