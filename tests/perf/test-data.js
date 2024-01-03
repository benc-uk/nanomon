// ==============================================================================
// Test data for perf tests, keep it in a separate file for easy of maintenance
// ==============================================================================

export const makeMonitor = () => {
  return {
    type: "http",
    name: `Test Monitor ${randomName()}`,
    enabled: false,
    interval: "15s",
    target: "https://example.net/",
  };
};

function randomName() {
  return Math.random().toString(36).substring(2, 8);
}
