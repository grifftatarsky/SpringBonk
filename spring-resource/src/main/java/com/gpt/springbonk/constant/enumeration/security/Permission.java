package com.gpt.springbonk.constant.enumeration.security;

/**
 * Fine-grained capabilities granted by one or more {@link Role}s.
 *
 * <p>Method-level @PreAuthorize checks reference these (not roles directly)
 * so a role's surface area can change without touching the call sites.
 */
public enum Permission {
  CREATE_POST,
  EDIT_POST,
  DELETE_POST
}
