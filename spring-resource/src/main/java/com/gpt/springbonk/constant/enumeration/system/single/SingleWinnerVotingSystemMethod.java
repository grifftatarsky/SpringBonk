package com.gpt.springbonk.constant.enumeration.system.single;

import java.util.EnumSet;
import lombok.Getter;

import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemBallotType.APPROVALS;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemBallotType.CREDITS;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemBallotType.NONE;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemBallotType.RANKING;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemBallotType.SCORES;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemBallotType.SINGLE_MARK;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.CLONE_PROOF;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.CONDORCET_LOSER;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.CONDORCET_WINNER;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.IIA;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.LATER_NO_HARM;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.LATER_NO_HELP;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.LIIA;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.MAJORITY_LOSER;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.MAJORITY_WINNER;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.MONOTONE;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.MUTUAL_MAJORITY;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.NO_FAVORITE_BETRAYAL;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.PARTICIPATION;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.SMITH;
import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemCriterion.SMITH_IIA;

@Getter
public enum SingleWinnerVotingSystemMethod
    // TODO: This isn't working with my @Getter for some reason; I'd like to fix this. It works in my AWIPS code.
    //implements VotingSystemMethod
{
  /**
   * First-past-the-post (FPTP)—also called choose-one, first-preference plurality (FPP), or simply plurality—is a
   * single-winner voting rule. Voters mark one candidate as their favorite, or first-preference, and the candidate
   * with the most first-preference marks is elected, regardless of whether they have over half of votes.
   */
  FIRST_PAST_THE_POST_VOTING(
      SINGLE_MARK,
      EnumSet.of(MAJORITY_WINNER, MONOTONE, PARTICIPATION, LATER_NO_HARM, LATER_NO_HELP)
  ),
  /**
   * Anti-plurality voting describes an electoral system in which each voter votes against a single candidate, and the
   * candidate with the fewest votes against wins. Anti-plurality voting is an example of a positional voting method.
   */
  ANTI_PLURALITY(
      SINGLE_MARK,
      EnumSet.of(MAJORITY_LOSER, MONOTONE, PARTICIPATION, NO_FAVORITE_BETRAYAL)
  ),
  TWO_ROUND_SYSTEM(
      SINGLE_MARK,
      EnumSet.of(MAJORITY_WINNER, MAJORITY_LOSER, CONDORCET_LOSER, LATER_NO_HARM, LATER_NO_HELP)
  ),
  INSTANT_RUNOFF(
      RANKING,
      EnumSet.of(
          MAJORITY_WINNER, MAJORITY_LOSER, MUTUAL_MAJORITY, CONDORCET_LOSER, CLONE_PROOF,
          LATER_NO_HARM,
          LATER_NO_HELP
      )
  ),
  COOMBS(
      RANKING,
      EnumSet.of(MAJORITY_WINNER, MAJORITY_LOSER, MUTUAL_MAJORITY, CONDORCET_LOSER,
          NO_FAVORITE_BETRAYAL)
  ),
  NANSON(
      RANKING,
      EnumSet.of(MAJORITY_WINNER, MAJORITY_LOSER, MUTUAL_MAJORITY, CONDORCET_WINNER,
          CONDORCET_LOSER, SMITH)
  ),
  /**
   * The Borda count electoral system can be combined with an instant-runoff procedure to create hybrid election
   * methods that are called Nanson method and Baldwin method. Both methods are designed to satisfy the Condorcet
   * criterion, and allow for incomplete ballots and equal rankings.
   */
  BALDWIN(
      RANKING,
      EnumSet.of(MAJORITY_WINNER, MAJORITY_LOSER, MUTUAL_MAJORITY, CONDORCET_WINNER,
          CONDORCET_LOSER, SMITH)
  ),
  TIDEMAN_ALTERNATIVE(
      RANKING,
      EnumSet.of(
          MAJORITY_WINNER, MAJORITY_LOSER, MUTUAL_MAJORITY, CONDORCET_WINNER, CONDORCET_LOSER,
          SMITH, SMITH_IIA,
          CLONE_PROOF
      )
  ),

  MINIMAX(
      RANKING,
      EnumSet.of(MAJORITY_WINNER, CONDORCET_WINNER, MONOTONE)
  ),
  /**
   * A variant of Minimax that counts only pairwise opposition, not opposition minus support. It fails the Condorcet
   * criterion but meets later-no-harm.
   */
  MINIMAX_ALTERNATIVE(
      RANKING,
      EnumSet.of(MAJORITY_WINNER, CONDORCET_WINNER, MONOTONE)
  ),
  COPELAND(
      RANKING,
      EnumSet.of(
          MAJORITY_WINNER, MAJORITY_LOSER, MUTUAL_MAJORITY, CONDORCET_WINNER, CONDORCET_LOSER,
          SMITH, SMITH_IIA,
          MONOTONE
      )
  ),
  /**
   * Black's method is an election method proposed by Duncan Black in 1958 as a compromise between the Condorcet
   * method and the Borda count. This method selects a Condorcet winner. If a Condorcet winner does not exist, then
   * the candidate with the highest Borda score is selected.
   */
  BLACK(
      RANKING,
      EnumSet.of(MAJORITY_WINNER, MAJORITY_LOSER, CONDORCET_WINNER, CONDORCET_LOSER, MONOTONE)
  ),
  KEMENY_YOUNG(
      RANKING,
      EnumSet.of(
          MAJORITY_WINNER, MAJORITY_LOSER, MUTUAL_MAJORITY, CONDORCET_WINNER, CONDORCET_LOSER,
          SMITH, SMITH_IIA, LIIA,
          MONOTONE
      )
  ),
  RANKED_PAIRS(
      RANKING,
      EnumSet.of(
          MAJORITY_WINNER, MAJORITY_LOSER, MUTUAL_MAJORITY, CONDORCET_WINNER, CONDORCET_LOSER,
          SMITH, SMITH_IIA, LIIA,
          CLONE_PROOF, MONOTONE
      )
  ),
  SCHULZE(
      RANKING,
      EnumSet.of(
          MAJORITY_WINNER, MAJORITY_LOSER, MUTUAL_MAJORITY, CONDORCET_WINNER, CONDORCET_LOSER,
          SMITH, SMITH_IIA,
          CLONE_PROOF, MONOTONE
      )
  ),
  BORDA(
      RANKING,
      EnumSet.of(MAJORITY_LOSER, CONDORCET_LOSER, MONOTONE, PARTICIPATION, LATER_NO_HELP)
  ),
  BUCKLIN(
      RANKING,
      EnumSet.of(MAJORITY_WINNER, MAJORITY_LOSER, MUTUAL_MAJORITY, MONOTONE, LATER_NO_HELP)
  ),
  /**
   * Approval voting is a single-winner rated voting system where voters can approve of as many candidates as they
   * like, rather than being restricted to selecting only one. Each voter can cast a vote for every candidate they
   * approve of, and the candidate with the most approval votes wins the election. This method is designed to allow
   * voters to express their support for multiple candidates, while both using a simple ballot format and being easy
   * to count.
   */
  APPROVAL(
      APPROVALS,
      EnumSet.of(
          MAJORITY_WINNER, IIA, LIIA, CLONE_PROOF, MONOTONE, PARTICIPATION, LATER_NO_HELP,
          NO_FAVORITE_BETRAYAL)
  ),
  MAJORITY_JUDGEMENT(
      SCORES,
      EnumSet.of(IIA, LIIA, CLONE_PROOF, MONOTONE, LATER_NO_HELP, NO_FAVORITE_BETRAYAL)
  ),
  SCORE(
      SCORES,
      EnumSet.of(IIA, LIIA, CLONE_PROOF, MONOTONE, PARTICIPATION, LATER_NO_HELP,
          NO_FAVORITE_BETRAYAL)
  ),
  STAR(
      SCORES,
      EnumSet.of(MAJORITY_LOSER, CONDORCET_LOSER, MONOTONE)
  ),
  QUADRATIC(
      CREDITS,
      EnumSet.of(MONOTONE, PARTICIPATION)
  ),
  /**
   * A randomly chosen ballot determines the winner.
   * <p>
   * This and closely related methods are of mathematical interest and included here to demonstrate that even
   * unreasonable methods can pass voting method criteria.
   */
  RANDOM_BALLOT(
      SINGLE_MARK,
      EnumSet.of(IIA, LIIA, CLONE_PROOF, MONOTONE, PARTICIPATION, LATER_NO_HARM, LATER_NO_HELP,
          NO_FAVORITE_BETRAYAL)
  ),
  /**
   * Where a winner is randomly chosen from the candidates.
   * <p>
   * Sortition is included to demonstrate that even non-voting methods can pass some criteria.
   */
  SORTITION(
      NONE,
      EnumSet.of(IIA, LIIA, MONOTONE, PARTICIPATION, LATER_NO_HARM, LATER_NO_HELP,
          NO_FAVORITE_BETRAYAL)
  );

  private final SingleWinnerVotingSystemBallotType ballotType;

  private final EnumSet<SingleWinnerVotingSystemCriterion> fulfilledCriteria;

  SingleWinnerVotingSystemMethod(
      SingleWinnerVotingSystemBallotType ballotType,
      EnumSet<SingleWinnerVotingSystemCriterion> fulfilledCriteria
  ) {
    this.ballotType = ballotType;
    this.fulfilledCriteria = fulfilledCriteria;
  }

  /*
   * NOTE
   *
   * Condorcet's criterion is incompatible with the consistency, participation, later-no-harm,
   * later-no-help, and sincere favorite criteria.
   *
   * QUESTION: What do I do with that information?
   */

  /*
   * NOTE
   *
   * In MAJORITY_JUDGEMENT, RANKED_PAIRS, and SCHULZE voting, there is always a regret-free, semi-honest ballot for
   * any voter, holding all other ballots constant and assuming they know enough about how others will vote.
   * Under such circumstances, there is always at least one way for a voter to participate without grading any
   * less-preferred candidate above any more-preferred one.
   *
   * QUESTION: Does this mean they should have PARTICIPATION or not?
   */

  /*
   * NOTE
   *
   * MAJORITY_JUDGEMENT may elect a candidate uniquely least-preferred by over half of voters,
   * but it never elects the candidate uniquely bottom-rated by over half of voters.
   * MAJORITY_JUDGEMENT also fails the mutual majority criterion,
   * but satisfies the criterion if the majority ranks the mutually favored set
   * above a given absolute grade and all others below that grade.
   *
   * QUESTION: Should we create any alternatives / would they have MAJORITY_LOSER or MUTUAL_MAJORITY?
   */

  /*
   * NOTE
   *
   * APPROVAL, SCORE, and MAJORITY_JUDGEMENT satisfy IIA
   * if it is assumed that voters rate candidates independently using their own absolute scale.
   * For this to hold, in some elections, some voters must use less than their full voting power
   * despite having meaningful preferences among viable candidates.
   *
   * QUESTION: How does this affect their IIA / LIIA status? Right now they're given both.
   */

  /*
   * NOTE
   *
   * QUADRATIC is not compatible with LATER_NO_HARM and LATER_NO_HELP.
   *
   * QUESTION: Should we include it then? I don't know. Add new enum LATER_N_A?
   */
}
