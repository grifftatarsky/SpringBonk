package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Shelf;
import com.gpt.springbonk.model.dto.request.BookRequest;
import com.gpt.springbonk.model.dto.response.BookResponse;
import com.gpt.springbonk.repository.BookRepository;
import com.gpt.springbonk.repository.ShelfRepository;
import com.gpt.springbonk.service.BookService;
import com.gpt.springbonk.service.openlibrary.OpenLibraryClient;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import static com.gpt.springbonk.constant.ShelfConstants.UNSHELVED;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class BookServiceImpl implements BookService {

  private static final String CUSTOM_ID_PREFIX = "custom-";

  private final BookRepository bookRepository;
  private final ShelfRepository shelfRepository;
  private final OpenLibraryClient openLibraryClient;

  @Override
  public BookResponse createBook(
      @NotNull BookRequest bookRequest,
      @NotNull UUID userId
  ) {
    Set<UUID> shelfIds = resolveShelfIds(bookRequest.getShelfIds(), userId);

    Optional<Book> optionalExistingBook = Optional.empty();
    if (bookRequest.getOpenLibraryId() != null && !bookRequest.getOpenLibraryId().isBlank()) {
      optionalExistingBook = bookRepository.findByOpenLibraryId(bookRequest.getOpenLibraryId());
    }

    if (optionalExistingBook.isEmpty()) {
      // CASE NEW BOOK!
      // Blurb rules:
      //   - Custom book (no OL id, or id starts with "custom-"): use the
      //     user-provided blurb as-is. Custom books are user-editable.
      //   - Open Library book: ignore whatever the client sent and
      //     hydrate the blurb from Open Library's Works API. If OL has
      //     no description, store null and let the read path display a
      //     friendly fallback message.
      String blurb;
      if (isCustomBook(bookRequest.getOpenLibraryId())) {
        blurb = bookRequest.getBlurb();
      } else {
        blurb = openLibraryClient
            .fetchWorkDescription(bookRequest.getOpenLibraryId())
            .orElse(null);
      }

      Book book = new Book(
          bookRequest.getTitle(),
          bookRequest.getAuthor(),
          bookRequest.getImageURL(),
          blurb,
          bookRequest.getOpenLibraryId()
      );
      shelfIds.forEach(shelfId -> addBookToShelf(book, shelfId, userId));
      return new BookResponse(bookRepository.saveAndFlush(book));
    }

    // CASE BOOK ALREADY IN SYSTEM — reconcile the caller's shelf picks.
    Book book = optionalExistingBook.get();
    List<UUID> previousUserShelvesForBook =
        getShelfIdsByBookOpenLibraryId(book.getOpenLibraryId(), userId);

    List<UUID> toRemove =
        previousUserShelvesForBook.stream().filter(id -> !shelfIds.contains(id)).toList();

    List<UUID> toAdd =
        shelfIds.stream().filter(id -> !previousUserShelvesForBook.contains(id)).toList();

    List<Shelf> shelvesToAdd = toAdd.stream().map(shelfRepository::getReferenceById).toList();

    List<Shelf> shelvesToRemove =
        toRemove.stream().map(shelfRepository::getReferenceById).toList();

    shelvesToRemove.forEach(shelf -> shelf.removeBook(book));
    shelvesToAdd.forEach(shelf -> shelf.addBook(book));

    // Custom books: honor a blurb update from the client (users own them).
    // Open Library books: do NOT let the client rewrite the blurb via this
    // path. Blurb stays whatever was hydrated from OL on original create.
    if (isCustomBook(book.getOpenLibraryId())
        && !Objects.equals(bookRequest.getBlurb(), book.getBlurb())) {
      book.setBlurb(bookRequest.getBlurb());
    }

    return new BookResponse(bookRepository.save(book));
  }

  /**
   * A book is "custom" (user-owned, freely editable) when it has no
   * Open Library id, a blank one, or a synthetic {@code custom-*} id we
   * minted at nomination time. Anything else is a real Open Library work.
   */
  private boolean isCustomBook(String openLibraryId) {
    return openLibraryId == null
        || openLibraryId.isBlank()
        || openLibraryId.startsWith(CUSTOM_ID_PREFIX);
  }

  @Override
  public BookResponse getOneBook(
      @NotNull UUID id
  ) {
    return new BookResponse(getBookById(id));
  }

  @Override
  public Book getBookById(
      @NotNull UUID id
  ) {
    return bookRepository.findById(id).orElseThrow(
        () -> new ResourceNotFoundException("Book not found with id: " + id)
    );
  }

  @Override
  public BookResponse updateBook(
      @NotNull UUID id,
      @NotNull BookRequest bookUpdateRequest,
      @NotNull UUID userId
  ) {
    Book book = getBookById(id);

    // Open Library books are read-only metadata. Authoritative data lives
    // upstream at Open Library; editing title/author/blurb locally would
    // fork the record from the catalog and confuse other users sharing
    // the same Book entity. Shelf assignment is still legal — that's a
    // per-user relationship, not book-wide metadata.
    if (!isCustomBook(book.getOpenLibraryId())) {
      // Any field mismatch from the current book indicates an edit attempt.
      boolean metadataEdit =
          notEqualIgnoringNull(bookUpdateRequest.getTitle(), book.getTitle())
              || notEqualIgnoringNull(bookUpdateRequest.getAuthor(), book.getAuthor())
              || notEqualIgnoringNull(bookUpdateRequest.getImageURL(), book.getImageURL())
              || notEqualIgnoringNull(bookUpdateRequest.getBlurb(), book.getBlurb());
      if (metadataEdit) {
        throw new AccessDeniedException(
            "Open Library books can't be edited locally. Only custom books are editable.");
      }
      // Shelves-only change path — reconcile and save.
      Set<UUID> shelfIds = resolveShelfIds(bookUpdateRequest.getShelfIds(), userId);
      shelfIds.forEach(shelfId -> addBookToShelf(book, shelfId, userId));
      return new BookResponse(bookRepository.saveAndFlush(book));
    }

    // Custom book — must own at least one shelf it lives on to edit.
    boolean ownsShelfForBook = book.getShelves().stream()
        .anyMatch(shelf -> shelf.getUser().getId().equals(userId));
    if (!ownsShelfForBook) {
      throw new AccessDeniedException(
          "You can only edit custom books on your own shelves.");
    }

    book.setTitle(bookUpdateRequest.getTitle());
    book.setAuthor(bookUpdateRequest.getAuthor());
    book.setImageURL(bookUpdateRequest.getImageURL());
    book.setBlurb(bookUpdateRequest.getBlurb());
    Set<UUID> shelfIds = resolveShelfIds(bookUpdateRequest.getShelfIds(), userId);
    shelfIds.forEach(shelfId -> addBookToShelf(book, shelfId, userId));

    return new BookResponse(bookRepository.saveAndFlush(book));
  }

  /** Treats a null request field as "don't change" — no edit detected. */
  private boolean notEqualIgnoringNull(String requested, String current) {
    if (requested == null) return false;
    return !Objects.equals(requested, current);
  }

  private Set<UUID> resolveShelfIds(Set<UUID> shelfIds, UUID userId) {
    if (shelfIds != null && !shelfIds.isEmpty()) {
      return new HashSet<>(shelfIds);
    }

    Shelf unshelvedShelf = shelfRepository.findByUserIdAndDefaultShelfAndTitle(
        userId,
        true,
        UNSHELVED
    ).orElseThrow(() -> new ResourceNotFoundException("Default shelf not found for user"));

    return new HashSet<>(List.of(unshelvedShelf.getId()));
  }

  @Override
  public void deleteBook(
      @NotNull UUID id,
      @NotNull UUID userId
  ) {
    Book book = getBookById(id);
    // Remove from user's shelves before deletion
    new HashSet<>(book.getShelves()).forEach(shelf -> {
      if (shelf.getUser().getId().equals(userId)) {
        removeBookFromShelf(book.getId(), shelf.getId(), userId);
      }
    });
    // Only delete the book if it's not on any shelves
    if (book.getShelves().isEmpty()) {
      bookRepository.delete(book);
    }
  }

  @Override
  public List<BookResponse> getBooksByShelfId(
      @NotNull UUID shelfId,
      @NotNull UUID userId
  ) {
    Shelf shelf = getShelfById(shelfId);
    validateShelfOwnership(shelf, userId);
    return shelf.getBooks().stream().map(BookResponse::new).toList();
  }

  @Override
  public Page<BookResponse> getPagedBooksByShelfId(
      @NotNull UUID shelfId,
      @NotNull UUID userId,
      @NotNull Pageable pageable
  ) {
    Shelf shelf = getShelfById(shelfId);
    validateShelfOwnership(shelf, userId);
    return bookRepository.findByShelves_Id(shelfId, pageable).map(BookResponse::new);
  }

  @Override
  public BookResponse addBookToShelf(
      @NotNull UUID bookId,
      @NotNull UUID shelfId,
      @NotNull UUID userId
  ) {
    Book book = getBookById(bookId);
    addBookToShelf(book, shelfId, userId);
    return new BookResponse(bookRepository.save(book));
  }

  @Override
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
    // TODO: Check for duplicate.

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
    if (!shelf.getUser().getId().equals(userId)) {
      throw new AccessDeniedException("You don't have access to this shelf");
    }
  }

  @Override
  public List<UUID> getShelfIdsByBookOpenLibraryId(String openLibraryId, UUID userId) {
    Book existingBook = bookRepository.findByOpenLibraryId(openLibraryId).orElseThrow(
        () -> new ResourceNotFoundException("Book not found with Open Library ID: " + openLibraryId)
    );

    List<UUID> shelfIds = new ArrayList<>();

    existingBook.getShelves().forEach(shelf -> {
      try {
        validateShelfOwnership(shelf, userId);
        shelfIds.add(shelf.getId());
      } catch (AccessDeniedException _) {
        log.debug("Discarded unowned shelf.");
      }
    });

    return shelfIds;
  }
}
