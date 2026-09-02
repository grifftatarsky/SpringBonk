package com.gpt.jpss.sticker.model;

import com.gpt.jpss.keycloak.KeycloakUser;
import com.gpt.jpss.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One photo pinned to the globe: where it was placed, who placed it, and what
 * they said about it.
 *
 * <p>The bytes deliberately live in {@link StickerImage}, a separate table keyed
 * by this row's id, and there is no JPA association between the two. A mapped
 * {@code @OneToOne} on the inverse side cannot be lazy without bytecode
 * enhancement — Hibernate has to fetch it just to decide whether it is null — so
 * mapping it here would drag every photo into memory on every wall listing.
 * {@link com.gpt.jpss.sticker.StickerService} loads and deletes the image row
 * explicitly instead.
 */
@Entity
@Table(name = "sticker")
@Getter
@Setter
@NoArgsConstructor
public class Sticker extends BaseEntity {

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "author_id", nullable = false)
  private KeycloakUser author;

  /** WGS84 degrees, -90..90. */
  @Column(nullable = false)
  private double latitude;

  /** WGS84 degrees, -180..180. */
  @Column(nullable = false)
  private double longitude;

  /** What the author had to say, if anything. Free text, shown verbatim. */
  @Column(name = "comment", length = 500)
  private String comment;

  /** Optional human label for the spot ("Prospect Park"), typed by the author. */
  @Column(name = "place", length = 80)
  private String place;

  /** Media type of the stored full-size image, e.g. {@code image/jpeg}. */
  @Column(name = "image_content_type", nullable = false, length = 64)
  private String imageContentType;

  @Column(name = "image_width", nullable = false)
  private int imageWidth;

  @Column(name = "image_height", nullable = false)
  private int imageHeight;

  public Sticker(KeycloakUser author, double latitude, double longitude, String comment, String place) {
    this.author = author;
    this.latitude = latitude;
    this.longitude = longitude;
    this.comment = comment;
    this.place = place;
  }
}
