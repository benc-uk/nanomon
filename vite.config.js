export default {
  // This is a trick/hack!
  // Makes Vite serve the whole app dir as static/vanilla content, no bundling
  publicDir: ".",

  // Where the frontend HTML & JS is
  root: "./frontend",

  // Some options for the dev server
  server: {
    port: 3000,
    open: true,
  },
};
