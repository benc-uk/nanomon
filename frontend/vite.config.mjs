// This is the Vite config file, it's only used during development

// This micro plugin will restart the dev server when a file changes
// HMR reloading isn't compatible with Alpine.js, so we need to force a restart
const hotUpdateRestart = () => ({
  name: 'hot-update-restart',
  handleHotUpdate({ server }) {
    server.restart()
  },
})

export default {
  server: {
    port: 3000,
    open: true,
    hmr: true,
  },
  plugins: [hotUpdateRestart()],
}
