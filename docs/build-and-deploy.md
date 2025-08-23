## 빌드 & 배포 가이드 (Nuxt 3 + PrimeVue)

### 개요
- 이 프로젝트는 `server/api`와 DB에 의존하므로 기본 권장은 SSR/Nitro 서버 실행형 배포입니다.
- 정적 HTML(SSG/SPAs)도 가능하지만, 내부 API 의존이 있을 경우 적합하지 않을 수 있습니다.

---

### 1) 로컬 프로덕션 실행(SSR)
1. 환경 변수 준비(`.env` 예시)
```dotenv
HOST=0.0.0.0
PORT=3000
JWT_SECRET=changeme
# DB 관련 값은 현재 코드가 하드코딩이라, 환경변수화 필요 시 추가 작업 필요
```
2. 빌드 & 실행
```bash
pnpm install --frozen-lockfile
pnpm build
node .output/server/index.mjs
```
3. 접속: `http://localhost:3000`

---

### 2) Docker 배포(권장)
이미 포함된 파일: `Dockerfile`, `.dockerignore`

1. 이미지 빌드
```bash
docker build -t nuxttest:prod .
```
2. 컨테이너 실행
```bash
# .env 없이
docker run -d --name nuxttest -p 3000:3000 nuxttest:prod

# .env 사용 시
docker run -d --name nuxttest -p 3000:3000 --env-file .env nuxttest:prod
```
3. 이미지/컨테이너 확인
```bash
docker images
docker ps -a
docker inspect nuxttest:prod
```

4. DB 연결 주의사항
- 현재 DB 설정은 환경변수 기반입니다. 컨테이너 실행 시 아래 값을 넘기면 됩니다:
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - 선택: `DB_TRUST_SERVER_CERT=true`, `DB_ENCRYPT=true|false`
  - 선택(초기화 스킵): `SKIP_DB_INIT=true`
- 호스트(로컬)에서 동작 중인 DB에 접속: `DB_HOST=host.docker.internal`
- DB도 컨테이너라면 동일 네트워크에 두고 컨테이너 이름으로 접속: 예) `DB_HOST=mssql-server-instance`

5. WebSocket/프록시
- 별도 포트(예: 4000)를 사용한다면 포트 매핑/프록시 규칙 추가 필요

---

### 2-1) Docker 네트워크로 DB 연결 구성
컨테이너 간 이름으로 통신하려면 사용자 네트워크를 생성해 두세요.
```bash
docker network create nuxtnet   # 최초 1회

# 이미 떠 있는 MSSQL 컨테이너를 네트워크에 연결 (예시 이름: mssql-server-instance)
docker network connect nuxtnet mssql-server-instance

# Nuxt 컨테이너 실행 (동일 네트워크, 컨테이너 이름으로 DB 접속)
docker run --rm --name nuxtapp --network nuxtnet \
  -p 3000:3000 \
  -e DB_HOST=mssql-server-instance \
  -e DB_PORT=1433 \
  -e DB_USER=frame \
  -e DB_PASSWORD=frame \
  -e DB_NAME=theframework \
  -e DB_TRUST_SERVER_CERT=true \
  nuxttest:latest
```

호스트 DB로 붙고 싶다면 네트워크 없이도 아래처럼 가능합니다.
```bash
docker run --rm --name nuxtapp -p 3000:3000 \
  -e DB_HOST=host.docker.internal -e DB_PORT=1433 \
  -e DB_USER=frame -e DB_PASSWORD=frame -e DB_NAME=theframework \
  -e DB_TRUST_SERVER_CERT=true \
  nuxttest:latest
```

---

### 2-2) docker-compose로 실행 (Docker Desktop 포함)
프로젝트 루트에 `docker-compose.yml`이 포함되어 있습니다. 외부 네트워크(`nuxtnet`)를 먼저 만들어 주세요.
```bash
docker network create nuxtnet   # 최초 1회만
docker compose up -d            # 또는 Docker Desktop에서 Compose 파일로 실행
```

`docker-compose.yml` 주요 내용(요약):
```yaml
services:
  nuxtapp:
    image: nuxttest:latest
    container_name: nuxtapp
    ports:
      - "3000:3000"
    environment:
      DB_HOST: mssql-server-instance
      DB_PORT: "1433"
      DB_USER: frame
      DB_PASSWORD: frame
      DB_NAME: theframework
      DB_TRUST_SERVER_CERT: "true"
    networks:
      - nuxtnet

networks:
  nuxtnet:
    external: true
```

Docker Desktop에서 실행하려면 Images → `nuxttest:latest` → Run에서 다음을 설정:
- Network: `nuxtnet`
- Ports: `3000:3000`
- Environment: 위와 동일한 DB 환경변수 입력

---

### 2-3) 파일 업로드(컨테이너)
업로드 API는 서버에서 파일을 저장하고 `/uploads/<파일명>` 경로로 접근합니다. 컨테이너에서도 영속적으로 동작하도록 볼륨과 환경변수를 설정하세요.

