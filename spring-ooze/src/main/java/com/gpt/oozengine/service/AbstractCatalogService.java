package com.gpt.oozengine.service;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.model.CatalogContent;
import com.gpt.oozengine.model.HiddenContent;
import com.gpt.oozengine.repository.CatalogRepository;
import com.gpt.oozengine.repository.HiddenContentRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * The per-user override mechanics shared by every catalog content type. Base
 * rows (ownerId null) are shared and immutable; editing one copy-on-writes the
 * caller's owned override (overridesId → base), "revert" deletes that override,
 * and hiding is recorded in {@code hidden_content} rather than copied.
 *
 * <p>Subclasses supply the repository, content type, and the entity↔DTO mapping;
 * all the ownership/visibility rules live here so they can't drift per type.
 *
 * @param <E> the content entity
 * @param <REQ> create/update payload
 * @param <RES> response DTO
 */
public abstract class AbstractCatalogService<E extends CatalogContent, REQ, RES> {

  protected abstract CatalogRepository<E> repo();

  protected abstract HiddenContentRepository hiddenRepo();

  protected abstract ContentType contentType();

  protected abstract E instantiate();

  protected abstract void apply(REQ req, E entity);

  protected abstract RES toResponse(E entity);

  /**
   * The shape a row takes in a list, which need not be the shape it takes on its
   * own. Defaults to the full response; a type whose detail is large — a
   * creature carries its whole stat block — overrides this to leave the heavy
   * part out, and the client fetches it per row when one is opened.
   */
  protected RES toListResponse(E entity) {
    return toResponse(entity);
  }

  protected abstract Comparator<E> listOrder();

  /** Base content with the caller's overrides swapped in, hidden/overridden
   * bases removed, plus their creations. {@code userId == null} ⇒ base only. */
  @Transactional(readOnly = true)
  public List<RES> list(UUID userId) {
    List<E> base = repo().findByOwnerIdIsNull();
    List<E> visible = new ArrayList<>();
    if (userId == null) {
      visible.addAll(base);
    } else {
      List<E> mine = repo().findByOwnerId(userId);
      Set<UUID> overridden =
          mine.stream()
              .map(CatalogContent::getOverridesId)
              .filter(Objects::nonNull)
              .collect(Collectors.toSet());
      Set<UUID> hiddenIds =
          hiddenRepo().findByOwnerIdAndContentType(userId, contentType()).stream()
              .map(HiddenContent::getBaseId)
              .collect(Collectors.toSet());
      for (E b : base) {
        if (!overridden.contains(b.getId()) && !hiddenIds.contains(b.getId())) {
          visible.add(b);
        }
      }
      visible.addAll(mine);
    }
    return visible.stream().sorted(listOrder()).map(this::toListResponse).toList();
  }

  @Transactional(readOnly = true)
  public RES get(UUID id, UUID userId) {
    return toResponse(readable(id, userId));
  }

  @Transactional
  public RES create(REQ req, UUID userId) {
    E e = instantiate();
    apply(req, e);
    e.setOwnerId(userId);
    e.setOverridesId(null);
    return toResponse(repo().save(e));
  }

  @Transactional
  public RES update(UUID id, REQ req, UUID userId) {
    E e = repo().findById(id).orElseThrow(AbstractCatalogService::notFound);
    if (e.isBaseContent()) {
      // Copy-on-write: edit (or create) this user's override of the base row.
      E override = repo().findByOwnerIdAndOverridesId(userId, id).orElseGet(this::instantiate);
      apply(req, override);
      override.setOwnerId(userId);
      override.setOverridesId(id);
      // The override is still that edition's content, so it follows the base
      // row when a reader filters editions. apply() can't set this — the
      // request DTOs carry no SRD version, deliberately: a DM edits rules text,
      // not which book the rules came from.
      override.setSrdVersion(e.getSrdVersion());
      return toResponse(repo().save(override));
    }
    if (!userId.equals(e.getOwnerId())) {
      throw forbidden();
    }
    apply(req, e);
    return toResponse(repo().save(e));
  }

  @Transactional
  public RES revert(UUID baseId, UUID userId) {
    repo().findByOwnerIdAndOverridesId(userId, baseId).ifPresent(repo()::delete);
    E base =
        repo().findById(baseId).filter(CatalogContent::isBaseContent).orElseThrow(AbstractCatalogService::notFound);
    return toResponse(base);
  }

  @Transactional
  public void delete(UUID id, UUID userId) {
    E e = repo().findById(id).orElseThrow(AbstractCatalogService::notFound);
    if (e.isBaseContent() || !userId.equals(e.getOwnerId())) {
      throw forbidden();
    }
    repo().delete(e);
  }

  @Transactional
  public void hide(UUID baseId, UUID userId) {
    repo().findById(baseId).filter(CatalogContent::isBaseContent).orElseThrow(AbstractCatalogService::notFound);
    if (!hiddenRepo().existsByOwnerIdAndContentTypeAndBaseId(userId, contentType(), baseId)) {
      HiddenContent h = new HiddenContent();
      h.setOwnerId(userId);
      h.setContentType(contentType());
      h.setBaseId(baseId);
      hiddenRepo().save(h);
    }
  }

  @Transactional
  public void unhide(UUID baseId, UUID userId) {
    hiddenRepo().deleteByOwnerIdAndContentTypeAndBaseId(userId, contentType(), baseId);
  }

  /** A row is readable if it's base content or owned by the caller. */
  protected E readable(UUID id, UUID userId) {
    E e = repo().findById(id).orElseThrow(AbstractCatalogService::notFound);
    if (e.isBaseContent() || (userId != null && userId.equals(e.getOwnerId()))) {
      return e;
    }
    throw notFound();
  }

  protected static ResponseStatusException notFound() {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
  }

  protected static ResponseStatusException forbidden() {
    return new ResponseStatusException(HttpStatus.FORBIDDEN, "That content isn't yours to change");
  }
}
