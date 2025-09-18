# Stored Procedure 서비스 사용 가이드

이 문서는 백엔드에서 Stored Procedure를 호출하는 서비스의 사용법을 설명합니다.

## 개요

Stored Procedure 서비스는 데이터베이스의 저장 프로시저를 안전하고 효율적으로 호출할 수 있도록 제공되는 서비스입니다. JSON 형태의 파라미터를 받아서 JSON 형태의 결과를 반환합니다.

## 주요 기능

- 단일 Stored Procedure 실행
- 여러 Stored Procedure 순차 실행
- Stored Procedure 파라미터 정보 조회
- Stored Procedure 목록 조회
- 실행 시간 측정 및 오류 처리

## 백엔드 서비스

### 1. 서비스 파일 위치
```
server/utils/storedProcedure.ts
```

### 2. 주요 함수

#### `executeStoredProcedure(procedureName, parameters)`
단일 Stored Procedure를 실행합니다.

```typescript
import { executeStoredProcedure } from '~/server/utils/storedProcedure'

const result = await executeStoredProcedure('GetUserInfo', {
  userId: 123,
  includeDetails: true
})
```

#### `executeMultipleStoredProcedures(procedures)`
여러 Stored Procedure를 순차적으로 실행합니다.

```typescript
import { executeMultipleStoredProcedures } from '~/server/utils/storedProcedure'

const results = await executeMultipleStoredProcedures([
  { name: 'GetUserInfo', parameters: { userId: 123 } },
  { name: 'GetUserPermissions', parameters: { userId: 123 } }
])
```

#### `getStoredProcedureParameters(procedureName)`
Stored Procedure의 파라미터 정보를 조회합니다.

```typescript
import { getStoredProcedureParameters } from '~/server/utils/storedProcedure'

const params = await getStoredProcedureParameters('GetUserInfo')
```

## API 엔드포인트

### 1. Stored Procedure 실행
**POST** `/api/stored-procedure/execute`

#### 요청 본문
```json
{
  "procedureName": "프로시저명",
  "parameters": {
    "param1": "value1",
    "param2": 123
  }
}
```

#### 응답
```json
{
  "success": true,
  "data": [...],
  "executionTime": 45,
  "procedureName": "프로시저명",
  "parameters": {...}
}
```

### 2. 여러 Stored Procedure 실행
**POST** `/api/stored-procedure/execute`

#### 요청 본문
```json
{
  "action": "multiple",
  "parameters": [
    {
      "name": "프로시저1",
      "parameters": {"param1": "value1"}
    },
    {
      "name": "프로시저2", 
      "parameters": {"param2": 123}
    }
  ]
}
```

### 3. Stored Procedure 파라미터 조회
**POST** `/api/stored-procedure/execute`

#### 요청 본문
```json
{
  "action": "parameters",
  "procedureName": "프로시저명"
}
```

### 4. Stored Procedure 목록 조회
**GET** `/api/stored-procedure/list`

## 프론트엔드 Composable

### 1. Composable 파일 위치
```
app/composables/useStoredProcedure.ts
```

### 2. 사용법

```vue
<script setup>
const { 
  executeProcedure, 
  executeMultipleProcedures, 
  getProcedureParameters, 
  getProcedureList,
  useExecuteProcedure 
} = useStoredProcedure()

// 단일 프로시저 실행
const result = await executeProcedure('GetUserInfo', { userId: 123 })

// 여러 프로시저 실행
const results = await executeMultipleProcedures([
  { name: 'GetUserInfo', parameters: { userId: 123 } },
  { name: 'GetUserPermissions', parameters: { userId: 123 } }
])

// 파라미터 정보 조회
const params = await getProcedureParameters('GetUserInfo')

// 프로시저 목록 조회
const list = await getProcedureList()

// 반응형 데이터와 함께 사용
const { result, loading, error, execute } = useExecuteProcedure('GetUserInfo', { userId: 123 })
</script>
```

## 테스트 페이지

Stored Procedure 서비스를 테스트할 수 있는 페이지가 제공됩니다.

**URL**: `/admin/stored-procedure-test`

### 주요 기능
- 프로시저 목록 조회 및 선택
- 파라미터 정보 조회
- 단일 프로시저 실행
- 여러 프로시저 순차 실행
- 실행 결과 표시 (성공/실패, 실행시간, 데이터)

## 오류 처리

서비스는 다음과 같은 오류 상황을 처리합니다:

1. **프로시저가 존재하지 않는 경우**
   ```json
   {
     "success": false,
     "error": "Stored procedure '프로시저명' not found"
   }
   ```

2. **파라미터 오류**
   ```json
   {
     "success": false,
     "error": "파라미터 오류 메시지"
   }
   ```

3. **데이터베이스 연결 오류**
   ```json
   {
     "success": false,
     "error": "데이터베이스 연결 오류"
   }
   ```

## 보안 고려사항

1. **SQL Injection 방지**: 파라미터는 prepared statement를 통해 안전하게 처리됩니다.
2. **프로시저 존재 여부 확인**: 실행 전 프로시저 존재 여부를 확인합니다.
3. **오류 정보 노출 제한**: 민감한 데이터베이스 정보는 클라이언트에 노출되지 않습니다.

## 성능 최적화

1. **연결 풀링**: 데이터베이스 연결을 재사용하여 성능을 최적화합니다.
2. **실행 시간 측정**: 각 프로시저의 실행 시간을 측정하여 성능 모니터링이 가능합니다.
3. **배치 실행**: 여러 프로시저를 순차적으로 실행하여 효율성을 높입니다.

## 예제 사용 사례

### 1. 사용자 정보 조회
```typescript
const userInfo = await executeProcedure('GetUserInfo', {
  userId: 123,
  includeDetails: true
})
```

### 2. 보고서 생성
```typescript
const reportData = await executeMultipleProcedures([
  { name: 'GetSalesData', parameters: { startDate: '2024-01-01', endDate: '2024-12-31' } },
  { name: 'GetCustomerData', parameters: { region: 'Asia' } },
  { name: 'GenerateReport', parameters: { reportType: 'monthly' } }
])
```

### 3. 데이터 검증
```typescript
const validation = await executeProcedure('ValidateUserData', {
  email: 'user@example.com',
  phone: '010-1234-5678'
})
```

이 서비스를 통해 Stored Procedure를 안전하고 효율적으로 호출할 수 있으며, 재사용 가능한 형태로 결과를 받을 수 있습니다.
