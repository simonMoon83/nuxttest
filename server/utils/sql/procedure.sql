/*-----------------------------------
Proc ID     : sp_adm011
Proc Name   : 동적화면 테스트1
Create Date : 2025.10.19
Proc Params : @case - Search : 조회  
                      Save   : 저장  
                      Delete : 삭제  
-----------------------------------*/
/*-----------------------------------
exec    sp_adm011
        @case                     =  'search'
exec    sp_adm011
        @case                     =  'save'
        @grid_id                  =  ''
        @grid_name                =  ''
        @grid_type                =  ''
        @grid_row                 =  ''
        @use_yn                   =  ''
-----------------------------------*/
CREATE   procedure  [dbo].[sp_adm011]
        @case                     varchar(10),
        @grid_id                  varchar(20)      =  null,
        @grid_name                varchar(30)      =  null,
        @grid_type                varchar(10)      =  null,
        @grid_row                 int              =  null,
        @use_yn                   char(1)          =  null,
        @user_id                  varchar(20)      =  null,
		@row_state                varchar(1)       =  null
as
begin
set     nocount on

declare @rowcnt               integer,
        @now                  datetime

select  @now                  =  getdate()

if      @case  =  'search'
begin
    select  grid_id                  =  a0.grid_id,
            grid_name                =  a0.grid_name,
            grid_type                =  a0.grid_type,
            grid_row                 =  a0.grid_row,
            use_yn                   =  a0.use_yn
      from  s_grid_master a0 (nolock)
	 where (isnull( @grid_id,  '' ) = '' or a0.grid_id   =  @grid_id)
	   and (isnull( @grid_name, '' ) = '' 
	    or  a0.grid_id            like  '%' + @grid_name + '%'
	    or  a0.grid_name          like  '%' + @grid_name + '%')
end
else if @case  =  'save'
begin
    if      @row_state  =  'A'
    begin
        insert into s_grid_master (
                grid_id,
                grid_name,
                grid_type,
                grid_row,
                use_yn,
                insert_user_id,
                insert_date,
                update_user_id,
                update_date)
        select  @grid_id,
                @grid_name,
                @grid_type,
                @grid_row,
                @use_yn,
                @user_id, @now, 
                @user_id, @now

        if  @@error <> 0
        begin
            select  return_code  =  'Err',
                    return_msg   =  ''
        end
    end
    else if @row_state = 'M'
    begin
        update  a0
           set  grid_name              =  @grid_name,
                grid_type              =  @grid_type,
                grid_row               =  @grid_row,
                use_yn                 =  @use_yn,
                update_user_id         =  @user_id,
                update_date            =  @now
          from  s_grid_master a0
         where  a0.grid_id             =  @grid_id

        if  @@error <> 0
        begin
            select  return_code  =  'Err',
                    return_msg   =  ''
        end
	end
	else if @row_state = 'D'
	begin
		delete  a0
		  from  s_grid_master a0
		 where  a0.grid_id             =  @grid_id

		if  @@error <> 0
		begin
			select  return_code  =  'Err',
					return_msg   =  ''
		end
	
    end

    select  return_code  =  'complete',
            return_msg   =  ''

end

end;

/*-----------------------------------
Proc ID     : sp_code_info
Proc Name   : Role 정보
Create Date : 2025.08.31
Proc Params : @case - Search : 조회  
                      Save   : 저장  
                      Delete : 삭제  
-----------------------------------*/
/*-----------------------------------
exec    sp_code_info
        @case                     =  'search',
		@plant_code               =  '1000',
		@code_grp                 =  'ACTIVE'

exec    sp_code_info
        @case                     =  'search'
exec    sp_code_info
        @case                     =  'save'
        @plant_code               =  ''
        @code_grp                 =  ''
        @code                     =  ''
        @code_name                =  ''
        @code_value1              =  ''
        @code_value2              =  ''
        @code_value3              =  ''
        @code_value4              =  ''
        @code_value5              =  ''
-----------------------------------*/
CREATE   procedure  [dbo].[sp_code_info]
        @case                     varchar(10),
        @plant_code               varchar(10)      =  null,
        @code_grp                 varchar(10)      =  null,
        @code                     varchar(10)      =  null,
        @code_name                varchar(50)      =  null,
        @code_value1              varchar(30)      =  null,
        @code_value2              varchar(30)      =  null,
        @code_value3              varchar(30)      =  null,
        @code_value4              varchar(30)      =  null,
        @code_value5              varchar(30)      =  null,
        @user_id                  varchar(20)      =  null
as
begin
set     nocount on

declare @rowcnt               integer,
        @now                  datetime

select  @now                  =  getdate()

if      @case  =  'search'
begin
    select  plant_code               =  a0.plant_code,
            code_grp                 =  a0.code_grp,
            code                     =  a0.code,
            code_name                =  a0.code_name,
            code_value1              =  a0.code_value1,
            code_value2              =  a0.code_value2,
            code_value3              =  a0.code_value3,
            code_value4              =  a0.code_value4,
            code_value5              =  a0.code_value5
      from  c_code a0 (nolock)
	 where  a0.plant_code            =  @plant_code
	   and  a0.code_grp              =  @code_grp
	   and (isnull( @code, '' )      =  ''
	    or (isnull( @code, '' )     <>  ''
	   and  a0.code                  =  @code))
	    
