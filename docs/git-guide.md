# 1. 모든 수정된 파일들을 이전 커밋 상태로 되돌리기

git reset {commit_hash}

# 2. 모든 수정된 파일들을 이전 커밋 상태로 되돌리기

git reset --hard HEAD

# 3. 추적되지 않는 파일들(untracked files)도 모두 삭제

git clean -fd

# 4. 상태 확인

git status
