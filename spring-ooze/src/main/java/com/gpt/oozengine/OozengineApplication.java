package com.gpt.oozengine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/// Enables JPA auditing so {@link com.gpt.oozengine.model.BaseEntity}'s
/// {@code @CreatedDate} / {@code @LastModifiedDate} fields are populated.
@EnableJpaAuditing
@SpringBootApplication
public class OozengineApplication {

    public static void main(String[] args) {
        SpringApplication.run(OozengineApplication.class, args);
    }

}
