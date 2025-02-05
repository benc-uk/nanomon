//
// This is a shallow stub of a Chart.js type definition
// It is a tiny fraction of what Chart.js provides
//

declare module 'https://cdn.jsdelivr.net/npm/chart.js*' {
  class Chart {
    constructor(ctx: HTMLElement, config: any)
    destroy(): void
    update(string): void
    static register(...args: any[]): void

    data: any
  }

  const registerables: any[]

  namespace Chart {
    function getChart(id: string): any
  }
}
