package com.gpt.springbonk.keycloak;


import com.gpt.springbonk.model.dto.response.KeycloakUserResponse;
import java.time.LocalDateTime;
import java.util.Map;
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

    private final KeycloakUserService keycloakUserService;

    @GetMapping("/sync")
    public KeycloakUserResponse syncUser(Authentication auth)
    {
        if (auth instanceof JwtAuthenticationToken jwtAuth)
        {
            Map<String, Object> attributes = jwtAuth.getTokenAttributes();

            final var subjectId = UUID.fromString(
                (String) attributes.getOrDefault(StandardClaimNames.SUB, "")
            );

            final var email = (String) attributes.getOrDefault(StandardClaimNames.EMAIL, "");
            final var username = (String) attributes.getOrDefault(StandardClaimNames.PREFERRED_USERNAME, "");
            final var lastName = (String) attributes.getOrDefault(StandardClaimNames.FAMILY_NAME, "");
            final var firstName = (String) attributes.getOrDefault(StandardClaimNames.GIVEN_NAME, "");

            // TODO: This does not work.
            final var roles = auth.getAuthorities()
                                  .stream()
                                  .map(GrantedAuthority::getAuthority)
                                  .toList();

            // This should validate a user is unique.
            // TODO: Fix. Right now, this is always returning a newUser, but luckily not creating a new one?
            KeycloakUser user = keycloakUserService.findUserById(subjectId)
                                                   .orElseGet(() -> {
                                                       KeycloakUser newUser = new KeycloakUser(
                                                           subjectId,
                                                           username,
                                                           firstName,
                                                           lastName,
                                                           roles,
                                                           email,
                                                           LocalDateTime.now(),
                                                           LocalDateTime.now()
                                                       );
                                                       return keycloakUserService.createUser(newUser);
                                                   });

            // Update last action for existing users
            if (user.getId() != null)
            {
                keycloakUserService.updateLastAction(user.getId());
            }

            return new KeycloakUserResponse(user);
        }

        return new KeycloakUserResponse(KeycloakUser.ANONYMOUS);
    }
}