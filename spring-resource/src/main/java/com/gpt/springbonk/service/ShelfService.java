package com.gpt.springbonk.service;

import com.gpt.springbonk.model.Shelf;
import com.gpt.springbonk.model.dto.request.ShelfRequest;
import com.gpt.springbonk.model.dto.response.ShelfResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ShelfService {
  ShelfResponse createShelf(ShelfRequest shelfRequest, UUID userId);

  List<ShelfResponse> getAllUserShelves(UUID userId);

  Page<ShelfResponse> getPagedShelves(Pageable pageable, UUID userId);

  ShelfResponse getOneShelf(UUID id, UUID userId);

  Shelf getShelfById(UUID id);

  ShelfResponse updateShelf(UUID id, ShelfRequest shelfUpdateRequest, UUID userId);

  Shelf getUnshelvedShelf(UUID userId);

  Shelf getNominatedShelf(UUID userId);

  void removeAllBooksFromShelf(UUID shelfId, UUID userId);

  void deleteShelf(UUID id, UUID userId);
}
