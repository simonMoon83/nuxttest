# 📚 Git 가이드 - SMART MES 프로젝트

이 문서는 **SMART MES 프로젝트**에서 Git을 효율적으로 사용하기 위한 가이드입니다.

---

## 🚀 기본 가이드

### 📋 **일상적인 작업 플로우**

#### **1. 프로젝트 시작**
```bash
# 저장소 클론
git clone <repository-url>
cd nuxttest

# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev
```

#### **2. 작업 전 준비**
```bash
# 최신 변경사항 가져오기
git pull origin main

# 현재 상태 확인
git status

# 새 브랜치 생성 및 이동
git checkout -b feature/new-feature
```

#### **3. 변경사항 커밋**
```bash
# 변경된 파일 확인
git status

# 스테이징 (선택적 추가)
git add app/pages/new-page.vue
git add server/api/new-endpoint.ts

# 또는 모든 변경사항 추가
git add .

# 커밋 메시지 작성
git commit -m "feat: 사용자 역할 관리 페이지 추가"
```

#### **4. 원격 저장소에 푸시**
```bash
# 브랜치 푸시
git push origin feature/new-feature

# 처음 푸시하는 브랜치인 경우
git push -u origin feature/new-feature
```

#### **5. 메인 브랜치로 돌아가기**
```bash
# 메인 브랜치로 전환
git checkout main

# 최신 변경사항 가져오기
git pull origin main

# 불필요한 브랜치 정리
git branch -d feature/new-feature
```

### 🔄 **자주 사용하는 명령어**

```bash
# 상태 확인
git status

# 변경 내역 확인
git diff

# 커밋 히스토리 확인
git log --oneline

# 브랜치 목록 확인
git branch -a

# 원격 저장소 확인
git remote -v
```

---

## 🛠️ 상세 가이드

### 📁 **브랜치 관리 전략**

#### **브랜치 네이밍 컨벤션**
```bash
# 기능 개발
feature/user-role-management
feature/api-auth-system
feature/dashboard-ui

# 버그 수정
bugfix/login-error-handling
bugfix/data-table-pagination

# 핫픽스
hotfix/security-patch
hotfix/production-error

# 릴리즈
release/v1.0.0
release/v1.1.0
```

#### **브랜치 생성 및 관리**
```bash
# 기능 브랜치 생성
git checkout -b feature/user-authentication

# 브랜치 간 이동
git checkout main
git checkout feature/user-authentication

# 브랜치 목록 확인
git branch              # 로컬 브랜치
git branch -r           # 원격 브랜치
git branch -a           # 모든 브랜치

# 브랜치 삭제
git branch -d feature/completed-feature    # 로컬 브랜치 삭제
git push origin --delete feature/old-feature  # 원격 브랜치 삭제
```

### 💾 **커밋 메시지 컨벤션**

#### **커밋 메시지 형식**
```
<type>(<scope>): <subject>

<body>

<footer>
```

#### **타입 정의**
- **feat**: 새로운 기능 추가
- **fix**: 버그 수정
- **docs**: 문서 변경
- **style**: 코드 포맷팅, 세미콜론 누락 등
- **refactor**: 코드 리팩토링
- **test**: 테스트 코드 추가/수정
- **chore**: 빌드 프로세스, 패키지 매니저 설정 등

#### **커밋 메시지 예시**
```bash
# 기능 추가
git commit -m "feat(auth): JWT 토큰 기반 인증 시스템 구현"

# 버그 수정
git commit -m "fix(api): 사용자 역할 조회 시 권한 오류 수정"

# 문서 업데이트
git commit -m "docs: FormKit 스타일 가이드 업데이트"

# 리팩토링
git commit -m "refactor(components): 사이드바 컴포넌트 구조 개선"

# 스타일 변경
git commit -m "style(pages): 코드 포맷팅 및 린트 규칙 적용"
```

### 🔄 **변경사항 되돌리기**

