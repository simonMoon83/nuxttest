@echo off
setlocal

REM Change to this script directory
cd /d "%~dp0"

REM Activate virtual environment if found
if exist ".venv\Scripts\activate.bat" (
  call ".venv\Scripts\activate.bat"
) else if exist "venv\Scripts\activate.bat" (
  call "venv\Scripts\activate.bat"
)

REM If an argument is provided, run it with python (and pass through all args)
if not "%~1"=="" (
  python %*
  echo.
  echo Script finished. Press any key to close...
  pause >nul
  goto :EOF
)

REM If no args, try influx_api.py, then main.py, else open Python REPL
if exist "influx_api.py" (
  python -m uvicorn influx_api:app --host 127.0.0.1 --port 8000 --reload
) else if exist "main.py" (
  python main.py
) else (
  echo No script argument provided and neither influx_api.py nor main.py found.
  echo Starting Python REPL...
  python
)

echo.
echo Script finished. Press any key to close...
pause >nul
endlocal

