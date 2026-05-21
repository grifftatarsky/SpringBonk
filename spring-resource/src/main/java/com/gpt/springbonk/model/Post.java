package com.gpt.springbonk.model;

import com.gpt.springbonk.keycloak.KeycloakUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
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
import org.hibernate.annotations.UpdateTimestamp;

/**
 * A blog post authored by a POST_ADMIN user, written in markdown.
 *
 * <p>Body is stored as raw markdown; rendering happens client-side after
 * sanitization. Access is gated by {@link
 * com.gpt.springbonk.constant.enumeration.security.Permission} at the
 * service layer — read endpoints are public, writes require CREATE_POST /
 * EDIT_POST / DELETE_POST.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "posts")
public class Post {
  @Id
  @GeneratedValue
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "author_id", nullable = false)
  private KeycloakUser author;

  @Column(name = "title", nullable = false)
  private String title;

  @Column(name = "body", nullable = false, columnDefinition = "TEXT")
  private String body;

  @CreationTimestamp
  @Column(name = "created_date", nullable = false, updatable = false)
  private LocalDateTime createdDate;

  @UpdateTimestamp
  @Column(name = "updated_date", nullable = false)
  private LocalDateTime updatedDate;

  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
      name = "post_tags",
      joinColumns = @JoinColumn(name = "post_id"),
      inverseJoinColumns = @JoinColumn(name = "tag_id")
  )
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Tag> tags = new HashSet<>();

  public Post(KeycloakUser author, String title, String body) {
    this.author = author;
    this.title = title;
    this.body = body;
  }
}
