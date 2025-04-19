package com.gpt.springbonk.keycloak;


import com.gpt.springbonk.model.dto.response.KeycloakUserResponse;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.StandardClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
public class KeycloakController
{
    // MARK // The BFF tutorial API
    @GetMapping("/me")
    public UserInfoDto getMe(Authentication auth) {
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            final var email = (String) jwtAuth.getTokenAttributes()
                .getOrDefault(StandardClaimNames.EMAIL, "");
            final var roles = auth.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
            final var exp = Optional.ofNullable(jwtAuth.getTokenAttributes()
                .get(JwtClaimNames.EXP)).map(expClaim -> {
                if(expClaim instanceof Long lexp) {
                    return lexp;
                }
                if(expClaim instanceof Instant iexp) {
                    return iexp.getEpochSecond();
                }
                if(expClaim instanceof Date dexp) {
                    return dexp.toInstant().getEpochSecond();
                }
                return Long.MAX_VALUE;
            }).orElse(Long.MAX_VALUE);
            return new UserInfoDto(auth.getName(), email, roles, exp);
        }
        return UserInfoDto.ANONYMOUS;
    }

    /**
     * @param username a unique identifier for the resource owner in the token (sub claim by default)
     * @param email OpenID email claim
     * @param roles Spring authorities resolved for the authentication in the security context
     * @param exp seconds from 1970-01-01T00:00:00Z UTC until the specified UTC date/time when the access token expires
     */
    public static record UserInfoDto(String username, String email, List<String> roles, Long exp) {
        public static final UserInfoDto ANONYMOUS = new UserInfoDto("", "", List.of(), Long.MAX_VALUE);
    }

    // MARK // My old sync code.
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