package com.gpt.springbonk.security;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.OAuthFlow;
import io.swagger.v3.oas.models.security.OAuthFlows;
import io.swagger.v3.oas.models.security.Scopes;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenAPISecurityConfig {
  // MARK // TODO: Convert this to a properties configuration with annotation processor as well.
  //               As a note, this also currently just does not work due to misconfigurations.

  @Value("${issuer}")
  String issuer;

  private static final String OAUTH_SCHEME_NAME = "Keycloak";

  @Bean
  public OpenAPI openAPI() {
    return new OpenAPI().components(new Components()
            .addSecuritySchemes(OAUTH_SCHEME_NAME, createOAuthScheme()))
        .addSecurityItem(new SecurityRequirement().addList(OAUTH_SCHEME_NAME))
        .info(new Info().title("SpringBonk")
            .description("The Spring Boot Resource Server in the Bonk! Ecosystem.")
            .version("1.0"));
  }

  private SecurityScheme createOAuthScheme() {
    OAuthFlows flows = createOAuthFlows();
    return new SecurityScheme().type(SecurityScheme.Type.OAUTH2)
        .flows(flows);
  }

  private OAuthFlows createOAuthFlows() {
    OAuthFlow flow = createAuthorizationCodeFlow();
    return new OAuthFlows().implicit(flow);
  }

  private OAuthFlow createAuthorizationCodeFlow() {
    return new OAuthFlow()
        .authorizationUrl(issuer + "/protocol/openid-connect/auth")
        .scopes(new Scopes().addString("read_access", "read data")
            .addString("write_access", "modify data"));
  }
}