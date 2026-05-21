package com.photoblog.springboot_photo.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** 启动时补齐 tb_blog_view（阅读去重） */
@Component
public class BlogViewSchemaPatcher implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BlogViewSchemaPatcher.class);

    private final JdbcTemplate jdbcTemplate;

    public BlogViewSchemaPatcher(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute(
                    """
                    CREATE TABLE IF NOT EXISTS tb_blog_view (
                        id BIGINT NOT NULL AUTO_INCREMENT,
                        blog_id BIGINT NOT NULL,
                        viewer_key VARCHAR(128) NOT NULL,
                        created_at DATETIME(6) NOT NULL,
                        PRIMARY KEY (id),
                        UNIQUE KEY uk_blog_viewer (blog_id, viewer_key),
                        KEY idx_bv_blog (blog_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """);
            log.info("tb_blog_view 表结构已就绪");
        } catch (DataAccessException e) {
            log.debug("tb_blog_view 补丁跳过: {}", e.getMessage());
        }
    }
}
