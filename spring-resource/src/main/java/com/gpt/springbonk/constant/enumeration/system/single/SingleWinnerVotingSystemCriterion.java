package com.gpt.springbonk.constant.enumeration.system.single;

import com.gpt.springbonk.constant.enumeration.system.VotingSystemCriterion;

public enum SingleWinnerVotingSystemCriterion implements VotingSystemCriterion {
  /**
   * The majority criterion is a voting system criterion applicable to voting rules over ordinal preferences required
   * that if only one candidate is ranked first by over 50% of voters, that candidate must win.
   */
  MAJORITY_WINNER,
  /**
   * The majority loser criterion is a criterion to evaluate single-winner voting systems. The criterion states that
   * if a majority of voters give a candidate no support, i.e. do not list that candidate on their ballot, that
   * candidate must lose.
   */
  MAJORITY_LOSER,
  /**
   * The mutual majority criterion is a criterion for evaluating electoral systems. It is also known as the majority
   * criterion for solid coalitions and the generalized majority criterion. This criterion requires that whenever a
   * majority of voters prefer a group of candidates above all others, then the winner must be a candidate from that
   * group. The mutual majority criterion may also be thought of as the single-winner case of Droop-Proportionality
   * for Solid Coalitions.
   */
  MUTUAL_MAJORITY,
  /**
   * A Condorcet winner is a candidate who would receive the support of more than half of the electorate in a
   * one-on-one race against any one of their opponents. Voting systems where a majority winner will always win are
   * said to satisfy the Condorcet winner criterion. The Condorcet winner criterion extends the principle of majority
   * rule to elections with multiple candidates.
   */
  CONDORCET_WINNER,
  /**
   * In single-winner voting system theory, the Condorcet loser criterion (CLC) is a measure for differentiating
   * voting systems. It implies the majority loser criterion but does not imply the Condorcet winner criterion.
   */
  CONDORCET_LOSER,
  /**
   * The Smith set, sometimes called the top-cycle or a Condorcet winning set, generalizes the idea of a Condorcet
   * winner to cases where no such winner exists. It does so by allowing cycles of candidates to be treated jointly,
   * as if they were a single Condorcet winner. Voting systems that always elect a candidate from the Smith set pass
   * the Smith criterion. The Smith set and Smith criterion are both named for mathematician John H. Smith.
   */
  SMITH,
  /**
   * Independence of Smith-dominated alternatives is a voting system criterion which says that the winner of an
   * election should not be affected by candidates who are not in the Smith set.
   */
  SMITH_IIA,
  /**
   * Independence of irrelevant alternatives (IIA) is an axiom of decision theory that codifies the intuition that a
   * choice between and  should not depend on the quality of a third, unrelated outcome. There are several different
   * variations of this axiom, which are generally equivalent under mild conditions. As a result of its importance,
   * the axiom has been independently rediscovered in various forms across a wide variety of fields, including
   * economics, cognitive science, social choice, fair division, rational choice, artificial intelligence,
   * probability, and game theory. It is closely tied to many of the most important theorems in these fields,
   * including Arrow's impossibility theorem, the Balinski–Young theorem, and the money pump arguments.
   */
  IIA,
  /**
   * See {@link SingleWinnerVotingSystemCriterion#IIA}.
   * <p>TODO: Figure out what this one is.</p>
   */
  LIIA,
  /**
   * In social choice theory, the independence of (irrelevant) clones criterion says that adding a clone, i.e. a new
   * candidate very similar to an already-existing candidate, should not spoil the results. It can be considered a
   * weak form of the independence of irrelevant alternatives (IIA) criterion that nevertheless is failed by a number
   * of voting rules. A method that passes the criterion is said to be clone independent.
   */
  CLONE_PROOF,
  /**
   * In social choice, the negative response, perversity, or additional support paradox is a pathological behavior of
   * some voting rules where a candidate loses as a result of having too much support. In other words, increasing
   * (decreasing) a candidate's ranking or rating causes that candidate to lose (win), respectively. Electoral systems
   * that do not exhibit perversity are sometimes said to satisfy the monotonicity criterion.
   */
  MONOTONE,
  /**
   * The participation criterion is a voting system criterion that says candidates should never lose an election as a
   * result of receiving too many votes in support. More formally, it says that adding more voters who prefer Alice to
   * Bob should not cause Alice to lose the election to Bob.
   */
  PARTICIPATION,
  /**
   * Later-no-harm is a property of some ranked-choice voting systems, first described by Douglas Woodall. In
   * later-no-harm systems, increasing the rating or rank of a candidate ranked below the winner of an election cannot
   * cause a higher-ranked candidate to lose. It is a common property in the plurality-rule family of voting systems.
   */
  LATER_NO_HARM,
  /**
   * The later-no-help criterion is a voting system criterion formulated by Douglas Woodall. The criterion is
   * satisfied if, in any election, a voter giving an additional ranking or positive rating to a less-preferred
   * candidate cannot cause a more-preferred candidate to win. Voting systems that fail the later-no-help criterion
   * are vulnerable to the tactical voting strategy called mischief voting, which can deny victory to a sincere
   * Condorcet winner.
   */
  LATER_NO_HELP,
  /**
   * The sincere favorite or no favorite-betrayal criterion is a property of some voting systems that says voters
   * should have no incentive to vote for someone else over their favorite. It protects voters from having to engage
   * in lesser-evil voting or a strategy called "decapitation".
   */
  NO_FAVORITE_BETRAYAL
}
