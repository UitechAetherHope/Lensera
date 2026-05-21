-- 在 Navicat 中选中库 photo_blog 后执行本脚本（与 JPA 实体字段一致）。
-- 若表已存在会跳过，不影响数据。
-- 用途：当 ddl-auto=update 未生成表时，可手动补齐结构。

USE photo_blog;

CREATE TABLE IF NOT EXISTS tb_work (
    work_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(128) NOT NULL,
    caption TEXT,
    image_path VARCHAR(512) NOT NULL,
    category VARCHAR(32),
    like_count INT NOT NULL DEFAULT 0,
    status INT NOT NULL DEFAULT 1,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (work_id),
    KEY idx_work_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tb_work_like (
    id BIGINT NOT NULL AUTO_INCREMENT,
    work_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_work_user (work_id, user_id),
    KEY idx_like_work (work_id),
    KEY idx_like_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tb_blog_post (
    blog_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(32) NOT NULL,
    tags VARCHAR(512),
    excerpt TEXT,
    body_markdown LONGTEXT,
    cover_path VARCHAR(512),
    cover_name VARCHAR(256),
    cover_byte_size BIGINT,
    cover_mime VARCHAR(64),
    status INT NOT NULL DEFAULT 0,
    review_note TEXT,
    view_count INT NOT NULL DEFAULT 0,
    comment_count INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    published_at DATETIME(6),
    PRIMARY KEY (blog_id),
    KEY idx_blog_user_status_pub (user_id, status, published_at),
    KEY idx_blog_user_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tb_blog_comment (
    comment_id BIGINT NOT NULL AUTO_INCREMENT,
    blog_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    parent_id BIGINT NULL,
    root_id BIGINT NULL,
    body TEXT NOT NULL,
    like_count INT NOT NULL DEFAULT 0,
    status INT NOT NULL DEFAULT 1,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (comment_id),
    KEY idx_bc_blog_created (blog_id, created_at),
    KEY idx_bc_root (root_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tb_blog_comment_like (
    id BIGINT NOT NULL AUTO_INCREMENT,
    comment_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_bcl_comment_user (comment_id, user_id),
    KEY idx_bcl_comment (comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tb_work_comment (
    comment_id BIGINT NOT NULL AUTO_INCREMENT,
    work_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    parent_id BIGINT NULL,
    root_id BIGINT NULL,
    body TEXT NOT NULL,
    like_count INT NOT NULL DEFAULT 0,
    status INT NOT NULL DEFAULT 1,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (comment_id),
    KEY idx_wc_work_created (work_id, created_at),
    KEY idx_wc_root (root_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tb_work_comment_like (
    id BIGINT NOT NULL AUTO_INCREMENT,
    comment_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_wcl_comment_user (comment_id, user_id),
    KEY idx_wcl_comment (comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tb_user_follow (
    id BIGINT NOT NULL AUTO_INCREMENT,
    follower_id INT NOT NULL,
    followee_id INT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_follow (follower_id, followee_id),
    KEY idx_followee (followee_id),
    KEY idx_follower (follower_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
