# Lensera

摄影社区全栈：React（`cover/`）+ Spring Boot（`springboot_photo/`）。

## 本地开发

- 后端：`cd springboot_photo && ./mvnw spring-boot:run`（密钥写在 `application-local.properties`）
- 前端：`cd cover && npm install && npm run dev`
- 上传目录：项目根下 `Photo_base/`（见 `application.yml`）

## 服务器一键部署（Docker）

适用：**阿里云公网 IP + HTTP（无域名/HTTPS）**。

### 1. 推送 GitHub

仓库名建议 **Lensera**（Private）。在仓库根目录：

```bash
git init
git add .
git status   # 确认无 Photo_base、.env、application-local.properties
git commit -m "Lensera 全栈与 Docker 部署"
git remote add origin https://github.com/<用户名>/Lensera.git
git push -u origin main
```

### 2. Ubuntu 虚拟机

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# 重新登录后生效

git clone https://github.com/<用户名>/Lensera.git
cd Lensera
cp .env.example .env
nano .env   # 改 APP_PUBLIC_BASE_URL=http://你的公网IP、邮箱、豆包 Key 等
```

### 3. 上传图片库（唯一需手动的步骤）

在**本机**把 `Photo_base` 同步到服务器（示例，替换 IP 与路径）：

```bash
scp -r Photo_base user@你的公网IP:~/Lensera/data/Photo_base
```

或在服务器创建目录后 rsync：

```bash
mkdir -p data/Photo_base
# 从 Windows 用 WinSCP / rsync 拷入 users/ 等子目录
```

目录结构须与本地一致：`data/Photo_base/users/1000000/works/...`（与 SQL 中 `users/...` 相对路径一致）。

### 4. 启动

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api
```

浏览器访问：**http://你的公网IP**（阿里云安全组放行 **80/TCP**）。

### 5. 架构说明

| 服务 | 容器内 | 对外 |
|------|--------|------|
| Nginx + React | 80 | **80** |
| Spring Boot | 8080 | 否（经 Nginx `/api`、`/files`） |
| MySQL 8 | 3306 | 否 |
| Redis 7 | 6379 | 否 |

- 首次启动 MySQL 会用 `deploy/sql/photo_blog.sql` 自动建库导入数据。
- API 返回的图片 URL 为 `http://公网IP/files/users/...`，与 SQL 相对路径 + `Photo_base` 卷一致。
- 重新初始化数据库：删除卷后再起（**会清空库**）  
  `docker compose down -v && docker compose up -d --build`

### 6. 增量更新（已部署过，只改代码）

见 **[deploy/PUSH-PULL.md](deploy/PUSH-PULL.md)**：本机按路径 `git add` 后 `push`；服务器 `git pull` + 仅 `docker compose build/up api web`。  
**不要**提交或覆盖服务器上的 `.env` 与 `data/Photo_base`。

```bash
# 服务器快捷方式
cd ~/Lensera && ./deploy/update-incremental.sh
```

### 7. 常见问题

- **页面能开但图裂**：检查 `data/Photo_base` 是否完整、`APP_PUBLIC_BASE_URL` 是否与浏览器地址一致（含 `http://`）。
- **502 / API 失败**：`docker compose logs api`，多为 MySQL 未就绪或 `.env` 密码错误。
- **邮件验证码发不出**：检查 `.env` 中 QQ SMTP 授权码（16 位，非 QQ 密码）。
- **改了 `.env` 不生效**：用 `docker compose up -d --force-recreate api`，不要用 `restart`。
