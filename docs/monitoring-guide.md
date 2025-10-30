# 모니터링 가이드

## 개요

이 문서는 Nuxt 3 애플리케이션의 모니터링 설정 및 운영 가이드입니다.

---

## 1. Health Check 엔드포인트

### 1.1 기본 Health Check

**엔드포인트**: `GET /api/health`

**응답 형식**:
```json
{
  "status": "healthy",  // "healthy" | "degraded" | "unhealthy"
  "timestamp": "2025-10-30T13:58:24.123Z",
  "uptime": 3600.5,
  "checks": {
    "database": {
      "healthy": true,
      "latency": 15,
      "timestamp": "2025-10-30T13:58:24.123Z"
    },
    "memory": {
      "healthy": true,
      "latency": 0,
      "timestamp": "2025-10-30T13:58:24.123Z"
    }
  },
  "version": "1.0.0"
}
```

**상태 코드**:
- `200 OK` - 시스템 정상
- `503 Service Unavailable` - 데이터베이스 연결 실패 등

**상태 판별 로직**:
```typescript
// healthy: 모든 체크 정상
// degraded: 메모리만 문제 (메모리 90% 이상)
// unhealthy: 데이터베이스 연결 실패
```

---

## 2. Docker Health Check

### 2.1 Dockerfile 설정

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"
```

**파라미터 설명**:
- `--interval=30s`: 30초마다 체크
- `--timeout=3s`: 3초 내 응답 없으면 실패
- `--start-period=5s`: 시작 후 5초간 유예 기간
- `--retries=3`: 3번 연속 실패 시 unhealthy

### 2.2 컨테이너 상태 확인

```bash
# 컨테이너 상태 확인
docker ps

# Health check 상태 확인
docker inspect --format='{{.State.Health.Status}}' nuxtapp

# Health check 로그 확인
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' nuxtapp
```

---

## 3. 외부 모니터링 도구 연동

### 3.1 Uptime Kuma (추천)

**설치**:
```bash
docker run -d --restart=always \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:1
```

**설정**:
1. http://localhost:3001 접속
2. "Add New Monitor" 클릭
3. 설정:
   - Monitor Type: HTTP(s)
   - Friendly Name: Nuxt App
   - URL: http://your-server:3000/api/health
   - Heartbeat Interval: 60초
   - Retries: 3
   - Expected Status Code: 200

**알림 설정**:
- Discord, Slack, Email, Telegram 등 지원
- Notification → Setup Notification

### 3.2 Prometheus + Grafana

**메트릭 수집을 위한 엔드포인트 추가**:

`server/api/metrics.get.ts`:
```typescript
import { checkSystemHealth } from '../utils/health-check'
import { cache } from '../utils/cache'

export default defineEventHandler(async (event) => {
  const health = await checkSystemHealth()

  // Prometheus 형식으로 변환
  const metrics = [
    `# HELP app_up Application is running`,
    `# TYPE app_up gauge`,
    `app_up ${health.status === 'healthy' ? 1 : 0}`,
    ``,
    `# HELP app_uptime_seconds Application uptime in seconds`,
    `# TYPE app_uptime_seconds counter`,
    `app_uptime_seconds ${health.uptime}`,
    ``,
    `# HELP database_healthy Database is healthy`,
    `# TYPE database_healthy gauge`,
    `database_healthy ${health.checks.database.healthy ? 1 : 0}`,
    ``,
    `# HELP database_latency_ms Database query latency in milliseconds`,
    `# TYPE database_latency_ms gauge`,
    `database_latency_ms ${health.checks.database.latency || 0}`,
    ``,
    `# HELP memory_healthy Memory is healthy`,
    `# TYPE memory_healthy gauge`,
    `memory_healthy ${health.checks.memory.healthy ? 1 : 0}`,
    ``,
    `# HELP cache_size Cache entries count`,
    `# TYPE cache_size gauge`,
    `cache_size ${cache.size()}`,
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'text/plain')
  return metrics
})
```

**Prometheus 설정** (`prometheus.yml`):
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nuxtapp'
    static_configs:
      - targets: ['your-server:3000']
    metrics_path: '/api/metrics'
```

### 3.3 Datadog

**설정**:
```yaml
# docker-compose.yml에 추가
services:
  datadog:
    image: datadog/agent:latest
    environment:
      - DD_API_KEY=${DD_API_KEY}
      - DD_SITE=datadoghq.com
      - DD_LOGS_ENABLED=true
      - DD_PROCESS_AGENT_ENABLED=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
```

**HTTP Check 설정** (`conf.d/http_check.yaml`):
```yaml
init_config:

instances:
  - name: nuxtapp_health
    url: http://nuxtapp:3000/api/health
    timeout: 3
    http_response_status_code: 200
    check_certificate_expiration: true
```

---

## 4. 로그 모니터링

### 4.1 Docker Logs

**실시간 로그 확인**:
```bash
# 실시간 로그 (tail -f)
docker logs -f nuxtapp

# 최근 100줄
docker logs --tail 100 nuxtapp

# 타임스탬프 포함
docker logs -t nuxtapp

# 특정 시간 이후
docker logs --since 30m nuxtapp
```

