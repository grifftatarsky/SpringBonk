package com.gpt.bonk_bff;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientProperties;

@SpringBootApplication
@EnableConfigurationProperties(OAuth2ClientProperties.class)
public class BonkBffApplication {

  public static void main(String[] args) {
    SpringApplication.run(BonkBffApplication.class, args);
  }
}
