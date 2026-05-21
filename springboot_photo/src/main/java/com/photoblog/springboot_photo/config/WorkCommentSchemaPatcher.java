package com.photoblog.springboot_photo.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 启动时尝试放宽 root_id 非空约束（ddl-auto=update 通常不会自动改列）。
 * 即使未执行成功，业务层也会用占位值 0 再更新为 comment_id。
 */
@Component
public class WorkCommentSchemaPatcher implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(WorkCommentSchemaPatcher.class);

    private final JdbcTemplate jdbcTemplate;

    public WorkCommentSchemaPatcher(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("ALTER TABLE tb_work_comment MODIFY COLUMN root_id BIGINT NULL");
            log.info("tb_work_comment.root_id 已调整为可空");
        } catch (DataAccessException e) {
            log.debug("tb_work_comment root_id 补丁跳过: {}", e.getMessage());
        }
    }
}
