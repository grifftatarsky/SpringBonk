package com.gpt.oozengine;

import org.springframework.boot.SpringApplication;

public class TestOozengineApplication {

    public static void main(String[] args) {
        SpringApplication.from(OozengineApplication::main).with(TestcontainersConfiguration.class).run(args);
    }

}
