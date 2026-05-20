@echo off
echo Starting SpendWise Ecosystem...

:: Start Backend in a new window
start cmd /k "cd backend && echo Starting Backend... && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Start Frontend in a new window
start cmd /k "cd frontend && echo Starting Frontend... && npm run dev"

echo Backend and Frontend are launching in separate windows.
echo API is at http://localhost:8000
echo Frontend is typically at http://localhost:5188
pause
