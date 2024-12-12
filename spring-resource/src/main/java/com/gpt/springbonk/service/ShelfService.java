package com.gpt.springbonk.service;

import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Shelf;
import com.gpt.springbonk.model.dto.request.ShelfRequest;
import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.model.dto.response.ShelfResponse;
import com.gpt.springbonk.repository.BookRepository;
import com.gpt.springbonk.repository.ShelfRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class ShelfService {

    private final ShelfRepository shelfRepository;
    private final BookRepository bookRepository;

    public ShelfResponse createShelf(ShelfRequest shelfRequest) {
        Shelf shelf = new Shelf(shelfRequest.getTitle());
        return new ShelfResponse(shelfRepository.saveAndFlush(shelf));
    }

    public List<ShelfResponse> getAllShelves() {
        return shelfRepository.findAll().stream()
                              .map(ShelfResponse::new)
                              .toList();
    }

    public ShelfResponse getOneShelf(UUID id) {
        return new ShelfResponse(getShelfById(id));
    }

    public Shelf getShelfById(UUID id) {
        return shelfRepository.findById(id)
                              .orElseThrow(() -> new ResourceNotFoundException("Shelf not found with id: " + id));
    }

    public ShelfResponse updateShelf(UUID id, ShelfRequest shelfUpdateRequest) {
        Shelf shelf = getShelfById(id);
        shelf.setTitle(shelfUpdateRequest.getTitle());
        return new ShelfResponse(shelfRepository.saveAndFlush(shelf));
    }

    public void removeAllBooksFromShelf(UUID shelfId) {
        Shelf shelf = getShelfById(shelfId);

        // Create a new HashSet to avoid concurrent modification
        new HashSet<>(shelf.getBooks()).forEach(book -> {
            shelf.removeBook(book);
            bookRepository.save(book);
        });

        shelfRepository.save(shelf);
    }

    public void deleteShelf(UUID id) {
        Shelf shelf = getShelfById(id);

        // Remove all books from the shelf before deletion
        removeAllBooksFromShelf(id);

        shelfRepository.delete(shelf);
    }
}