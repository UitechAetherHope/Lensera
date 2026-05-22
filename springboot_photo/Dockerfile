# syntax=docker/dockerfile:1
# Multi-stage build for Spring Boot (Java 17)
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /build
RUN apk add --no-cache bash
# Aliyun Maven mirror for faster builds on CN ECS (avoids repo.maven.apache.org timeouts)
COPY docker/maven-settings.xml /root/.m2/settings.xml
COPY mvnw pom.xml ./
COPY .mvn .mvn
ENV MAVEN_OPTS="-Xmx768m"
COPY src src
# 直接 package（勿用 dependency:go-offline，在弱网下易 SSL 中断且耗时极长）
RUN --mount=type=cache,target=/root/.m2 \
    chmod +x mvnw && ./mvnw -B -DskipTests package

FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache curl tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone
WORKDIR /app
COPY --from=build /build/target/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Dfile.encoding=UTF-8", "-jar", "/app/app.jar"]
