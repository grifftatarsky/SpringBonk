package com.gpt.springbonk.controller;

import com.gpt.springbonk.model.dto.request.ShelfRequest;
import com.gpt.springbonk.model.dto.response.ShelfResponse;
import com.gpt.springbonk.service.ShelfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Shelf Suite")
@RequestMapping("/api/shelf")
public class ShelfController {

    private final ShelfService shelfService;

    @PostMapping()
    @Operation(summary = "Create a new shelf")
    public ResponseEntity<ShelfResponse> createShelf(@RequestBody ShelfRequest shelfRequest) {
        ShelfResponse createdShelf = shelfService.createShelf(shelfRequest);
        return ResponseEntity.ok(createdShelf);
    }

    @GetMapping
    @Operation(summary = "Get all available shelves (unpaged)")
    public ResponseEntity<List<ShelfResponse>> getAllShelves() {
        List<ShelfResponse> shelves = shelfService.getAllShelves();
        return ResponseEntity.ok(shelves);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an existing shelf by ID")
    public ResponseEntity<ShelfResponse> getShelfById(@PathVariable UUID id) {
        ShelfResponse shelf = shelfService.getOneShelf(id);
        return ResponseEntity.ok(shelf);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing shelf")
    public ResponseEntity<ShelfResponse> updateShelf(
        @PathVariable UUID id,
        @RequestBody ShelfRequest shelfUpdateRequest
    ) {
        ShelfResponse updatedShelf = shelfService.updateShelf(id, shelfUpdateRequest);
        return ResponseEntity.ok(updatedShelf);
    }

    @DeleteMapping("/{id}/books")
    @Operation(summary = "Remove all books from an existing shelf")
    public ResponseEntity<Void> removeAllBooksFromShelf(@PathVariable UUID id) {
        shelfService.removeAllBooksFromShelf(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an existing shelf")
    public ResponseEntity<Void> deleteShelf(@PathVariable UUID id) {
        shelfService.deleteShelf(id);
        return ResponseEntity.noContent().build();
    }
}