end
else if @case  =  'save'
begin
    select  @rowcnt           =  count(1)
      from  c_code a0 (nolock)
     where  a0.plant_code             =  @plant_code
       and  a0.code_grp               =  @code_grp
       and  a0.code                   =  @code

    if  @rowcnt  =  0
    begin
        insert into c_code (
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
                update_date)
        select  @plant_code,
                @code_grp,
                @code,
                @code_name,
                @code_value1,
                @code_value2,
                @code_value3,
                @code_value4,
                @code_value5,
                @user_id, @now, 
                @user_id, @now

        if  @@error <> 0
        begin
            select  return_code  =  'Err',
                    return_msg   =  ''
        end
    end
    else
    begin
        update  a0
           set  code_name              =  @code_name,
                code_value1            =  @code_value1,
                code_value2            =  @code_value2,
                code_value3            =  @code_value3,
                code_value4            =  @code_value4,
                code_value5            =  @code_value5,
                update_user_id         =  @user_id,
                update_date            =  @now
          from  c_code a0
         where  a0.plant_code             =  @plant_code
           and  a0.code_grp               =  @code_grp
           and  a0.code                   =  @code

        if  @@error <> 0
        begin
            select  return_code  =  'Err',
                    return_msg   =  ''
        end
    end

    select  return_code  =  'complete',
            return_msg   =  ''

end
else if @case  =  'delete'
begin
    delete  a0
      from  c_code a0
         where  a0.plant_code             =  @plant_code
           and  a0.code_grp               =  @code_grp
           and  a0.code                   =  @code

    if  @@error <> 0
    begin
        select  return_code  =  'Err',
                return_msg   =  ''
    end

    select  return_code  =  'complete',
            return_msg   =  ''

end

end;

/*-----------------------------------
Proc ID     : sp_create_proc
Proc Name   : 유저 정보 관리
Create Date	: 2025. 06. 22
Proc Params : @case - Search : 조회
                      Save   : 저장
					  Delete : 삭제
-----------------------------------*/
/*-----------------------------------
exec    sp_create_proc
		@sp_id                =  'sp_role_info',
        @sp_name              =  'Role 정보',
		@table_name           =  's_role_info'
-----------------------------------*/
CREATE   procedure  [dbo].[sp_create_proc]
	    @sp_id                varchar(50),
		@sp_name              varchar(50),
		@table_name           varchar(50)
as
begin

set     nocount on

declare @max_seq     int,
        @tot_cnt     int,
		@hide_cnt    int,
		@pk_cnt      int,
		@non_pk_min  int

declare @text table (
    seq int primary key, 
    txt varchar(500)
)

declare @table table (
    column_id   int primary key, 
    column_name varchar(50),
	column_type varchar(50),
	pk_yn       char(1),
	hide_yn     char(1)
)

insert  into @table ( column_id   , column_name , column_type , pk_yn, hide_yn )
select  column_id    =  col.column_id,
		column_name  =  col.name, 
        column_type  =  typ.name
		             +  case when typ.name like '%char'   then '(' + convert( varchar, col.max_length ) + ')'
					         when typ.name    = 'numeric' then '(' + convert( varchar, col.precision )  + ', ' + convert( varchar, col.scale ) + ')'
							                              else ''
 						end,
		pk_yn        =  case when idx.column_id is null then 'N' else 'Y' end,
		hide_yn      =  case when col.name in ('insert_user_id', 'insert_date', 'update_user_id', 'update_date') then 'Y' else 'N' end
  from  sys.tables tab (nolock) 
        left join sys.all_columns col  (nolock)
               on col.object_id      = tab.object_id
	    left join sys.types       typ  (nolock)
		       on typ.system_type_id = col.system_type_id
			  and typ.user_type_id   = col.user_type_id
		outer apply (
		     select ic.*
		       from sys.indexes   ix (nolock)
			        left join sys.index_columns ic (nolock) 
					       on ic.object_id = ix.object_id
						  and ic.index_id  = ix.index_id
		      where ix.object_id      = tab.object_id
			    and ix.is_primary_key = 1
				and ic.column_id      = col.column_id
		) idx
 where  tab.name   =  @table_name

select  @tot_cnt     =  count(1),
        @hide_cnt    =  max( case when column_name in ('insert_user_id', 'insert_date', 'update_user_id', 'update_date') then 0 else column_id end ),
		@pk_cnt      =  max( case when pk_yn = 'Y' then column_id else 0 end ),
		@non_pk_min	 =  min( case when pk_yn = 'N' then column_id else 9999 end )
  from  @table
  
/* ---- Header ---- */
insert  into @text (seq, txt)
select  1 , '/*-----------------------------------'     union 
select  2 , 'Proc ID     : ' + @sp_id                   union
select  3 , 'Proc Name   : ' + @sp_name                 union
select  4 , 'Create Date : ' + format( getdate(), 'yyyy.MM.dd' )       union
select  5 , 'Proc Params : @case - Search : 조회  '     union
select  6 , '                      Save   : 저장  '     union
select  7 , '                      Delete : 삭제  '     union
select  8 , '-----------------------------------*/'     union
select  9 , '/*-----------------------------------'     union
select  10, 'exec    ' + @sp_id                         union
select  11, '        @case                     =  ''search'''          union
select  12, 'exec    ' + @sp_id                         union
select  13, '        @case                     =  ''save'''            union
select  13 + column_id,
        '        @' + convert( char(24), column_name ) + ' =  '''''
  from  @table       
 where  hide_yn = 'N'                                   union
select  @hide_cnt + 14, 
        '-----------------------------------*/'         


/* ---- Proc Start ---- */
insert  into @text (seq, txt)
select  @hide_cnt + 15, 
        'create   procedure  [dbo].[' + @sp_id + ']'  union
select  @hide_cnt + 16, 
        '        @case                     varchar(10),' union
select  @hide_cnt + 16 + column_id, 
        '        @' + convert( char(24), column_name ) + ' ' + convert( char(15), column_type ) + '  =  null,'
  from  @table
 where  hide_yn = 'N'                                   union
select  @hide_cnt * 2 + 17,
        '        @user_id                  varchar(20)' union
select  @hide_cnt * 2 + 18, 'as'                        union
select  @hide_cnt * 2 + 19, 'begin'                     union
select  @hide_cnt * 2 + 20, 'set     nocount on'        union
select  @hide_cnt * 2 + 21, ''                          union
select  @hide_cnt * 2 + 22, 
        'declare @rowcnt               integer,'        union
select  @hide_cnt * 2 + 23, 
        '        @now                  varchar(14)'     union
select  @hide_cnt * 2 + 24, ''                          union
select  @hide_cnt * 2 + 25, 
        'select  @now                  =  format(getdate(), ''yyyyMMddHHmmss'')' union
select  @hide_cnt * 2 + 26, ''                          


/* ---- Search ---- */
insert  into @text (seq, txt)
select  @hide_cnt * 2 + 27, 
        'if      @case  =  ''search'''                  union
