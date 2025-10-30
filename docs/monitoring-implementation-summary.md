# 모니터링 구현 요약

Phase 3의 일부로 구현된 모니터링 시스템 개요

## 구현된 파일

### API 엔드포인트

1. **[server/api/metrics.get.ts](../server/api/metrics.get.ts)**
   - Prometheus 메트릭 엔드포인트
   - 텍스트 형식으로 시스템 메트릭 노출
   - 메트릭: `app_up`, `app_uptime_seconds`, `database_healthy`, `database_latency_ms`, `memory_healthy`, `cache_size`

2. **[server/api/db-stats.get.ts](../server/api/db-stats.get.ts)**
   - 데이터베이스 통계 엔드포인트 (관리자 전용)
   - 연결 풀 정보: size, available, pending, borrowed
   - MSSQL 세션 통계: total, running, sleeping

### 유틸리티

3. **[server/utils/db-monitor.ts](../server/utils/db-monitor.ts)**
   - `getSlowQueries(durationMs)`: 느린 쿼리 감지
   - `getConnectionStats()`: DB 연결 통계

4. **[server/utils/alert.ts](../server/utils/alert.ts)**
   - `sendDiscordAlert(message, options)`: Discord 알림
   - `sendSlackAlert(message, options)`: Slack 알림
   - `sendAlert(message, options)`: 두 채널 모두로 전송

5. **[server/utils/metrics-collector.ts](../server/utils/metrics-collector.ts)**
   - `collectHttpMetric()`: HTTP 요청 메트릭 수집
   - `collectCustomMetric()`: 커스텀 메트릭 수집
   - InfluxDB 연동

### 미들웨어

6. **[server/middleware/metrics.ts](../server/middleware/metrics.ts)**
   - HTTP 요청 duration 추적
   - 1초 이상 걸리는 요청 자동 로깅

### 프론트엔드

7. **[public/dashboard.html](../public/dashboard.html)**
   - 간단한 실시간 시스템 대시보드
   - 5초마다 자동 갱신
   - 시스템 상태, uptime, DB latency, memory, cache size 표시

### 스크립트

8. **[scripts/health-check.sh](../scripts/health-check.sh)**
   - Bash 헬스체크 스크립트
   - Discord/Slack 알림 전송
   - cron으로 실행 가능

### 설정 파일

9. **[docs/prometheus.yml](../docs/prometheus.yml)**
   - Prometheus 스크래핑 설정
   - 알림 규칙 예제

## 환경 변수

[docs/env.example](../docs/env.example)에 추가됨:

```bash
# Discord webhook URL for system alerts
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# Slack webhook URL for system alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## 사용 방법

### 1. 기본 Health Check

```bash
# 시스템 상태 확인
curl http://localhost:3000/api/health

# 브라우저에서 대시보드 확인
open http://localhost:3000/dashboard.html
```

### 2. Prometheus 메트릭

```bash
# 메트릭 확인
curl http://localhost:3000/api/metrics

# Prometheus 실행
docker run -d -p 9090:9090 \
  -v $(pwd)/docs/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### 3. DB 통계 (관리자만)

```bash
# 연결 풀 및 세션 통계
curl -b auth-token=YOUR_TOKEN http://localhost:3000/api/db-stats
```

### 4. 알림 설정

```bash
# .env 파일에 webhook URL 추가
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# 서버에서 알림 전송 (코드에서)
import { sendDiscordAlert } from '~/server/utils/alert'
await sendDiscordAlert('Database connection failed!', { isError: true })
```

### 5. 자동 Health Check (cron)

```bash
# health-check.sh에 실행 권한 부여
chmod +x scripts/health-check.sh

# 환경 변수 설정
export HEALTH_URL=http://localhost:3000/api/health
export SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# crontab 등록 (1분마다)
* * * * * /path/to/scripts/health-check.sh >> /var/log/health-check.log 2>&1
```

## 모니터링 레벨

### 최소 (무료)
- Docker Health Check
- Uptime Kuma
- Discord/Slack webhook

### 중급
- Prometheus + Grafana
- Loki (로그 집계)
- 느린 쿼리 모니터링

### 엔터프라이즈
- Datadog
- New Relic
- Sentry
- PagerDuty

## 주요 메트릭

### Golden Signals
1. **Latency**: API 응답 시간 (목표: p95 < 500ms)
2. **Traffic**: 초당 요청 수
3. **Errors**: 5xx 에러율 (목표: < 0.1%)
4. **Saturation**: CPU, 메모리, DB 연결 풀 (목표: < 80%)

### 커스텀 메트릭
- 활성 사용자 수
- 채팅 메시지 전송률
- 파일 업로드 성공률
- 캐시 히트율

## 참고 문서

- [monitoring-guide.md](monitoring-guide.md): 상세 모니터링 가이드
- [CLAUDE.md](../CLAUDE.md): 프로젝트 아키텍처 개요

---

**구현 완료**: 2025-10-30
**Phase**: 3 (Operations Infrastructure)
