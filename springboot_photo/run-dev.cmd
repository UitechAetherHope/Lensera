@echo off
cd /d "%~dp0"
rem JDK 24+ 加载 DJL PyTorch 原生库需要此参数，否则分类会失败
set "JAVA_TOOL_OPTIONS=--enable-native-access=ALL-UNNAMED -Dfile.encoding=UTF-8"
call mvnw.cmd spring-boot:run
