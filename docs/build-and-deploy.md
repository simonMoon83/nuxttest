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
- 현재 `server/utils/db.ts`는 `localhost`로 고정. 컨테이너에서 호스트 DB에 연결하려면:
  - Windows: `host.docker.internal` 사용 권장
  - 또는 DB도 Docker로 띄우고 동일 네트워크 사용
- 필요 시 DB 설정을 환경변수로 빼도록 리팩터 필요

5. WebSocket/프록시
- 별도 포트(예: 4000)를 사용한다면 포트 매핑/프록시 규칙 추가 필요

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

---

### 6) 체크리스트
- [ ] `.env`에 `JWT_SECRET`, `HOST`, `PORT` 설정
- [ ] DB 연결 가능 여부 확인(컨테이너에서 DB 도달 가능?)
- [ ] WebSocket/프록시 포트 매핑
- [ ] 프로덕션 로그/보안 설정 점검


