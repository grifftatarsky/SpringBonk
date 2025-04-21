package com.gpt.springbonk.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
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

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "books")
public class Book {
  @Id
  @GeneratedValue
  private UUID id;

  @Column
  private String googleID;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false)
  private String author;

  @Column(name = "image_url")
  private String imageURL;

  @Column(columnDefinition = "TEXT")
  private String blurb;

  @CreationTimestamp
  @Column(name = "created_date", nullable = false, updatable = false)
  private LocalDateTime createdDate;

  @ManyToMany
  @JoinTable(
      name = "book_shelf",
      joinColumns = @JoinColumn(name = "book_id"),
      inverseJoinColumns = @JoinColumn(name = "shelf_id")
  )
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Shelf> shelves = new HashSet<>();

  public Book(String title, String author) {
    this.title = title;
    this.author = author;
  }

  public Book(String title, String author, String imageURL, String blurb, String googleID) {
    this.title = title;
    this.author = author;
    this.imageURL = imageURL;
    this.blurb = blurb;
    this.googleID = googleID;
  }
}