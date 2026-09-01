package com.gpt.jpss.sticker;

import com.gpt.jpss.sticker.model.Sticker;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StickerRepository extends JpaRepository<Sticker, UUID> {

  /** The public wall, newest first. Carries no image bytes — those live in their own table. */
  List<Sticker> findAllByOrderByCreatedAtDesc();
}