#### **1. 작업 디렉토리 변경사항 되돌리기**
```bash
# 특정 파일 되돌리기
git checkout -- <filename>

# 모든 변경사항 되돌리기
git checkout -- .

# 추적되지 않는 파일 삭제
git clean -f          # 파일만 삭제
git clean -fd         # 파일과 디렉토리 삭제
git clean -fX         # .gitignore에 있는 파일만 삭제
```

#### **2. 스테이징 영역에서 제거**
```bash
# 특정 파일을 스테이징에서 제거
git reset HEAD <filename>

# 모든 파일을 스테이징에서 제거
git reset HEAD
```

#### **3. 커밋 되돌리기**
```bash
# 마지막 커밋 취소 (변경사항은 유지)
git reset --soft HEAD~1

# 마지막 커밋 취소 (변경사항을 스테이징 영역에서 제거)
git reset HEAD~1

# 마지막 커밋 완전히 취소 (변경사항 삭제)
git reset --hard HEAD~1

# 특정 커밋으로 되돌리기
git reset --hard {commit_hash}
```

#### **4. 커밋 수정**
```bash
# 마지막 커밋 메시지 수정
git commit --amend -m "새로운 커밋 메시지"

# 마지막 커밋에 파일 추가
git add forgotten-file.js
git commit --amend --no-edit
```

### 🔀 **병합과 리베이스**

#### **병합 (Merge)**
```bash
# 메인 브랜치로 이동
git checkout main

# 기능 브랜치 병합
git merge feature/user-authentication

# 병합 충돌 해결 후
git add .
git commit -m "resolve: 병합 충돌 해결"
```

#### **리베이스 (Rebase)**
```bash
# 현재 브랜치를 메인 브랜치 기준으로 리베이스
git rebase main

# 인터랙티브 리베이스 (커밋 정리)
git rebase -i HEAD~3

# 리베이스 중단
git rebase --abort

# 리베이스 계속
git rebase --continue
```

### 📊 **로그 및 히스토리 확인**

#### **커밋 히스토리 조회**
```bash
# 간단한 로그
git log --oneline

# 그래프로 브랜치 구조 확인
git log --graph --oneline --all

# 특정 파일의 히스토리
git log --follow <filename>

# 특정 기간의 커밋
git log --since="2024-01-01" --until="2024-12-31"

# 특정 작성자의 커밋
git log --author="개발자이름"
```

#### **변경사항 비교**
```bash
# 작업 디렉토리와 스테이징 영역 비교
git diff

# 스테이징 영역과 마지막 커밋 비교
git diff --staged

# 두 브랜치 비교
git diff main..feature/new-feature

# 특정 커밋과 비교
git diff {commit_hash}

# 파일별 변경사항 확인
git diff HEAD~1 -- <filename>
```

### 🏷️ **태그 관리**

#### **태그 생성 및 관리**
```bash
# 경량 태그 생성
git tag v1.0.0

# 주석 태그 생성
git tag -a v1.0.0 -m "버전 1.0.0 릴리즈"

# 태그 목록 확인
git tag

# 특정 패턴의 태그 검색
git tag -l "v1.*"

# 태그 푸시
git push origin v1.0.0
git push origin --tags  # 모든 태그 푸시

# 태그 삭제
git tag -d v1.0.0                    # 로컬 태그 삭제
git push origin --delete tag v1.0.0  # 원격 태그 삭제
```

### 🔧 **스태시 (Stash) 활용**

#### **임시 저장 및 복원**
```bash
# 현재 변경사항 임시 저장
git stash

# 메시지와 함께 스태시
git stash save "작업 중인 기능 임시 저장"

# 추적되지 않는 파일까지 포함
git stash -u

# 스태시 목록 확인
git stash list

# 스태시 복원
git stash pop           # 가장 최근 스태시 복원 및 삭제
git stash apply         # 가장 최근 스태시 복원 (삭제하지 않음)
git stash apply stash@{1}  # 특정 스태시 복원

# 스태시 삭제
git stash drop stash@{1}   # 특정 스태시 삭제
git stash clear            # 모든 스태시 삭제
```

