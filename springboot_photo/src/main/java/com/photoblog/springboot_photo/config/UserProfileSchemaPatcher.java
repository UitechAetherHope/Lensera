package com.photoblog.springboot_photo.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** 启动时补齐 tb_user.bio（个人签名）列 */
@Component
public class UserProfileSchemaPatcher implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(UserProfileSchemaPatcher.class);

    private final JdbcTemplate jdbcTemplate;

    public UserProfileSchemaPatcher(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("ALTER TABLE tb_user ADD COLUMN bio VARCHAR(200) NULL");
            log.info("tb_user.bio 列已添加");
        } catch (DataAccessException e) {
            log.debug("tb_user.bio 补丁跳过: {}", e.getMessage());
        }
    }
}
