const withPWA = require('next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
});
module.exports = withPWA({
  reactStrictMode: true,
});
