package com.gpt.springbonk.keycloak;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

@Repository
public interface KeycloakUserRepository extends JpaRepository<KeycloakUser, UUID> {
  Optional<KeycloakUser> findKeycloakUserById(@NonNull UUID id);

  Optional<KeycloakUser> findByUsername(String username);

  boolean existsByUsername(String username);
}