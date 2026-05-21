package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.keycloak.KeycloakUser;
import com.gpt.springbonk.keycloak.KeycloakUserService;
import com.gpt.springbonk.model.Post;
import com.gpt.springbonk.model.Tag;
import com.gpt.springbonk.model.dto.request.PostRequest;
import com.gpt.springbonk.model.dto.response.PostResponse;
import com.gpt.springbonk.repository.PostRepository;
import com.gpt.springbonk.service.PostService;
import com.gpt.springbonk.service.TagService;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class PostServiceImpl implements PostService {
  private final PostRepository postRepository;
  private final TagService tagService;
  private final KeycloakUserService keycloakUserService;

  @Override
  @PreAuthorize("hasAuthority('CREATE_POST')")
  public PostResponse createPost(@NotNull UUID authorId, @NotNull PostRequest request) {
    KeycloakUser author = keycloakUserService.getUserById(authorId);
    Post post = new Post(author, request.title(), request.body());
    post.setTags(new LinkedHashSet<>(tagService.resolveOrCreate(request.tagLabels())));
    Post saved = postRepository.saveAndFlush(post);
    log.info("[PostService] user={} created post {}", authorId, saved.getId());
    return new PostResponse(saved);
  }

  @Override
  @PreAuthorize("hasAuthority('EDIT_POST')")
  public PostResponse updatePost(@NotNull UUID postId, @NotNull PostRequest request) {
    Post post = getOrThrow(postId);
    post.setTitle(request.title());
    post.setBody(request.body());
    Set<Tag> nextTags = new LinkedHashSet<>(tagService.resolveOrCreate(request.tagLabels()));
    post.getTags().clear();
    post.getTags().addAll(nextTags);
    Post saved = postRepository.saveAndFlush(post);
    return new PostResponse(saved);
  }

  @Override
  @PreAuthorize("hasAuthority('DELETE_POST')")
  public void deletePost(@NotNull UUID postId) {
    Post post = getOrThrow(postId);
    postRepository.delete(post);
  }

  @Override
  public PostResponse getPost(@NotNull UUID postId) {
    return new PostResponse(getOrThrow(postId));
  }

  @Override
  public Page<PostResponse> listPosts(String tagSlug, @NotNull Pageable pageable) {
    Page<Post> page = (tagSlug == null || tagSlug.isBlank())
        ? postRepository.findAllByOrderByCreatedDateDesc(pageable)
        : postRepository.findByTags_SlugOrderByCreatedDateDesc(tagSlug, pageable);
    return page.map(PostResponse::new);
  }

  private Post getOrThrow(UUID postId) {
    return postRepository.findById(postId)
        .orElseThrow(() -> new ResourceNotFoundException("Post does not exist."));
  }
}
