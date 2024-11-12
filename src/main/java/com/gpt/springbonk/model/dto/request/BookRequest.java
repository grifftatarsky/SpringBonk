package com.gpt.springbonk.model.dto.request;

import java.util.UUID;
import lombok.Data;

import jakarta.validation.constraints.NotBlank;

@Data
public class BookRequest {

    private String googleID;

    @NotBlank(message = "Title is mandatory")
    private String title;

    @NotBlank(message = "Author is mandatory")
    private String author;

    private String imageURL;
    private String blurb;

    private UUID shelfId; // Optional: Associate book with a shelf during creation/update
}