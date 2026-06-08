package com.gpt.oozengine.controller;

import com.gpt.oozengine.service.AbstractCatalogService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * Shared REST surface for catalog content. Concrete controllers add
 * {@code @RestController} + {@code @RequestMapping("<path>")} and supply the
 * service; Spring resolves the generic {@code REQ} body type and inherits these
 * mappings from the subclass. Reads are public (permit-all in config); writes
 * require {@code MANAGE_CONTENT} and only touch the caller's own content.
 */
public abstract class AbstractCatalogController<REQ, RES> {

  protected abstract AbstractCatalogService<?, REQ, RES> service();

  @GetMapping
  public List<RES> list(@AuthenticationPrincipal Jwt jwt) {
    return service().list(userId(jwt));
  }

  @GetMapping("/{id}")
  public RES get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return service().get(id, userId(jwt));
  }

  @PostMapping
  @PreAuthorize("hasAuthority('MANAGE_CONTENT')")
  public ResponseEntity<RES> create(@Valid @RequestBody REQ req, @AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.ok(service().create(req, requireUserId(jwt)));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('MANAGE_CONTENT')")
  public RES update(
      @PathVariable UUID id, @Valid @RequestBody REQ req, @AuthenticationPrincipal Jwt jwt) {
    return service().update(id, req, requireUserId(jwt));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('MANAGE_CONTENT')")
  public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    service().delete(id, requireUserId(jwt));
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/revert")
  @PreAuthorize("hasAuthority('MANAGE_CONTENT')")
  public RES revert(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return service().revert(id, requireUserId(jwt));
  }

  @PostMapping("/{id}/hide")
  @PreAuthorize("hasAuthority('MANAGE_CONTENT')")
  public ResponseEntity<Void> hide(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    service().hide(id, requireUserId(jwt));
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/{id}/hide")
  @PreAuthorize("hasAuthority('MANAGE_CONTENT')")
  public ResponseEntity<Void> unhide(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    service().unhide(id, requireUserId(jwt));
    return ResponseEntity.noContent().build();
  }

  protected static UUID userId(Jwt jwt) {
    return jwt == null ? null : UUID.fromString(jwt.getSubject());
  }

  protected static UUID requireUserId(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
  }
}
