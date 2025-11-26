# 프로시저 수정 가이드: DROP_로 시작하는 col_code 처리

## 개요
`s_grid_detail` 테이블의 `col_code`가 `DROP_`로 시작하는 경우, `c_code` 테이블에서 코드 리스트를 조회하여 그리드의 콤보박스 옵션으로 사용합니다.

## 프로시저 수정 내용

### `sp_grid_info` 프로시저 수정

**위치**: `server/utils/sql/procedure.sql`

**수정 내용**:
- `@case = 'search'` 케이스에서 두 개의 결과셋을 반환하도록 수정
- 첫 번째 결과셋: 기존과 동일하게 `s_grid_detail` 컬럼 정보 반환
- 두 번째 결과셋: `col_code`가 `DROP_`로 시작하는 경우, `c_code` 테이블에서 코드 리스트 조회

**수정된 SQL**:
```sql
if @case = 'search'
begin
    -- 첫 번째 결과셋: s_grid_detail 컬럼 정보
    select  grid_id, col_id, col_name, col_seq, col_type, 
            col_size, col_code, col_width, col_hide, col_flex, use_yn
      from  s_grid_detail a0 (nolock)
     where  a0.grid_id = @grid_id
     order  by a0.col_seq

    -- 두 번째 결과셋: col_code가 DROP_로 시작하는 경우 c_code에서 코드 리스트 조회
    select  col_code = a0.col_code,
            code = c0.code,
            code_name = c0.code_name
      from  s_grid_detail a0 (nolock)
     inner join c_code c0 (nolock)
        on  c0.code_grp = a0.col_code
     where  a0.grid_id = @grid_id
       and  a0.col_code like 'DROP_%'
     order  by a0.col_code, c0.code
end
```

## 프론트엔드 처리

### `AgGrid.vue` 컴포넌트 수정

**위치**: `app/components/AgGrid.vue`

**처리 로직**:
1. `sp_grid_info` 프로시저 호출 시 `recordsets` 배열 확인
2. 두 번째 결과셋이 있으면 `col_code`별로 코드 리스트를 Map에 저장
3. 컬럼 정의 생성 시 `col_code`가 `DROP_`로 시작하는 경우:
   - 프로시저에서 받은 두 번째 결과셋의 데이터 사용
   - 별도의 API 호출 없이 바로 콤보박스 옵션으로 설정
4. 그 외의 경우는 기존대로 `sp_code_info` 프로시저 호출

**주요 코드**:
```typescript
// 두 번째 결과셋에서 DROP_로 시작하는 col_code의 코드 리스트 추출
const codeOptionsMap = new Map<string, any[]>()
if (Array.isArray(result.recordsets) && result.recordsets.length > 1) {
  const codeList = result.recordsets[1] || []
  codeList.forEach((item: any) => {
    const colCode = String(item?.col_code || '').trim()
    if (colCode) {
      if (!codeOptionsMap.has(colCode)) {
        codeOptionsMap.set(colCode, [])
      }
      codeOptionsMap.get(colCode)!.push({
        code: item.code,
        code_name: item.code_name
      })
    }
  })
}

// col_code가 DROP_로 시작하는 경우 처리
if (codeGroup.toUpperCase().startsWith('DROP_')) {
  const options = codeOptionsMap.get(codeGroup) || []
  if (options.length > 0) {
    def.__options = options
    // 값 -> 라벨 포맷팅
    def.valueFormatter = (p: any) => {
      const v = smartGet(p?.data, def.field)
      const m = (def.__options || []).find((o: any) => String(o.code) === String(v))
      return m ? (m.code_name ?? m.name ?? m.text ?? v) : (v ?? '')
    }
  }
}
```

## 서버 유틸리티 수정

### `storedProcedure.ts` 수정

**위치**: `server/utils/storedProcedure.ts`

**수정 내용**:
- 프로시저 실행 결과에서 `recordsets` 배열도 반환하도록 수정
- 여러 결과셋을 반환하는 프로시저를 지원

**수정된 코드**:
```typescript
return {
  success: true,
  data: result.recordset,
  recordset: result.recordset,
  recordsets: (result as any).recordsets,  // 여러 결과셋 포함
  rowsAffected: result.rowsAffected,
  output: result.output,
  returnValue: result.returnValue,
  executionTime,
  procedureName,
  parameters
}
```

## 사용 방법

1. **데이터베이스에서 프로시저 수정**:
   - `server/utils/sql/procedure.sql` 파일의 `sp_grid_info` 프로시저를 수정
   - 데이터베이스에 프로시저 재생성

2. **s_grid_detail 테이블 설정**:
   - 그리드 컬럼의 `col_code`를 `DROP_`로 시작하도록 설정
   - 예: `DROP_STATUS`, `DROP_TYPE` 등

3. **c_code 테이블 데이터 준비**:
   - `code_grp`가 `DROP_`로 시작하는 `col_code` 값과 일치하는 코드 데이터 입력
   - 예: `code_grp = 'DROP_STATUS'`인 경우 `code`, `code_name` 등 입력

4. **그리드 사용**:
   - `/ADM011` 페이지에서 해당 그리드를 조회하면 자동으로 콤보박스가 표시됨

## 장점

- **성능 향상**: 별도의 API 호출 없이 한 번의 프로시저 호출로 모든 데이터 조회
- **일관성**: 프로시저 기반으로 데이터 관리
- **유지보수**: 프로시저 수정만으로 동작 변경 가능

