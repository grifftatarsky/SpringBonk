package com.gpt.springbonk.controller;

import com.gpt.springbonk.model.dto.request.PostRequest;
import com.gpt.springbonk.model.dto.response.PostResponse;
import com.gpt.springbonk.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Blog")
@RequestMapping("post")
public class PostController {
  private final PostService postService;

  @GetMapping
  @Operation(summary = "List posts (newest first), optionally filtered by tag slug. Public.")
  public ResponseEntity<PagedModel<PostResponse>> listPosts(
      @RequestParam(required = false) String tag,
      Pageable pageable
  ) {
    Page<PostResponse> page = postService.listPosts(tag, pageable);
    return ResponseEntity.ok(new PagedModel<>(page));
  }

  @GetMapping("/{id}")
  @Operation(summary = "Get a single post by id. Public.")
  public ResponseEntity<PostResponse> getPost(@PathVariable UUID id) {
    return ResponseEntity.ok(postService.getPost(id));
  }

  @PostMapping
  @Operation(summary = "Create a post. Requires CREATE_POST.")
  public ResponseEntity<PostResponse> createPost(
      @Valid @RequestBody PostRequest request,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    return ResponseEntity.ok(postService.createPost(userId, request));
  }

  @PutMapping("/{id}")
  @Operation(summary = "Update an existing post. Requires EDIT_POST.")
  public ResponseEntity<PostResponse> updatePost(
      @PathVariable UUID id,
      @Valid @RequestBody PostRequest request
  ) {
    return ResponseEntity.ok(postService.updatePost(id, request));
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "Delete a post. Requires DELETE_POST.")
  public ResponseEntity<Void> deletePost(@PathVariable UUID id) {
    postService.deletePost(id);
    return ResponseEntity.noContent().build();
  }
}
