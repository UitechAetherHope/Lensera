/*
 Navicat Premium Dump SQL

 Source Server         : photo
 Source Server Type    : MySQL
 Source Server Version : 80040 (8.0.40)
 Source Host           : localhost:3306
 Source Schema         : photo_blog

 Target Server Type    : MySQL
 Target Server Version : 80040 (8.0.40)
 File Encoding         : 65001

 Date: 21/05/2026 17:32:41
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for tb_blog_comment
-- ----------------------------
DROP TABLE IF EXISTS `tb_blog_comment`;
CREATE TABLE `tb_blog_comment`  (
  `comment_id` bigint NOT NULL AUTO_INCREMENT,
  `blog_id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `parent_id` bigint NULL DEFAULT NULL,
  `root_id` bigint NULL DEFAULT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `like_count` int NOT NULL DEFAULT 0,
  `status` int NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`comment_id`) USING BTREE,
  INDEX `idx_bc_blog_created`(`blog_id` ASC, `created_at` ASC) USING BTREE,
  INDEX `idx_bc_root`(`root_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tb_blog_comment
-- ----------------------------
INSERT INTO `tb_blog_comment` VALUES (1, 4, 9, NULL, 1, 'Hello World', 0, 1, '2026-05-19 16:46:26.814269');
INSERT INTO `tb_blog_comment` VALUES (2, 4, 9, 1, 1, '我回复我自己', 1, 1, '2026-05-19 16:46:37.944281');
INSERT INTO `tb_blog_comment` VALUES (3, 4, 9, 2, 1, '该评论已删除', 0, 0, '2026-05-19 16:46:44.578590');
INSERT INTO `tb_blog_comment` VALUES (4, 4, 9, 2, 1, '依旧回复我自己', 0, 1, '2026-05-19 16:46:59.106007');
INSERT INTO `tb_blog_comment` VALUES (5, 10, 11, NULL, 5, '该评论已删除', 0, 0, '2026-05-20 16:42:58.530461');
INSERT INTO `tb_blog_comment` VALUES (6, 10, 11, NULL, 6, 'I\'m king', 0, 1, '2026-05-20 16:43:29.557901');

-- ----------------------------
-- Table structure for tb_blog_comment_like
-- ----------------------------
DROP TABLE IF EXISTS `tb_blog_comment_like`;
CREATE TABLE `tb_blog_comment_like`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `comment_id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_bcl_comment_user`(`comment_id` ASC, `user_id` ASC) USING BTREE,
  UNIQUE INDEX `UKguv6bra6259t9eih113i8afl`(`comment_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `idx_bcl_comment`(`comment_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tb_blog_comment_like
-- ----------------------------
INSERT INTO `tb_blog_comment_like` VALUES (1, 2, 9, '2026-05-19 16:46:46.766913');

-- ----------------------------
-- Table structure for tb_blog_post
-- ----------------------------
DROP TABLE IF EXISTS `tb_blog_post`;
CREATE TABLE `tb_blog_post`  (
  `blog_id` bigint NOT NULL AUTO_INCREMENT,
  `body_markdown` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `category` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `comment_count` int NOT NULL,
  `cover_byte_size` bigint NULL DEFAULT NULL,
  `cover_mime` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `cover_name` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `cover_path` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `excerpt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `published_at` datetime(6) NULL DEFAULT NULL,
  `review_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `status` int NOT NULL,
  `tags` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` int NOT NULL,
  `view_count` int NOT NULL,
  PRIMARY KEY (`blog_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tb_blog_post
-- ----------------------------
INSERT INTO `tb_blog_post` VALUES (1, '#第一级标题\r\nHello World!!!!!\r\n##第二级标题\r\nHhh wd', '技术分享', 0, 6221741, 'image/jpeg', 'luise-and-nic-X6AtpzVKMtI-unsplash.jpg', 'users/1000000/blog/covers/2026/05/1779195292846_bf523c91435041ff.jpg', '2026-05-19 12:55:03.324187', '光圈800', NULL, NULL, 0, 'IOS 1000', '运动摄影', '2026-05-19 12:55:03.324187', 9, 0);
INSERT INTO `tb_blog_post` VALUES (2, '#Hellow World\r\n**##Hello world**', '技术分享', 0, 3277193, 'image/jpeg', 'matthew-stephenson-zya2lvVNY3g-unsplash.jpg', 'users/1000000/blog/covers/2026/05/1779196162638_69896c764b32467a.jpg', '2026-05-19 13:09:28.237530', 'Hello World!!!', '2026-05-19 13:09:28.235528', NULL, 2, '夜景摄影', 'super photo', '2026-05-19 13:09:28.237530', 9, 1);
INSERT INTO `tb_blog_post` VALUES (3, '# 一级标题\r\n\r\n## 二级标题\r\n\r\n### 三级标题\r\n\r\n正文\r\n\r\n插入图片\r\n\r\n![evgeni-tcherkasski-c659bBmJpw0-unsplash](users/1000000/blog/assets/2026/05/1779197754129_9fd98b9842f2497d.jpg)', '技术分享', 0, 6221741, 'image/jpeg', 'luise-and-nic-X6AtpzVKMtI-unsplash.jpg', 'users/1000000/blog/covers/2026/05/1779197795271_f6aed6c12d5a4d71.jpg', '2026-05-19 13:36:44.732814', '超级无敌super super Web', '2026-05-19 13:36:44.724936', NULL, 2, '夜景,街拍分享', 'Hello World', '2026-05-19 13:36:44.732814', 9, 3);
INSERT INTO `tb_blog_post` VALUES (4, '很多朋友晚上拍照总是发黑、噪点多、灯光过曝，其实只要调好基础参数，手机相机都能拍出好看夜景。\r\n\r\n# 一、相机基础拍摄参数\r\n\r\n### 1.感光度 ISO：控制在 100‑400 之间，越低画面越干净，减少噪点\r\n\r\n### ２.快门速度：1/10s–3s，拍夜景适当放慢快门，记得稳住相机或用三脚架\r\n\r\n### 3.光圈：F1.8‑F2.8 大光圈优先，进光量充足，灯光自带柔和光斑\r\n\r\n### 4.白平衡：手动调到 3200K‑4200K，夜景色调清冷高级，不会发黄发灰\r\n\r\n# 二、拍摄小技巧\r\n\r\n### 1、尽量使用三脚架，长曝光避免画面模糊\r\n\r\n### 2、避开强光直射镜头，防止炫光鬼影\r\n\r\n### 3、傍晚蓝调时刻拍摄，天空带淡蓝色氛围感最强\r\n\r\n# 三、后期简单微调\r\n\r\n轻微降低高光、提升阴影，减少夜景灯光刺眼感，整体画面通透干净。', '技术分享', 3, 2491563, 'image/jpeg', 'jack-white-HHkPsAU4oE8-unsplash.jpg', 'users/1000000/blog/covers/2026/05/1779202489149_1752bc113a264710.jpg', '2026-05-19 14:54:54.994332', '分享一套通用夜景拍照参数，不用反复试错，随手拍出干净有质感的夜景大片。', '2026-05-19 14:54:54.991885', NULL, 2, '夜景摄影,参数设置', '夜景摄影保姆级参数设置｜新手直接抄作业', '2026-05-19 16:46:59.110008', 9, 3);
INSERT INTO `tb_blog_post` VALUES (5, '夜晚拍摄一直是摄影里很有氛围感的题材，很多朋友夜景拍出来发黑、噪点多、灯光过曝，其实核心就是控制好快门、光圈与感光度。\r\n器材方面优先使用三脚架，夜景长曝光必须保证机身稳定，避免画面模糊。\r\n\r\n## 拍摄参数参考\r\n\r\n光圈：F8‑F11，保证画面整体清晰度，灯光星芒效果更好\r\n快门：2‑10s，根据环境亮度调整，车流、水面可以适当拉长快门\r\nISO：100‑200，最低原生感光度，最大限度减少夜景噪点\r\n白平衡：手动 4200K‑4800K，避免灯光发黄发红\r\n拍摄小技巧：使用定时拍摄或者快门线，按快门时不会抖动；尽量避开强光直射镜头，减少鬼影炫光。\r\n后期只需要简单压低高光、提亮阴影，降低噪点，一张干净通透的夜景大片就完成了。\r\n\r\n夜晚拍摄一直是摄影里很有氛围感的题材，很多朋友夜景拍出来发黑、噪点多、灯光过曝，其实核心就是控制好快门、光圈与感光度。\r\n器材方面优先使用三脚架，夜景长曝光必须保证机身稳定，避免画面模糊。\r\n\r\n## 拍摄参数参考\r\n\r\n### 光圈：F8‑F11，保证画面整体清晰度，灯光星芒效果更好\r\n\r\n### 快门：2‑10s，根据环境亮度调整，车流、水面可以适当拉长快门\r\n\r\n### ISO：100‑200，最低原生感光度，最大限度减少夜景噪点\r\n\r\n### 白平衡：手动 4200K‑4800K，避免灯光发黄发红\r\n\r\n拍摄小技巧：使用定时拍摄或者快门线，按快门时不会抖动；尽量避开强光直射镜头，减少鬼影炫光。\r\n后期只需要简单压低高光、提亮阴影，降低噪点，一张干净通透的夜景大片就完成了。', '技术分享', 0, 3319106, 'image/jpeg', 'caroline-badran-K4Y7oLEpiZU-unsplash.jpg', 'users/1000001/blog/covers/2026/05/1779288596400_0526f4ee3cfb4bc2.jpg', '2026-05-20 14:50:04.129044', '分享夜景城市风光长曝光拍摄思路、相机参数设置与后期简单调整技巧，新手也能直接套用。', '2026-05-20 14:50:04.119046', NULL, 2, '参数,思路全分享', '夜景长曝光拍摄实操', '2026-05-20 14:50:04.129044', 10, 1);
INSERT INTO `tb_blog_post` VALUES (6, '很多人拍夜景人像只会开大光圈，结果背景一片漆黑，今天分享兼顾人物清晰 + 夜景氛围感的拍摄方式。\r\n\r\n## 相机通用参数\r\n\r\n光圈：F2.8‑F4，虚化背景同时保留夜景环境细节\r\n\r\n## 快门：1/50s 左右，保证人物不糊\r\n\r\n## ISO：400‑800，现代相机高感完全够用\r\n\r\n## 对焦：单点对焦对准人物眼睛\r\n\r\n拍摄思路：优先找有环境光源的街道、橱窗、路灯，利用环境光给面部补光，不要直面强光。构图上把夜景灯光带入画面，让人物和环境融合，氛围感直接拉满。\r\n后期轻微磨皮、统一色调，降低画面杂色，夜景人像高级感立刻出来。', '技术分享', 0, 141244, 'image/jpeg', '37f704a37a5eb5ad8c11e845254ebcef~tplv-be4g95zd3a-image.jpeg', 'users/1000001/blog/covers/2026/05/1779289246364_a5c55d8d9fa64427.jpg', '2026-05-20 15:00:47.624538', '夜景人像不用大光圈硬拍，一套通用拍摄参数 + 构图技巧，轻松拍出干净夜景人像。', '2026-05-20 15:00:47.624538', NULL, 2, '氛围感拍摄参数教程', '人像夜景摄影｜氛围感拍摄参数教程', '2026-05-20 15:00:47.624538', 10, 1);
INSERT INTO `tb_blog_post` VALUES (7, '# 拍照其实没有固定万能参数，只有理解逻辑，才能应对白天、夜景、室内各种场景。\r\n\r\n### 光圈：控制进光量 + 虚化，夜景想要环境就缩小光圈，想要虚化就开大光圈\r\n\r\n### 快门：控制画面动静，拍静止夜景慢快门，拍人物必须快快门防糊片\r\n\r\n### ISO 感光度：越高画面越亮，但噪点越多，夜景尽量压低 ISO，用三脚架换慢快门\r\n\r\n### 夜景摄影核心逻辑：低 ISO + 慢快门 + 三脚架，这是画质最好的组合；手持拍摄就适当提高 ISO、加快快门。\r\n\r\n学会这套参数逻辑，不管是风光、人像、街头夜景，都可以灵活调整，不用死记参数模板。', '技术分享', 0, 4313720, 'image/jpeg', 'anna-pelzer-IGfIGP5ONV0-unsplash.jpg', 'users/1000001/blog/covers/2026/05/1779289490660_f92fba5db3d24e76.jpg', '2026-05-20 15:04:56.570199', '从夜景实拍角度讲解光圈、快门、ISO 三者关系，告别盲目调参数。', '2026-05-20 15:04:56.569186', NULL, 2, '相机基础参数逻辑讲解', '新手摄影必看｜相机基础参数逻辑讲解', '2026-05-20 15:04:56.570199', 10, 2);
INSERT INTO `tb_blog_post` VALUES (8, '2026 年 5 月 15 日，备受行业关注的第二十七届 CHINA P&E 影像博览会在北京展览馆正式开幕，展期持续至 5 月 18 日。作为国内影像行业规模最大、权威性最高的年度展会，本次博览会以*影像无处不在*为核心主题，汇聚全球 120 余家主流影像品牌，展览总面积突破 20000 平方米，行业热度与参展规模再创近年新高。\r\n本届展会汇聚了佳能、索尼、尼康等国际影像巨头，同时影石 Insta360、神牛等国产头部品牌集中亮相，带来全新一代摄影硬件与影像解决方案。不同于往年单纯的器材迭代，2026 年展会核心风向全面转向智能化、轻量化、工作流一体化。\r\n\r\n## 本届展会三大核心看点\r\n\r\n### AI 深度落地摄影全流程：全新 AI 智能对焦、智能光影修复、场景自动调色功能全面下放至消费级相机，大幅降低普通人的创作门槛\r\n\r\n### 国产影像设备崛起：国产补光设备、全景相机、便携稳定设备技术迭代成熟，性价比与专业度全面对标国际大牌\r\n\r\n### 短视频与直播影像设备爆发：针对 vlog、直播、夜景短视频创作的轻量化器材成为展会主流新品\r\n\r\n业内人士表示，2026 年是AI 摄影工业化落地元年，摄影不再单纯依赖摄影师手动参数调试与后期修图，智能化辅助工具将成为职业摄影师与摄影爱好者的标配。', '社区新闻', 0, 747757, 'image/jpeg', 'chloe-9OzrJbDYeEQ-unsplash(1).jpg', 'users/1000002/blog/covers/2026/05/1779290191012_51fff199357c40be.jpg', '2026-05-20 15:16:33.767470', '第二十七届中国国际照相机械影像器材与技术博览会如期开展，国内外影像品牌集中发布新品，AI 工作流、轻量化创作设备成为本届展会最大亮点。', '2026-05-20 15:16:33.767470', NULL, 2, 'AI 摄影', '2026 China P&E 影像展正式开幕，AI 摄影成年度核心趋势', '2026-05-20 15:16:33.767470', 11, 1);
INSERT INTO `tb_blog_post` VALUES (9, '近日，2026 索尼世界摄影奖（SWPA） 完整获奖名单正式公布，本次赛事共收纳全球 200 多个国家和地区超 43 万幅参赛作品，是全球覆盖面最广、含金量最高的摄影赛事之一。\r\n相较于往年侧重光影质感、画面唯美度的评选标准，2026 年赛事呈现出颠覆性的审美变革，彻底改写了现代摄影的创作导向。评委团队明确提出：高颜值画面不再是加分核心，有故事、有内核、有社会价值的影像作品才是主流趋势。\r\n\r\n## 本年度摄影行业审美新趋势\r\n\r\n去唯美化：摒弃过度磨皮、过度调色、干净空洞的网红画面，保留真实光影瑕疵与场景质感\r\n重结构与表达：优先考察画面构图逻辑、空间层次、主题表达，光影服务于内容而非颜值\r\n纪实价值优先：聚焦人文、乡土、工业、小众群体的纪实作品大幅获奖，空洞风光片竞争力大幅下降\r\n本届年度最佳摄影师由墨西哥摄影师斩获，获奖作品聚焦原住民女性生活，以真实、质朴的镜头语言传递人文力量。这也意味着：2026 年，摄影正式从 “拍好看” 进入 “拍深刻” 的全新阶段。', '社区新闻', 0, 146731, 'image/jpeg', '4bbda3e22e25dfa4dec93d8da1b4a350~tplv-be4g95zd3a-image(1).jpeg', 'users/1000002/blog/covers/2026/05/1779290404835_35828dfef63b4483.jpg', '2026-05-20 15:20:06.093053', '本年度索尼世界摄影奖评选结果出炉，全球超 43 万份作品参赛，行业审美彻底告别 “唯唯美论”，纪实价值与内容内核成为获奖核心标准。', '2026-05-20 15:20:06.093053', NULL, 2, '索尼世界摄影奖', '2026 索尼世界摄影奖落幕，摄影审美迎来重大变革', '2026-05-20 15:20:06.093053', 11, 1);
INSERT INTO `tb_blog_post` VALUES (10, '2026 年中旬，全球影像软件与相机硬件完成新一轮技术统一迭代，AI 摄影从 “辅助修图” 正式升级为 “全流程智能创作”，彻底改变传统摄影的拍摄与后期逻辑。\r\n在前两年，AI 摄影仅局限于一键美颜、自动调色、背景替换等基础功能，同质化严重、画质失真问题频发。而 2026 年全新 AI 影像技术，实现了场景深度识别、光影逻辑复刻、构图智能优化三大核心突破。\r\n\r\n## AI 摄影全新行业能力升级\r\n\r\n拍摄端智能：相机内置 AI 可实时识别夜景、人像、风光、车流场景，自动微调快门、光圈、ISO 参数，规避新手常见过曝、欠曝问题\r\n构图智能辅助：实时画面提示黄金分割、引导线构图，辅助拍摄者快速构建高级画面\r\n后期工业化提速：AI 可自动完成污点去除、光影统一、色调校准，保留原创光影质感，无 AI 虚假磨皮感\r\n目前，主流专业后期软件与国产影像设备已全面适配全新 AI 工作流。对于摄影爱好者而言，智能化工具降低了技术门槛；对于职业摄影师而言，效率大幅提升，可将更多精力放在创意与内容创作上，成为 2026 年影像行业最大的变革红利。', '技术分享', 1, 178077, 'image/jpeg', 'c2fc402021fe95c6a8c434b53b5c5a8f~tplv-be4g95zd3a-image(1).jpeg', 'users/1000002/blog/covers/2026/05/1779290449968_98fca856bbe94496.jpg', '2026-05-20 15:20:51.305555', '告别简单一键滤镜，本年度 AI 影像技术完成质变，深度介入对焦、光影、构图、后期全流程，重塑职业摄影师工作模式。', '2026-05-20 15:20:51.304041', NULL, 2, 'AI 摄影', 'AI 摄影全面迭代！2026 专业影像工作流彻底升级', '2026-05-20 16:43:29.563330', 11, 2);
INSERT INTO `tb_blog_post` VALUES (11, '你好世界', '技术分享', 0, 1759706, 'image/jpeg', 'colorhub.me_photos_qRyB1_3456x2304(1).jpg', 'users/1000002/blog/covers/2026/05/1779295119890_646f157e24164ab8.jpg', '2026-05-20 16:38:41.685380', NULL, NULL, NULL, 0, NULL, '你好世界', '2026-05-20 16:38:41.685380', 11, 0);

-- ----------------------------
-- Table structure for tb_blog_view
-- ----------------------------
DROP TABLE IF EXISTS `tb_blog_view`;
CREATE TABLE `tb_blog_view`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `blog_id` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `viewer_key` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UK1cj9ywuav3mbcmqvlmkjetekg`(`blog_id` ASC, `viewer_key` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tb_blog_view
-- ----------------------------
INSERT INTO `tb_blog_view` VALUES (1, 4, '2026-05-20 13:44:55.725318', 'u:10');
INSERT INTO `tb_blog_view` VALUES (2, 3, '2026-05-20 13:44:59.494578', 'u:10');
INSERT INTO `tb_blog_view` VALUES (3, 5, '2026-05-20 14:50:16.240513', 'u:10');
INSERT INTO `tb_blog_view` VALUES (4, 6, '2026-05-20 15:02:06.416147', 'u:10');
INSERT INTO `tb_blog_view` VALUES (5, 8, '2026-05-20 15:16:38.709122', 'u:11');
INSERT INTO `tb_blog_view` VALUES (6, 9, '2026-05-20 15:21:06.076430', 'u:11');
INSERT INTO `tb_blog_view` VALUES (7, 10, '2026-05-20 16:33:14.146498', 'u:11');
INSERT INTO `tb_blog_view` VALUES (8, 2, '2026-05-20 16:37:39.855139', 'u:11');
INSERT INTO `tb_blog_view` VALUES (9, 3, '2026-05-20 16:37:50.502016', 'u:11');
INSERT INTO `tb_blog_view` VALUES (10, 4, '2026-05-20 16:37:57.673828', 'u:11');
INSERT INTO `tb_blog_view` VALUES (11, 7, '2026-05-20 17:22:33.246109', 'u:11');
INSERT INTO `tb_blog_view` VALUES (12, 7, '2026-05-20 17:36:44.796098', 'u:9');
INSERT INTO `tb_blog_view` VALUES (13, 10, '2026-05-20 17:38:46.382866', 'u:9');
INSERT INTO `tb_blog_view` VALUES (14, 3, '2026-05-20 18:27:04.982505', 'u:9');
INSERT INTO `tb_blog_view` VALUES (15, 4, '2026-05-21 04:50:23.623783', 'u:9');

-- ----------------------------
-- Table structure for tb_user
-- ----------------------------
DROP TABLE IF EXISTS `tb_user`;
CREATE TABLE `tb_user`  (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `user_email` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `user_passwd` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `user_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `public_id` bigint NULL DEFAULT NULL,
  `avatar_path` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `cover_path` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `cover_focus_x` double NULL DEFAULT NULL,
  `cover_focus_y` double NULL DEFAULT NULL,
  `bio` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`) USING BTREE,
  UNIQUE INDEX `UKqp79bex2xm1yc0dll1ldxyjij`(`public_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tb_user
-- ----------------------------
INSERT INTO `tb_user` VALUES (2, 'a222_0702@outlook.com', '123456', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_user` VALUES (3, 'a222_0702@outlook.com', '123456', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_user` VALUES (4, 'a222_0702@outlook.com', '123456', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_user` VALUES (5, 'a222_0702@outlook.com', '123456', 'machenglei', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_user` VALUES (6, '123@qq.com', '123456', 'xushu', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_user` VALUES (7, '123@qq.com', '123456', 'mcl', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_user` VALUES (9, 'a222_0702@qq.com', '$2a$10$w3qB.N4QhOXUfCg5w8APaOAVIfwh3wZixfkRFMYxIeBFzlT7mc5Se', 'mmm', 1000000, 'users/1000000/avatar/1778250071458_ecd8214ee6414ae1bd4417253591b5f3.png', 'users/1000000/background/1779117057858_1892e3f6c57d44c6a22d842527d82344.jpg', 26.1, 64.8, '君子当坐如尸，立如齐，礼从宜，使从俗。');
INSERT INTO `tb_user` VALUES (10, '3413542260@qq.com', '$2a$10$4kYCUiQtbP8EC11S0k13IeNvam.0DkQgJ3EWxlsT2IliBeu7N8LlC', '柯公子', 1000001, 'users/1000001/avatar/1779264130540_c93331c65f894ce28a3c88bffb4a7f89.jpg', NULL, 50, 42, '曼巴out');
INSERT INTO `tb_user` VALUES (11, '1870067756@qq.com', '$2a$10$ohcdrYYrJhM8SMXRKt.Ri.UA7OUELK24izleQBXSCxPOvdWFnTeVi', '眭公子', 1000002, 'users/1000002/avatar/1779289824341_7499acd6abb8447a8b7a207d77ff3fd6.jpg', NULL, 50, 42, '如果这就是你真正的实例，那么他人的质疑，就是对你最高的赞誉。');

-- ----------------------------
-- Table structure for tb_user_follow
-- ----------------------------
DROP TABLE IF EXISTS `tb_user_follow`;
CREATE TABLE `tb_user_follow`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `followee_id` int NOT NULL,
  `follower_id` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UKsotvk7k586ogbg3xwv5gqayeq`(`follower_id` ASC, `followee_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tb_user_follow
-- ----------------------------
INSERT INTO `tb_user_follow` VALUES (5, 9, 10);
INSERT INTO `tb_user_follow` VALUES (1, 9, 11);

-- ----------------------------
-- Table structure for tb_work
-- ----------------------------
DROP TABLE IF EXISTS `tb_work`;
CREATE TABLE `tb_work`  (
  `work_id` bigint NOT NULL AUTO_INCREMENT,
  `caption` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `category` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `image_path` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `like_count` int NOT NULL,
  `status` int NOT NULL,
  `title` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` int NOT NULL,
  `ai_label` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `ai_score` double NULL DEFAULT NULL,
  `ai_top_k_json` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `ai_coarse_score` double NULL DEFAULT NULL,
  `ai_coarse_zh` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `ai_feat_animal` double NULL DEFAULT NULL,
  `ai_feat_landscape` double NULL DEFAULT NULL,
  `ai_feat_other` double NULL DEFAULT NULL,
  `ai_feat_portrait` double NULL DEFAULT NULL,
  `ai_feat_still` double NULL DEFAULT NULL,
  `ai_feat_street` double NULL DEFAULT NULL,
  PRIMARY KEY (`work_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 71 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tb_work
-- ----------------------------
INSERT INTO `tb_work` VALUES (41, NULL, '风景', '2026-05-08 19:05:53.319850', 'users/1000000/works/2026/05/3761d0b7d0514f33bbfbc5035c89b9f5.jpg', 0, 1, '风景', '2026-05-08 19:05:53.319850', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (42, NULL, '风景', '2026-05-08 19:06:03.749573', 'users/1000000/works/2026/05/9c506241b1634afab3b5ae0a7ac8c89c.jpg', 0, 1, '风景', '2026-05-08 19:06:03.749573', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (43, NULL, '风景', '2026-05-08 19:06:19.714792', 'users/1000000/works/2026/05/3b466c5cab344ef4b1416c7f4fcdbe7f.jpg', 0, 1, '风景', '2026-05-08 19:06:19.714792', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (44, NULL, '风景', '2026-05-08 19:06:31.718935', 'users/1000000/works/2026/05/da53aa4385104398b31fbd70b11e22b0.jpg', 0, 1, '风景', '2026-05-08 19:06:31.718935', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (45, NULL, '风景', '2026-05-08 19:06:43.478927', 'users/1000000/works/2026/05/d16931b85e354677aad265fbbba3fb96.jpg', 1, 1, '风', '2026-05-20 08:03:26.560859', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (46, NULL, '风景', '2026-05-08 19:06:54.529512', 'users/1000000/works/2026/05/c60301da05e442a1a85811da439348bf.jpg', 0, 1, '风景', '2026-05-08 19:06:54.529512', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (47, NULL, '风景', '2026-05-08 19:07:20.732961', 'users/1000000/works/2026/05/bd58fbba311e4096b094ce197337111a.jpg', 1, 1, '风景', '2026-05-18 14:41:48.465387', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (48, NULL, '风景', '2026-05-08 19:07:29.998667', 'users/1000000/works/2026/05/b8ed8bdbd53f4b0ba2c93223fbbed896.jpg', 0, 1, '风景', '2026-05-08 19:07:29.998667', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (49, NULL, '风景', '2026-05-08 19:07:39.400042', 'users/1000000/works/2026/05/a0778322ba2e4fc7b1c50bc7a00a6b0d.jpg', 0, 1, '风', '2026-05-08 19:07:39.400042', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (50, NULL, '风景', '2026-05-08 19:07:47.554868', 'users/1000000/works/2026/05/4a667f04c5c345799b485b85e3a2068b.jpg', 1, 1, '风', '2026-05-20 08:03:30.424936', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (51, NULL, '动物', '2026-05-08 19:08:00.404239', 'users/1000000/works/2026/05/7780dcf74b6b4920a4f58d765334d985.jpg', 2, 1, '风', '2026-05-20 10:51:57.801939', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (52, NULL, '动物', '2026-05-08 19:08:09.801639', 'users/1000000/works/2026/05/4c379ea53d9f41ad9100e182a66173fb.webp', 0, 1, '动物', '2026-05-08 19:08:09.801639', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (53, NULL, '风景', '2026-05-08 19:08:26.651234', 'users/1000000/works/2026/05/d554b29c97b14abcb4e5aad7abc18421.jpg', 0, 1, '风景', '2026-05-08 19:08:26.651234', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (54, NULL, '风景', '2026-05-08 19:08:44.021933', 'users/1000000/works/2026/05/14a996a901e0412a808747204c85d146.jpg', 0, 1, '风景', '2026-05-08 19:08:44.021933', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (55, NULL, '风景', '2026-05-08 19:09:19.065331', 'users/1000000/works/2026/05/d86a9a72c1c444e59ee260a65f3b615f.jpg', 1, 1, '风景', '2026-05-15 11:26:21.773081', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (56, NULL, NULL, '2026-05-08 19:09:51.243897', 'users/1000000/works/2026/05/fb7f047ed5824f1f90b908ecadffbca8.jpg', 2, 1, '风景', '2026-05-20 10:52:00.765431', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (57, NULL, '动物', '2026-05-08 19:10:15.190435', 'users/1000000/works/2026/05/0fcf98d0f996447c8614595b1bf6f700.jpg', 0, 1, '动物', '2026-05-08 19:10:15.190435', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (58, NULL, '街拍', '2026-05-08 19:10:39.755300', 'users/1000000/works/2026/05/de23212149874f61abf288ce565922ce.jpg', 0, 1, '街拍', '2026-05-08 19:10:39.755300', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (59, '绝美的风景', '静物', '2026-05-08 19:11:01.528510', 'users/1000000/works/2026/05/a8e542f579c24366a1791f39c09645ec.jpg', 1, 1, '静物', '2026-05-20 10:52:12.735575', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (60, NULL, '风景', '2026-05-08 19:11:13.812295', 'users/1000000/works/2026/05/8e4218f07edb4be398918328dbdb40b2.jpg', 1, 1, '风景', '2026-05-20 10:52:04.077508', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (61, 'super man', '人物', '2026-05-20 14:03:09.580400', 'users/1000001/works/2026/05/ec6fbc32702b43258178b06b67c323b8.jpg', 1, 1, '人物', '2026-05-20 14:03:13.771824', 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (62, 'super man', '人物', '2026-05-20 14:04:12.267285', 'users/1000001/works/2026/05/609b053c8bd747358ea7ab0d130b685d.jpg', 0, 1, '人物', '2026-05-20 14:04:12.267285', 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (64, '曼巴out', '人物', '2026-05-20 15:11:36.570129', 'users/1000002/works/2026/05/27a2e008d18d474fb5b7319eb479dc38.jpg', 0, 1, '曼巴', '2026-05-20 15:11:36.570129', 11, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (65, '无', NULL, '2026-05-21 06:57:49.316134', 'users/1000000/works/2026/05/9347f96656f947929a982b1489255059.jpg', 0, 1, '非常好看的图片', '2026-05-21 06:57:49.316134', 9, 'n03028079 church, church building', 0.2058761864900589, '[{\"class\":\"n03028079 church, church building\",\"probability\":0.2058761864900589},{\"class\":\"n04346328 stupa, tope\",\"probability\":0.19675235450267792},{\"class\":\"n03220513 dome\",\"probability\":0.12610752880573273},{\"class\":\"n03877845 palace\",\"probability\":0.06098374351859093},{\"class\":\"n02980441 castle\",\"probability\":0.05319499969482422}]', 0.5479414432808035, '其他', 0, 0, 0.5479414432808035, 0, 0, 0.4520585567191964);
INSERT INTO `tb_work` VALUES (67, '非常好看', '风景', '2026-05-21 07:14:53.186760', 'users/1000000/works/2026/05/6d87ea2f6008464f8be22d9a6539bf3f.jpg', 0, 1, '好看的图片', '2026-05-21 07:14:53.186760', 9, 'n03733281 maze, labyrinth', 0.32776039838790894, '[{\"class\":\"n03733281 maze, labyrinth\",\"probability\":0.32776039838790894},{\"class\":\"n09468604 valley, vale\",\"probability\":0.2740411162376404},{\"class\":\"n09193705 alp\",\"probability\":0.11182678490877151},{\"class\":\"n09472597 volcano\",\"probability\":0.07446308434009552},{\"class\":\"n09332890 lakeside, lakeshore\",\"probability\":0.062418241053819656}]', 0.6339350243275746, '风景', 0, 0.6339350243275746, 0.3660649756724253, 0, 0, 0);
INSERT INTO `tb_work` VALUES (68, '绝美的风景', NULL, '2026-05-21 07:43:04.172621', 'users/1000000/works/2026/05/06d3e549408b43d2af734e0eb4e5196f.jpg', 0, 1, '风景', '2026-05-21 07:43:04.172621', 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_work` VALUES (69, '绝美的风景', '风景', '2026-05-21 07:50:24.187820', 'users/1000000/works/2026/05/d7f809d875954c348de360b192a75a6e.jpg', 0, 1, '风景', '2026-05-21 07:50:24.187820', 9, 'vision:fallback', 1, '[]', 1, '风景', 0, 0, 0, 0, 0, 0);
INSERT INTO `tb_work` VALUES (70, 'cute', '动物', '2026-05-21 07:51:00.946524', 'users/1000000/works/2026/05/905444e584fb4acda74d799d5993d981.jpg', 0, 1, '动物', '2026-05-21 07:51:00.946524', 9, 'vision:fallback', 1, '[]', 1, '动物', 0, 0, 0, 0, 0, 0);

-- ----------------------------
-- Table structure for tb_work_comment
-- ----------------------------
DROP TABLE IF EXISTS `tb_work_comment`;
CREATE TABLE `tb_work_comment`  (
  `comment_id` bigint NOT NULL AUTO_INCREMENT,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `like_count` int NOT NULL,
  `parent_id` bigint NULL DEFAULT NULL,
  `root_id` bigint NULL DEFAULT NULL,
  `status` int NOT NULL,
  `user_id` int NOT NULL,
  `work_id` bigint NOT NULL,
  PRIMARY KEY (`comment_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tb_work_comment
-- ----------------------------
INSERT INTO `tb_work_comment` VALUES (1, 'Hello World', '2026-05-19 16:04:31.211719', 1, NULL, 1, 1, 9, 60);
INSERT INTO `tb_work_comment` VALUES (2, '我回复我自己', '2026-05-19 16:04:47.962284', 0, 1, 1, 1, 9, 60);
INSERT INTO `tb_work_comment` VALUES (3, '该评论已删除', '2026-05-19 16:05:01.468380', 0, 2, 1, 0, 9, 60);
INSERT INTO `tb_work_comment` VALUES (4, '还是回复我自己', '2026-05-19 16:13:01.688994', 0, 2, 1, 1, 9, 60);
INSERT INTO `tb_work_comment` VALUES (5, 'Hello World', '2026-05-20 08:04:09.408724', 0, NULL, 5, 1, 10, 60);
INSERT INTO `tb_work_comment` VALUES (6, '我也回复你一下', '2026-05-20 08:04:22.432139', 0, 1, 1, 1, 10, 60);
INSERT INTO `tb_work_comment` VALUES (7, 'super man', '2026-05-20 14:12:00.610367', 0, NULL, 7, 1, 10, 62);
INSERT INTO `tb_work_comment` VALUES (8, 'verry nice', '2026-05-20 17:10:03.916278', 0, NULL, 8, 1, 11, 61);

-- ----------------------------
-- Table structure for tb_work_comment_like
-- ----------------------------
DROP TABLE IF EXISTS `tb_work_comment_like`;
CREATE TABLE `tb_work_comment_like`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `comment_id` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UKlry1991o3l8bkxednida8fjrs`(`comment_id` ASC, `user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tb_work_comment_like
-- ----------------------------
INSERT INTO `tb_work_comment_like` VALUES (1, 1, '2026-05-19 16:04:37.104543', 9);

-- ----------------------------
-- Table structure for tb_work_like
-- ----------------------------
DROP TABLE IF EXISTS `tb_work_like`;
CREATE TABLE `tb_work_like`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `user_id` int NOT NULL,
  `work_id` bigint NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UK67eu8hmh7xfdklmviwr7513uc`(`work_id` ASC, `user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 40 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tb_work_like
-- ----------------------------
INSERT INTO `tb_work_like` VALUES (1, '2026-05-03 13:16:03.391266', 9, 1);
INSERT INTO `tb_work_like` VALUES (8, '2026-05-03 13:38:21.223598', 11, 2);
INSERT INTO `tb_work_like` VALUES (9, '2026-05-03 14:08:02.026131', 11, 1);
INSERT INTO `tb_work_like` VALUES (29, '2026-05-15 11:26:21.765087', 9, 55);
INSERT INTO `tb_work_like` VALUES (30, '2026-05-18 14:41:48.354862', 9, 47);
INSERT INTO `tb_work_like` VALUES (31, '2026-05-20 08:03:24.217610', 10, 51);
INSERT INTO `tb_work_like` VALUES (32, '2026-05-20 08:03:26.554867', 10, 45);
INSERT INTO `tb_work_like` VALUES (33, '2026-05-20 08:03:28.338653', 10, 56);
INSERT INTO `tb_work_like` VALUES (34, '2026-05-20 08:03:30.418416', 10, 50);
INSERT INTO `tb_work_like` VALUES (35, '2026-05-20 10:51:57.733829', 9, 51);
INSERT INTO `tb_work_like` VALUES (36, '2026-05-20 10:52:00.758429', 9, 56);
INSERT INTO `tb_work_like` VALUES (37, '2026-05-20 10:52:04.071564', 9, 60);
INSERT INTO `tb_work_like` VALUES (38, '2026-05-20 10:52:12.729577', 9, 59);
INSERT INTO `tb_work_like` VALUES (39, '2026-05-20 14:03:13.753776', 10, 61);

SET FOREIGN_KEY_CHECKS = 1;
