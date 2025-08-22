## Python 실행 가이드 (Windows, macOS)

### 개요
- 이 문서는 저장소의 `python/` 폴더에 있는 배치/셸 스크립트를 이용해 Python 서비스를 실행하는 방법을 안내합니다.
- 기본값으로 `influx_api.py`가 있으면 Uvicorn으로 `127.0.0.1:8000`에서 실행합니다. 없으면 `main.py`를 실행하고, 둘 다 없으면 Python REPL을 엽니다.

---

### 선행 준비
- Python 3.9+ 설치 (권장: 3.10/3.11)
- (옵션) 가상환경 생성 및 활성화
```bash
# macOS/Linux (bash/zsh)
python3 -m venv .venv && source .venv/bin/activate

# Windows (PowerShell)
py -3 -m venv .venv; .\.venv\Scripts\Activate.ps1
```
- 의존성 설치
```bash
# 프로젝트 루트에서
pip install -r python/requirements.txt
```

---

### Windows: 배치 스크립트 실행 (`python\\run_python.bat`)
```bat
REM 기본 실행 (인자 없으면 influx_api.py → main.py → REPL 순)
python\run_python.bat

REM 특정 스크립트/모듈을 직접 실행
python\run_python.bat script.py arg1 arg2
python\run_python.bat -m uvicorn influx_api:app --host 127.0.0.1 --port 8000 --reload
```
- 스크립트는 현재 디렉토리를 `python/`로 이동하고, `.venv` 또는 `venv`가 있으면 자동 활성화합니다.

---

### macOS: 셸 스크립트 실행 (`python/run_python.sh`)
```bash
# 실행 권한 부여 (최초 1회)
chmod +x python/run_python.sh

# 기본 실행 (인자 없으면 influx_api.py → main.py → REPL 순)
./python/run_python.sh

# 특정 스크립트/모듈을 직접 실행
./python/run_python.sh script.py arg1 arg2
./python/run_python.sh -m uvicorn influx_api:app --host 127.0.0.1 --port 8000 --reload

# 포트/호스트 변경 (환경변수 사용)
PY_PORT=8010 ./python/run_python.sh
PY_HOST=0.0.0.0 PY_PORT=8010 ./python/run_python.sh
```
- 스크립트는 현재 디렉토리를 `python/`로 이동하고, `.venv` 또는 `venv`가 있으면 자동 활성화합니다.
- `PY_HOST` 기본값은 `127.0.0.1`, `PY_PORT` 기본값은 `8000`입니다. (또는 `PORT` 환경변수도 인식)

---

### 포트 충돌(8000) 해결
macOS
```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
kill -TERM $(lsof -tiTCP:8000 -sTCP:LISTEN) 2>/dev/null || true
sleep 1
kill -KILL $(lsof -tiTCP:8000 -sTCP:LISTEN) 2>/dev/null || true
```

Windows (PowerShell)
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

### 참고
- 이 Python 서비스는 Nuxt(포트 3000)와 독립적으로 실행됩니다. 동시에 사용할 경우 Python 포트를 8010 등으로 조정하세요.
- Docker 컨테이너 안/밖의 `127.0.0.1`은 서로 다릅니다. 컨테이너에서 호스트로 접속하려면 `host.docker.internal`을 참고하세요.

---

## (가이드) Python을 Docker로 실행하기
아래는 컨테이너화 예시 가이드입니다. 실제 파일을 생성하지 않고, 필요 시 이 예시를 참고해 직접 구성하세요.

### 1) Dockerfile 예시
```dockerfile
FROM python:3.11-slim
WORKDIR /app

# 시스템 필수 패키지(필요 시)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

# 의존성 설치
COPY python/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 앱 복사
COPY python/ ./

# 기본 실행: influx_api.py가 있다고 가정
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "influx_api:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2) 빌드/실행 예시
```bash
# 이미지 빌드 (프로젝트 루트에서)
docker build -t my-python-app -f python/Dockerfile .

# 네트워크(선택): Nuxt와 동일 네트워크 사용 시
docker network create nuxtnet  # 최초 1회

# 실행 (단독)
docker run --rm -p 8000:8000 my-python-app

# 실행 (Nuxt와 같은 네트워크)
docker run --rm --network nuxtnet -p 8000:8000 my-python-app
```

### 3) 환경변수/포트 변경
```bash
docker run --rm -p 8010:8000 -e UVICORN_HOST=0.0.0.0 -e UVICORN_PORT=8000 my-python-app
```

> 참고: 위 Dockerfile에서는 Uvicorn 호스트/포트를 고정으로 기동합니다. 동적으로 바꾸려면 `CMD`를 엔트리포인트 스크립트로 교체해 환경변수를 읽어 반영하도록 구성하면 됩니다.



