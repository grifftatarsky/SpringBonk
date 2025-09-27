package com.gpt.springbonk.model;

import com.gpt.springbonk.constant.enumeration.election.Flag;
import com.gpt.springbonk.model.record.ElectionResultRecord;
import com.gpt.springbonk.model.record.RoundResultRecord;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(
    name = "results",
    uniqueConstraints =
        @jakarta.persistence.UniqueConstraint(
            name = "uk_results_election_closure",
            columnNames = {"election_id", "closure_time"}
        )
)
public class ElectionResult {
  /*
   * Right now, this doesn't support three future enhancements.
   * 1. No winner
   * 2. Multiple winners
   * 3. Queryable rounds (see note below)
   *
   * LOCK_IN_POINT FOR PGSQL: JDBC json type.
   */

  @Id
  @GeneratedValue
  private UUID id;

  @Column
  private UUID winnerId;

  /*
   * CHOICE
   * This may change, as many choices can.
   * Right now this is historical data for view only. No query, nothing.
   * So, as long as we're in PGSQL, this is satisfactory.
   * If metrics, or queries, ever come into play...this will become a relationship to an entity.
   */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "rounds", columnDefinition = "jsonb")
  private List<RoundResultRecord> rounds;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "election_id", nullable = false)
  private Election election;

  @Column
  private int totalVotes;

  @Column
  private ZonedDateTime closureTime;

  @ElementCollection
  @CollectionTable(name = "flags", joinColumns = @JoinColumn(name = "id"))
  @Enumerated(EnumType.STRING)
  @Column(name = "flags", nullable = false)
  private List<Flag> flags = new ArrayList<>();

  /// Create an ElectionResult entity from an ElectionResultRecord and ZonedDateTime.
  public ElectionResult(
      ElectionResultRecord record,
      ZonedDateTime closureTime,
      Election election) {
    this.winnerId = record.winnerId();
    this.rounds = record.rounds();
    this.totalVotes = record.totalVotes();
    this.closureTime = closureTime;
    this.election = election;
  }

  ///  Create an ElectionResult given a flag, such as a failed scheduled closure.
  public ElectionResult(
      Flag flag,
      ZonedDateTime closureTime,
      Election election
  ) {
    this.closureTime = closureTime;
    this.flags.add(flag);
    this.election = election;
  }
}
