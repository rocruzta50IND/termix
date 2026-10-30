@echo off
rem termix-open: abre uma página local na aba Web do Termix (só existe nos terminais do Termix)
where node >nul 2>nul
if errorlevel 1 goto useexe
node "%~dp0..\open-wrapper.js" %*
exit /b %errorlevel%
:useexe
"%TERMIX_EXE%" --termix-run "%~dp0..\open-wrapper.js" %*
exit /b %errorlevel%