### 🌐 **원격 저장소 관리**

#### **원격 저장소 설정**
```bash
# 원격 저장소 추가
git remote add origin <repository-url>

# 원격 저장소 확인
git remote -v

# 원격 저장소 URL 변경
git remote set-url origin <new-repository-url>

# 원격 브랜치 정보 업데이트
git fetch

# 원격 브랜치 추적
git branch --set-upstream-to=origin/main main
```

### 🚨 **응급 상황 대응**

#### **실수 복구 방법**
```bash
# 잘못된 브랜치에 커밋한 경우
git log --oneline  # 커밋 해시 확인
git checkout correct-branch
git cherry-pick {commit_hash}
git checkout wrong-branch
git reset --hard HEAD~1

# 민감한 정보를 커밋한 경우
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch <sensitive-file>' \
--prune-empty --tag-name-filter cat -- --all

# 푸시된 커밋 강제 되돌리기 (주의!)
git reset --hard HEAD~1
git push --force-with-lease origin feature-branch
```

### 📝 **Git 설정**

#### **전역 설정**
```bash
# 사용자 정보 설정
git config --global user.name "개발자이름"
git config --global user.email "developer@company.com"

# 에디터 설정
git config --global core.editor "code --wait"

# 줄바꿈 설정
git config --global core.autocrlf true    # Windows
git config --global core.autocrlf input   # Mac/Linux

# 브랜치 기본 이름 설정
git config --global init.defaultBranch main

# 설정 확인
git config --list
```

#### **프로젝트별 설정**
```bash
# 프로젝트별 사용자 정보
git config user.name "프로젝트개발자"
git config user.email "project@company.com"

# .gitignore 설정
echo "node_modules/" >> .gitignore
echo ".env" >> .gitignore
echo "dist/" >> .gitignore
```

---

## 🎯 **SMART MES 프로젝트 특화 가이드**

### 📂 **프로젝트 구조 고려사항**
```bash
# 주요 디렉토리별 작업 패턴

# 프론트엔드 작업
git add app/pages/
git add app/components/
git add app/stores/

# 백엔드 API 작업
git add server/api/
git add server/utils/
git add server/middleware/

# 설정 파일 작업
git add nuxt.config.ts
git add package.json
git add docs/
```

### 🔐 **보안 고려사항**
```bash
# 민감한 정보가 포함된 파일들 (.gitignore에 추가)
echo ".env" >> .gitignore
echo "*.key" >> .gitignore
echo "config/secrets.json" >> .gitignore

# 이미 추적 중인 민감한 파일 제거
git rm --cached .env
git commit -m "remove: 환경 변수 파일 추적 중단"
```

### 📋 **코드 리뷰 체크리스트**
- [ ] 커밋 메시지가 컨벤션을 따르는가?
- [ ] 한 커밋당 하나의 논리적 변경사항만 포함되어 있는가?
- [ ] 민감한 정보가 포함되어 있지 않은가?
- [ ] 테스트 코드가 포함되어 있는가?
- [ ] 문서가 업데이트되었는가?

---

## 🆘 **문제 해결**

### **자주 발생하는 문제들**

#### **Q: 커밋 메시지를 잘못 작성했어요**
```bash
# 마지막 커밋 메시지 수정
git commit --amend -m "올바른 커밋 메시지"
```

#### **Q: 잘못된 파일을 커밋했어요**
```bash
# 마지막 커밋에서 파일 제거
git reset HEAD~1
git add 올바른파일.js
git commit -m "올바른 커밋 메시지"
```

#### **Q: 병합 충돌이 발생했어요**
```bash
# 충돌 파일 확인
git status

# 충돌 해결 후
git add .
git commit -m "resolve: 병합 충돌 해결"
```

#### **Q: 원격 저장소와 동기화되지 않아요**
```bash
# 강제로 원격 저장소 상태로 맞추기
git fetch origin
git reset --hard origin/main
```

이 가이드를 통해 **효율적이고 안전한 Git 워크플로우**를 구축하실 수 있습니다! 🚀
