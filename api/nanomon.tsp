// ===============================================================
// TypeSpec definitions for NanoMon API
// ===============================================================
import "@typespec/http";
using TypeSpec.Http;

// Core definitions for the whole API
@doc("This is the NanoMon REST API")
@service({
  title: "NanoMon API Service",
  version: "2023-03-12",
})
@useAuth(BearerAuth)

// List servers and endpoints
@server("http://localhost:8000", "Local dev server endpoint")
@route("/api")
namespace NanoMon;

// ====================================================
// API operations for Monitors
// ====================================================
@route("/monitors")
@tag("Monitors")
interface MonitorAPI {
  @doc("List all monitors. Doesn't require authentication")
  list(): Monitor[];

  @doc("Get a monitor by ID. Doesn't require authentication")
  get(@path id: string): Monitor | {
    @statusCode code: 400;
    @body _: Problem;
  } | {
    @statusCode code: 404;
    @body _: Problem;
  };

  @doc("Create a new monitor")
  create(@body monitor: Monitor): Monitor | {
    @statusCode code: 400;
    @body _: Problem;
  };

  @doc("Update a single monitor")
  update(@path id: string, @body monitor: Monitor): Monitor | {
    @statusCode code: 400;
    @body _: Problem;
  } | {
    @statusCode code: 404;
    @body _: Problem;
  };

  @doc("Delete a monitor")
  @delete
  delete(@path id: string): void | {
    @statusCode code: 400;
    @body _: Problem;
  } | {
    @statusCode code: 404;
    @body _: Problem;
  };

  @doc("List *Results* for a single monitor. Doesn't require authentication")
  @route("/{id}/results")
  @get
  getResults(@path id: string, @query max?: int32): Result[] | {
    @statusCode code: 400;
    @body _: Problem;
  };
}

// ====================================================
// API operations for Results
// ====================================================
@route("/results")
@tag("Results")
interface ResultsAPI {
  @doc("List *Results* for ALL monitors. Doesn't require authentication")
  @get
  getResults(@query max?: int32): Result[];
}

// ====================================================
// MODELS
// ====================================================

// This holds the configuration for a single monitor
model Monitor {
  @visibility("read")
  @key
  @pattern("[A-Fa-f0-9]{24}")
  id: string;

  @visibility("read")
  updated: zonedDateTime;
  name: string;
  type: MonitorType;
  target: string;
  interval: duration;
  rule: string;
  enabled: boolean;
  properties: Record<string>;
}

// Possible monitor types as an enumerated set
enum MonitorType {
  http,
  ping,
  tcp,
}

// This holds the result of a single monitor check
model Result {
  date: zonedDateTime;
  @minValue(0) @maxValue(2) status: int32;
  value: float64;
  message: string;
  monitor_id: string;
  monitor_name: string;
  monitor_target: string;
}

// A standard RCF 7807 'Problem Details' for HTTP APIs
@error
model Problem {
  type: string;
  title: string;
  @minValue(100) @maxValue(599) status: integer;
  detail: string;
  instance: string;
}
