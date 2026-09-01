package com.gpt.jpss.keycloak;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface KeycloakUserRepository extends JpaRepository<KeycloakUser, UUID> {
}
