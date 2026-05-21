package com.gpt.springbonk.constant.enumeration.security;

import java.util.Arrays;
import java.util.Optional;
import java.util.Set;

/**
 * Application roles, carried by Keycloak in {@code realm_access.roles}.
 *
 * <p>Each role bundles a set of {@link Permission}s; the security layer
 * expands the role into both the role-name authority and the permission
 * authorities at JWT-conversion time, so @PreAuthorize checks can reference
 * the granular permission rather than the role.
 */
public enum Role {
  POST_ADMIN(Set.of(Permission.CREATE_POST, Permission.EDIT_POST, Permission.DELETE_POST));

  private final Set<Permission> permissions;

  Role(Set<Permission> permissions) {
    this.permissions = permissions;
  }

  public Set<Permission> getPermissions() {
    return permissions;
  }

  /** @return the role whose name matches {@code authority}, or empty if none. */
  public static Optional<Role> fromAuthority(String authority) {
    if (authority == null) return Optional.empty();
    return Arrays.stream(values())
        .filter(r -> r.name().equals(authority))
        .findFirst();
  }
}
