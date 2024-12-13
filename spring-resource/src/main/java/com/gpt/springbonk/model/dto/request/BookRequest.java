package com.gpt.springbonk.model.dto.request;


import jakarta.validation.constraints.NotBlank;
import java.util.UUID;
import lombok.Data;

@Data
public class BookRequest
{
    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Author is required")
    private String author;

    private String imageURL;
    private String blurb;
    private String googleID;
    private UUID shelfId;  // Optional - if not provided, goes to default shelf
}