select  @hide_cnt * 2 + 28, 'begin'                     union
select  @hide_cnt * 2 + 28 + column_id, 
        case when column_id = 1 then  '    select  ' else '            ' end + 
		convert( char(24), column_name ) + ' =  a0.' + column_name + 
		case when @hide_cnt = column_id then '' else ',' end
  from  @table
 where  hide_yn = 'N'                                   union
select  @hide_cnt * 3 + 29, 
        '      from  ' + @table_name + ' a0 (nolock)'   union
select  @hide_cnt * 3 + 30, 'end'                       


/* ---- Save ---- */
insert  into @text (seq, txt)
select  1000, 
        'else if @case  =  ''save'''                    union
select  1001, 'begin'                   union
select  1002,
        '    select  @rowcnt           =  count(1)'     union
select  1003,
        '      from  ' + @table_name + ' a0 (nolock)'   union
select  1003 + column_id,
        case when column_id = 1 then '     where  a0.' else '       and  a0.' end + 
        convert( char(21), column_name ) + '  =  @'  + column_name
  from  @table
 where  pk_yn = 'y'                                     union
select  1004 + @pk_cnt, ''                


/* ---- insert ---- */
insert  into @text (seq, txt)
select  2000, 
        '    if  @rowcnt  =  0'                         union
select  2001, '    begin'     union
select  2002,
        '        insert into ' + @table_name + ' ('     union
select  2002 + column_id,
        '                ' + column_name + case when column_id = @tot_cnt then ')' else ',' end
  from  @table                                          union
select  @tot_cnt + 2002 + column_id,
        case when column_id = '1' then '        select  ' else '                ' end + 
		'@' + column_name + ','
  from  @table
 where  hide_yn = 'N'                                   union
select  2003 + @tot_cnt +  @hide_cnt,
        '                @user_id, @now, '              union
select  2004 + @tot_cnt +  @hide_cnt,
        '                @user_id, @now'                union
select  2005 + @tot_cnt + @hide_cnt, ''                  union
select  2006 + @tot_cnt + @hide_cnt,
        '        if  @@error <> 0'                      union
select  2007 + @tot_cnt + @hide_cnt,
        '        begin'                                 union
select  2008 + @tot_cnt + @hide_cnt,
        '            select  return_code  =  ''Err'','  union
select  2009 + @tot_cnt + @hide_cnt,
        '                    return_msg   =  '''''      union
select  2010 + @tot_cnt + @hide_cnt,
        '        end'                                   union
select  2011 + @tot_cnt + @hide_cnt,
        '    end'                                       


/* ---- update ---- */
insert  into @text (seq, txt)
select  3000,
        '    else'                                      union
select  3001,
        '    begin'                                     union
select  3002,
        '        update  a0'                            union
select  3002 + column_id,
        case when column_id = @non_pk_min then '           set  ' else '                ' end +
		convert( char(21), column_name ) + '  =  @' + column_name + ','
  from  @table
 where  hide_yn = 'N' and pk_yn = 'N'                   union
select  3003 + @hide_cnt,
        '                update_user_id         =  @user_id,'  union
select  3004 + @hide_cnt,
        '                update_date            =  @now'       union
select  3005 + @hide_cnt,
        '          from  ' + @table_name + ' a0'        union
select  3005 + @hide_cnt + column_id,
        case when column_id = 1 then '         where  a0.' else '           and  a0.' end + 
		convert( char(21), column_name ) + '  =  @' + column_name
  from  @table
 where  pk_yn = 'Y'                                     union
select  3006 + @hide_cnt + @pk_cnt, ''                  union
select  3007 + @hide_cnt + @pk_cnt,
        '        if  @@error <> 0'                      union
select  3008 + @hide_cnt + @pk_cnt,
        '        begin'                                 union
select  3009 + @hide_cnt + @pk_cnt,
        '            select  return_code  =  ''Err'','  union
select  3010 + @hide_cnt + @pk_cnt,
        '                    return_msg   =  '''''      union
select  3011 + @hide_cnt + @pk_cnt,
        '        end'                                   union
select  3012 + @hide_cnt + @pk_cnt,
        '    end'                                       union
select  3013 + @hide_cnt + @pk_cnt, ''                  union
select  3014 + @hide_cnt + @pk_cnt,
        '    select  return_code  =  ''complete'','     union
select  3015 + @hide_cnt + @pk_cnt,
        '            return_msg   =  '''''              union
select  3016 + @hide_cnt + @pk_cnt, ''                  union
select  3017 + @hide_cnt + @pk_cnt,
        'end'                                           


/* ---- delete ---- */
insert  into @text (seq, txt)
select  4000,
        'else if @case  =  ''delete'''                  union
select  4001,
        'begin'                                         union
select  4002,   
        '    delete  a0'                                union
select  4003,
        '      from  ' + @table_name + ' a0'            union
select  4003 + column_id,
        case when column_id = 1 then '         where  a0.' else '           and  a0.' end + 
		convert( char(21), column_name ) + '  =  @' + column_name
  from  @table
 where  pk_yn = 'Y'                                     union
