package com.gpt.jpss.sticker.model;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * The bytes for one {@link Sticker}, in their own table so a wall listing never
 * touches them. The primary key <em>is</em> the sticker's id — there is no JPA
 * association, only the shared identifier (see {@link Sticker} for why).
 *
 * <p>Two renditions are stored, both re-encoded on upload: {@code data} is the
 * display image, capped on its long edge, and {@code thumbData} is the tile the
 * globe packs into its icon atlas. Serving the original upload back verbatim
 * would mean serving bytes we never decoded.
 */
@Entity
@Table(name = "sticker_image")
@Getter
@Setter
@NoArgsConstructor
public class StickerImage {

  /** Same value as the sticker's id; assigned, never generated. */
  @Id
  @Column(updatable = false, nullable = false)
  private UUID id;

  @Basic
  @Column(name = "data", nullable = false)
  private byte[] data;

  @Column(name = "content_type", nullable = false, length = 64)
  private String contentType;

  @Basic
  @Column(name = "thumb_data", nullable = false)
  private byte[] thumbData;

  @Column(name = "thumb_content_type", nullable = false, length = 64)
  private String thumbContentType;

  public StickerImage(UUID id) {
    this.id = id;
  }
}
