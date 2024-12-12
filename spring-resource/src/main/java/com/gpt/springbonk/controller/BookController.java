package com.gpt.springbonk.controller;

import com.gpt.springbonk.model.dto.request.BookRequest;
import com.gpt.springbonk.model.dto.response.BookResponse;
import com.gpt.springbonk.service.BookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Book Suite")
@RequestMapping("/api/book")
public class BookController {

    private final BookService bookService;

    @PostMapping
    @Operation(summary = "Create a new book")
    public ResponseEntity<BookResponse> createBook(@RequestBody BookRequest bookRequest) {
        BookResponse createdBook = bookService.createBook(bookRequest);
        return ResponseEntity.ok(createdBook);
    }

    @GetMapping
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
    public ResponseEntity<BookResponse> updateBook(@PathVariable UUID id, @RequestBody BookRequest bookUpdateRequest) {
        BookResponse updatedBook = bookService.updateBook(id, bookUpdateRequest);
        return ResponseEntity.ok(updatedBook);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an existing book")
    public ResponseEntity<Void> deleteBook(@PathVariable UUID id) {
        bookService.deleteBook(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/shelf/{shelfId}")
    @Operation(summary = "Get all books on a shelf by shelf ID")
    public ResponseEntity<List<BookResponse>> getBooksByShelfId(@PathVariable UUID shelfId) {
        List<BookResponse> books = bookService.getBooksByShelfId(shelfId);
        return ResponseEntity.ok(books);
    }

    @PutMapping("/{bookId}/{shelfId}")
    @Operation(summary = "Add an existing book to a new shelf")
    public ResponseEntity<BookResponse> addBookToShelf(@PathVariable UUID bookId, @PathVariable UUID shelfId) {
        BookResponse updatedBook = bookService.addBookToShelf(bookId, shelfId);
        return ResponseEntity.ok(updatedBook);
    }

    @DeleteMapping("/{bookId}/{shelfId}")
    @Operation(summary = "Remove an existing book from a shelf")
    public ResponseEntity<BookResponse> removeBookFromShelf(
        @PathVariable UUID bookId,
        @PathVariable UUID shelfId
    ) {
        BookResponse updatedBook = bookService.removeBookFromShelf(bookId, shelfId);
        return ResponseEntity.ok(updatedBook);
    }
}