select  4004 + @pk_cnt, ''                              union
select  4005 + @pk_cnt,
        '    if  @@error <> 0'                          union
select  4006 + @pk_cnt,
        '    begin'                                     union
select  4007 + @pk_cnt,
        '        select  return_code  =  ''Err'','      union
select  4008 + @pk_cnt,
        '                return_msg   =  '''''          union
select  4009 + @pk_cnt, '    end'                       union
select  4010 + @pk_cnt, ''                              union
select  4011 + @pk_cnt,
        '    select  return_code  =  ''complete'','     union
select  4012 + @pk_cnt,
        '            return_msg   =  '''''              union
select  4013 + @pk_cnt, ''                              union
select  4014 + @pk_cnt, 'end'                           union
select  4015 + @pk_cnt, ''                              



/* ---- Proc end ---- */
insert  into @text (seq, txt)
select  9999, 'end'
        
--select  *
--  from  @table
/*-----------------------------------
exec    sp_create_proc
        @sp_id       =  'sp_grid_info',
        @sp_name              =  '그리드 정보',
		@table_name           =  's_grid_detail'
-----------------------------------*/
   
select  *
  from  @text
 order  by
        seq

end;

/*-----------------------------------
Proc ID     : sp_grid_info
Proc Name   : 그리드 정보
Create Date : 2025.08.30
Proc Params : @case      - Search : 조회  
                           Save   : 저장 (row_state로 분기)
              @row_state - A : 추가 (INSERT)
                           M : 수정 (UPDATE)
                           D : 삭제 (DELETE)
-----------------------------------*/
/*-----------------------------------
exec    sp_grid_info
        @case                     =  'search',
		@grid_id                  =  'menu5_header'

exec    sp_grid_info
        @case                     =  'save',
        @row_state                =  'A',
        @grid_id                  =  'menu5_header',
        @col_id                   =  'test_col',
        @col_name                 =  '테스트컬럼',
        @col_seq                  =  1,
        @col_type                 =  'text',
        @col_size                 =  '50',
        @use_yn                   =  'Y',
        @user_id                  =  'admin'

exec    sp_grid_info
        @case                     =  'save',
        @row_state                =  'M',
        @grid_id                  =  'menu5_header',
        @col_id                   =  'test_col',
        @col_name                 =  '수정된컬럼',
        @use_yn                   =  'Y',
        @user_id                  =  'admin'

exec    sp_grid_info
        @case                     =  'save',
        @row_state                =  'D',
        @grid_id                  =  'menu5_header',
        @col_id                   =  'test_col',
        @user_id                  =  'admin'
-----------------------------------*/
CREATE   procedure  [dbo].[sp_grid_info]
        @case                     varchar(10),
        @row_state                char(1)          =  null,
        @grid_id                  varchar(20)      =  null,
        @col_id                   varchar(20)      =  null,
        @col_name                 varchar(30)      =  null,
        @col_seq                  int              =  null,
        @col_type                 varchar(20)      =  null,
        @col_size                 varchar(10)      =  null,
        @col_code                 varchar(20)      =  null,
        @col_width                int              =  null,
        @col_hide                 int              =  null,
        @col_flex                 int              =  null,
        @use_yn                   char(1)          =  null,
        @user_id                  varchar(20)      =  null
as
begin
set     nocount on

declare @now                  varchar(14)

select  @now                  =  format(getdate(), 'yyyyMMddHHmmss')

if      @case  =  'search'
begin
    select  grid_id                  =  a0.grid_id,
            col_id                   =  a0.col_id,
            col_name                 =  a0.col_name,
            col_seq                  =  a0.col_seq,
            col_type                 =  a0.col_type,
            col_size                 =  a0.col_size,
            col_code                 =  a0.col_code,
            col_width                =  a0.col_width,
            col_hide                 =  a0.col_hide,
            col_flex                 =  a0.col_flex,
            use_yn                   =  a0.use_yn
      from  s_grid_detail a0 (nolock)
	 where  a0.grid_id               =  @grid_id
	 order  by
	        a0.col_seq
end
else if @case  =  'save'
begin
    if      @row_state  =  'A'    -- Add (INSERT)
    begin
        insert into s_grid_detail (
                grid_id,
                col_id,
                col_name,
                col_seq,
                col_type,
                col_size,
                col_code,
                col_width,
                col_hide,
                col_flex,
                use_yn,
                insert_user_id,
                insert_date,
                update_user_id,
                update_date)
        select  @grid_id,
                @col_id,
                @col_name,
                @col_seq,
                @col_type,
                @col_size,
                @col_code,
                @col_width,
                @col_hide,
                @col_flex,
                @use_yn,
                @user_id, @now, 
                @user_id, @now

        if  @@error <> 0
        begin
            select  return_code  =  'Err',
                    return_msg   =  ''
            return
        end
    end
    else if @row_state =  'M'     -- Modify (UPDATE)
    begin
        update  a0
           set  col_name               =  @col_name,
                col_seq                =  @col_seq,
                col_type               =  @col_type,
                col_size               =  @col_size,
                col_code               =  @col_code,
                col_width              =  @col_width,
                col_hide               =  @col_hide,
                col_flex               =  @col_flex,
                use_yn                 =  @use_yn,
                update_user_id         =  @user_id,
                update_date            =  @now
          from  s_grid_detail a0
         where  a0.grid_id                =  @grid_id
           and  a0.col_id                 =  @col_id

        if  @@error <> 0
        begin
            select  return_code  =  'Err',
                    return_msg   =  ''
            return
        end
    end
    else if @row_state =  'D'     -- Delete
    begin
        delete  a0
          from  s_grid_detail a0
         where  a0.grid_id                =  @grid_id
           and  a0.col_id                 =  @col_id

        if  @@error <> 0
        begin
            select  return_code  =  'Err',
                    return_msg   =  ''
            return
        end
    end

    select  return_code  =  'complete',
            return_msg   =  ''

