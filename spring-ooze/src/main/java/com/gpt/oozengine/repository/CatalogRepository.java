package com.gpt.oozengine.repository;

import com.gpt.oozengine.model.CatalogContent;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

/**
 * Shared queries for any catalog content table. Each content type's repository
 * extends this with its concrete entity, inheriting the ownership lookups the
 * override logic needs (see {@code AbstractCatalogService}).
 */
@NoRepositoryBean
public interface CatalogRepository<E extends CatalogContent> extends JpaRepository<E, UUID> {

  /** Base, shared, unowned content. */
  List<E> findByOwnerIdIsNull();

  /** A user's own rows: their overrides and creations. */
  List<E> findByOwnerId(UUID ownerId);

  /** A user's override of a specific base row, if any. */
  Optional<E> findByOwnerIdAndOverridesId(UUID ownerId, UUID overridesId);
}
