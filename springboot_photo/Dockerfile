# 多阶段构建 Spring Boot（Java 17）
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /build
RUN apk add --no-cache bash
# 国内 ECS 访问 repo.maven.apache.org 易超时，使用阿里云镜像
COPY docker/maven-settings.xml /root/.m2/settings.xml
COPY mvnw pom.xml ./
COPY .mvn .mvn
COPY src src
ENV MAVEN_OPTS="-Xmx768m"
# 默认 pom 已不依赖 DJL（豆包云端分类）；勿加 -Pcv
RUN chmod +x mvnw && ./mvnw -B -DskipTests package

FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache curl tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone
WORKDIR /app
COPY --from=build /build/target/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Dfile.encoding=UTF-8", "-jar", "/app/app.jar"]
