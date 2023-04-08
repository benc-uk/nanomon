// ===============================================================
// TypeSpec definitions for NanoMon API
// ===============================================================
import "@typespec/http";

using TypeSpec.Http;

@doc("This is the NanoMon REST API")
@route("/api")
@useAuth(BearerAuth)
@service({
  title: "NanoMon API Service",
  version: "2023-03-12",
})
@server("http://localhost:8000", "Local dev server endpoint")

namespace NanoMon;

enum MonitorType {
  http,
  ping,
  tcp
}

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

model Result {
  date: zonedDateTime;
  @minValue(0) @maxValue(2) status: int32;
  value: float64;
  message: string;
  monitor_id: string;
  monitor_name: string;
  monitor_target: string;
}

@error
model Problem {
  type: string;
  title: string;
  @minValue(100) @maxValue(599) status: integer;
  detail: string;
  instance: string;
}

@route("/monitors")
@tag("Monitors")
interface MonitorAPI {
  @doc("List all monitors")
  list(): Monitor[];

  get(@path id: string): Monitor | {
    @statusCode code: 400; @body _: Problem
  } | {
    @statusCode code: 404; @body _: Problem
  };

  create(@body monitor: Monitor): Monitor | {
    @statusCode code: 400; @body _: Problem
  };

  update(@path id: string, @body monitor: Monitor): Monitor | {
    @statusCode code: 400; @body _: Problem
  } | {
    @statusCode code: 404; @body _: Problem
  };

  @delete delete(@path id: string): void | {
    @statusCode code: 400; @body _: Problem
  } | {
    @statusCode code: 404; @body _: Problem
  };

  @route("/{id}/results")
  @get getResults(@path id: string, @query max?: int32): Result[] | {
    @statusCode code: 400; @body _: Problem
  }
}

@route("/results")
@tag("Results")
interface ResultsAPI {
  @get getResults(@query max?: int32): Result[];
}