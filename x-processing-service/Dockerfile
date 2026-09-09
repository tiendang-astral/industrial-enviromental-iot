# Build bằng chính gradle wrapper của project (Gradle 9.6.1) — không ghim thêm image gradle
# để khỏi lệch version với repo.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src

# Copy phần khai báo build trước để lớp tải dependency được cache lại giữa các lần build
COPY gradle gradle
COPY gradlew build.gradle settings.gradle ./
RUN chmod +x gradlew && ./gradlew --no-daemon --version

COPY src src
RUN ./gradlew --no-daemon clean bootJar -x test

FROM eclipse-temurin:21-jre AS runtime
# curl cho healthcheck của compose (ảnh temurin không có sẵn)
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

# Không chạy bằng root
RUN useradd -r -u 10001 -m appuser
USER appuser

WORKDIR /app
COPY --from=build /src/build/libs/*.jar app.jar

# MaxRAMPercentage để JVM tôn trọng memory limit của container thay vì đọc RAM của cả host.
# Đo thực tế: processing đỉnh ~407MB khi gánh tải, nên limit tối thiểu 768MB (xem compose prod).
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseContainerSupport"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
