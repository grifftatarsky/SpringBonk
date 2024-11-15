package com.gpt.springbonk.security.keycloak;


import java.util.List;
import java.util.UUID;

public record KeycloakUserDTO(
    UUID userId,
    String username,
    String email,
    String lastName,
    String firstName,
    List<String> roles
)
{
    public static final KeycloakUserDTO ANONYMOUS = new KeycloakUserDTO(
        null,
        null,
        null,
        null,
        null,
        null
    );
}