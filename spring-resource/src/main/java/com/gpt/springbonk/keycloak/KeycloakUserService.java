package com.gpt.springbonk.keycloak;

import com.gpt.springbonk.model.dto.response.UserInfoResponse;
import java.util.UUID;
import org.springframework.security.core.Authentication;

public interface KeycloakUserService {
  UserInfoResponse getUserDetails(Authentication auth);

  KeycloakUser createUser(KeycloakUser user);

  KeycloakUser getUserById(UUID id);

  void updateLastAction(UUID userId);

  void deleteUser(UUID id);

  KeycloakUser updateUser(UUID id, KeycloakUser userDetails);

  void createDefaultShelf(String defaultShelfName, KeycloakUser user);
}
