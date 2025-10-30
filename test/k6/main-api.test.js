import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-arrival-rate',
      startRate: Number(__ENV.START_RATE || 5),
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.VUS || 50),
      maxVUs: Number(__ENV.MAX_VUS || 200),
      stages: [
        { duration: __ENV.RAMP_UP || '30s', target: Number(__ENV.PEAK_RATE || 50) },
        { duration: __ENV.HOLD || '2m', target: Number(__ENV.PEAK_RATE || 50) },
        { duration: __ENV.RAMP_DOWN || '30s', target: 0 },
      ],
      tags: { scenario: 'browse' },
    },
    login: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.LOGIN_RPS || 2),
      timeUnit: '1s',
      duration: __ENV.DURATION || '3m',
      preAllocatedVUs: Number(__ENV.LOGIN_VUS || 10),
      tags: { scenario: 'login' },
      exec: 'loginScenario',
    },
  },
  thresholds: {
    'http_req_failed{scenario:browse}': ['rate<0.01'],
    'http_req_duration{endpoint:users}': ['p(95)<800'],
    'http_req_duration{endpoint:departments}': ['p(95)<800'],
    'http_req_duration{endpoint:roles}': ['p(95)<800'],
    'http_req_duration{endpoint:notifications}': ['p(95)<900'],
    'http_req_duration{endpoint:chats}': ['p(95)<1000'],
    'http_req_duration{endpoint:menu-admin}': ['p(95)<800'],
    'http_req_duration{endpoint:settings}': ['p(95)<800'],
    'http_req_duration{endpoint:products}': ['p(95)<800'],
    'http_req_failed{endpoint:chats}': ['rate<0.01'],
    'http_req_failed{endpoint:notifications}': ['rate<0.01'],
    'http_req_failed{endpoint:menu-admin}': ['rate<0.01'],
  },
  discardResponseBodies: true,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

function authenticate() {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    username: __ENV.USERNAME || 'admin',
    password: __ENV.PASSWORD || 'admin123',
  }), { headers: { 'Content-Type': 'application/json' } });

  const hasAuthCookie = ((res.cookies['auth-token']) || []).some(c => c && c.value);
  check(res, {
    'login 200': r => r.status === 200,
    'login cookie': _ => hasAuthCookie,
  });
  return res;
}

export function loginScenario() {
  group('auth:login', () => {
    authenticate();
    sleep(1);
  });
}

function get(path, endpointTag, q = '') {
  const url = q ? `${BASE_URL}${path}?${q}` : `${BASE_URL}${path}`;
  const res = http.get(url, { tags: { endpoint: endpointTag } });
  check(res, { '200': r => r.status === 200 });
  return res;
}

export function handleSummary(data) {
  return { 'summary.html': htmlReport(data), 'summary.json': JSON.stringify(data) };
}

export default function () {
  if (__ITER === 0) {
    authenticate();
    const me = http.get(`${BASE_URL}/api/auth/me`, { tags: { endpoint: 'me' } });
    check(me, { 'me 200': r => r.status === 200 });
  }
  const tasks = [
    () => get('/api/users', 'users', 'search='),
    () => get('/api/departments', 'departments', 'search='),
    () => get('/api/roles', 'roles', 'search='),
    () => get('/api/notifications', 'notifications', 'mode=inbox&limit=50'),
    () => get('/api/chats', 'chats'),
    () => get('/api/menu/admin', 'menu-admin'),
    () => get('/api/settings', 'settings'),
    () => get('/api/products', 'products'),
  ];
  const n = Math.floor(Math.random() * 4) + 3; // 3~6회 호출
  for (let i = 0; i < n; i++) {
    const f = tasks[Math.floor(Math.random() * tasks.length)];
    f();
    sleep(Math.random() * 0.4 + 0.2);
  }
}