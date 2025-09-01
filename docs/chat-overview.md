# Chat System Overview

본 문서는 프로젝트의 채팅 기능 전반을 설명합니다. 구성 요소, 데이터 흐름, 실시간 동기화, 읽음 처리, 검색/첨부 동작을 포함합니다.

- 프론트엔드
  - 컴포넌트: `app/components/chat/ChatList.vue`, `app/components/chat/ChatWindow.vue`
  - 스토어: `app/stores/chat.ts` (`useChatStore`)
- 백엔드 API: `server/api/chats/*`
  - 목록: `index.get.ts`
  - 메시지: `id/messages.get.ts`, `id/message.post.ts`, `id/attach.post.ts`, `id/around.get.ts`, `id/search.get.ts`
  - 읽음: `id/read.post.ts`, `read-all.post.ts`
  - 시작: `start.post.ts`(1:1), `start-group.post.ts`(그룹), `id/members.get.ts`
  - 실시간: `stream.get.ts` (SSE)

## Architecture
```mermaid
flowchart LR
  subgraph FE[Frontend]
    CL["ChatList.vue<br/>검색/목록/미읽음"]
    CW["ChatWindow.vue<br/>대화/전송/검색/첨부/읽음"]
    ST[(useChatStore)]
  end
  subgraph API[Server API]
    IDX["GET /api/chats (index.get)<br/>대화 목록"]
    MSGS["GET /api/chats/:id/messages"]
    SEND["POST /api/chats/:id/message"]
    ATT["POST /api/chats/:id/attach"]
    AROUND["GET /api/chats/:id/around"]
    SEARCH["GET /api/chats/:id/search"]
    READ["POST /api/chats/:id/read"]
    READALL["POST /api/chats/read-all"]
    START["POST /api/chats/start"]
    SGRP["POST /api/chats/start-group"]
    MEM["GET /api/chats/:id/members"]
    SSE["GET /api/chats/stream"]
  end
  DB[(MSSQL)]
  BUS[[chatBus]]

  CL -- useChatStore --> ST
  CW -- useChatStore --> ST
  ST --> IDX & MSGS & SEND & ATT & AROUND & SEARCH & READ & READALL & START & SGRP
  SSE --> ST
  API --> DB
  SEND & ATT & READ & READALL --> BUS --> SSE
```

## Data Model (요약)
실제 스키마는 쿼리에서 유추됩니다.
- `chats`: `id`, `is_group`, `title`, `updated_at`
- `chat_members`: `chat_id`, `user_id`, `last_read_message_id`, `last_read_at`
- `chat_messages`: `id`, `chat_id`, `sender_id`, `content`, `created_at`
- `chat_attachments`: `id`, `message_id`, `file_name`, `file_path`, `mime_type`, `size`
- `app_users`: `id`, `username`, `full_name`, `is_active`, `department_id`

관계: 하나의 `chat` ↔ 다수 `chat_members`/`chat_messages`; 각 메시지 ↔ 다수 `chat_attachments`.

## Frontend Behavior
- `ChatList.vue`
  - 초기에 `startSSE()` + `startPolling(30000)` + `fetchConversations()`.
  - 상단 '모두 읽음'은 `chat.markReadAll()` → 목록 갱신.
  - 항목 클릭 시 상위로 `emit('open', id)`.
  - 상단 우측 '새 채팅' 아이콘 클릭 시 `emit('start')` → 헤더 `AppTopbar.vue`에서 `showStartChat` 다이얼로그를 열고 패널을 닫음.
- `ChatWindow.vue`
  - 열릴 때: `chat.setActiveChat(id)` → `fetchMessages(id)` → `markRead(id)` → 스크롤 하단.
  - 전송: `send()` → 첨부 있으면 `uploadAttachments`, 아니면 `sendMessage`.
  - 첨부 미리보기: 이미지 썸네일, 파일 카드 다운로드 링크.
  - 검색: 입력 → `/api/chats/{id}/search` → 결과 클릭 시 `openResult()`가 `/around` 호출로 해당 메시지 주변 로드 후 해당 메시지로 스크롤/하이라이트.
  - 읽음 처리: 메시지 변화 감시 시 활성 대화면 `markRead(id)` 호출.
  - 스크롤 상태 추적: 하단 여부에 따라 자동 스크롤/신규 메시지 표시 배지.
  - 멤버 보기(그룹): `[id]/members` 다이얼로그.
- `useChatStore`
  - API 래핑: `fetchConversations`, `fetchMessages`, `searchMessages`, `fetchAround`, `sendMessage`, `uploadAttachments`, `markRead`, `markReadAll` 등.
  - SSE: `/api/chats/stream` 수신 → `handleSSE()`에서 `message`, `read` 이벤트 반영. 폴백 폴링 제공.
  - 읽음 감소 로직: `lastReadByUser` 메모리 맵으로 동일 범위 중복 감소 방지.

