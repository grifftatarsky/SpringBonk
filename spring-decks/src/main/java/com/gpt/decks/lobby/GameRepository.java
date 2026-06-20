package com.gpt.decks.lobby;

import com.gpt.decks.lobby.model.Game;
import com.gpt.decks.lobby.model.GameStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface GameRepository extends JpaRepository<Game, UUID> {

  List<Game> findByStatusOrderByUpdatedAtDesc(GameStatus status);

  /** Games the user owns or is seated in, excluding closed ones. */
  @Query("""
      select distinct g from Game g
      left join g.seats s
      where g.status <> com.gpt.decks.lobby.model.GameStatus.CLOSED
        and (g.owner.id = :userId or s.user.id = :userId)
      order by g.updatedAt desc
      """)
  List<Game> findActiveForUser(UUID userId);
}
