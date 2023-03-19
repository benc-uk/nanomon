import Alpine from 'https://unpkg.com/alpinejs@3.12.0/dist/module.esm.js'

const VERSION = '0.0.1'

Alpine.data('app', () => ({
  page: '',
  version: VERSION,
  topics: [
    {
      id: 1,
      title: 'Hello World',
    },
    {
      id: 2,
      title: 'Hello Moon',
    }
  ],

  async init() {
    console.log(`### Monitr frontend`)
  }
}))


Alpine.start()
