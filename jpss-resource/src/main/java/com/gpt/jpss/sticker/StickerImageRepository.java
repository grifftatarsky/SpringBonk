package com.gpt.jpss.sticker;

import com.gpt.jpss.sticker.model.StickerImage;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface StickerImageRepository extends JpaRepository<StickerImage, UUID> {

  /**
   * One rendition of one photo, plus the timestamp the ETag is built from.
   *
   * <p>A projection rather than the entity because the two renditions live in
   * the same row: loading {@link StickerImage} to serve a thumbnail drags the
   * full-size bytes along with it and throws them away. The sidebar asks for
   * both — the thumbnail as a blur-up placeholder behind the full image — so
   * every sticker that gets opened was moving the large rendition twice.
   */
  interface Rendition {
    byte[] getBytes();

    String getContentType();

    Instant getUpdatedAt();
  }

  /**
   * The sticker is joined on id rather than through an association: the two are
   * deliberately unassociated so a wall listing cannot drag photo bytes with it.
   * Joining here is what lets one query answer both "which bytes" and "how stale".
   */
  @Query("""
      select i.data as bytes, i.contentType as contentType, s.updatedAt as updatedAt
      from StickerImage i, Sticker s
      where i.id = :id and s.id = i.id
      """)
  Optional<Rendition> findFull(UUID id);

  @Query("""
      select i.thumbData as bytes, i.thumbContentType as contentType, s.updatedAt as updatedAt
      from StickerImage i, Sticker s
      where i.id = :id and s.id = i.id
      """)
  Optional<Rendition> findThumbnail(UUID id);
}
