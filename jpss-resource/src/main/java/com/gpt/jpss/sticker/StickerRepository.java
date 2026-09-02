package com.gpt.jpss.sticker;

import com.gpt.jpss.sticker.model.Sticker;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface StickerRepository extends JpaRepository<Sticker, UUID> {

  /**
   * The public wall, newest first. Carries no image bytes — those live in their
   * own table — but does fetch the author, which every row needs for its display
   * name. Without the join Hibernate resolves the eager association row by row,
   * so the wall cost a round trip per distinct author on top of the listing.
   */
  @Query("select s from Sticker s join fetch s.author order by s.createdAt desc")
  List<Sticker> wall();
}
