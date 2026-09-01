package com.gpt.jpss;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * Boots the whole context against a throwaway Postgres, which also runs
 * Liquibase and then lets Hibernate's {@code ddl-auto: validate} check every
 * entity against the migrated schema. A column that drifts from its changeset
 * fails here rather than at deploy.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class JpssApplicationTests {

  @Test
  void contextLoads() {
  }
}
