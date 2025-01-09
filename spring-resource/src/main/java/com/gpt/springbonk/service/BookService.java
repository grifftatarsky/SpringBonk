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
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import static com.gpt.springbonk.constant.ShelfConstants.UNSHELVED;

@Slf4j
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
    )
    {
        Set<UUID> shelfIds = bookRequest.getShelfIds();

        Book book;

        Optional<Book> optionalExistingBook = bookRepository.findByGoogleID(bookRequest.getGoogleID());

        if (optionalExistingBook.isEmpty())
        {
            // CASE NEW BOOK!
            // Create the book.
            book = new Book(
                bookRequest.getTitle(),
                bookRequest.getAuthor(),
                bookRequest.getImageURL(),
                bookRequest.getBlurb(),
                bookRequest.getGoogleID()
            );
            // Update the shelves.
            if (!shelfIds.isEmpty())
            {
                shelfIds.forEach(shelfId -> addBookToShelf(book, shelfId, userId));
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
            // Return the new book.
            return new BookResponse(bookRepository.saveAndFlush(book));
        }
        else
        {
            // CASE BOOK ALREADY IN SYSTEM!
            book = optionalExistingBook.get();
            // Grab the IDs of the user's shelves.
            List<UUID> previousUserShelvesForBook = getShelfIdsByBookGoogleId(book.getGoogleID(), userId);
            // Slate!
            List<UUID> toRemove = previousUserShelvesForBook.stream().filter(id -> !shelfIds.contains(id)).toList();

            // IDs to add - in new request but didn't exist before
            List<UUID> toAdd = shelfIds.stream().filter(id -> !previousUserShelvesForBook.contains(id)).toList();

            List<Shelf> shelvesToAdd = toAdd.stream().map(shelfRepository::getReferenceById).toList();

            List<Shelf> shelvesToRemove = toRemove.stream().map(shelfRepository::getReferenceById).toList();

            shelvesToRemove.forEach(shelf -> shelf.removeBook(book));

            shelvesToAdd.forEach(shelf -> shelf.addBook(book));

            return new BookResponse(bookRepository.save(book));
        }
    }

    // Cache? IDK what use we have for this.
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
    )
    {
        return new BookResponse(getBookById(id));
    }

    public Book getBookById(
        @NotNull UUID id
    )
    {
        return bookRepository.findById(id).orElseThrow(
            () -> new ResourceNotFoundException("Book not found with id: " + id)
        );
    }

    public BookResponse updateBook(
        @NotNull UUID id,
        @NotNull BookRequest bookUpdateRequest,
        @NotNull UUID userId
    )
    {
        Book book = getBookById(id);

        book.setTitle(bookUpdateRequest.getTitle());
        book.setAuthor(bookUpdateRequest.getAuthor());
        book.setImageURL(bookUpdateRequest.getImageURL());
        book.setBlurb(bookUpdateRequest.getBlurb());
        Set<UUID> shelfIds = bookUpdateRequest.getShelfIds();
        // If shelf update is requested
        // TODO: Fix this duplicated code.
        if (!shelfIds.isEmpty())
        {
            shelfIds.forEach(shelfId -> addBookToShelf(book, shelfId, userId));
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

    public void deleteBook(
        @NotNull UUID id,
        @NotNull UUID userId
    )
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

    public List<BookResponse> getBooksByShelfId(
        @NotNull UUID shelfId,
        @NotNull UUID userId
    )
    {
        Shelf shelf = getShelfById(shelfId);
        validateShelfOwnership(shelf, userId);
        return shelf.getBooks().stream().map(BookResponse::new).toList();
    }

    public BookResponse addBookToShelf(
        @NotNull UUID bookId,
        @NotNull UUID shelfId,
        @NotNull UUID userId
    )
    {
        Book book = getBookById(bookId);
        addBookToShelf(book, shelfId, userId);
        return new BookResponse(bookRepository.save(book));
    }

    public BookResponse removeBookFromShelf(
        @NotNull UUID bookId,
        @NotNull UUID shelfId,
        @NotNull UUID userId
    )
    {
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
    )
    {
        // TODO: Check for duplicate.

        Shelf shelf = getShelfById(shelfId);
        validateShelfOwnership(shelf, userId);
        shelf.addBook(book);
        shelfRepository.saveAndFlush(shelf);
    }

    private Shelf getShelfById(
        @NotNull UUID shelfId
    )
    {
        return shelfRepository.findById(shelfId).orElseThrow(
            () -> new ResourceNotFoundException("Shelf not found with id: " + shelfId)
        );
    }

    private void validateShelfOwnership(
        @NotNull Shelf shelf,
        @NotNull UUID userId
    )
    {
        if (!shelf.getUser().getId().equals(userId))
        {
            throw new AccessDeniedException("You don't have access to this shelf");
        }
    }

    public List<UUID> getShelfIdsByBookGoogleId(String googleId, UUID userId)
    {
        Book existingBook = bookRepository.findByGoogleID(googleId).orElseThrow(
            () -> new ResourceNotFoundException("Book not found with id: " + googleId)
        );

        List<UUID> shelfIds = new ArrayList<>();

        existingBook.getShelves().forEach(shelf -> {
            try
            {
                validateShelfOwnership(shelf, userId);
                shelfIds.add(shelf.getId());
            }
            catch (AccessDeniedException _)
            {
                log.debug("Discarded unowned shelf.");
            }
        });

        return shelfIds;
    }
}