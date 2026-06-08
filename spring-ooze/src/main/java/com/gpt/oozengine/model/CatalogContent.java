package com.gpt.oozengine.model;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Shared ownership for catalog content (spells, species, vocations, …).
 *
 * <p>{@code ownerId == null} marks base 5e content: loaded via Liquibase, shared
 * by everyone, and immutable. {@code ownerId} set marks a single user's private
 * content. A user never edits a base row in place — editing one copy-on-writes a
 * new owned row whose {@link #overridesId} points at the base row it shadows
 * (see the services). {@code overridesId == null} on an owned row means brand-new
 * user content rather than an override.
 *
 * <p>{@code overridesId} is a plain id column, not a JPA association: the target
 * is always the same table as the row itself, so a self-referencing FK is added
 * per table in Liquibase rather than modelled polymorphically here.
 */
@MappedSuperclass
@Getter
@Setter
public abstract class CatalogContent extends BaseEntity {

  @Column(name = "owner_id")
  private UUID ownerId;

  @Column(name = "overrides_id")
  private UUID overridesId;

  /** True for shared, unowned, immutable base content. */
  public boolean isBaseContent() {
    return ownerId == null;
  }
}
