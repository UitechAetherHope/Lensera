#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 MySQL 导出 SQL 中的本机绝对路径改为相对路径（相对上传根目录 Photo_base）。

数据库存储约定（与 Spring Boot app.upload.root 一致）：
  磁盘：{项目根}/Photo_base/users/...
  库内：users/...（不含 Photo_base 前缀）

用法（在项目根「全栈」下）：
  python deploy/scripts/rewrite-sql-paths.py deploy/sql/photo_blog_seed.sql
  python deploy/scripts/rewrite-sql-paths.py deploy/sql/photo_blog_seed.sql -o deploy/sql/photo_blog_seed_rel.sql
  python deploy/scripts/rewrite-sql-paths.py deploy/sql/photo_blog_seed.sql --in-place

可选 --strip-url-prefix：把 http://localhost:8080/files/ 转为 users/...（便于 Docker 用环境变量拼 URL）
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Windows 盘符绝对路径（允许 SQL 转义反斜杠）
WIN_ABS_PATH_RE = re.compile(
    r"[A-Za-z]:(?:\\\\|/|[^'\"\s;\)]|(?:\\'))+",
    re.UNICODE,
)

# http(s)://host/files/相对路径
URL_FILES_RE = re.compile(
    r"https?://[^/'\s]+/files/([^\s'\"]+)",
    re.IGNORECASE,
)


def detect_project_root(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    # deploy/scripts/rewrite-sql-paths.py -> 全栈
    return Path(__file__).resolve().parent.parent.parent


def normalize_slashes(s: str) -> str:
    return s.replace("\\", "/")


def try_upload_relative(raw: str, upload_root: Path) -> str | None:
    """若 raw 指向上传目录内文件，返回 users/... 形式相对路径。"""
    cleaned = raw.strip().strip("'\"")
    cleaned = cleaned.replace("\\\\", "/").replace("\\", "/")
    if cleaned.lower().startswith("file:///"):
        cleaned = cleaned[8:]
    elif cleaned.lower().startswith("file://"):
        cleaned = cleaned[7:]

    upload_posix = upload_root.resolve().as_posix().lower()
    lower = cleaned.lower()

    # 直接前缀剥离（兼容未规范化路径）
    if lower.startswith(upload_posix + "/"):
        return cleaned[len(upload_posix) + 1 :].lstrip("/")

    # Photo_base 出现在路径任意位置时，取其后的部分
    marker = "/photo_base/"
    idx = lower.find(marker)
    if idx >= 0:
        return cleaned[idx + len(marker) :].lstrip("/")

    marker2 = "photo_base/"
    if lower.startswith(marker2):
        return cleaned[len(marker2) :].lstrip("/")

    try:
        p = Path(cleaned)
        if not p.is_absolute() and ":" not in cleaned[:3]:
            return None
        resolved = Path(cleaned).resolve()
        rel = resolved.relative_to(upload_root.resolve())
        return rel.as_posix()
    except (ValueError, OSError):
        return None


def rewrite_absolute_paths(text: str, upload_root: Path) -> tuple[str, int]:
    count = 0

    def repl(m: re.Match[str]) -> str:
        nonlocal count
        original = m.group(0)
        rel = try_upload_relative(original, upload_root)
        if rel:
            count += 1
            return rel
        return original

    return WIN_ABS_PATH_RE.sub(repl, text), count


def rewrite_url_files(text: str) -> tuple[str, int]:
    count = 0

    def repl(m: re.Match[str]) -> str:
        nonlocal count
        count += 1
        path = m.group(1).replace("\\", "/").lstrip("/")
        if path.lower().startswith("files/"):
            path = path[6:]
        return path

    return URL_FILES_RE.sub(repl, text), count


def main() -> int:
    parser = argparse.ArgumentParser(description="SQL 绝对路径 → Photo_base 相对路径")
    parser.add_argument("sql_file", help="待处理的 .sql 文件")
    parser.add_argument(
        "-o",
        "--output",
        help="输出文件（默认：<原名>_relative.sql）",
    )
    parser.add_argument(
        "--in-place",
        action="store_true",
        help="直接覆盖原文件",
    )
    parser.add_argument(
        "--project-root",
        help="项目根目录「全栈」路径（默认：自动识别为脚本上两级目录）",
    )
    parser.add_argument(
        "--upload-dir",
        default="Photo_base",
        help="上传目录名，相对项目根（默认 Photo_base）",
    )
    parser.add_argument(
        "--strip-url-prefix",
        action="store_true",
        help="同时将 http://localhost:8080/files/... 改为 users/... 相对路径",
    )
    args = parser.parse_args()

    sql_path = Path(args.sql_file).expanduser().resolve()
    if not sql_path.is_file():
        print(f"错误：找不到 SQL 文件 {sql_path}", file=sys.stderr)
        return 1

    project_root = detect_project_root(args.project_root)
    upload_root = (project_root / args.upload_dir).resolve()

    print(f"项目根目录: {project_root}")
    print(f"上传根目录: {upload_root}")
    if not upload_root.is_dir():
        print(f"警告：上传目录不存在，仍将按路径前缀规则替换: {upload_root}", file=sys.stderr)

    text = sql_path.read_text(encoding="utf-8", errors="replace")
    text, n_abs = rewrite_absolute_paths(text, upload_root)
    n_url = 0
    if args.strip_url_prefix:
        text, n_url = rewrite_url_files(text)

    if args.in_place:
        out_path = sql_path
    elif args.output:
        out_path = Path(args.output).expanduser().resolve()
    else:
        out_path = sql_path.with_name(sql_path.stem + "_relative.sql")

    out_path.write_text(text, encoding="utf-8", newline="\n")
    print(f"已处理绝对路径: {n_abs} 处")
    if args.strip_url_prefix:
        print(f"已处理 /files/ URL: {n_url} 处")
    print(f"输出: {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
