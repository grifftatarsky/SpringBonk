package com.gpt.springbonk.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Free-form label attached to {@link Post}s. Many-to-many via the
 * {@code post_tags} join table managed from the {@link Post} side.
 *
 * <p>Slug is a lowercased, hyphenated form of the display label; it serves
 * as a stable, URL-safe key and has a unique constraint so the same tag
 * isn't created twice with different casing.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tags")
public class Tag {
  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "label", nullable = false)
  private String label;

  @Column(name = "slug", nullable = false, unique = true)
  private String slug;

  @CreationTimestamp
  @Column(name = "created_date", nullable = false, updatable = false)
  private LocalDateTime createdDate;

  @ManyToMany(mappedBy = "tags")
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Post> posts = new HashSet<>();

  public Tag(String label, String slug) {
    this.label = label;
    this.slug = slug;
  }
}
