package com.gpt.oozengine.constant.security;

/**
 * Fine-grained capabilities granted by one or more {@link Role}s.
 *
 * <p>Method-level {@code @PreAuthorize} checks reference these (not roles
 * directly) so a role's surface area can change without touching call sites.
 */
public enum Permission {
  /** Create, edit, or delete catalog content (the DM's private catalog). */
  MANAGE_CONTENT
}
