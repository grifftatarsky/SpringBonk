package com.gpt.oozengine.repository;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.model.HiddenContent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HiddenContentRepository extends JpaRepository<HiddenContent, UUID> {

  List<HiddenContent> findByOwnerIdAndContentType(UUID ownerId, ContentType contentType);

  boolean existsByOwnerIdAndContentTypeAndBaseId(
      UUID ownerId, ContentType contentType, UUID baseId);

  void deleteByOwnerIdAndContentTypeAndBaseId(
      UUID ownerId, ContentType contentType, UUID baseId);
}
