//
// This is a stub of a type definition file for Chart.js.
// It is not complete but should be enough to suppress TypeScript errors when using the global Chart lib
//

declare class Chart {
  constructor(ctx: HTMLElement, config: any)
  destroy(): void
  update(string): void

  data: any
}

declare namespace Chart {
  function getChart(id: string): any
}
