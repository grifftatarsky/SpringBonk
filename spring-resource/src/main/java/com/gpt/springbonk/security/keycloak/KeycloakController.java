package com.gpt.springbonk.security.keycloak;


import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.StandardClaimNames;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
public class KeycloakController
{
    private final KeycloakUserRepository keycloakUserRepository;

    @GetMapping("/sync")
    public KeycloakUserDTO syncUser(Authentication auth)
    {
        if (auth instanceof JwtAuthenticationToken jwtAuth)
        {
            Map<String, Object> attributes = jwtAuth.getTokenAttributes();

            final var email = (String) attributes.getOrDefault(StandardClaimNames.EMAIL, "");

            final var subjectIdString = (String) attributes.getOrDefault(StandardClaimNames.SUB, "");
            final var subjectId = UUID.fromString(subjectIdString);

            final var username = (String) attributes.getOrDefault(StandardClaimNames.PREFERRED_USERNAME, "");

            final var lastName = (String) attributes.getOrDefault(StandardClaimNames.FAMILY_NAME, "");

            final var firstName = (String) attributes.getOrDefault(StandardClaimNames.GIVEN_NAME, "");

            // TODO: This does not work.
            final var roles = auth.getAuthorities()
                                  .stream()
                                  .map(GrantedAuthority::getAuthority)
                                  .toList();

            KeycloakUserDTO dto = new KeycloakUserDTO(
                subjectId,
                auth.getName(),
                email,
                lastName,
                firstName,
                roles
            );

            Optional<KeycloakUser> user = keycloakUserRepository.findKeycloakUserById(subjectId);

            if (user.isEmpty())
            {
                LocalDateTime now = LocalDateTime.now();
                KeycloakUser toCreate = new KeycloakUser(
                    subjectId,
                    username,
                    firstName,
                    lastName,
                    roles,
                    email,
                    now,
                    now
                );

                keycloakUserRepository.saveAndFlush(toCreate);
            } else
            {
                KeycloakUser toUpdate = user.get();
                toUpdate.setLastAction(LocalDateTime.now());
                keycloakUserRepository.saveAndFlush(toUpdate);
            }
            return dto;
        }
        return KeycloakUserDTO.ANONYMOUS;
    }
}