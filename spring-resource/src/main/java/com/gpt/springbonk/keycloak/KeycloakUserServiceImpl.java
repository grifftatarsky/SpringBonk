package com.gpt.springbonk.keycloak;

import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.model.Shelf;
import com.gpt.springbonk.model.dto.response.UserInfoResponse;
import com.gpt.springbonk.repository.ShelfRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.StandardClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

import static com.gpt.springbonk.constant.ShelfConstants.NOMINATIONS;
import static com.gpt.springbonk.constant.ShelfConstants.UNSHELVED;

@Service
@Transactional
@RequiredArgsConstructor
public class KeycloakUserServiceImpl implements KeycloakUserService {

  private final KeycloakUserRepository keycloakUserRepository;
  private final ShelfRepository shelfRepository;

  @Override
  public UserInfoResponse getUserDetails(Authentication auth) {
    if (auth instanceof JwtAuthenticationToken jwtAuth) {
      Map<String, Object> attributes = jwtAuth.getTokenAttributes();

      final var email = (String) attributes.getOrDefault(StandardClaimNames.EMAIL, "");

      // MARK // TODO: Look into if this works.
      final var roles = auth.getAuthorities()
          .stream()
          .map(GrantedAuthority::getAuthority)
          .toList();

      final var exp = Optional.ofNullable(attributes.get(JwtClaimNames.EXP)).map(expClaim -> {
        if (expClaim instanceof Long lexp) {
          return lexp;
        }

        if (expClaim instanceof Instant iexp) {
          return iexp.getEpochSecond();
        }

        if (expClaim instanceof Date dexp) {
          return dexp.toInstant().getEpochSecond();
        }

        return Long.MAX_VALUE;
      }).orElse(Long.MAX_VALUE);

      UUID userSubject = UUID.fromString(
          (String) attributes.getOrDefault(StandardClaimNames.SUB, "")
      );
      final var preferredUsername =
          (String) attributes.getOrDefault(StandardClaimNames.PREFERRED_USERNAME, auth.getName());

      // MARK // NOTE: Here, we sync the authenticated user to our PG database.
      try {
        updateLastAction(userSubject);
      } catch (ResourceNotFoundException e) {
        // MARK // NOTE: This e means we haven't synced them before.
        final var username = preferredUsername;
        final var lastName = (String) attributes.getOrDefault(StandardClaimNames.FAMILY_NAME, "");
        final var firstName = (String) attributes.getOrDefault(StandardClaimNames.GIVEN_NAME, "");
        LocalDateTime now = LocalDateTime.now();

        createUser(new KeycloakUser(
            userSubject,
            username,
            firstName,
            lastName,
            roles,
            email,
            now,
            now
        ));
      }

      return new UserInfoResponse(userSubject, preferredUsername, email, roles, exp);
    }
    // MARK // NOTE: This returns an "anon" non-authenticated empty user.
    return UserInfoResponse.ANONYMOUS;
  }

  @Override
  public KeycloakUser createUser(
      @NotNull KeycloakUser user
  ) {
    user.setCreated(LocalDateTime.now());
    user.setLastAction(LocalDateTime.now());

    KeycloakUser savedUser = keycloakUserRepository.save(user);

    createDefaultShelf(UNSHELVED, savedUser);
    createDefaultShelf(NOMINATIONS, savedUser);

    return savedUser;
  }

  @Override
  public KeycloakUser getUserById(
      @NotNull UUID id
  ) {
    return keycloakUserRepository.findById(id).orElseThrow(
        () -> new ResourceNotFoundException("User not found with id: " + id)
    );
  }

  @Override
  public void updateLastAction(
      @NotNull UUID userId
  ) {
    KeycloakUser user = getUserById(userId);
    user.setLastAction(LocalDateTime.now());
    keycloakUserRepository.save(user);
  }

  // UTILITY ONLY.
  // Users are stored and managed in keycloak.
  // This would not truly delete a user.
  @Override
  public void deleteUser(
      @NotNull UUID id
  ) {
    KeycloakUser user = getUserById(id);
    // The cascade on the user-shelf relationship will handle shelf deletion
    keycloakUserRepository.delete(user);
  }

  // UTILITY ONLY.
  // As per delete, this would not modify a user.
  // However, we could call this on login to update their details from any changes in the app.
  @Override
  public KeycloakUser updateUser(
      @NotNull UUID id,
      @NotNull KeycloakUser userDetails
  ) {
    KeycloakUser user = getUserById(id);

    user.setUsername(userDetails.getUsername());
    user.setFirstName(userDetails.getFirstName());
    user.setLastName(userDetails.getLastName());
    user.setEmail(userDetails.getEmail());
    user.setRoles(userDetails.getRoles());
    user.setLastAction(LocalDateTime.now());

    return keycloakUserRepository.save(user);
  }

  // NOTE: This shouldn't be used outside of this class unless a special situation.
  // A user's shelves should be non-default.
  @Override
  public void createDefaultShelf(
      @NotNull String defaultShelfName,
      @NotNull KeycloakUser user
  ) {
    Shelf defaultShelf = new Shelf(defaultShelfName);
    defaultShelf.setUser(user);
    defaultShelf.setDefaultShelf(true);
    shelfRepository.saveAndFlush(defaultShelf);
  }
}
