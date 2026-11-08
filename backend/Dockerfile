# Build Stage
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run Stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/claimledger-backend-1.0.0.jar app.jar

ENV PORT=8080
ENV JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8 -Xmx240m -Xms64m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m -XX:ReservedCodeCacheSize=32m -Xss512k"
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

