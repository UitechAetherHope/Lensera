# 增量 Push / Pull（本次：喜欢页 + 消息中心 + 移除 DJL）

**不会提交/覆盖：** `.env`、`Photo_base`、`application-local.properties`（已在 `.gitignore`）。

**服务器上 `git pull` 只会更新有改动的文件**，不会删你的 `.env`；重建容器只动 `api` 和 `web`。

---

## 一、本机 Windows（PowerShell）

在项目根目录 `全栈` 下执行。

### 1. 只暂存「应用代码」相关文件（推荐）

```powershell
cd "C:\Users\MN\Desktop\比赛\计算机设计\第十九届计算机设计大赛\全栈"

# 前端
git add cover/src/Mine.css cover/src/Mine.jsx cover/src/MineMessagesModal.css cover/src/MineMessagesModal.jsx
git add cover/src/TiltWorksPanel.jsx cover/src/api/works.js cover/src/api/inbox.js
git add cover/Dockerfile

# 后端
git add springboot_photo/pom.xml springboot_photo/Dockerfile springboot_photo/run-dev.cmd
git add springboot_photo/docker/maven-settings.xml
git add springboot_photo/src/main/java/com/photoblog/springboot_photo/
git add springboot_photo/src/main/resources/application.yml
git add springboot_photo/src/main/resources/application.properties
git add springboot_photo/src/main/resources/application-docker.properties

# 部署说明（可选）
git add deploy/update-incremental.sh deploy/PUSH-PULL.md README.md
```

若你确认服务器上的 `docker-compose.yml` 与仓库一致，可再加：

```powershell
git add docker-compose.yml .env.example deploy/check-server.sh
```

### 2. 检查暂存区（确认没有密钥）

```powershell
git status
git diff --cached --name-only
```

**不应出现：** `.env`、`application-local.properties`、`Photo_base/`。

### 3. 提交并推送

```powershell
git commit -m "feat: 喜欢页与消息中心；移除本地 DJL；优化消息图标"
git push origin main
```

---

## 二、服务器 Ubuntu（SSH 登录后）

```bash
cd ~/Lensera

# 若曾在服务器上改过 compose，先备份
cp -a docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d) 2>/dev/null || true

# 拉取（只更新 Git 里变更过的文件）
git pull --ff-only origin main

# 只重建并启动 api + web（默认会用 Docker 缓存，不会 --no-cache 全量重下）
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose build api web
docker compose up -d api web

# 查看
docker compose ps
docker compose logs --tail=40 api
```

或使用脚本：

```bash
cd ~/Lensera
chmod +x deploy/update-incremental.sh
./deploy/update-incremental.sh
```

### 改 `.env` 之后（例如换了豆包 Key）

`docker compose restart` **不会**重载 `.env`，需要：

```bash
docker compose up -d --force-recreate api
```

---

## 三、关于 Docker 缓存（不是让你从头下载）

| 命令 | 行为 |
|------|------|
| `docker compose build api web` | **默认用缓存**。`pom.xml` / `package-lock.json` 未改时，Maven、npm 依赖层可复用。 |
| `docker compose build --no-cache api web` | 强制不用缓存，**才会**像第一次一样全量下载，一般不要加。 |
| `docker compose up -d --build` | 同上，带 build 但**不是** `--no-cache`。 |

本次 Dockerfile 已加 **BuildKit 缓存挂载**（`/root/.m2`、`/root/.npm`），改 Java/前端源码后仍会重新编译，但 **Maven/npm 包不会每次从公网重下**。

若构建仍很慢：多半是 **2G 内存** 上跑 `mvn package` 编译慢，不是每次都重新拉依赖。

---

## 四、本次更新是否需要改服务器 `.env`？

**不需要。** 无新增环境变量；仍用现有 `DOUBAO_API_KEY`、`APP_PUBLIC_BASE_URL` 等。

确认 `.env` 中：

```bash
grep -E '^APP_PUBLIC_BASE_URL=|^DOUBAO_API_KEY=' .env
```

应为你的公网 IP（如 `http://47.115.228.191`），不是示例 `123.45.67.89`。

---

## 五、验证

1. 浏览器打开 `http://你的公网IP`，**Ctrl+F5** 强刷。
2. 登录 → 个人主页 → 应有 **喜欢** Tab、圆形 **消息** 图标。
3. `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/works/feed` 在服务器上应为 `200`（经 Nginx 对外同 `/api/works/feed`）。
