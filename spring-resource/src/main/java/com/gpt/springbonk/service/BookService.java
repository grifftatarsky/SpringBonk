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
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@Transactional
@RequiredArgsConstructor
public class BookService
{

    private final BookRepository bookRepository;
    private final ShelfRepository shelfRepository;

    public BookResponse createBook(BookRequest bookRequest)
    {
        Book book = new Book(
            bookRequest.getTitle(),
            bookRequest.getAuthor(),
            bookRequest.getImageURL(),
            bookRequest.getBlurb(),
            bookRequest.getGoogleID()
            );
        setBookShelf(book, bookRequest.getShelfId());
        return new BookResponse(bookRepository.saveAndFlush(book));
    }

    public List<BookResponse> getAllBooks() {
        List<Book> books = bookRepository.findAll();
        return books.stream()
                    .map(BookResponse::new).toList();
    }

    public BookResponse getOneBook(UUID id) {
        return new BookResponse(getBookById(id));
    }

    public Book getBookById(UUID id)
    {
        return bookRepository.findById(id)
                             .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + id));
    }

    public BookResponse updateBook(UUID id, BookRequest bookUpdateRequest)
    {
        Book book = getBookById(id);
        book.setTitle(bookUpdateRequest.getTitle());
        book.setAuthor(bookUpdateRequest.getAuthor());
        book.setImageURL(bookUpdateRequest.getImageURL());
        book.setBlurb(bookUpdateRequest.getBlurb());

        setBookShelf(book, bookUpdateRequest.getShelfId());
        return new BookResponse(bookRepository.saveAndFlush(book));
    }

    public void deleteBook(UUID id)
    {
        Book book = getBookById(id);
        bookRepository.delete(book);
    }

    public List<BookResponse> getBooksByShelfId(UUID shelfId)
    {
        return bookRepository.findByShelfId(shelfId).stream().map(BookResponse::new).toList();
    }

    public BookResponse addOrSwitchBookToShelf(UUID bookId, UUID shelfId)
    {
        Book book = getBookById(bookId);
        Shelf currentShelf = book.getShelf();

        if (currentShelf.getId() == shelfId) {
            throw new IllegalArgumentException("Shelf already exists");
        }

        setBookShelf(book, shelfId);
        bookRepository.save(book);
        return new BookResponse(book);
    }

    public BookResponse removeBookFromShelf(UUID bookId)
    {
        Book book = getBookById(bookId);
        Shelf shelf = book.getShelf();

        if (shelf != null)
        {
            shelf.getBooks().remove(book);
            book.setShelf(null);
            shelfRepository.save(shelf);
            bookRepository.save(book);
        }

        return new BookResponse(book);
    }

    private void setBookShelf(Book book, @NotNull UUID shelfId)
    {
        book.setShelf(shelfRepository.findById(shelfId)
                                     .orElseThrow(() -> new ResourceNotFoundException(
                                         "Shelf not found with id: " + shelfId)));
    }
}