### 4.2 로그 집계 (ELK Stack)

**Filebeat 설정** (`filebeat.yml`):
```yaml
filebeat.inputs:
  - type: docker
    containers.ids:
      - '*'
    processors:
      - add_docker_metadata: ~

output.elasticsearch:
  hosts: ["elasticsearch:9200"]

setup.kibana:
  host: "kibana:5601"
```

### 4.3 JSON 로그 파싱

현재 로그는 `json-file` 드라이버 사용:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
```

**로그 파일 위치**:
```bash
# Docker 로그 파일 찾기
docker inspect --format='{{.LogPath}}' nuxtapp

# 로그 파일 직접 읽기
sudo cat $(docker inspect --format='{{.LogPath}}' nuxtapp) | jq
```

---

## 5. 데이터베이스 모니터링

### 5.1 쿼리 성능 모니터링

**느린 쿼리 감지**:
```typescript
// server/utils/db-monitor.ts
import { getDbConnection } from './db'

export async function getSlowQueries(durationMs: number = 1000) {
  const db = await getDbConnection()

  const result = await db.request().query(`
    SELECT
      qs.execution_count,
      SUBSTRING(qt.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
          WHEN -1 THEN DATALENGTH(qt.text)
          ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2) + 1) AS query_text,
      qs.total_worker_time/1000 AS total_cpu_ms,
      qs.total_elapsed_time/1000 AS total_elapsed_ms,
      qs.total_logical_reads,
      qs.total_logical_writes
    FROM sys.dm_exec_query_stats qs
    CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
    WHERE qs.total_elapsed_time/qs.execution_count > ${durationMs} * 1000
    ORDER BY qs.total_elapsed_time DESC
  `)

  return result.recordset
}
```

### 5.2 연결 풀 모니터링

```typescript
// server/api/db-stats.get.ts
import { getDbConnection } from '../utils/db'
import { getCurrentUserId } from '../utils/auth'

export default defineEventHandler(async (event) => {
  // 관리자만 접근 가능
  const userId = getCurrentUserId(event)

  const db = await getDbConnection()

  // 현재 연결 상태
  const connections = await db.request().query(`
    SELECT
      COUNT(*) as total_connections,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
      SUM(CASE WHEN status = 'sleeping' THEN 1 ELSE 0 END) as sleeping
    FROM sys.dm_exec_sessions
    WHERE is_user_process = 1
  `)

  return {
    success: true,
    data: {
      pool: {
        size: db.pool?.size || 0,
        available: db.pool?.available || 0,
        pending: db.pool?.pending || 0,
        borrowed: db.pool?.borrowed || 0,
      },
      connections: connections.recordset[0]
    }
  }
})
```

---

## 6. 성능 메트릭 수집

### 6.1 응답 시간 추적

**미들웨어 추가** (`server/middleware/metrics.ts`):
```typescript
export default defineEventHandler((event) => {
  const start = Date.now()

  event.node.res.on('finish', () => {
    const duration = Date.now() - start
    const path = event.path
    const method = event.method
    const status = event.node.res.statusCode

    // 느린 요청 로그
    if (duration > 1000) {
      console.warn(`[SlowRequest] ${method} ${path} - ${duration}ms (${status})`)
    }

    // 메트릭 수집 (Prometheus, InfluxDB 등으로 전송)
    // collectMetric('http_request_duration_ms', duration, { path, method, status })
  })
})
```

### 6.2 InfluxDB 연동 (이미 있음)

```typescript
// server/utils/metrics-collector.ts
import { writeMetric } from './influx'

export async function collectHttpMetric(
  duration: number,
  path: string,
  method: string,
  statusCode: number
) {
  await writeMetric('http_requests', {
    duration_ms: duration,
    path,
    method,
    status: statusCode,
  })
}
```

---

## 7. 알림 설정

### 7.1 Health Check 실패 알림

**간단한 스크립트** (`scripts/health-check.sh`):
```bash
#!/bin/bash

URL="http://your-server:3000/api/health"
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $HTTP_CODE -ne 200 ]; then
  # Slack 알림
  curl -X POST $WEBHOOK_URL \
    -H 'Content-Type: application/json' \
    -d '{
      "text": "🚨 Application Health Check Failed!",
      "attachments": [{
        "color": "danger",
        "fields": [{
          "title": "HTTP Status",
          "value": "'$HTTP_CODE'",
          "short": true
        }]
      }]
    }'
fi
```

**Cron 등록**:
```bash
# 1분마다 체크
* * * * * /path/to/health-check.sh
```

### 7.2 Discord Webhook

```typescript
// server/utils/alert.ts
export async function sendDiscordAlert(message: string, isError: boolean = true) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL

  if (!webhookUrl) return

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: isError ? '🚨 알림' : 'ℹ️ 알림',
        description: message,
        color: isError ? 15158332 : 3447003, // 빨강 or 파랑
        timestamp: new Date().toISOString(),
      }]
    })
  })
}
```

**사용 예시**:
```typescript
// 데이터베이스 연결 실패 시
import { sendDiscordAlert } from './alert'

