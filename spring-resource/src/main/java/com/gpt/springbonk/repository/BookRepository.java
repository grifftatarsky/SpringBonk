package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Book;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookRepository extends JpaRepository<Book, UUID> {
  Optional<Book> findByOpenLibraryId(String openLibraryId);

  Page<Book> findByShelves_Id(UUID shelfId, Pageable pageable);
}
