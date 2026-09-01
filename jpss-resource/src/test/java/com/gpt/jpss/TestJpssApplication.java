package com.gpt.jpss;

import org.springframework.boot.SpringApplication;

/** Runs the service locally against a Testcontainers Postgres instead of the shared one. */
public class TestJpssApplication {

  public static void main(String[] args) {
    SpringApplication.from(JpssApplication::main).with(TestcontainersConfiguration.class).run(args);
  }
}
