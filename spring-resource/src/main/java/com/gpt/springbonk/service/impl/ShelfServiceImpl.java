package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.keycloak.KeycloakUser;
import com.gpt.springbonk.keycloak.KeycloakUserService;
import com.gpt.springbonk.model.Shelf;
import com.gpt.springbonk.model.dto.request.ShelfRequest;
import com.gpt.springbonk.model.dto.response.ShelfResponse;
import com.gpt.springbonk.repository.BookRepository;
import com.gpt.springbonk.repository.ShelfRepository;
import com.gpt.springbonk.service.ShelfService;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import static com.gpt.springbonk.constant.ShelfConstants.NOMINATIONS;
import static com.gpt.springbonk.constant.ShelfConstants.UNSHELVED;

@Service
@Transactional
@RequiredArgsConstructor
public class ShelfServiceImpl implements ShelfService {

  private final ShelfRepository shelfRepository;
  private final BookRepository bookRepository;
  private final KeycloakUserService keycloakUserService;

  @Override
  public ShelfResponse createShelf(
      @NotNull ShelfRequest shelfRequest,
      @NotNull UUID userId
  ) {
    KeycloakUser user = keycloakUserService.getUserById(userId);
    Shelf shelf = new Shelf(shelfRequest.getTitle());
    shelf.setUser(user);
    return new ShelfResponse(shelfRepository.saveAndFlush(shelf));
  }

  @Override
  public List<ShelfResponse> getAllUserShelves(
      @NotNull UUID userId
  ) {
    return shelfRepository.findByUserId(userId).stream().map(ShelfResponse::new).toList();
  }

  @Override
  public Page<ShelfResponse> getPagedShelves(Pageable pageable, @NotNull UUID userId) {
    return shelfRepository.findByUserId(userId, pageable).map(ShelfResponse::new);
  }

  @Override
  public ShelfResponse getOneShelf(
      @NotNull UUID id,
      @NotNull UUID userId
  ) {
    Shelf shelf = getShelfById(id);
    validateShelfOwnership(shelf, userId);
    return new ShelfResponse(shelf);
  }

  @Override
  public Shelf getShelfById(
      @NotNull UUID id
  ) {
    return shelfRepository.findById(id).orElseThrow(
        () -> new ResourceNotFoundException("Shelf not found with id: " + id)
    );
  }

  @Override
  public ShelfResponse updateShelf(
      @NotNull UUID id,
      @NotNull ShelfRequest shelfUpdateRequest,
      @NotNull UUID userId
  ) {
    Shelf shelf = getShelfById(id);
    validateShelfOwnership(shelf, userId);

    if (shelf.isDefaultShelf()) {
      throw new IllegalStateException("Cannot modify the default shelf");
    }

    shelf.setTitle(shelfUpdateRequest.getTitle());
    return new ShelfResponse(shelfRepository.saveAndFlush(shelf));
  }

  @Override
  public Shelf getUnshelvedShelf(
      @NotNull UUID userId
  ) {
    return shelfRepository.findByUserIdAndDefaultShelfAndTitle(userId, true, UNSHELVED).orElseThrow(
        () -> new ResourceNotFoundException("Default shelf not found for user")
    );
  }

  @Override
  public Shelf getNominatedShelf(
      @NotNull UUID userId
  ) {
    return shelfRepository.findByUserIdAndDefaultShelfAndTitle(userId, true, NOMINATIONS)
        .orElseThrow(
            () -> new ResourceNotFoundException("Default shelf not found for user")
        );
  }

  @Override
  public void removeAllBooksFromShelf(
      @NotNull UUID shelfId,
      @NotNull UUID userId
  ) {
    Shelf shelf = getShelfById(shelfId);
    validateShelfOwnership(shelf, userId);

    new HashSet<>(shelf.getBooks()).forEach(book -> {
      shelf.removeBook(book);
      bookRepository.save(book);
    });

    shelfRepository.save(shelf);
  }

  @Override
  public void deleteShelf(
      @NotNull UUID id,
      @NotNull UUID userId
  ) {
    Shelf shelf = getShelfById(id);
    validateShelfOwnership(shelf, userId);

    if (shelf.isDefaultShelf()) {
      throw new IllegalStateException("Cannot delete the default shelf");
    }

    removeAllBooksFromShelf(id, userId);
    shelfRepository.delete(shelf);
  }

  private void validateShelfOwnership(
      @NotNull Shelf shelf,
      @NotNull UUID userId
  ) {
    if (!shelf.getUser().getId().equals(userId)) {
      throw new AccessDeniedException("You don't have access to this shelf");
    }
  }
}
