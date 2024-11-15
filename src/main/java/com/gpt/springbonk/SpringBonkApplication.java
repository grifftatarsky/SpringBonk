package com.gpt.springbonk;


import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class SpringBonkApplication
{

    public static void main(String[] args)
    {
        SpringApplication.run(SpringBonkApplication.class, args);
    }
}
