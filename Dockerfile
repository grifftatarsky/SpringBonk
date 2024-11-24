#Build stage
FROM maven:3.9.9-eclipse-temurin-23-alpine AS build

WORKDIR /app

COPY pom.xml ./
RUN mvn dependency:go-offline
COPY src ./src

RUN --mount=type=cache,target=/root/.m2 mvn -f pom.xml clean package -DskipTests

FROM eclipse-temurin:23-jre

RUN groupadd -r bonk-docker && useradd -r -g bonk-docker veto

COPY --from=build /app/target/*.jar /app/runner.jar

RUN chown -R veto:bonk-docker /app

EXPOSE 7084

USER veto

ENTRYPOINT ["java", "-jar", "app/runner.jar"]