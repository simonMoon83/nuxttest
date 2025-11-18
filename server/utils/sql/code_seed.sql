/*-----------------------------------------------------------
코드 관리용 기본 데이터 Seed 스크립트

실행 목적
- schema.vue 화면에서 사용하는 코드성 컬럼(GRID_TYPE, COLUMN_TYPE 등)을
  DB 테이블(c_code_group, c_code)에 사전 등록합니다.

주의사항
- 컬럼 구조가 프로젝트별로 다를 수 있으니 필요한 경우 컬럼명을 조정하세요.
- 기본 plant_code는 '1000'으로 가정했습니다. 환경에 맞게 변경 가능합니다.
-----------------------------------------------------------*/

DECLARE @now VARCHAR(14) = FORMAT(GETDATE(), 'yyyyMMddHHmmss');
DECLARE @system_user VARCHAR(20) = 'system';

/*-----------------------------------------------------------
1. 코드 그룹 등록/업데이트
-----------------------------------------------------------*/
IF OBJECT_ID('tempdb..#code_groups') IS NOT NULL DROP TABLE #code_groups;

CREATE TABLE #code_groups (
    code_grp      VARCHAR(30)    NOT NULL,
    code_grp_name NVARCHAR(100)  NOT NULL,
    description   NVARCHAR(200)  NULL
);

INSERT INTO #code_groups (code_grp, code_grp_name, description)
VALUES
    ('YN_FLAG', '사용 여부', '일반적인 Y/N 플래그'),
    ('BINARY_FLAG', '이진 플래그', '0/1 기반 플래그'),
    ('GRID_TYPE', '그리드 타입', '검색/결과/상세 등 화면 역할'),
    ('GRID_COLUMN_TYPE', '그리드 컬럼 타입', '동적 컬럼 UI 타입'),
    ('GRID_FIELD_SIZE', '그리드 필드 폭', '폼/그리드 레이아웃 폭'),
    ('MENU_CONTENT_TYPE', '메뉴 컨텐츠 타입', 'grid/card 등 화면 구성');

MERGE c_code_group AS target
USING (
    SELECT code_grp, code_grp_name, description FROM #code_groups
) AS src
ON target.code_grp = src.code_grp
WHEN MATCHED THEN
    UPDATE SET
        code_grp_name  = src.code_grp_name,
        description    = src.description,
        use_yn         = 'Y',
        update_user_id = @system_user,
        update_date    = @now
WHEN NOT MATCHED THEN
    INSERT (code_grp, code_grp_name, description, use_yn, insert_user_id, insert_date, update_user_id, update_date)
    VALUES (src.code_grp, src.code_grp_name, src.description, 'Y', @system_user, @now, @system_user, @now);

DROP TABLE #code_groups;

/*-----------------------------------------------------------
2. 코드 값 등록/업데이트
-----------------------------------------------------------*/
IF OBJECT_ID('tempdb..#code_values') IS NOT NULL DROP TABLE #code_values;

CREATE TABLE #code_values (
    plant_code VARCHAR(10)   NOT NULL,
    code_grp   VARCHAR(30)   NOT NULL,
    code       VARCHAR(30)   NOT NULL,
    code_name  NVARCHAR(100) NOT NULL,
    code_value1 NVARCHAR(100) NULL,
    code_value2 NVARCHAR(100) NULL,
    code_value3 NVARCHAR(100) NULL,
    code_value4 NVARCHAR(100) NULL,
    code_value5 NVARCHAR(100) NULL
);

INSERT INTO #code_values (plant_code, code_grp, code, code_name, code_value1)
VALUES
    ('1000', 'YN_FLAG', 'Y', N'사용', NULL),
    ('1000', 'YN_FLAG', 'N', N'미사용', NULL),

    ('1000', 'BINARY_FLAG', '0', N'표시', NULL),
    ('1000', 'BINARY_FLAG', '1', N'숨김', NULL),

    ('1000', 'GRID_TYPE', 'SEARCH', N'검색', NULL),
    ('1000', 'GRID_TYPE', 'RESULT', N'결과', NULL),
    ('1000', 'GRID_TYPE', 'DETAIL', N'상세', NULL),

    ('1000', 'GRID_COLUMN_TYPE', 'InputText', N'텍스트 입력', 'text'),
    ('1000', 'GRID_COLUMN_TYPE', 'Dropdown', N'드롭다운', 'select'),
    ('1000', 'GRID_COLUMN_TYPE', 'Number', N'숫자 입력', 'number'),
    ('1000', 'GRID_COLUMN_TYPE', 'Date', N'날짜', 'date'),
    ('1000', 'GRID_COLUMN_TYPE', 'Checkbox', N'체크박스', 'checkbox'),

    ('1000', 'GRID_FIELD_SIZE', 'col-3', N'1/4 폭', NULL),
    ('1000', 'GRID_FIELD_SIZE', 'col-4', N'1/3 폭', NULL),
    ('1000', 'GRID_FIELD_SIZE', 'col-6', N'1/2 폭', NULL),
    ('1000', 'GRID_FIELD_SIZE', 'col-12', N'전체 폭', NULL),

    ('1000', 'MENU_CONTENT_TYPE', 'grid', N'그리드', NULL),
    ('1000', 'MENU_CONTENT_TYPE', 'card', N'카드', NULL);

MERGE c_code AS target
USING (
    SELECT plant_code, code_grp, code, code_name, code_value1, code_value2, code_value3, code_value4, code_value5
    FROM #code_values
) AS src
ON  target.plant_code = src.plant_code
AND target.code_grp   = src.code_grp
AND target.code       = src.code
WHEN MATCHED THEN
    UPDATE SET
        code_name      = src.code_name,
        code_value1    = src.code_value1,
        code_value2    = src.code_value2,
        code_value3    = src.code_value3,
        code_value4    = src.code_value4,
        code_value5    = src.code_value5,
        update_user_id = @system_user,
        update_date    = @now
WHEN NOT MATCHED THEN
    INSERT (
        plant_code,
        code_grp,
        code,
        code_name,
        code_value1,
        code_value2,
        code_value3,
        code_value4,
        code_value5,
        insert_user_id,
        insert_date,
        update_user_id,
        update_date
    )
    VALUES (
        src.plant_code,
        src.code_grp,
        src.code,
        src.code_name,
        src.code_value1,
        src.code_value2,
        src.code_value3,
        src.code_value4,
        src.code_value5,
        @system_user,
        @now,
        @system_user,
        @now
    );

DROP TABLE #code_values;

