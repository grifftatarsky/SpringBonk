package com.gpt.springbonk.model;

import com.gpt.springbonk.keycloak.KeycloakUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
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

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "shelves")
public class Shelf {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(nullable = false)
  private String title;

  @CreationTimestamp
  @Column(name = "created_date", nullable = false, updatable = false)
  private LocalDateTime createdDate;

  @ManyToMany(mappedBy = "shelves")
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Book> books = new HashSet<>();

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private KeycloakUser user;

  @Column(nullable = false)
  private boolean defaultShelf = false;

  public Shelf(String title) {
    this.title = title;
  }

  public void addBook(Book book) {
    books.add(book);
    book.getShelves().add(this);
  }

  public void removeBook(Book book) {
    books.remove(book);
    book.getShelves().remove(this);
  }
}