## Sequence: Send Text Message
```mermaid
sequenceDiagram
  participant U as User
  participant CW as ChatWindow.vue
  participant ST as useChatStore
  participant API as POST /api/chats/:id/message
  participant DB as DB
  participant SSE as /api/chats/stream

  U->>CW: 입력 후 보내기
  CW->>ST: sendMessage(chatId, content)
  ST->>API: body { content }
  API->>DB: chat_messages INSERT, chats.updated_at, 내 last_read 갱신
  API-->>SSE: emitToUsers(type: "message", data)
  API-->>ST: { message }
  ST->>ST: appendMessageLocal, updateConversationOnNewMessage
  alt 활성 대화
    ST->>API: POST /read (lastMessageId)
    API-->>SSE: emit read(chat_id, user_id, last_message_id)
  end
  SSE-->>ST: message/read 이벤트 수신
  ST->>ST: 대화/메시지 상태 업데이트
```

## Sequence: Upload Attachments
```mermaid
sequenceDiagram
  participant U as User
  participant CW as ChatWindow.vue
  participant ST as useChatStore
  participant API as POST /api/chats/:id/attach (multipart)
  participant DB as DB
  participant SSE as /api/chats/stream

  U->>CW: 파일 드래그/선택(+옵션 content)
  CW->>ST: uploadAttachments(chatId, files, content?)
  ST->>API: FormData(file*, content?)
  API->>DB: chat_messages INSERT + chat_attachments INSERT*
  API-->>SSE: emit message({attachments})
  API-->>ST: { message:{attachments} }
  ST->>ST: appendMessageLocal, updateConversationOnNewMessage, markRead
```

## Sequence: Read Receipts
```mermaid
sequenceDiagram
  participant FE as Active chat client
  participant API as POST /api/chats/:id/read
  participant DB as DB
  participant SSE as /api/chats/stream (others)

  FE->>API: lastMessageId = 최신 ID
  API->>DB: chat_members.last_read_message_id 갱신
  API-->>SSE: emit read(chat_id, user_id, last_message_id)
  SSE-->>FE: read 이벤트 수신
  FE->>FE: 내 메시지들의 unread_count 감소 (범위/중복 보호)
```

## Sequence: Search and Jump
```mermaid
sequenceDiagram
  participant CW as ChatWindow.vue
  participant ST as useChatStore
  participant SEARCH as GET /api/chats/:id/search
  participant AROUND as GET /api/chats/:id/around

  CW->>ST: searchMessages(q, limit, offset)
  ST->>SEARCH: q, paging
  SEARCH-->>ST: 결과(messages)
  U->>CW: 결과 항목 클릭
  CW->>ST: fetchAround(messageId, before, after)
  ST->>AROUND: messageId 중심 주변 로드
  AROUND-->>ST: messages (주변 포함)
  ST-->>CW: 상태 반영
  CW->>CW: 해당 메시지로 스크롤/하이라이트
```

## Sequence: Start Chat (1:1 & Group)
```mermaid
sequenceDiagram
  participant U as User
  participant TB as AppTopbar.vue
  participant CL as ChatList.vue
  participant ST as useChatStore
  participant START as POST /api/chats/start
  participant SGRP as POST /api/chats/start-group
  participant CW as ChatWindow.vue

  U->>TB: 채팅 아이콘 클릭
  TB->>CL: OverlayPanel 표시 (ChatList)
  U->>CL: '새 채팅' 아이콘 클릭
  CL-->>TB: emit('start') → 새 채팅 다이얼로그 표시
  U->>TB: 사용자/부서 선택, 제목 입력(선택)
  alt 1:1 조건(사용자 1명, 부서 선택 없음)
    TB->>START: { targetUserId }
    START-->>TB: { chatId }
  else 그룹 조건(그 외 경우)
    TB->>SGRP: { title?, memberUserIds[], departmentId?, includeSub }
    SGRP-->>TB: { chatId }
  end
  TB->>TB: currentChatId 설정, 패널 닫기
  TB->>CW: ChatWindow 열기(v-model:visible)
  TB->>ST: openChat(chatId), fetchConversations()
```

## Operational Notes
- SSE 연결 실패 시 폴링(`startPolling`) 자동 전환, 성공 시 `stopPolling`.
- 타임스탬프 포맷: 클라이언트에서 `formatYMDHMSLocal` 및 서버 SQL `CONVERT(varchar(19), created_at, 120)` 혼용.
- 이미지 판별: `ChatAttachment.mime_type`로 `image/` prefix 체크.
- 보안/권한: 각 API는 `chat_members` 포함 여부 확인 후 수행.
