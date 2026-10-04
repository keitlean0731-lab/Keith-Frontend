const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

let accessToken = sessionStorage.getItem('lavalust_access_token') || ''
let refreshToken = sessionStorage.getItem('lavalust_refresh_token') || ''

export function setTokens(tokens) {
  accessToken = tokens?.access_token || ''
  refreshToken = tokens?.refresh_token || refreshToken

  if (accessToken) sessionStorage.setItem('lavalust_access_token', accessToken)
  if (refreshToken) sessionStorage.setItem('lavalust_refresh_token', refreshToken)
}

export function clearTokens() {
  accessToken = ''
  refreshToken = ''
  sessionStorage.removeItem('lavalust_access_token')
  sessionStorage.removeItem('lavalust_refresh_token')
}

export function hasSession() {
  return Boolean(accessToken)
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json')
    ? await response.json()
    : { error: await response.text() }

  if (!response.ok) {
    const error = new Error(body?.error || body?.message || `Request failed with status ${response.status}`)
    error.status = response.status
    throw error
  }

  return body
}

async function request(path, options = {}, allowRefresh = true) {
  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error('The backend is unreachable. Check the API URL and make sure LavaLust is running.')
  }

  if (response.status === 401 && allowRefresh && refreshToken && path !== '/api/refresh') {
    try {
      const refreshed = await request('/api/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }, false)
      setTokens(refreshed.tokens || refreshed)
      return request(path, options, false)
    } catch {
      clearTokens()
    }
  }

  return parseResponse(response)
}

export const api = {
  login: (payload) => request('/api/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => request('/api/register', { method: 'POST', body: JSON.stringify(payload) }),
  refresh: () => request('/api/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) }),
  logout: () => request('/api/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) }),
  profile: () => request('/api/profile'),
  products: () => request('/api/products'),
  users: () => request('/api/users'),
  createProduct: (payload) => request('/api/products', { method: 'POST', body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),
}

