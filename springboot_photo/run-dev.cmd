@echo off
cd /d "%~dp0"
set "JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8"
call mvnw.cmd spring-boot:run
