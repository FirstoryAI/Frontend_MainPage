const csrfPath = '/api/auth/csrf';

export class ApiError extends Error {
  constructor({ status, code, message, fields }) {
    super(message || `API request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function readCookie(name) {
  const prefix = `${encodeURIComponent(name)}=`;
  const entry = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(prefix));

  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

let csrfRequest;

export function initializeCsrf() {
  if (!csrfRequest) {
    csrfRequest = request(csrfPath, { method: 'GET' }).finally(() => {
      csrfRequest = undefined;
    });
  }

  return csrfRequest;
}

async function ensureCsrfToken() {
  let token = readCookie('XSRF-TOKEN');

  if (!token) {
    await initializeCsrf();
    token = readCookie('XSRF-TOKEN');
  }

  if (!token) {
    throw new Error('CSRF token was not set by the server');
  }

  return token;
}

async function request(path, options = {}) {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);

  if (options.body != null && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-XSRF-TOKEN', await ensureCsrfToken());
  }

  const response = await fetch(path, {
    ...options,
    method,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    let errorBody;

    try {
      errorBody = await response.json();
    } catch {
      errorBody = undefined;
    }

    throw new ApiError({
      status: response.status,
      code: errorBody?.code,
      message: errorBody?.message,
      fields: errorBody?.fields,
    });
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) =>
    request(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: (path, body, options) =>
    request(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  patch: (path, body, options) =>
    request(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
