package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.constant.ProfileAvatar;
import java.util.List;
import java.util.UUID;

/**
 * @param id       the subject/UUID for the authenticated user (from token sub)
 * @param username a human-friendly username (preferred_username when available)
 * @param email    OpenID email claim
 * @param roles    Spring authorities resolved for the authentication in the security context
 * @param exp      seconds from 1970-01-01T00:00:00Z UTC until the specified UTC date/time when the access token expires
 */
public record UserInfoResponse(UUID id, String username, String email, List<String> roles,
                               Long exp, ProfileAvatar avatar) {
  public static final UserInfoResponse ANONYMOUS =
      new UserInfoResponse(new UUID(0L, 0L), "", "", List.of(), Long.MAX_VALUE, ProfileAvatar.BOOKLING_EMERALD);
}
