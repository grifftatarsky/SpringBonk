package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Shelf;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class BookResponse {
    // TODO: Clean up the inner class in this.

    private UUID id;
    private String googleID;
    private String title;
    private String author;
    private String imageURL;
    private String blurb;
    private LocalDateTime createdDate;
    private Set<ShelfInfo> shelves;

    @Data
    public static class ShelfInfo {
        private UUID id;
        private String title;

        public ShelfInfo(Shelf shelf) {
            this.id = shelf.getId();
            this.title = shelf.getTitle();
        }
    }

    public BookResponse(Book book) {
        this.id = book.getId();
        this.googleID = book.getGoogleID();
        this.title = book.getTitle();
        this.author = book.getAuthor();
        this.imageURL = book.getImageURL();
        this.blurb = book.getBlurb();
        this.createdDate = book.getCreatedDate();
        this.shelves = book.getShelves().stream().map(ShelfInfo::new).collect(Collectors.toSet());
    }

    public static List<BookResponse> booksToBookResponses(List<Book> bookList) {
        return bookList.stream().map(BookResponse::new).toList();
    }
}