package com.photoblog.springboot_photo.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * ddl-auto=update 未建表时，启动阶段补齐博客评论相关表结构。
 */
@Component
public class BlogCommentSchemaPatcher implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BlogCommentSchemaPatcher.class);

    private final JdbcTemplate jdbcTemplate;

    public BlogCommentSchemaPatcher(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute(
                    """
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
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """);
            jdbcTemplate.execute(
                    """
                    CREATE TABLE IF NOT EXISTS tb_blog_comment_like (
                        id BIGINT NOT NULL AUTO_INCREMENT,
                        comment_id BIGINT NOT NULL,
                        user_id INT NOT NULL,
                        created_at DATETIME(6) NOT NULL,
                        PRIMARY KEY (id),
                        UNIQUE KEY uk_bcl_comment_user (comment_id, user_id),
                        KEY idx_bcl_comment (comment_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """);
            jdbcTemplate.execute("ALTER TABLE tb_blog_comment MODIFY COLUMN root_id BIGINT NULL");
            log.info("博客评论表结构已就绪 (tb_blog_comment / tb_blog_comment_like)");
        } catch (DataAccessException e) {
            log.warn("博客评论表补丁执行失败: {}", e.getMessage());
        }
    }
}
