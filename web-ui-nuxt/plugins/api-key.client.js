// Automatically injects the Kong API key into all requests to the gateway.
// Kong's key-auth plugin requires "apikey" header on every request.
export default defineNuxtPlugin(() => {
  const originalFetch = window.fetch
  window.fetch = function (url, options = {}) {
    if (typeof url === 'string' && url.includes('localhost:8000')) {
      options.headers = {
        ...options.headers,
        apikey: 'user123',
      }
    }
    return originalFetch(url, options)
  }
})
