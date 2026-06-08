package com.gpt.oozengine.controller;

import com.gpt.oozengine.model.dto.request.CharacterRequest;
import com.gpt.oozengine.model.dto.response.CharacterResponse;
import com.gpt.oozengine.service.CharacterService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Characters are private to each user: reads are scoped to the caller (anonymous
 * sees none), and writes need {@code MANAGE_CONTENT} plus ownership.
 */
@RestController
@RequestMapping("character")
@RequiredArgsConstructor
@Tag(name = "Characters")
public class CharacterController {

  private final CharacterService characterService;

  @GetMapping
  public List<CharacterResponse> list(@AuthenticationPrincipal Jwt jwt) {
    return characterService.list(userId(jwt));
  }

  @GetMapping("/{id}")
  public CharacterResponse get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return characterService.get(id, userId(jwt));
  }

  @PostMapping
  @PreAuthorize("hasAuthority('MANAGE_CONTENT')")
  public ResponseEntity<CharacterResponse> create(
      @Valid @RequestBody CharacterRequest req, @AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.ok(characterService.create(req, requireUserId(jwt)));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('MANAGE_CONTENT')")
  public CharacterResponse update(
      @PathVariable UUID id,
      @Valid @RequestBody CharacterRequest req,
      @AuthenticationPrincipal Jwt jwt) {
    return characterService.update(id, req, requireUserId(jwt));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('MANAGE_CONTENT')")
  public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    characterService.delete(id, requireUserId(jwt));
    return ResponseEntity.noContent().build();
  }

  private static UUID userId(Jwt jwt) {
    return jwt == null ? null : UUID.fromString(jwt.getSubject());
  }

  private static UUID requireUserId(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
  }
}
