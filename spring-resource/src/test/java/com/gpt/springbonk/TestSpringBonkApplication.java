package com.gpt.springbonk;


import org.springframework.boot.SpringApplication;

public class TestSpringBonkApplication
{
    public static void main(String[] args)
    {
        SpringApplication.from(SpringBonkApplication::main).with(TestcontainersConfiguration.class).run(args);
    }
}