- 기본 원리
  - 저장 경로는 `UPLOADS_DIR` 환경변수로 제어됩니다. 미설정 시 `.output/public/uploads`(개발 폴백: `public/uploads`).
  - 이 저장소에서 파일을 직접 서빙하는 라우트가 포함되어 있습니다: `server/routes/uploads/[...file].get.ts` → 브라우저에서 `/uploads/<파일명>`로 접근합니다.

- 예시 1) 프로젝트 경로 바인드(맥/리눅스)
```yaml
services:
  nuxtapp:
    volumes:
      - ./public/uploads:/app/public/uploads
      - ./public/uploads:/app/.output/public/uploads
    environment:
      UPLOADS_DIR: /app/.output/public/uploads
```

- 예시 2) 단일 타깃 경로 사용(맥/리눅스)
```yaml
services:
  nuxtapp:
    volumes:
      - /absolute/host/uploads:/uploads
    environment:
      UPLOADS_DIR: /uploads
```

- 예시 3) Windows (Docker Desktop)
```yaml
services:
  nuxtapp:
    volumes:
      - "D:/public/uploads:/uploads"   # 호스트 D:\\public\\uploads → 컨테이너 /uploads
    environment:
      UPLOADS_DIR: /uploads
```
주의: Docker Desktop Settings → Resources → File Sharing에서 해당 드라이브/폴더 공유를 허용해야 합니다.

- 업로드/확인
```bash
curl -F "file=@public/nuxt.png" http://localhost:3000/api/upload/logo
# 응답: { success: true, path: "/uploads/xxx.png", ... }
curl -I "http://localhost:3000/uploads/xxx.png"
```

---

### 2-4) k6로 스모크/램핑 테스트(선택)
```bash
# 스모크(10 VUs, 10s)
docker run --rm --network nuxtnet -i grafana/k6:0.51.0 run - <<'K6'
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { vus: 10, duration: '10s' };
export default function () {
  const r = http.get('http://nuxtapp:3000/api/products');
  check(r, { '200': (res) => res.status === 200 });
  sleep(0.2);
}
K6
```

```bash
# 램핑 예시
docker run --rm --network nuxtnet -i grafana/k6:0.51.0 run - <<'K6'
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus', startVUs: 0,
      stages: [ { duration: '30s', target: 50 }, { duration: '1m', target: 50 }, { duration: '30s', target: 0 } ]
    }
  },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<800'] }
};
export default function () {
  const r = http.get('http://nuxtapp:3000/api/products');
  check(r, { '200': (res) => res.status === 200 });
  sleep(0.2);
}
K6
```

---

### 3) 정적 HTML(선택)
두 가지 방식이 있습니다.

1) SSG(사전렌더)
```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: { '/**': { prerender: true } },
  nitro: { prerender: { crawlLinks: true, routes: ['/', '/login', '/admin/menu3'] } },
  // app: { baseURL: '/myapp/' }
})
```
```bash
pnpm generate
```
- 산출물: `.output/public`
- 주의: 내부 `server/api` 의존이 있으면 정적 배포로 데이터가 동작하지 않을 수 있음

2) SPA(CSR 전환)
```ts
// nuxt.config.ts
export default defineNuxtConfig({ ssr: false })
```
```bash
pnpm generate
```
- 산출물: `.output/public`
- 정적 서버에서 모든 경로를 `index.html`로 리라이트 필요(Nginx/CloudFront/Netlify 등)

---

### 4) Nginx 예시(정적/SPA)
```nginx
server {
  listen 80;
  server_name example.com;

  root /var/www/nuxttest/.output/public;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

### 5) 트러블슈팅
- `nuxi: not found`
  - Docker 빌드 스테이지에서 devDependencies가 설치되지 않아 발생
  - 본 Dockerfile은 builder 스테이지를 `NODE_ENV=development`로 두고 devDeps 설치 후 빌드하도록 구성
- `.env` 파일 오류
  - `--env-file .env` 사용 시 파일이 존재해야 함. 필요한 값만 넣고 실행하거나 옵션을 제거하세요.
- 이미지 위치는 어디?
  - Docker 데몬 로컬 저장소(Windows는 Docker Desktop/WSL2 내부). `docker images`로 확인
- `/uploads/*`가 404가 나요
  - `nuxt.config.ts`에 `nitro.serveStatic=true`, `nitro.publicAssets=[{ dir: 'public', baseURL: '/' }]`가 포함되어 있어야 합니다(이미 반영됨).
  - `server/routes/uploads/[...file].get.ts` 라우트가 업로드 디렉터리에서 직접 파일을 서빙합니다.
  - `UPLOADS_DIR`과 볼륨 마운트가 일치하는지 확인하세요. (예: `UPLOADS_DIR=/uploads`, `-v D:/public/uploads:/uploads`)
  - Docker Desktop에서 호스트 폴더 공유가 허용되어 있는지 확인하세요.

---

### 6) 체크리스트
- [ ] `.env`에 `JWT_SECRET`, `HOST`, `PORT` 설정
- [ ] DB 연결 가능 여부 확인(컨테이너에서 DB 도달 가능?)
- [ ] WebSocket/프록시 포트 매핑
- [ ] 프로덕션 로그/보안 설정 점검