try {
  await getDbConnection()
} catch (error) {
  await sendDiscordAlert(`Database connection failed: ${error.message}`)
  throw error
}
```

---

## 8. 대시보드 구성

### 8.1 Grafana 대시보드 예제

**패널 구성**:
1. **System Health** (Gauge)
   - Query: `app_up`
   - Threshold: 0 = 빨강, 1 = 초록

2. **응답 시간** (Graph)
   - Query: `rate(http_request_duration_ms[5m])`
   - 95th percentile, median

3. **데이터베이스 지연시간** (Graph)
   - Query: `database_latency_ms`

4. **에러율** (Graph)
   - Query: `sum(rate(http_requests{status=~"5.."}[5m]))`

5. **메모리 사용률** (Gauge)
   - Query: `memory_healthy`

### 8.2 간단한 HTML 대시보드

```html
<!-- public/dashboard.html -->
<!DOCTYPE html>
<html>
<head>
  <title>System Dashboard</title>
  <script>
    async function updateHealth() {
      const res = await fetch('/api/health')
      const data = await res.json()

      document.getElementById('status').textContent = data.status
      document.getElementById('status').className = data.status
      document.getElementById('uptime').textContent = Math.floor(data.uptime / 60) + ' min'
      document.getElementById('db-latency').textContent = data.checks.database.latency + ' ms'
    }

    setInterval(updateHealth, 5000)
    updateHealth()
  </script>
  <style>
    .healthy { color: green; }
    .degraded { color: orange; }
    .unhealthy { color: red; }
  </style>
</head>
<body>
  <h1>System Status</h1>
  <p>Status: <span id="status">...</span></p>
  <p>Uptime: <span id="uptime">...</span></p>
  <p>DB Latency: <span id="db-latency">...</span></p>
</body>
</html>
```

---

## 9. 주요 모니터링 지표

### 9.1 Golden Signals

1. **Latency** (지연 시간)
   - API 응답 시간
   - 데이터베이스 쿼리 시간
   - 목표: p95 < 500ms

2. **Traffic** (트래픽)
   - 초당 요청 수 (RPS)
   - 동시 접속자 수
   - 목표: 부하 테스트 결과 기반

3. **Errors** (에러)
   - 5xx 에러율
   - 데이터베이스 연결 실패
   - 목표: < 0.1%

4. **Saturation** (포화도)
   - CPU 사용률
   - 메모리 사용률
   - 데이터베이스 연결 풀
   - 목표: < 80%

### 9.2 커스텀 지표

- 활성 사용자 수
- 채팅 메시지 전송률
- 파일 업로드 성공률
- 알림 전송 성공률
- 캐시 히트율

---

## 10. 문제 해결 가이드

### 10.1 Health Check 실패

**증상**: `/api/health`가 503 반환

**확인 사항**:
1. 데이터베이스 연결
   ```bash
   docker exec -it nuxtapp node -e "require('./server/utils/db').getDbConnection().then(() => console.log('OK')).catch(console.error)"
   ```

2. 로그 확인
   ```bash
   docker logs --tail 100 nuxtapp | grep -i error
   ```

3. 메모리 확인
   ```bash
   docker stats nuxtapp
   ```

### 10.2 느린 응답

**확인 사항**:
1. 데이터베이스 쿼리 최적화 필요 여부
2. 인덱스 누락 여부
3. 캐시 활용 여부
4. N+1 쿼리 문제

### 10.3 메모리 누수

**확인**:
```bash
# 메모리 사용량 추이 확인
docker stats nuxtapp --no-stream

# Node.js 힙 스냅샷 (개발 환경)
node --inspect server/index.mjs
```

---

## 11. 권장 설정

### 11.1 최소 모니터링 (무료)

1. **Docker Health Check** (기본 제공)
2. **Uptime Kuma** (무료 오픈소스)
3. **Discord/Slack Webhook** (무료)

### 11.2 중급 모니터링

1. Docker Health Check
2. Prometheus + Grafana
3. 로그 집계 (Loki)
4. 알림 (PagerDuty 무료 플랜)

### 11.3 엔터프라이즈 모니터링

1. Datadog (유료)
2. New Relic (유료)
3. Sentry (에러 추적)
4. PagerDuty (알림)

---

## 12. 체크리스트

### 일일 체크
- [ ] Health check 상태 확인
- [ ] 에러 로그 확인
- [ ] 응답 시간 확인

### 주간 체크
- [ ] 디스크 사용량 확인
- [ ] 로그 파일 정리
- [ ] 데이터베이스 성능 확인
- [ ] 보안 업데이트 확인

### 월간 체크
- [ ] 백업 복구 테스트
- [ ] 부하 테스트
- [ ] 성능 트렌드 분석
- [ ] 용량 계획 검토

---

## 참고 자료

- [Uptime Kuma](https://github.com/louislam/uptime-kuma)
- [Prometheus](https://prometheus.io/docs/introduction/overview/)
- [Grafana](https://grafana.com/docs/)
- [Docker Health Check](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Golden Signals](https://sre.google/sre-book/monitoring-distributed-systems/)

---

**최종 업데이트**: 2025-10-30
**버전**: 1.0
