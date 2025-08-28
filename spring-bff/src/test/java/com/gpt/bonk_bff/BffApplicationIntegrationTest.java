package com.gpt.bonk_bff;

import com.c4_soft.springaddons.security.oauth2.test.webflux.AddonsWebfluxTestConf;
import com.c4_soft.springaddons.security.oauth2.test.webflux.WebTestClientSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithAnonymousUser;

@SpringBootTest
@AutoConfigureWebTestClient
@ImportAutoConfiguration(AddonsWebfluxTestConf.class)
class BffApplicationIntegrationTest {

  // IDE Warning is irrelevant; bean is present, and functional.
  @Autowired
  WebTestClientSupport api;

  @Test
  @WithAnonymousUser
  void givenRequestIsAnonymous_whenGetLoginOptions_thenOk() {
    api.get("/login-options")
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$")
        .isArray()
        .jsonPath("$[0].label")
        .isEqualTo("gpt-keycloak")
        .jsonPath("$[0].loginUri")
        .isEqualTo("https://localhost:7080/bff/oauth2/authorization/gpt-keycloak")
        .jsonPath("$[0].isSameAuthority")
        .isEqualTo(true);
  }
}