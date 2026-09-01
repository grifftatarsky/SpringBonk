package com.gpt.jpss.security;

import com.c4_soft.springaddons.security.oidc.starter.synchronised.resourceserver.ResourceServerExpressionInterceptUrlRegistryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;

/**
 * Method-aware access rules for the sticker wall.
 *
 * <p>This exists because spring-addons' {@code resourceserver.permit-all}
 * property takes plain path patterns and applies them to every method — and here
 * one path has to be public to read and authenticated to write.
 * {@code /stickers} is the whole wall on GET and a new post on POST, so a single
 * pattern cannot express it. spring-addons hands the rest of the registry to
 * this post-processor, which is where the method actually gets to matter.
 *
 * <p>Row-level rules — you may only edit or delete your own sticker — are not
 * here. They are enforced in {@link com.gpt.jpss.sticker.StickerService}, since
 * no authority grants them.
 */
@Configuration
public class AccessConfig {

  @Bean
  ResourceServerExpressionInterceptUrlRegistryPostProcessor authorizePostProcessor() {
    return registry -> registry
        // The wall is public: readable without an account, and GET /stickers is
        // also the frontend's down-detector ping.
        .requestMatchers(HttpMethod.GET, "/stickers", "/stickers/*", "/stickers/*/image")
        .permitAll()
        .anyRequest()
        .authenticated();
  }
}
