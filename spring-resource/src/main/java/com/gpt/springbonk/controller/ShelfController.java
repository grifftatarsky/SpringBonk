package com.gpt.springbonk.controller;

import com.gpt.springbonk.model.dto.request.ShelfRequest;
import com.gpt.springbonk.model.dto.response.ShelfResponse;
import com.gpt.springbonk.service.ShelfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.ResponseEntity;
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

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Shelf Suite")
@RequestMapping("shelf")
public class ShelfController {

  private final ShelfService shelfService;

  @PostMapping()
  @Operation(summary = "Create a new shelf")
  public ResponseEntity<ShelfResponse> createShelf(
      @RequestBody ShelfRequest shelfRequest,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    ShelfResponse createdShelf = shelfService.createShelf(shelfRequest, userId);
    return ResponseEntity.ok(createdShelf);
  }

  @GetMapping
  @Operation(summary = "Get shelves (paged)")
  public ResponseEntity<PagedModel<ShelfResponse>> getPagedShelves(
      Pageable pageable,
      PagedResourcesAssembler assembler
  ) {
    Page<ShelfResponse> elections = shelfService.getPagedShelves(pageable);
    return ResponseEntity.ok(assembler.toModel(elections));
  }

  @GetMapping("/all")
  @Operation(summary = "Get all shelves for the current user (unpaged)")
  public ResponseEntity<List<ShelfResponse>> getUserShelves(
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    List<ShelfResponse> shelves = shelfService.getAllUserShelves(userId);
    return ResponseEntity.ok(shelves);
  }

  @GetMapping("/{id}")
  @Operation(summary = "Get an existing shelf by ID")
  public ResponseEntity<ShelfResponse> getShelfById(
      @PathVariable UUID id,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    ShelfResponse shelf = shelfService.getOneShelf(id, userId);
    return ResponseEntity.ok(shelf);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Update an existing shelf")
  public ResponseEntity<ShelfResponse> updateShelf(
      @PathVariable UUID id,
      @RequestBody ShelfRequest shelfUpdateRequest,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    ShelfResponse updatedShelf = shelfService.updateShelf(id, shelfUpdateRequest, userId);
    return ResponseEntity.ok(updatedShelf);
  }

  @DeleteMapping("/{id}/books")
  @Operation(summary = "Remove all books from an existing shelf")
  public ResponseEntity<Void> removeAllBooksFromShelf(
      @PathVariable UUID id,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    shelfService.removeAllBooksFromShelf(id, userId);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "Delete an existing shelf")
  public ResponseEntity<Void> deleteShelf(
      @PathVariable UUID id,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    shelfService.deleteShelf(id, userId);
    return ResponseEntity.noContent().build();
  }
}