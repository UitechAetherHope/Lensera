-- 若评论发送报 root_id 不能为空，在 Navicat 对库 photo_blog 执行：
USE photo_blog;

ALTER TABLE tb_work_comment MODIFY COLUMN root_id BIGINT NULL;
