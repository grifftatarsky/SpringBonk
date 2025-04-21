package com.gpt.springbonk.controller;

import com.gpt.springbonk.model.dto.request.BookRequest;
import com.gpt.springbonk.model.dto.response.BookResponse;
import com.gpt.springbonk.service.BookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Book Suite")
@RequestMapping("book")
public class BookController {

  private final BookService bookService;

  @PostMapping
  @Operation(summary = "Create a new book")
  public ResponseEntity<BookResponse> createBook(
      @RequestBody BookRequest bookRequest,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    BookResponse createdBook = bookService.createBook(bookRequest, userId);
    return ResponseEntity.ok(createdBook);
  }

  @GetMapping("/all")
  @Operation(summary = "Get all available books (unpaged)")
  public ResponseEntity<List<BookResponse>> getAllBooks() {
    List<BookResponse> books = bookService.getAllBooks();
    return ResponseEntity.ok(books);
  }

  @GetMapping("/{id}")
  @Operation(summary = "Get an existing book by ID")
  public ResponseEntity<BookResponse> getBookById(@PathVariable UUID id) {
    BookResponse book = bookService.getOneBook(id);
    return ResponseEntity.ok(book);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Update an existing book")
  public ResponseEntity<BookResponse> updateBook(
      @PathVariable UUID id,
      @RequestBody BookRequest bookUpdateRequest,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    BookResponse updatedBook = bookService.updateBook(id, bookUpdateRequest, userId);
    return ResponseEntity.ok(updatedBook);
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "Delete an existing book")
  public ResponseEntity<Void> deleteBook(
      @PathVariable UUID id,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    bookService.deleteBook(id, userId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/shelf/{shelfId}/all")
  @Operation(summary = "Get all books on a shelf by shelf ID")
  public ResponseEntity<List<BookResponse>> getBooksByShelfId(
      @PathVariable UUID shelfId,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    List<BookResponse> books = bookService.getBooksByShelfId(shelfId, userId);
    return ResponseEntity.ok(books);
  }

  @PutMapping("/{bookId}/shelf/{shelfId}")
  @Operation(summary = "Add an existing book to a new shelf")
  public ResponseEntity<BookResponse> addBookToShelf(
      @PathVariable UUID bookId,
      @PathVariable UUID shelfId,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    BookResponse updatedBook = bookService.addBookToShelf(bookId, shelfId, userId);
    return ResponseEntity.ok(updatedBook);
  }

  @DeleteMapping("/{bookId}/shelf/{shelfId}")
  @Operation(summary = "Remove an existing book from a shelf")
  public ResponseEntity<BookResponse> removeBookFromShelf(
      @PathVariable UUID bookId,
      @PathVariable UUID shelfId,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    BookResponse updatedBook = bookService.removeBookFromShelf(bookId, shelfId, userId);
    return ResponseEntity.ok(updatedBook);
  }

  @GetMapping("/{googleId}/shelves")
  @Operation(summary = "Get a book's shelfIds by GoogleId")
  public ResponseEntity<List<UUID>> getShelfIdsByBookGoogleId(
      @PathVariable String googleId,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    List<UUID> shelfIds = bookService.getShelfIdsByBookGoogleId(googleId, userId);
    return ResponseEntity.ok(shelfIds);
  }
}