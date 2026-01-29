# JJAJO 백엔드 Docker 이미지 (Render/Docker 배포용)
# DEPLOYMENT_GUIDE.md 2단계 참고

FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

# Maven wrapper 및 pom 복사
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# 의존성만 다운로드 (캐시 활용)
RUN ./mvnw dependency:go-offline -B

# 소스 복사 후 패키징
COPY src ./src
RUN ./mvnw -q -DskipTests package

# 실행 스테이지
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN adduser -D -u 1000 appuser
COPY --from=build /app/target/jjajo-backend-*.jar app.jar
RUN chown -R appuser:appuser /app

USER appuser
EXPOSE 8080

ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "app.jar"]
