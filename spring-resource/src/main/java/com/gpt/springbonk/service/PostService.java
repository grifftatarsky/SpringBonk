package com.gpt.springbonk.service;

import com.gpt.springbonk.model.dto.request.PostRequest;
import com.gpt.springbonk.model.dto.response.PostResponse;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PostService {
  PostResponse createPost(UUID authorId, PostRequest request);

  PostResponse updatePost(UUID postId, PostRequest request);

  void deletePost(UUID postId);

  PostResponse getPost(UUID postId);

  /** {@code tagSlug} may be null for "all posts". */
  Page<PostResponse> listPosts(String tagSlug, Pageable pageable);
}
