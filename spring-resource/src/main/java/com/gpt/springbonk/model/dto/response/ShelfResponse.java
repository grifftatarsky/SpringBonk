package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Shelf;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static com.gpt.springbonk.model.dto.response.BookResponse.booksToBookResponses;

@Data
public class ShelfResponse {
    // TODO: Clean up inner class.
    private UUID id;
    private String title;
    private LocalDateTime createdDate;
    private List<SimpleBookResponse> books;

    public ShelfResponse(Shelf shelf) {
        this.id = shelf.getId();
        this.title = shelf.getTitle();
        this.createdDate = shelf.getCreatedDate();
        this.books = shelf.getBooks().stream()
                          .map(SimpleBookResponse::new)
                          .toList();
    }

    @Data
    public static class SimpleBookResponse {
        private UUID id;
        private String title;
        private String author;
        private String imageURL;
        private String blurb;
        private String googleID;

        public SimpleBookResponse(Book book) {
            this.id = book.getId();
            this.title = book.getTitle();
            this.author = book.getAuthor();
            this.imageURL = book.getImageURL();
            this.blurb = book.getBlurb();
            this.googleID = book.getGoogleID();
        }
    }
}