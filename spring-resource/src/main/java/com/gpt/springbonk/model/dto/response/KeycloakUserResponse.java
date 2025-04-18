package com.gpt.springbonk.model.dto.response;


import com.gpt.springbonk.keycloak.KeycloakUser;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Data;

@Data
public class KeycloakUserResponse
{
    private UUID id;
    private String username;
    private String firstName;
    private String lastName;
    private List<String> roles;
    private String email;
    private LocalDateTime created;
    private LocalDateTime lastAction;

    public KeycloakUserResponse(KeycloakUser user)
    {
        this.id = user.getId();
        this.username = user.getUsername();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.roles = user.getRoles();
        this.email = user.getEmail();
        this.created = user.getCreated();
        this.lastAction = user.getLastAction();
    }
}