end

end;

/*-----------------------------------
Proc ID     : sp_menu_info
Proc Name   : 메뉴 정보 관리
Create Date	: 2025. 07. 06
Proc Params : @case - Search : 조회
                      Save   : 저장
					  Delete : 삭제
-----------------------------------*/
/*-----------------------------------
exec    sp_menu_info
        @case         =  'search',
		@user_id      =  'admin'
		
exec    sp_menu_info  
        @case         =  'searchAll'
		
exec    sp_menu_info  
        @case         =  'save',
		@menu_id      =  'QM110',
		@menu_name    =  'SPC 2',
		@p_menu_id    =  'MENU30',
		@menu_seq     =  '00020',
		@user_id      =  'admin',
		@use_yn       =  'Y'

exec    sp_menu_info  
        @case         =  'delete'
-----------------------------------*/
CREATE   procedure  [dbo].[sp_menu_info]
	    @case                 varchar(10)  =  null,
		@menu_id              varchar(20)  =  null,
        @menu_name            varchar(50)  =  null,
        @p_menu_id            varchar(20)  =  null,
        @menu_seq             varchar(10)  =  null,
		@user_id              varchar(20)  =  null,
        @use_yn               char(01)     =  null
as
begin

set     nocount on

declare @rowcnt               integer,
        @now                  varchar(14)
		
select  @now                  =  FORMAT(GETDATE(), 'yyyyMMddHHmmss')

if      @case  =  'searchAll'
begin
    select  menu_id           =  menu.menu_id  ,
            menu_name         =  menu.menu_name,
            p_menu_id         =  menu.p_menu_id,
            menu_seq          =  menu.menu_seq ,
            use_yn            =  menu.use_yn   ,
            insert_user_id    =  menu.insert_user_id,
			insert_user_name  =  usr1.user_name,
            insert_date       =  menu.insert_date   ,
            update_user_id    =  menu.update_user_id,
			update_user_name  =  usr2.user_name,
            update_date       =  menu.update_date   
	  from  s_menu_info menu (nolock)
	        left join s_menu_info menp (nolock)
			       on menp.menu_id = menu.p_menu_id
	        left join s_user_info usr1 (nolock)
			       on usr1.user_id = menu.insert_user_id
	        left join s_user_info usr2 (nolock)
			       on usr2.user_id = menu.update_user_id
	 order  by
	        right( '00000' + menp.menu_seq, 5 ) + right( '00000' + menu.menu_seq, 5 )

end
else if @case  =  'search'
begin
    select  menu_id           =  menu.menu_id  ,
            menu_name         =  menu.menu_name,
            p_menu_id         =  menu.p_menu_id,
            menu_seq          =  case when menp.menu_seq is null then right( '00000' + menu.menu_seq, 5 ) + '00000' else right( '00000' + menp.menu_seq, 5 ) + right( '00000' + menu.menu_seq, 5 ) end
	  from  s_menu_info menu (nolock) 
	        left join s_menu_info menp (nolock)
			       on menp.menu_id = menu.p_menu_id
	 where  menu.use_yn       =  'Y'
	   and (exists (
	             select 1
				   from s_user_info usr (nolock)
				        left join s_user_role_list rol (nolock)
				               on rol.user_id = usr.user_id
							   or rol.user_id = usr.dept_code
						left join s_role_menu_info men (nolock)
						       on men.role_id = rol.role_id
				  where usr.user_id = @user_id
				    and men.menu_id = menu.menu_id )
	    or  @user_id = 'admin')
	 order  by
	        menu_seq
end
else if @case  =  'save'
begin
    select  @rowcnt           =  count(1)
	  from  s_menu_info usr (nolock)
	 where  usr.menu_id       =  @menu_id

	print   @rowcnt

	if  @rowcnt  =  0
	begin
	    insert  into  s_menu_info (
		        menu_id           , menu_name         , p_menu_id         , menu_seq          ,
                use_yn            ,				      				      
                insert_user_id    , insert_date       , update_user_id    , update_date   
		)
		select  @menu_id          , @menu_name        , @p_menu_id        , @menu_seq         ,
                @use_yn           ,				      				     
                @user_id          , @now              , @user_id          , @now

		if  @@error  <>  0
		begin
		    select  return_code   =  'Error', 
			        return_msg    =  '메뉴 정보를 저장하지 못하였습니다.'
		end
	end
	else
	begin
	    update  menu
		   set  menu_name         =  isnull( @menu_name  , menu_name     ),
                p_menu_id         =  isnull( @p_menu_id  , p_menu_id     ),
                menu_seq          =  isnull( @menu_seq   , menu_seq      ),
                use_yn            =  isnull( @use_yn     , use_yn        ),
                update_user_id    =  @user_id   ,
                update_date       =  @now           
		  from  s_menu_info menu
		 where  menu.menu_id       =  @menu_id		 

		if  @@error  <>  0
		begin
		    select  return_code   =  'Error', 
			        return_msg    =  '메뉴 정보를 저장하지 못하였습니다.'
		end
	end
	
    select  return_code       =  'Complete', 
            return_msg        =  '메뉴 정보를 저장하였습니다.'
end
else if @case  =  'delete'
begin
    delete  menu
	  from  s_menu_info menu
	 where  menu.menu_id       =  @menu_id		 


    select  return_code       =  'Complete', 
            return_msg        =  '메뉴 정보를 삭제하였습니다.'
end

end;

