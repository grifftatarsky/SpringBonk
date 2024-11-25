package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Shelf;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static com.gpt.springbonk.model.dto.response.BookResponse.booksToBookResponses;

@Data
public class ShelfResponse {

    private UUID id;
    private String title;
    private LocalDateTime createdDate;
    private List<BookResponse> books;

    public ShelfResponse(Shelf shelf) {
        this.id = shelf.getId();
        this.title = shelf.getTitle();
        this.createdDate = shelf.getCreatedDate();
        this.books = booksToBookResponses(shelf.getBooks());
    }
}