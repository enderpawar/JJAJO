# JJAJO 백엔드 Docker 이미지 (Render/Docker 배포용)
# DEPLOYMENT_GUIDE.md 2단계 참고
# Maven Wrapper 대신 시스템 Maven 사용 (ClassNotFoundException 회피)

FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

RUN apk add --no-cache maven

COPY pom.xml ./
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn -q -DskipTests package

# 실행 스테이지
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN adduser -D -u 1000 appuser
COPY --from=build /app/target/jjajo-backend-*.jar app.jar
RUN chown -R appuser:appuser /app

USER appuser
EXPOSE 8080

ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "app.jar"]