/*-----------------------------------
Proc ID     : sp_menu_info2
Proc Name   : 메뉴 정보
Create Date : 2025.09.02
Proc Params : @case - Search : 조회  
                      Save   : 저장  
                      Delete : 삭제  
-----------------------------------*/
/*-----------------------------------
exec    sp_menu_info2
        @case                     =  'search',
		@menu_name                =  '',
		@menu_url                 =  '',
		@use_yn                   =  null

exec    sp_menu_info2
        @case                     =  'save'
        @menu_id                  =  ''
        @menu_name                =  ''
        @p_menu_id                =  ''
        @menu_url                 =  ''
        @menu_icon                =  ''
        @sort                     =  ''
        @separate_yn              =  ''
        @use_yn                   =  ''
-----------------------------------*/
CREATE   procedure  [dbo].[sp_menu_info2]
        @case                     varchar(10),
        @menu_id                  varchar(10)      =  null,
        @menu_name                varchar(30)      =  null,
        @p_menu_id                varchar(10)      =  null,
        @menu_url                 varchar(30)      =  null,
        @menu_icon                varchar(30)      =  null,
        @sort                     varchar(10)      =  null,
        @separate_yn              char(1)          =  null,
        @use_yn                   char(1)          =  null,
        @user_id                  varchar(20)      =  null
as
begin
set     nocount on

declare @rowcnt               integer,
        @now                  datetime

select  @now                  =  getdate()

if      @case  =  'search2'
begin
    select  menu_name                =  a0.menu_name,
            menu_url                 =  a0.menu_url,
            use_yn                   =  a0.use_yn
      from  s_menu_info a0 (nolock)
	 where  a0.menu_name          like  '%' + isnull( @menu_id, '' ) + '%'
	   and  a0.menu_url           like  '%' + isnull( @menu_url, '' ) + '%'
	   and (a0.use_yn                =  isnull(@use_yn, '' )
	    or  isnull( @use_yn, '' )    =  '')
end
else if @case  =  'search'
begin
    select  menu_id                  =  a0.menu_id,
            menu_name                =  a0.menu_name,
            p_menu_id                =  a0.p_menu_id,
            menu_url                 =  a0.menu_url,
            menu_icon                =  a0.menu_icon,
            sort                     =  a0.sort,
            separate_yn              =  a0.separate_yn,
            use_yn                   =  a0.use_yn
      from  s_menu_info a0 (nolock)
	 where  a0.menu_name          like  '%' + isnull( @menu_id, '' ) + '%'
	   and  a0.menu_url           like  '%' + isnull( @menu_url, '' ) + '%'
	   and (a0.use_yn                =  isnull(@use_yn, '' )
	    or  isnull( @use_yn, '' )    =  '')
end
else if @case  =  'save'
begin
    select  @rowcnt           =  count(1)
      from  s_menu_info a0 (nolock)
     where  a0.menu_id                =  @menu_id

    if  @rowcnt  =  0
    begin
        insert into s_menu_info (
                menu_id,
                menu_name,
                p_menu_id,
                menu_url,
                menu_icon,
                sort,
                separate_yn,
                use_yn,
                insert_user_id,
                insert_date,
                update_user_id,
                update_date)
        select  @menu_id,
                @menu_name,
                @p_menu_id,
                @menu_url,
                @menu_icon,
                @sort,
                @separate_yn,
                @use_yn,
                @user_id, @now, 
                @user_id, @now

        if  @@error <> 0
        begin
            select  return_code  =  'Err',
                    return_msg   =  ''
        end
end
    else
    begin
        update  a0
           set  menu_name              =  @menu_name,
                p_menu_id              =  @p_menu_id,
                menu_url               =  @menu_url,
                menu_icon              =  @menu_icon,
                sort                   =  @sort,
                separate_yn            =  @separate_yn,
                use_yn                 =  @use_yn,
                update_user_id         =  @user_id,
                update_date            =  @now
          from  s_menu_info a0
         where  a0.menu_id                =  @menu_id

        if  @@error <> 0
        begin
            select  return_code  =  'Err',
                    return_msg   =  ''
        end
    end

    select  return_code  =  'complete',
            return_msg   =  ''

end
else if @case  =  'delete'
begin
    delete  a0
      from  s_menu_info a0
         where  a0.menu_id                =  @menu_id

    if  @@error <> 0
    begin
        select  return_code  =  'Err',
                return_msg   =  ''
    end

    select  return_code  =  'complete',
            return_msg   =  ''

end

end;

/*-----------------------------------
Proc ID     : sp_menu_info2
Proc Name   : 메뉴 정보
Create Date : 2025.09.02
Proc Params : @case - Search : 조회  
                      Save   : 저장  
                      Delete : 삭제  
-----------------------------------*/
/*-----------------------------------
exec    sp_menu_info2
        @case                     =  'search',
		@menu_name                =  '',
		@menu_url                 =  '',
		@use_yn                   =  null

exec    sp_menu_info2
        @case                     =  'save'
        @menu_id                  =  ''
        @menu_name                =  ''
        @p_menu_id                =  ''
        @menu_url                 =  ''
        @menu_icon                =  ''
        @sort                     =  ''
        @separate_yn              =  ''
        @use_yn                   =  ''
-----------------------------------*/
CREATE   procedure  [dbo].[sp_menu_info999]
        @case                     varchar(10),
        @menu_id                  varchar(10)      =  null,
        @menu_name                varchar(30)      =  null,
        @p_menu_id                varchar(10)      =  null,
        @menu_url                 varchar(30)      =  null,
        @menu_icon                varchar(30)      =  null,
        @sort                     varchar(10)      =  null,
        @separate_yn              char(1)          =  null,
        @use_yn                   char(1)          =  null,
        @user_id                  varchar(20)      =  null
as
begin
set     nocount on

declare @rowcnt               integer,
        @now                  datetime

select  @now                  =  getdate()

