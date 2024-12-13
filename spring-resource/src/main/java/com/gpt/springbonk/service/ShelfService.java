package com.gpt.springbonk.service;


import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.model.Shelf;
import com.gpt.springbonk.model.dto.request.ShelfRequest;
import com.gpt.springbonk.model.dto.response.ShelfResponse;
import com.gpt.springbonk.repository.BookRepository;
import com.gpt.springbonk.repository.ShelfRepository;
import com.gpt.springbonk.security.keycloak.KeycloakUser;
import com.gpt.springbonk.security.keycloak.KeycloakUserService;
import jakarta.transaction.Transactional;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
@Transactional
@RequiredArgsConstructor
public class ShelfService
{

    private final ShelfRepository shelfRepository;
    private final BookRepository bookRepository;
    private final KeycloakUserService keycloakUserService;

    public ShelfResponse createShelf(ShelfRequest shelfRequest, UUID userId)
    {
        KeycloakUser user = keycloakUserService.getUserById(userId);
        Shelf shelf = new Shelf(shelfRequest.getTitle());
        shelf.setUser(user);
        return new ShelfResponse(shelfRepository.saveAndFlush(shelf));
    }

    public List<ShelfResponse> getUserShelves(UUID userId)
    {
        return shelfRepository.findByUserId(userId).stream().map(ShelfResponse::new).toList();
    }

    public ShelfResponse getOneShelf(UUID id, UUID userId)
    {
        Shelf shelf = getShelfById(id);
        validateShelfOwnership(shelf, userId);
        return new ShelfResponse(shelf);
    }

    public Shelf getShelfById(UUID id)
    {
        return shelfRepository.findById(id)
                              .orElseThrow(() -> new ResourceNotFoundException("Shelf not found with id: " + id));
    }

    public ShelfResponse updateShelf(UUID id, ShelfRequest shelfUpdateRequest, UUID userId)
    {
        Shelf shelf = getShelfById(id);
        validateShelfOwnership(shelf, userId);

        if (shelf.isDefaultShelf())
        {
            throw new IllegalStateException("Cannot modify the default shelf");
        }

        shelf.setTitle(shelfUpdateRequest.getTitle());
        return new ShelfResponse(shelfRepository.saveAndFlush(shelf));
    }

    public Shelf getDefaultShelf(UUID userId)
    {
        return shelfRepository.findByUserIdAndDefaultShelf(userId, true)
                              .orElseThrow(() -> new ResourceNotFoundException("Default shelf not found for user"));
    }

    public void removeAllBooksFromShelf(UUID shelfId, UUID userId)
    {
        Shelf shelf = getShelfById(shelfId);
        validateShelfOwnership(shelf, userId);

        new HashSet<>(shelf.getBooks()).forEach(book -> {
            shelf.removeBook(book);
            bookRepository.save(book);
        });

        shelfRepository.save(shelf);
    }

    public void deleteShelf(UUID id, UUID userId)
    {
        Shelf shelf = getShelfById(id);
        validateShelfOwnership(shelf, userId);

        if (shelf.isDefaultShelf())
        {
            throw new IllegalStateException("Cannot delete the default shelf");
        }

        removeAllBooksFromShelf(id, userId);
        shelfRepository.delete(shelf);
    }

    private void validateShelfOwnership(Shelf shelf, UUID userId)
    {
        if (!shelf.getUser().getId().equals(userId))
        {
            throw new AccessDeniedException("You don't have access to this shelf");
        }
    }
}