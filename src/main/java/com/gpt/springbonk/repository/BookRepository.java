package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.List;

@Repository
public interface BookRepository extends JpaRepository<Book, UUID> {
    List<Book> findByShelfId(UUID shelfId);
}