if      @case  =  'search2'
begin
    select  menu_name                =  a0.menu_name,
            menu_url                 =  a0.menu_url,
            use_yn                   =  a0.use_yn
      from  s_menu_info987 a0 (nolock)
	 where  a0.menu_name          like  '%' + isnull( @menu_id, '' ) + '%'
	   and  a0.menu_url           like  '%' + isnull( @menu_url, '' ) + '%'
	   and (a0.use_yn                =  isnull(@use_yn, '' )
	    or  isnull( @use_yn, '' )    =  '')
end
else if @case  =  'search'
begin
    select  menu_id                  =  a0.menu_id,
            menu_name                =  a0.menu_name,
            p_menu_id                =  a0.p_menu_id,
            menu_url                 =  a0.menu_url,
            menu_icon                =  a0.menu_icon,
            sort                     =  a0.sort,
            separate_yn              =  a0.separate_yn,
            use_yn                   =  a0.use_yn
      from  s_menu_info987 a0 (nolock)
	 where  a0.menu_name          like  '%' + isnull( @menu_id, '' ) + '%'
	   and  a0.menu_url           like  '%' + isnull( @menu_url, '' ) + '%'
	   and (a0.use_yn                =  isnull(@use_yn, '' )
	    or  isnull( @use_yn, '' )    =  '')
end
else if @case  =  'save'
begin
    select  @rowcnt           =  count(1)
      from  s_menu_info987 a0 (nolock)
     where  a0.menu_id                =  @menu_id

    if  @rowcnt  =  0
    begin
        insert into s_menu_info987 (
                menu_id,
                menu_name,
                p_menu_id,
                menu_url,
                menu_icon,
                sort,
                separate_yn,
                use_yn,
                insert_user_id,
                insert_date,
                update_user_id,
                update_date)
        select  @menu_id,
                @menu_name,
                @p_menu_id,
                @menu_url,
                @menu_icon,
                @sort,
                @separate_yn,
                @use_yn,
                @user_id, @now, 
                @user_id, @now

        if  @@error <> 0
        begin
            select  return_code  =  'Err',
                    return_msg   =  ''
     end
    end
    else
    begin
        update  a0
           set  menu_name              =  @menu_name,
                p_menu_id              =  @p_menu_id,
                menu_url               =  @menu_url,
                menu_icon              =  @menu_icon,
                sort                   =  @sort,
                separate_yn            =  @separate_yn,
                use_yn                 =  @use_yn,
                update_user_id         =  @user_id,
                update_date            =  @now
          from  s_menu_info987 a0
         where  a0.menu_id                =  @menu_id

        if  @@error <> 0
        begin
            select  return_code  =  'Err',
                    return_msg   =  ''
        end
    end

    select  return_code  =  'complete',
            return_msg   =  ''

end
else if @case  =  'delete'
begin
    delete  a0
      from  s_menu_info987 a0
         where  a0.menu_id                =  @menu_id

    if  @@error <> 0
    begin
        select  return_code  =  'Err',
                return_msg   =  ''
    end

    select  return_code  =  'complete',
            return_msg   =  ''

end

end;

/*-----------------------------------
Proc ID     : sp_role_info
Proc Name   : 메뉴 정보 관리         
Create Date : 2025.08.30
Proc Params : @case - Search : 조회  
                      Save   : 저장  
                      Delete : 삭제  
-----------------------------------*/
/*-----------------------------------
exec    sp_role_info
        @case                     =  'search'
exec    sp_role_info
        @case                     =  'save'
        @role_id                  =  ''
        @role_name                =  ''
        @use_yn                   =  ''
-----------------------------------*/
create   procedure  [dbo].[sp_role_info]
        @case                     varchar(10),
        @role_id                  varchar(20)      =  null,
        @role_name                varchar(50)      =  null,
        @use_yn                   varchar(1)       =  null,
        @user_id                  varchar(20)
as
begin
set     nocount on

declare @rowcnt               integer,
        @now                  varchar(14)

select  @now                  =  FORMAT(GETDATE(), 'yyyyMMddHHmmss')

if      @case  =  'search'
begin
    select  role_id                  =  a0.role_id,
            role_name                =  a0.role_name,
            use_yn                   =  a0.use_yn
      from  s_role_info a0 (nolock)
end
else if @case  =  'save'
begin
    select  @rowcnt           =  count(1)
      from  s_role_info a0 (nolock)
     where  a0.role_id                =  @role_id

    if  @rowcnt  =  0
    begin
        insert into s_role_info (
                role_id,
                role_name,
                use_yn,
                insert_user_id,
                insert_date,
                update_user_id,
                update_date)
        select  @role_id,
                @role_name,
                @use_yn,
                @user_id, @now, @user_id, @now
    end
    else
    begin
        update  a0
           set  role_name              =  @role_name,
                use_yn                 =  @use_yn,
                update_user_id         =  @user_id,
                update_date            =  @now
          from  s_role_info a0
         where  a0.role_id                =  @role_id
    end
end
else if @case  =  'delete'
begin
    delete  a0
      from  s_role_info a0
     where  a0.role_id                =  @role_id
end
end;

/*-----------------------------------
Proc ID     : sp_spc_test
Proc Name   : 메뉴 정보 관리
Create Date	: 2025. 07. 06
Proc Params : @case - Search : 조회
                      Save   : 저장
					  Delete : 삭제
-----------------------------------*/
/*-----------------------------------
exec    sp_spc_test
        @case         =  'search',
		@item_code    =  'TEST001',
		@insp_code    =  'INSP001'
		
-----------------------------------*/
CREATE   procedure  [dbo].[sp_spc_test]
	    @case                 varchar(10)  =  null,
		@item_code            varchar(20)  =  null,
		@insp_code            varchar(10)  =  null
as
begin

set     nocount on

declare @rowcnt               integer,
        @now                  varchar(14)
		
select  @now                  =  FORMAT(GETDATE(), 'yyyyMMddHHmmss')

