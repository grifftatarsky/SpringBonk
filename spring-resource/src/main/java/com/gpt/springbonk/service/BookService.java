package com.gpt.springbonk.service;

import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.dto.request.BookRequest;
import com.gpt.springbonk.model.dto.response.BookResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface BookService {
  BookResponse createBook(BookRequest bookRequest, UUID userId);

  List<BookResponse> getAllBooks();

  BookResponse getOneBook(UUID id);

  Book getBookById(UUID id);

  BookResponse updateBook(UUID id, BookRequest bookUpdateRequest, UUID userId);

  void deleteBook(UUID id, UUID userId);

  List<BookResponse> getBooksByShelfId(UUID shelfId, UUID userId);

  Page<BookResponse> getPagedBooksByShelfId(UUID shelfId, UUID userId, Pageable pageable);

  BookResponse addBookToShelf(UUID bookId, UUID shelfId, UUID userId);

  BookResponse removeBookFromShelf(UUID bookId, UUID shelfId, UUID userId);

  List<UUID> getShelfIdsByBookOpenLibraryId(String openLibraryId, UUID userId);
}
