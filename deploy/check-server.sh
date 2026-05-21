#!/bin/bash
# 在 Ubuntu 服务器 ~/Lensera 下执行: bash deploy/check-server.sh

set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
echo "== Lensera 部署自检 =="
echo "目录: $ROOT"
echo

fail=0
ok() { echo "  [OK] $1"; }
warn() { echo "  [!!] $1"; }
bad() { echo "  [XX] $1"; fail=1; }

if grep -q 'WorkImageClassificationService.java</exclude>' springboot_photo/pom.xml 2>/dev/null; then
  ok "pom 默认跳过 DJL（豆包云端分类，勿 mvn -Pcv）"
else
  bad "pom 未更新，请 git pull 最新代码"
fi

if [ -f springboot_photo/docker/maven-settings.xml ]; then
  ok "Maven 阿里云镜像配置存在"
else
  bad "缺少 springboot_photo/docker/maven-settings.xml"
fi

# .env
if [ -f .env ]; then
  ok ".env 存在"
  if grep -q 'APP_PUBLIC_BASE_URL=http://47.115.228.191' .env 2>/dev/null || grep -q 'APP_PUBLIC_BASE_URL=http://[0-9]' .env; then
    ok "APP_PUBLIC_BASE_URL 已配置"
  else
    warn "APP_PUBLIC_BASE_URL 仍是示例 IP，请改为公网 IP（如 http://47.115.228.191）"
  fi
  if grep -q 'ark-your-key-here' .env 2>/dev/null; then
    warn "DOUBAO_API_KEY 仍是占位符"
  else
    ok "DOUBAO_API_KEY 已填写"
  fi
else
  bad "缺少 .env，请 cp .env.example .env 并编辑"
fi

# Photo_base
PB="${PHOTO_BASE_HOST_PATH:-./data/Photo_base}"
if [ -d "$PB/users" ] && [ "$(ls -A "$PB/users" 2>/dev/null | head -1)" ]; then
  ok "Photo_base 已上传 ($PB/users)"
else
  bad "Photo_base 未就绪: 需要 $PB/users/ 下有 1000000 等目录"
fi

# SQL
if [ -f deploy/sql/photo_blog.sql ]; then
  ok "MySQL 初始化 SQL 存在"
else
  bad "缺少 deploy/sql/photo_blog.sql"
fi

# swap（2G 机建议）
if swapon --show | grep -q .; then
  ok "swap 已启用"
else
  warn "未检测到 swap，编译可能 OOM，建议加 2G swap"
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "自检通过，可执行: docker compose build api --no-cache && docker compose up -d"
else
  echo "请先修复 [XX] 项再构建"
  exit 1
fi