if      @case  =  'search'
begin
    select  insp_time         =  CONVERT(DATETIME, 
                                 STUFF(STUFF(STUFF(STUFF(STUFF(spc.insp_time, 
                                 13, 0, ':'), 11, 0, ':'), 9, 0, ' '), 7, 0, '-'), 5, 0, '-')),
            spec_lsl          =  spc.spec_lsl ,
            spec_lcl          =  spc.spec_lcl ,
            spec_ucl          =  spc.spec_ucl ,
            spec_usl          =  spc.spec_usl ,
            spec_val          =  spc.spec_val 
	  from  q_spc_test spc (nolock) 
	 where  spc.item_code     =  @item_code
	   and  spc.insp_code     =  @insp_code
end

end;

/*-----------------------------------
Proc ID     : sp_user_info
Proc Name   : 유저 정보 관리
Create Date	: 2025. 06. 22
Proc Params : @case - Search : 조회
                      Save   : 저장
					  Delete : 삭제
-----------------------------------*/
/*-----------------------------------
exec    sp_user_info
        @case         =  'search'
		
exec    sp_user_info  
        @case         =  'save',
        @user_id      =  'admin',
		@user_name    =  'admin',
		@dept_code    =  'D9999',
		@enter_date   =  '',
		@use_yn       =  'Y',
		@update_user  =  'admin',
		@password     =  'MTIzNA=='  --1234
		
exec    sp_user_info  
        @case         =  'save',
        @user_id      =  'U250007',
		@user_name    =  '김민영1',
		@update_user  =  'admin'

exec    sp_user_info  
        @case         =  'delete',
        @user_id      =  'U250002'
-----------------------------------*/
CREATE   procedure  [dbo].[sp_user_info]
	    @case                 varchar(10)  =  null,
		@user_id              varchar(20)  =  null,
        @user_name            varchar(50)  =  null,
        @dept_code            varchar(50)  =  null,
        @enter_date           varchar(08)  =  null,
        @retire_date          varchar(08)  =  null,
        @password             varchar(50)  =  null,
        @plant_code           varchar(10)  =  null,
        @proc_code            varchar(10)  =  null,
        @equip_code           varchar(10)  =  null,
        @use_yn               char(01)     =  null,
        @update_user          varchar(20)  =  null
as
begin

set     nocount on

declare @rowcnt               integer,
        @now                  varchar(14)
		
select  @now                  =  FORMAT(GETDATE(), 'yyyyMMddHHmmss')

if      @case  =  'search'
begin
    select  user_id           =  usr.user_id       ,
            user_name         =  usr.user_name     ,
            dept_code         =  usr.dept_code     ,
            dept_name         =  dpt.dept_name     ,
            enter_date        =  usr.enter_date    ,
            retire_date       =  usr.retire_date   ,
            password          =  usr.password      ,
            plant_code        =  usr.plant_code    ,
            proc_code         =  usr.proc_code     ,
            equip_code        =  usr.equip_code    ,
            use_yn            =  usr.use_yn        ,
            insert_user_id    =  usr.insert_user_id,
            insert_date       =  usr.insert_date   ,
            update_user_id    =  usr.update_user_id,
            update_date       =  usr.update_date   
	  from  s_user_info usr (nolock)
	        left join s_dept_info dpt (nolock)
			       on dpt.dept_code = usr.dept_code
	 where  usr.user_name  like  '%' + isnull( @user_name, '' ) + '%'
	   and  usr.user_id    like  '%' + isnull( @user_id  , '' ) + '%'
	   and  isnull( dpt.dept_name, '' )
	                       like  '%' + isnull( @dept_code, '' ) + '%'
--	   FOR JSON AUTO
end
else if @case  =  'save'
begin
    select  @rowcnt           =  count(1)
	  from  s_user_info usr (nolock)
	 where  usr.user_id       =  @user_id

	print   @rowcnt

	if  @rowcnt  =  0
	begin
	    insert  into  s_user_info (
		        user_id           , user_name         , dept_code         , 
			    enter_date        , retire_date       , password          , plant_code        ,
			    proc_code         , equip_code        , use_yn            , 
				insert_user_id    , insert_date       , update_user_id    , update_date       
		)
		select  @user_id          , @user_name        , @dept_code        , 
		        @enter_date       , @retire_date      , @password         , @plant_code       ,
		        @proc_code        , @equip_code       , @use_yn           ,
		        @update_user      , @now              , @update_user      , @now

		if  @@error  <>  0
		begin
		    select  return_code   =  'Error', 
			        return_msg    =  '유저 정보를 저장하지 못하였습니다.'
		end
	end
	else
	begin
	    update  usr
		   set  user_name         =  isnull( @user_name  , user_name     ),
                dept_code         =  isnull( @dept_code  , dept_code     ),
                enter_date        =  isnull( @enter_date , enter_date    ),
                retire_date       =  isnull( @retire_date, retire_date   ),
                password          =  isnull( @password   , password      ),
                plant_code        =  isnull( @plant_code , plant_code    ),
                proc_code         =  isnull( @proc_code  , proc_code     ),
                equip_code        =  isnull( @equip_code , equip_code    ),
                use_yn            =  isnull( @use_yn     , use_yn        ),
                update_user_id    =  @update_user   ,
                update_date       =  @now           
		  from  s_user_info usr
		 where  usr.user_id       =  @user_id		 

		if  @@error  <>  0
		begin
		    select  return_code   =  'Error', 
			        return_msg    =  '유저 정보를 저장하지 못하였습니다.'
		end
	end
	
    select  return_code       =  'Complete', 
            return_msg        =  '유저 정보를 저장하였습니다.'
end
else if @case  =  'delete'
begin
    delete  usr
	  from  s_user_info usr
	 where  usr.user_id       =  @user_id

    select  return_code       =  'Complete', 
            return_msg        =  '유저 정보를 삭제하였습니다.'
end

end;
end;