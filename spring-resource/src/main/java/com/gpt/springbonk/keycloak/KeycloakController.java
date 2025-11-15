package com.gpt.springbonk.keycloak;

import com.gpt.springbonk.constant.ProfileAvatar;
import com.gpt.springbonk.model.dto.request.AvatarUpdateRequest;
import com.gpt.springbonk.model.dto.response.UserInfoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.StandardClaimNames;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "User Suite")
@RequestMapping("user")
public class KeycloakController {
  private final KeycloakUserService keycloakUserService;

  @GetMapping("/details")
  @Operation(summary = "Provide user details for an authenticated user and sync to Resource DB")
  public UserInfoResponse getDetails(Authentication auth) {
    return keycloakUserService.getUserDetails(auth);
  }

  @PutMapping("/avatar")
  @Operation(summary = "Update the selected profile avatar for the authenticated user")
  public UserInfoResponse updateAvatar(@RequestBody AvatarUpdateRequest request, Authentication auth) {
    UUID userId = resolveUserId(auth);
    ProfileAvatar nextAvatar = request.avatar();
    keycloakUserService.updateAvatar(userId, nextAvatar);
    return keycloakUserService.getUserDetails(auth);
  }

  private UUID resolveUserId(Authentication auth) {
    if (auth instanceof JwtAuthenticationToken jwtAuth) {
      Object subject = jwtAuth.getTokenAttributes().get(StandardClaimNames.SUB);
      if (subject instanceof String subjectValue && !subjectValue.isBlank()) {
        return UUID.fromString(subjectValue);
      }
    }
    try {
      return UUID.fromString(auth.getName());
    } catch (IllegalArgumentException ignored) {
      return keycloakUserService.getUserDetails(auth).id();
    }
  }
}
