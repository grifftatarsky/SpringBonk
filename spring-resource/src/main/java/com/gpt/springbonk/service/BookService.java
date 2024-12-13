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

@Service
@Transactional
@RequiredArgsConstructor
public class BookService
{

    private final BookRepository bookRepository;
    private final ShelfRepository shelfRepository;

    public BookResponse createBook(BookRequest bookRequest, UUID userId)
    {
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
            // If no shelf specified, add to user's default shelf
            Shelf defaultShelf = shelfRepository.findByUserIdAndDefaultShelf(userId, true)
                                                .orElseThrow(() -> new ResourceNotFoundException(
                                                    "Default shelf not found for user"));
            addBookToShelf(book, defaultShelf.getId(), userId);
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

    public BookResponse getOneBook(UUID id)
    {
        return new BookResponse(getBookById(id));
    }

    public Book getBookById(UUID id)
    {
        return bookRepository.findById(id).orElseThrow(
            () -> new ResourceNotFoundException("Book not found with id: " + id)
        );
    }

    public BookResponse updateBook(UUID id, BookRequest bookUpdateRequest, UUID userId)
    {
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

    public void deleteBook(UUID id, UUID userId)
    {
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

    public List<BookResponse> getBooksByShelfId(UUID shelfId, UUID userId)
    {
        Shelf shelf = getShelfById(shelfId);
        validateShelfOwnership(shelf, userId);
        return shelf.getBooks().stream()
                    .map(BookResponse::new)
                    .toList();
    }

    public BookResponse addBookToShelf(UUID bookId, UUID shelfId, UUID userId)
    {
        Book book = getBookById(bookId);
        addBookToShelf(book, shelfId, userId);
        return new BookResponse(bookRepository.save(book));
    }

    public BookResponse removeBookFromShelf(UUID bookId, UUID shelfId, UUID userId)
    {
        Book book = getBookById(bookId);
        Shelf shelf = getShelfById(shelfId);
        validateShelfOwnership(shelf, userId);

        shelf.removeBook(book);
        shelfRepository.save(shelf);
        return new BookResponse(bookRepository.save(book));
    }

    private void addBookToShelf(Book book, @NotNull UUID shelfId, UUID userId)
    {
        Shelf shelf = getShelfById(shelfId);
        validateShelfOwnership(shelf, userId);
        shelf.addBook(book);
        shelfRepository.save(shelf);
    }

    private Shelf getShelfById(UUID shelfId)
    {
        return shelfRepository.findById(shelfId).orElseThrow(
            () -> new ResourceNotFoundException("Shelf not found with id: " + shelfId)
        );
    }

    private void validateShelfOwnership(Shelf shelf, UUID userId)
    {
        if (!shelf.getUser().getId().equals(userId))
        {
            throw new AccessDeniedException("You don't have access to this shelf");
        }
    }
}