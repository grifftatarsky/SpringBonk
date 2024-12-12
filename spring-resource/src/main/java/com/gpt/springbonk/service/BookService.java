package com.gpt.springbonk.service;

import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Shelf;
import com.gpt.springbonk.model.dto.request.BookRequest;
import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.model.dto.response.BookResponse;
import com.gpt.springbonk.repository.BookRepository;
import com.gpt.springbonk.repository.ShelfRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@Transactional
@RequiredArgsConstructor
public class BookService {

    private final BookRepository bookRepository;
    private final ShelfRepository shelfRepository;

    public BookResponse createBook(BookRequest bookRequest) {
        Book book = new Book(
            bookRequest.getTitle(),
            bookRequest.getAuthor(),
            bookRequest.getImageURL(),
            bookRequest.getBlurb(),
            bookRequest.getGoogleID()
        );

        // If initial shelf is provided, add it
        if (bookRequest.getShelfId() != null) {
            addBookToShelf(book, bookRequest.getShelfId());
        }

        return new BookResponse(bookRepository.saveAndFlush(book));
    }

    public List<BookResponse> getAllBooks() {
        List<Book> books = bookRepository.findAll();
        return books.stream()
                    .map(BookResponse::new)
                    .toList();
    }

    public BookResponse getOneBook(UUID id) {
        return new BookResponse(getBookById(id));
    }

    public Book getBookById(UUID id) {
        return bookRepository.findById(id).orElseThrow(
            () -> new ResourceNotFoundException("Book not found with id: " + id)
        );
    }

    public BookResponse updateBook(UUID id, BookRequest bookUpdateRequest) {
        Book book = getBookById(id);

        book.setTitle(bookUpdateRequest.getTitle());
        book.setAuthor(bookUpdateRequest.getAuthor());
        book.setImageURL(bookUpdateRequest.getImageURL());
        book.setBlurb(bookUpdateRequest.getBlurb());

        // If shelf update is requested
        if (bookUpdateRequest.getShelfId() != null) {
            addBookToShelf(book, bookUpdateRequest.getShelfId());
        }

        return new BookResponse(bookRepository.saveAndFlush(book));
    }

    public void deleteBook(UUID id) {
        Book book = getBookById(id);
        // Remove from all shelves before deletion
        new HashSet<>(book.getShelves()).forEach(shelf ->
            removeBookFromShelf(book.getId(), shelf.getId())
        );
        bookRepository.delete(book);
    }

    public List<BookResponse> getBooksByShelfId(UUID shelfId) {
        Shelf shelf = getShelfById(shelfId);
        return shelf.getBooks().stream()
                    .map(BookResponse::new)
                    .toList();
    }

    public BookResponse addBookToShelf(UUID bookId, UUID shelfId) {
        Book book = getBookById(bookId);
        addBookToShelf(book, shelfId);
        return new BookResponse(bookRepository.save(book));
    }

    public BookResponse removeBookFromShelf(UUID bookId, UUID shelfId) {
        Book book = getBookById(bookId);
        Shelf shelf = getShelfById(shelfId);

        shelf.removeBook(book);
        shelfRepository.save(shelf);
        return new BookResponse(bookRepository.save(book));
    }

    private void addBookToShelf(Book book, @NotNull UUID shelfId) {
        Shelf shelf = getShelfById(shelfId);
        shelf.addBook(book);
        shelfRepository.save(shelf);
    }

    private Shelf getShelfById(UUID shelfId) {
        return shelfRepository.findById(shelfId).orElseThrow(
            () -> new ResourceNotFoundException("Shelf not found with id: " + shelfId)
        );
    }
}