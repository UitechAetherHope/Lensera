# 博客：数据库与图片存储架构

## 1. 与现有体系的关系

本项目的静态资源统一落在 **`app.upload.root`**（默认 `./data/upload-root`，部署时可指向仓库旁的 **`Photo_base`**）。  
对外 URL：`{app.public-base-url}/files/{相对路径}`，由 `WebMvcConfig` 映射。

已有目录约定（`UserUploadPaths`）：

| 路径 | 用途 |
|------|------|
| `users/{publicId}/works/{yyyy}/{MM}/` | 摄影作品主图 + 缩略图 |
| `users/{publicId}/avatar/` | 头像 |
| `users/{publicId}/background/` | 个人主页背景 |
| `users/{publicId}/blog/covers/{yyyy}/{MM}/` | **博客列表卡片封面** |
| `users/{publicId}/blog/assets/{yyyy}/{MM}/` | **Markdown 正文内嵌图** |

文件名：`{epochMillis}_{uuid16}.{ext}`（`UserUploadPaths.uniqueFileBaseName()`），便于按时间排查且避免冲突。

压缩策略（`ProfileImageCompressor`）：

- 封面：最长边 3840，JPEG 质量 0.92（与主页背景同级）
- 正文内嵌图：最长边 1920，JPEG 质量 0.90
- GIF 原样保存

## 2. 数据库：`tb_blog_post`

与前端 `Blog.jsx` 投稿表单 / `normalizeManagedArticle` 对齐：

| 列 | 类型 | 说明 |
|----|------|------|
| `blog_id` | BIGINT PK | 自增主键 |
| `user_id` | INT | 作者，关联 `tb_user` |
| `title` | VARCHAR(200) | 标题 |
| `category` | VARCHAR(32) | 技术分享 / 器材资讯 / 社区新闻 / 后期教程 / 行业动态 |
| `tags` | VARCHAR(512) | 逗号分隔，如 `夜景摄影,参数设置` |
| `excerpt` | TEXT | 卡片摘要 |
| `body_markdown` | LONGTEXT | **Markdown 全文**；图片以 `![]({publicUrl})` 写入 |
| `cover_path` | VARCHAR(512) | 卡片封面相对路径 |
| `cover_name` | VARCHAR(256) | 原文件名（对应前端 `coverName`） |
| `cover_byte_size` | BIGINT | 字节数（`coverSize`） |
| `cover_mime` | VARCHAR(64) | MIME（`coverType`） |
| `status` | INT | 0 草稿 / 1 待审 / 2 已发布 / 3 已驳回 |
| `review_note` | TEXT | 审核备注 |
| `view_count` | INT | 浏览量 |
| `comment_count` | INT | 评论数 |
| `created_at` / `updated_at` / `published_at` | DATETIME(6) | 时间戳 |

索引：`(user_id, status, published_at)`、`(user_id, updated_at)`。

## 3. HTTP API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/blog-posts/assets` | 上传正文内嵌图，返回 `relativePath` + `url` |
| POST | `/api/blog-posts` | multipart 创建帖子（含封面文件） |
| GET | `/api/blog-posts/mine` | 当前用户全部状态 |
| GET | `/api/blog-posts?publicId=` | 某用户已发布列表 |
| GET | `/api/blog-posts/{blogId}` | 详情（非作者仅可读已发布） |

## 4. 前端卡片字段映射

| 卡片 UI (`MineBlogPanel` / `Blog.jsx`) | 来源 |
|----------------------------------------|------|
| `category` | `category` |
| `title` | `title` |
| `excerpt` | `excerpt` |
| `author` | 作者 `userName` |
| `date` | `published_at` 或 `updated_at` |
| `views` / `comments` | `view_count` / `comment_count`（紧凑格式） |
| `image` | `cover_path` → `/files/...` |
| `tags` | `tags` 拆分 |
| 正文 | `body_markdown`（详情页 Markdown 渲染） |

## 5. 示例目录树

```text
Photo_base/   (即 app.upload.root)
└── users/
    └── 1000123/
        ├── works/2026/05/1730_abc.jpg
        ├── avatar/1730_def.jpg
        ├── background/1730_ghi.jpg
        └── blog/
            ├── covers/2026/05/1730123456789_a1b2c3d4e5f6g7h8.jpg
            └── assets/2026/05/1730123456790_b2c3d4e5f6g7h8i9.jpg
```

Markdown 存库示例：

```markdown
## 夜景流程

![街头层次](http://localhost:8080/files/users/1000123/blog/assets/2026/05/1730_xxx.jpg)

第二段文字…
```
