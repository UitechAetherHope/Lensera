将本机 MySQL 导出文件放在此目录，例如 photo_blog_seed.sql

Windows 导出示例（在项目根「全栈」打开终端）：
  mysqldump -uroot -p --databases photo_blog --single-transaction --set-gtid-purged=OFF > deploy/sql/photo_blog_seed.sql

转换为相对路径（相对 Photo_base，库内存 users/...）：
  python deploy/scripts/rewrite-sql-paths.py deploy/sql/photo_blog_seed.sql --strip-url-prefix
  或
  deploy\scripts\rewrite-sql-paths.cmd deploy\sql\photo_blog_seed.sql --strip-url-prefix

生成 photo_blog_seed_relative.sql 后，可将 relative 版本用于 Docker 初始化导入。

注意：Photo_base 文件夹不要提交 Git，部署时单独拷贝到服务器数据卷。
