// GRCell — k6 yük smoke testi (Test planı 4: normal yük + çoxsaylı istifadəçi)
// İcra:  k6 run tests/load/k6-smoke.js
//        k6 run --vus 50 --duration 2m tests/load/k6-smoke.js   (ağır yük)
// Qeyd: k6 ayrıca binardır (https://k6.io). Bu skript public səhifələri vurur —
//       autentifikasiya tələb etmir, ona görə canlı datanı dəyişmir.

import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE = __ENV.BASE_URL || 'https://grcell.com'

export const options = {
  // Default smoke: 10 virtual user, 30 saniyə. --vus/--duration ilə override.
  vus: Number(__ENV.VUS) || 10,
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],      // <1% xəta
    http_req_duration: ['p(95)<2000'],   // p95 < 2s (CWV hədəfi)
  },
}

export default function () {
  // Landing (ən ağır public səhifə) + login (auth forması)
  const landing = http.get(`${BASE}/`)
  check(landing, {
    'landing 200': (r) => r.status === 200,
    'landing < 2s': (r) => r.timings.duration < 2000,
    'GRCell markası var': (r) => r.body && r.body.includes('GRCell'),
  })

  const login = http.get(`${BASE}/login`)
  check(login, {
    'login 200': (r) => r.status === 200,
  })

  sleep(1)
}
