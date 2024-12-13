package com.gpt.springbonk.service;


import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Shelf;
import com.gpt.springbonk.model.dto.request.BookRequest;
import com.gpt.springbonk.model.dto.response.BookResponse;
import com.gpt.springbonk.repository.BookRepository;
import com.gpt.springbonk.repository.ShelfRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import static com.gpt.springbonk.constant.ShelfConstants.UNSHELVED;

@Service
@Transactional
@RequiredArgsConstructor
public class BookService
{

    private final BookRepository bookRepository;
    private final ShelfRepository shelfRepository;

    public BookResponse createBook(
        @NotNull BookRequest bookRequest,
        @NotNull UUID userId
    ) {
        Book book = new Book(
            bookRequest.getTitle(),
            bookRequest.getAuthor(),
            bookRequest.getImageURL(),
            bookRequest.getBlurb(),
            bookRequest.getGoogleID()
        );

        // If shelf ID is provided, add to that shelf
        if (bookRequest.getShelfId() != null)
        {
            addBookToShelf(book, bookRequest.getShelfId(), userId);
        }
        else
        {
            Shelf unshelvedShelf = shelfRepository.findByUserIdAndDefaultShelfAndTitle(
                userId,
                true,
                UNSHELVED
            ).orElseThrow(() -> new ResourceNotFoundException("Default shelf not found for user"));
            addBookToShelf(book, unshelvedShelf.getId(), userId);
        }

        return new BookResponse(bookRepository.saveAndFlush(book));
    }

    // Cache? Idk what use we have for this.
    // Google Books handles the main search...but this is all the ones we've saved.
    public List<BookResponse> getAllBooks()
    {
        List<Book> books = bookRepository.findAll();
        return books.stream()
                    .map(BookResponse::new)
                    .toList();
    }

    public BookResponse getOneBook(
        @NotNull UUID id
    ) {
        return new BookResponse(getBookById(id));
    }

    public Book getBookById(
        @NotNull UUID id
    ) {
        return bookRepository.findById(id).orElseThrow(
            () -> new ResourceNotFoundException("Book not found with id: " + id)
        );
    }

    public BookResponse updateBook(
        @NotNull UUID id,
        @NotNull BookRequest bookUpdateRequest,
        @NotNull UUID userId
    ) {
        Book book = getBookById(id);

        book.setTitle(bookUpdateRequest.getTitle());
        book.setAuthor(bookUpdateRequest.getAuthor());
        book.setImageURL(bookUpdateRequest.getImageURL());
        book.setBlurb(bookUpdateRequest.getBlurb());

        // If shelf update is requested
        if (bookUpdateRequest.getShelfId() != null)
        {
            addBookToShelf(book, bookUpdateRequest.getShelfId(), userId);
        }

        return new BookResponse(bookRepository.saveAndFlush(book));
    }

    public void deleteBook(
        @NotNull UUID id,
        @NotNull UUID userId
    ) {
        Book book = getBookById(id);
        // Remove from user's shelves before deletion
        new HashSet<>(book.getShelves()).forEach(shelf -> {
            if (shelf.getUser().getId().equals(userId))
            {
                removeBookFromShelf(book.getId(), shelf.getId(), userId);
            }
        });
        // Only delete the book if it's not on any shelves
        if (book.getShelves().isEmpty())
        {
            bookRepository.delete(book);
        }
    }

    public List<BookResponse> getBooksByShelfId(
        @NotNull UUID shelfId,
        @NotNull UUID userId
    ) {
        Shelf shelf = getShelfById(shelfId);
        validateShelfOwnership(shelf, userId);
        return shelf.getBooks().stream().map(BookResponse::new).toList();
    }

    public BookResponse addBookToShelf(
        @NotNull UUID bookId,
        @NotNull UUID shelfId,
        @NotNull UUID userId
    ) {
        Book book = getBookById(bookId);
        addBookToShelf(book, shelfId, userId);
        return new BookResponse(bookRepository.save(book));
    }

    public BookResponse removeBookFromShelf(
        @NotNull UUID bookId,
        @NotNull UUID shelfId,
        @NotNull UUID userId
    ) {
        Book book = getBookById(bookId);
        Shelf shelf = getShelfById(shelfId);
        validateShelfOwnership(shelf, userId);

        shelf.removeBook(book);
        shelfRepository.save(shelf);
        return new BookResponse(bookRepository.save(book));
    }

    private void addBookToShelf(
        @NotNull Book book,
        @NotNull UUID shelfId,
        @NotNull UUID userId
    ) {
        Shelf shelf = getShelfById(shelfId);
        validateShelfOwnership(shelf, userId);
        shelf.addBook(book);
        shelfRepository.saveAndFlush(shelf);
    }

    private Shelf getShelfById(
        @NotNull UUID shelfId
    ) {
        return shelfRepository.findById(shelfId).orElseThrow(
            () -> new ResourceNotFoundException("Shelf not found with id: " + shelfId)
        );
    }

    private void validateShelfOwnership(
        @NotNull Shelf shelf,
        @NotNull UUID userId
    ) {
        if (!shelf.getUser().getId().equals(userId))
        {
            throw new AccessDeniedException("You don't have access to this shelf");
        }
    }
}