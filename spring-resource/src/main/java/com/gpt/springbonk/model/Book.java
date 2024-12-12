package com.gpt.springbonk.model;

import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

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