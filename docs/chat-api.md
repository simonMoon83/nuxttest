# Chat API Reference

채팅 기능 관련 서버 API 목록과 파라미터/응답 요약입니다. 파일 경로 기준: `server/api/chats/*`

> 모든 엔드포인트는 인증 사용자 기준 `getCurrentUserId(event)`로 권한을 확인합니다. 채팅 멤버가 아닌 경우 403.

## List Conversations
- Method: GET
- Path: `/api/chats`
- Impl: `server/api/chats/index.get.ts`
- Query: (없음)
- Response: `{ success, data: ChatConversation[] }`
  - 필드: `id, is_group, title, updated_at, last_content, last_at, last_at_text, last_sender_name, unread_count, other_user_id, other_user_name, member_count`

## Fetch Messages
- Method: GET
- Path: `/api/chats/:id/messages`
- Impl: `...[id]/messages.get.ts`
- Query: `days` (기본 7, 최대 30)
- Response: `{ success, data: ChatMessage[] }` (+ 각 메시지 `attachments[]` 조인)

## Fetch Around (for search jump)
- Method: GET
- Path: `/api/chats/:id/around`
- Impl: `...[id]/around.get.ts`
- Query: `messageId`(필수), `before`(≤200), `after`(≤200)
- Response: `{ success, data: ChatMessage[] }` (기준 메시지 주변 정렬 ASC)

## Search in Chat
- Method: GET
- Path: `/api/chats/:id/search`
- Impl: `...[id]/search.get.ts`
- Query: `q`(필수), `limit`(≤200), `offset`
- Match: `content LIKE %q%` 또는 첨부파일 `file_name LIKE %q%`
- Response: `{ success, data: ChatMessage[] }`

## Send Text Message
- Method: POST
- Path: `/api/chats/:id/message`
- Impl: `...[id]/message.post.ts`
- Body: `{ content?: string }` (최대 2000자)
- Response: `{ success, data: { message } }`
- Side effects:
  - `chats.updated_at` 갱신
  - 내 `chat_members.last_read_message_id` 최신화
  - `emitToUsers([...], { type: 'message', data: { chat_id, message } })`

## Upload Attachments (optional content)
- Method: POST
- Path: `/api/chats/:id/attach`
- Impl: `...[id]/attach.post.ts`
- Body: `multipart/form-data`
  - fields: `file` (여러개), `content`(선택)
- Response: `{ success, data: { message{ attachments[] } } }`
- Notes:
  - 파일 저장 경로: `/uploads/<generated>` (`server/utils/uploads` 사용)
  - MIME 판별: `part.filename`로 파일 식별, `type`은 MIME

## Mark Read (per chat)
- Method: POST
- Path: `/api/chats/:id/read`
- Impl: `...[id]/read.post.ts`
- Body: `{ lastMessageId?: number }` (생략 시 기존 값 유지, 시각만 갱신)
- Response: `{ success: true }`
- Side effects: 모든 멤버에게 `type: 'read'` SSE 브로드캐스트

## Mark All Read (all chats)
- Method: POST
- Path: `/api/chats/read-all`
- Impl: `server/api/chats/read-all.post.ts`
- Body: (없음)
- Response: `{ success: true }`
- Side effects: 각 대화의 최신 메시지 id 기준 `type: 'read'` SSE 다건 전송

## Leave Chat (나가기)
- Method: POST
- Path: `/api/chats/:id/leave`
- Impl: `server/api/chats/[id]/leave.post.ts`
- Body: (없음)
- Response: `{ success: true }`
- Side effects:
  - `chat_members`에서 본인 제거
  - SSE `type: 'conversation'` 전송: `{ chat_id, action: 'left', user_id, user_name }`

## Invite Members (초대)
- Method: POST
- Path: `/api/chats/:id/invite`
- Impl: `server/api/chats/[id]/invite.post.ts`
- Body: `{ userIds?: number[], departmentId?: number, includeSub?: boolean }`
- Behavior:
  - 중복 멤버 제외 후 `chat_members`에 추가, 필요 시 `chats.is_group = 1`
  - 부서 지정 시 해당 부서(옵션: 하위부서 포함) 전체 사용자 초대 가능
- Response: `{ success: true, added: number }`
- Side effects:
  - SSE `type: 'conversation'` 전송: `{ chat_id, action: 'invited', inviter_id, inviter_name, invited_user_ids[], invited_user_names[] }`

## Start Direct Chat (1:1)
- Method: POST
- Path: `/api/chats/start`
- Impl: `server/api/chats/start.post.ts`
- Body: `{ targetUserId: number }`
- Response: `{ success: true, chatId }`
- Rule: 본인 대상 금지, 기존 1:1 존재 시 재사용

## Start Group Chat
- Method: POST
- Path: `/api/chats/start-group`
- Impl: `server/api/chats/start-group.post.ts`
- Body: `{ title?, memberUserIds?, departmentId?, includeSub? }`
- Behavior:
  - 호출자(me) 자동 포함, 중복 제거
  - 부서 선택 시 부서/하위부서(옵션) 사용자 합류
  - 2인 이상 필수
- Response: `{ success: true, chatId }`

## List Members (group)
- Method: GET
- Path: `/api/chats/:id/members`
- Impl: `...[id]/members.get.ts`
- Response: `{ success, data: Array<{ id, name, username, is_active }> }`

## Server-Sent Events (SSE)
- Method: GET
- Path: `/api/chats/stream`
- Impl: `server/api/chats/stream.get.ts`
- Headers: `Content-Type: text/event-stream`
- Events:
  - `connected`
  - `ping`
  - `message`: `{ chat_id, message }`
  - `read`: `{ chat_id, user_id, last_message_id }`
  - `conversation`:
    - 멤버 초대: `{ chat_id, action: 'invited', inviter_id, inviter_name, invited_user_ids[], invited_user_names[] }`
    - 멤버 나감: `{ chat_id, action: 'left', user_id, user_name }`

## Example cURL
```bash
# 1:1 채팅 시작
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"targetUserId": 42}' \
  http://localhost:3000/api/chats/start

# 메시지 전송
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"content":"안녕하세요"}' \
  http://localhost:3000/api/chats/123/message

# 첨부 업로드
curl -X POST \
  -F file=@./image.png \
  -F content='설명 텍스트' \
  http://localhost:3000/api/chats/123/attach

# 읽음 처리
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"lastMessageId": 9999}' \
  http://localhost:3000/api/chats/123/read
```

## Type Hints (FE Store)
`app/stores/chat.ts`의 주요 타입
```ts
export interface ChatConversation { id:number; is_group:boolean; title:string|null; updated_at:string; last_content:string|null; last_at:string|null; last_at_text?:string|null; unread_count:number; other_user_id?:number|null; other_user_name?:string|null; member_count?:number; last_sender_name?:string|null }
export interface ChatAttachment { id:number; message_id:number; file_name:string; file_path:string; mime_type?:string|null; size?:number }
export interface ChatMessage { id:number; chat_id:number; sender_id:number; sender_name?:string|null; content:string|null; created_at:string; created_at_text?:string; attachments?:ChatAttachment[]; unread_count?:number }
```
