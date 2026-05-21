@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."
if "%~1"=="" (
  echo 用法: deploy\scripts\rewrite-sql-paths.cmd deploy\sql\photo_blog_seed.sql
  echo 可选第二参数: --in-place  或  --strip-url-prefix
  exit /b 1
)
python deploy\scripts\rewrite-sql-paths.py %*
exit /b %ERRORLEVEL%
