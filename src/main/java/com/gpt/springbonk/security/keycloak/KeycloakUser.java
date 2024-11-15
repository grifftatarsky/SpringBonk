package com.gpt.springbonk.security.keycloak;


import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "keycloak_user")
public class KeycloakUser {
    @Id
    private UUID id;
    @Column
    private String username;
    @Column
    private String firstName;
    @Column
    private String lastName;
    @ElementCollection
    private List<String> roles;
    @Column
    private String email;
    @Column
    private LocalDateTime created;
    @Column
    private LocalDateTime lastAction;
}
