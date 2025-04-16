package com.gpt.springbonk.unit;


import com.gpt.springbonk.exception.ElectionCannotBeCompletedException;
import com.gpt.springbonk.model.BallotBox;
import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.ElectionResult;
import com.gpt.springbonk.model.RoundResult;
import com.gpt.springbonk.model.Vote;
import com.gpt.springbonk.model.VoteCount;
import com.gpt.springbonk.security.keycloak.KeycloakUser;
import com.gpt.springbonk.service.electoral.single.InstantRunoffService;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static com.gpt.springbonk.constant.enumeration.process.EliminationMessage.NO_TIE_ELIMINATION_MESSAGE;
import static com.gpt.springbonk.constant.enumeration.process.EliminationMessage.TIE_ALL_WAY_TIE_ELIMINATION_MESSAGE;
import static com.gpt.springbonk.constant.enumeration.process.EliminationMessage.TIE_ELIMINATION_MESSAGE;
import static com.gpt.springbonk.constant.enumeration.process.EliminationMessage.WINNER_ATTRITION;
import static com.gpt.springbonk.constant.enumeration.process.EliminationMessage.WINNER_MAJORITY;
import static com.gpt.springbonk.exception.ElectionCannotBeCompletedException.FULL_WAY_TIE;
import static com.gpt.springbonk.exception.ElectionCannotBeCompletedException.NO_CANDIDATES_MESSAGE;
import static com.gpt.springbonk.exception.ElectionCannotBeCompletedException.NO_ELECTION_MESSAGE;
import static com.gpt.springbonk.exception.ElectionCannotBeCompletedException.NO_VOTES_MESSAGE;
import static com.gpt.springbonk.service.BallotUtility.conductRound;
import static com.gpt.springbonk.service.BallotUtility.processCandidates;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Slf4j
class ElectionSuiteTests
{
    private Election election;

    private Candidate blue;
    private Candidate red;
    private Candidate green;
    private Candidate yellow;

    private Book blueBook;
    private Book redBook;
    private Book greenBook;
    private Book yellowBook;

    private KeycloakUser jim;
    private KeycloakUser jane;
    private KeycloakUser john;
    private KeycloakUser jade;

    @BeforeEach
    void validTestElection()
    {
        // Electors
        jim = new KeycloakUser();
        jim.setId(UUID.randomUUID());
        jim.setUsername("jim");

        jane = new KeycloakUser();
        jane.setId(UUID.randomUUID());
        jane.setUsername("jane");

        john = new KeycloakUser();
        john.setId(UUID.randomUUID());
        john.setUsername("john");

        jade = new KeycloakUser();
        jade.setId(UUID.randomUUID());
        jade.setUsername("jade");

        // Election
        election = new Election();

        // Books
        blueBook = new Book("The Blue Book", "A Blue Rat");
        redBook = new Book("The Red Book", "A Red Capybara");
        yellowBook = new Book("The Yellow Book", "A Yellow Porcupine");
        greenBook = new Book("The Green Book", "A Green Hedgehog");

        // Candidates
        blue = new Candidate(election, blueBook, jim);
        blue.setId(UUID.randomUUID());

        red = new Candidate(election, redBook, jane);
        red.setId(UUID.randomUUID());

        yellow = new Candidate(election, yellowBook, john);
        yellow.setId(UUID.randomUUID());

        green = new Candidate(election, greenBook, jade);
        green.setId(UUID.randomUUID());

        // Populate
        election.setCandidates(List.of(blue, red, yellow, green));
    }

    @Nested
    class SetupTests
    {
        @Test
        void shouldSucceed()
        {

            assertEquals(election.getCandidates(), List.of(blue, red, yellow, green));

            assertEquals(blue.getBook(), blueBook);
            assertEquals(red.getBook(), redBook);
            assertEquals(yellow.getBook(), yellowBook);
            assertEquals(green.getBook(), greenBook);

            assertEquals(blue.getNominator(), jim);
            assertEquals(red.getNominator(), jane);
            assertEquals(yellow.getNominator(), john);
            assertEquals(green.getNominator(), jade);
        }

        @Test
        void withValidVoteSlate_1_shouldSucceed()
        {
            voteSlateValid_1();

            assertEquals(4, blue.getVotes().size());
            assertEquals(4, red.getVotes().size());
            assertEquals(4, yellow.getVotes().size());
            assertEquals(4, green.getVotes().size());
        }

        @Test
        void withValidVoteSlate_2_shouldSucceed()
        {
            voteSlateValid_2();

            assertEquals(4, blue.getVotes().size());
            assertEquals(4, red.getVotes().size());
            assertEquals(4, yellow.getVotes().size());
            assertEquals(4, green.getVotes().size());
        }

        @Test
        void withValidVoteSlate_3_shouldSucceed()
        {
            voteSlateValid_3();

            assertEquals(4, blue.getVotes().size());
            assertEquals(4, red.getVotes().size());
            assertEquals(4, yellow.getVotes().size());
            assertEquals(4, green.getVotes().size());
        }
    }

    @Nested
    class BallotUtilityTests
    {
        @Test
        void processCandidates_shouldSucceed_withValidVoteSlate_1()
        {
            voteSlateValid_1();

            // Process candidates
            BallotBox ballotBox = processCandidates(election.getCandidates());

            // Verify BallotBox
            assertEquals(4, ballotBox.getTotalVotes(), "Ballot box should have 4 voters");
            assertEquals(4, ballotBox.getCandidates().size(), "Ballot box should have 4 candidates");

            // Verify candidates in BallotBox
            assertTrue(ballotBox.getCandidates().containsValue(blue));
            assertTrue(ballotBox.getCandidates().containsValue(red));
            assertTrue(ballotBox.getCandidates().containsValue(green));
            assertTrue(ballotBox.getCandidates().containsValue(yellow));

            // Verify Jim's preferences
            List<UUID> jimPreferences = ballotBox.getBallots().get(jim.getId());
            assertNotNull(jimPreferences, "Jim's preferences should not be null");
            assertEquals(4, jimPreferences.size(), "Jim should have 4 preferences");
            assertEquals(blue.getId(), jimPreferences.getFirst(), "Jim's first preference should be blue");
            assertEquals(red.getId(), jimPreferences.get(1), "Jim's second preference should be red");
            assertEquals(green.getId(), jimPreferences.get(2), "Jim's third preference should be green");
            assertEquals(yellow.getId(), jimPreferences.get(3), "Jim's fourth preference should be yellow");

            // Verify Jane's preferences
            List<UUID> janePreferences = ballotBox.getBallots().get(jane.getId());
            assertNotNull(janePreferences, "Jane's preferences should not be null");
            assertEquals(4, janePreferences.size(), "Jane should have 4 preferences");
            assertEquals(green.getId(), janePreferences.getFirst(), "Jane's first preference should be green");
            assertEquals(yellow.getId(), janePreferences.get(1), "Jane's second preference should be yellow");
            assertEquals(blue.getId(), janePreferences.get(2), "Jane's third preference should be blue");
            assertEquals(red.getId(), janePreferences.get(3), "Jane's fourth preference should be red");

            // Verify John's preferences
            List<UUID> johnPreferences = ballotBox.getBallots().get(john.getId());
            assertNotNull(johnPreferences, "John's preferences should not be null");
            assertEquals(4, johnPreferences.size(), "John should have 4 preferences");
            assertEquals(blue.getId(), johnPreferences.getFirst(), "John's first preference should be blue");
            assertEquals(green.getId(), johnPreferences.get(1), "John's second preference should be green");
            assertEquals(yellow.getId(), johnPreferences.get(2), "John's third preference should be yellow");
            assertEquals(red.getId(), johnPreferences.get(3), "John's fourth preference should be red");

            // Verify Jade's preferences
            List<UUID> jadePreferences = ballotBox.getBallots().get(jade.getId());
            assertNotNull(jadePreferences, "Jade's preferences should not be null");
            assertEquals(4, jadePreferences.size(), "Jade should have 4 preferences");
            assertEquals(red.getId(), jadePreferences.getFirst(), "Jade's first preference should be red");
            assertEquals(green.getId(), jadePreferences.get(1), "Jade's second preference should be green");
            assertEquals(blue.getId(), jadePreferences.get(2), "Jade's third preference should be blue");
            assertEquals(yellow.getId(), jadePreferences.get(3), "Jade's fourth preference should be yellow");
        }

        @Test
        void processCandidates_shouldSucceed_withValidVoteSlate_2()
        {
            voteSlateValid_2();

            BallotBox ballotBox = processCandidates(election.getCandidates());

            assertEquals(4, ballotBox.getTotalVotes(), "Ballot box should have 4 voters");
            assertEquals(4, ballotBox.getCandidates().size(), "Ballot box should have 4 candidates");

            assertTrue(ballotBox.getCandidates().containsValue(blue));
            assertTrue(ballotBox.getCandidates().containsValue(red));
            assertTrue(ballotBox.getCandidates().containsValue(green));
            assertTrue(ballotBox.getCandidates().containsValue(yellow));

            List<UUID> jimPreferences = ballotBox.getBallots().get(jim.getId());
            assertNotNull(jimPreferences, "Jim's preferences should not be null");
            assertEquals(4, jimPreferences.size(), "Jim should have 4 preferences");
            assertEquals(blue.getId(), jimPreferences.getFirst(), "Jim's first preference should be blue");
            assertEquals(red.getId(), jimPreferences.get(1), "Jim's second preference should be red");
            assertEquals(yellow.getId(), jimPreferences.get(2), "Jim's third preference should be yellow");
            assertEquals(green.getId(), jimPreferences.get(3), "Jim's fourth preference should be green");

            List<UUID> janePreferences = ballotBox.getBallots().get(jane.getId());
            assertNotNull(janePreferences, "Jane's preferences should not be null");
            assertEquals(4, janePreferences.size(), "Jane should have 4 preferences");
            assertEquals(green.getId(), janePreferences.getFirst(), "Jane's first preference should be green");
            assertEquals(red.getId(), janePreferences.get(1), "Jane's second preference should be red");
            assertEquals(blue.getId(), janePreferences.get(2), "Jane's third preference should be blue");
            assertEquals(yellow.getId(), janePreferences.get(3), "Jane's fourth preference should be yellow");

            // Verify John's preferences
            List<UUID> johnPreferences = ballotBox.getBallots().get(john.getId());
            assertNotNull(johnPreferences, "John's preferences should not be null");
            assertEquals(4, johnPreferences.size(), "John should have 4 preferences");
            assertEquals(red.getId(), johnPreferences.getFirst(), "John's first preference should be red");
            assertEquals(green.getId(), johnPreferences.get(1), "John's second preference should be green");
            assertEquals(yellow.getId(), johnPreferences.get(2), "John's third preference should be yellow");
            assertEquals(blue.getId(), johnPreferences.get(3), "John's fourth preference should be blue");

            // Verify Jade's preferences
            List<UUID> jadePreferences = ballotBox.getBallots().get(jade.getId());
            assertNotNull(jadePreferences, "Jade's preferences should not be null");
            assertEquals(4, jadePreferences.size(), "Jade should have 4 preferences");
            assertEquals(yellow.getId(), jadePreferences.getFirst(), "Jade's first preference should be yellow");
            assertEquals(blue.getId(), jadePreferences.get(1), "VJade's second preference should be blue");
            assertEquals(green.getId(), jadePreferences.get(2), "Jade's third preference should be green");
            assertEquals(red.getId(), jadePreferences.get(3), "Jade's fourth preference should be red");
        }

        @Test
        void processCandidates_shouldSucceed_withValidVoteSlate_3()
        {
            voteSlateValid_3();

            BallotBox ballotBox = processCandidates(election.getCandidates());

            // Verify BallotBox
            assertEquals(4, ballotBox.getTotalVotes(), "Ballot box should have 4 voters");
            assertEquals(4, ballotBox.getCandidates().size(), "Ballot box should have 4 candidates");

            // Verify candidates in BallotBox
            assertTrue(ballotBox.getCandidates().containsValue(blue));
            assertTrue(ballotBox.getCandidates().containsValue(red));
            assertTrue(ballotBox.getCandidates().containsValue(green));
            assertTrue(ballotBox.getCandidates().containsValue(yellow));

            // Verify Jim's preferences
            List<UUID> jimPreferences = ballotBox.getBallots().get(jim.getId());
            assertNotNull(jimPreferences, "Jim's preferences should not be null");
            assertEquals(4, jimPreferences.size(), "Jim should have 4 preferences");
            assertEquals(blue.getId(), jimPreferences.getFirst(), "Jim's first preference should be blue");
            assertEquals(red.getId(), jimPreferences.get(1), "Jim's second preference should be red");
            assertEquals(yellow.getId(), jimPreferences.get(2), "Jim's third preference should be yellow");
            assertEquals(green.getId(), jimPreferences.get(3), "Jim's fourth preference should be green");

            // Verify Jane's preferences
            List<UUID> janePreferences = ballotBox.getBallots().get(jane.getId());
            assertNotNull(janePreferences, "Jane's preferences should not be null");
            assertEquals(4, janePreferences.size(), "Jane should have 4 preferences");
            assertEquals(blue.getId(), janePreferences.getFirst(), "Jane's first preference should be blue");
            assertEquals(red.getId(), janePreferences.get(1), "Jane's second preference should be red");
            assertEquals(green.getId(), janePreferences.get(2), "Jane's third preference should be green");
            assertEquals(yellow.getId(), janePreferences.get(3), "Jane's fourth preference should be yellow");

            // Verify John's preferences
            List<UUID> johnPreferences = ballotBox.getBallots().get(john.getId());
            assertNotNull(johnPreferences, "John's preferences should not be null");
            assertEquals(4, johnPreferences.size(), "John should have 4 preferences");
            assertEquals(blue.getId(), johnPreferences.getFirst(), "John's first preference should be blue");
            assertEquals(green.getId(), johnPreferences.get(1), "John's second preference should be green");
            assertEquals(yellow.getId(), johnPreferences.get(2), "John's third preference should be yellow");
            assertEquals(red.getId(), johnPreferences.get(3), "John's fourth preference should be red");

            // Verify Jade's preferences
            List<UUID> jadePreferences = ballotBox.getBallots().get(jade.getId());
            assertNotNull(jadePreferences, "Jade's preferences should not be null");
            assertEquals(4, jadePreferences.size(), "Jade should have 4 preferences");
            assertEquals(yellow.getId(), jadePreferences.getFirst(), "Jade's first preference should be yellow");
            assertEquals(blue.getId(), jadePreferences.get(1), "VJade's second preference should be blue");
            assertEquals(green.getId(), jadePreferences.get(2), "Jade's third preference should be green");
            assertEquals(red.getId(), jadePreferences.get(3), "Jade's fourth preference should be red");
        }

        @Test
        void processCandidates_shouldFail_dueToNull_withNoCandidates()
        {
            Exception e = assertThrows(ElectionCannotBeCompletedException.class, () -> processCandidates(null));
            assertEquals(NO_CANDIDATES_MESSAGE, e.getMessage());
        }

        @Test
        void processCandidates_shouldFail_dueToNull_withNoVotes()
        {
            Exception e = assertThrows(
                ElectionCannotBeCompletedException.class, () -> processCandidates(election.getCandidates()));
            assertEquals(NO_VOTES_MESSAGE, e.getMessage());
        }

        @Test
        void processCandidates_shouldSucceed_withValidVoteSlate_1_withRound_1()
        {
            voteSlateValid_1();

            BallotBox ballotBox = processCandidates(election.getCandidates());

            VoteCount voteCount = conductRound(ballotBox, new ArrayList<>(), 1, 0);

            assertEquals(1, voteCount.getRoundNumber(), "The round should be 1.");
            assertEquals(4, voteCount.getCurrentVotesSize(), "There should be 4 votes in the round.");

            Map<UUID, Integer> firstRoundVotes = voteCount.getCurrentVotes();

            assertEquals(2, firstRoundVotes.get(blue.getId()), "Blue should have 2 votes in first round");
            assertEquals(1, firstRoundVotes.get(red.getId()), "Red should have 1 vote in first round");
            assertEquals(1, firstRoundVotes.get(green.getId()), "Green should have 1 vote in first round");
            assertEquals(
                0, firstRoundVotes.getOrDefault(yellow.getId(), 0), "Yellow should have 0 votes in first round");
        }

        @Test
        void processCandidates_shouldSucceed_withValidVoteSlate_2_withRound_1()
        {
            voteSlateValid_2();

            BallotBox ballotBox = processCandidates(election.getCandidates());

            VoteCount voteCount = conductRound(ballotBox, new ArrayList<>(), 1, 0);

            assertEquals(1, voteCount.getRoundNumber(), "The round should be 1.");
            assertEquals(4, voteCount.getCurrentVotesSize(), "There should be 4 votes in the round.");

            Map<UUID, Integer> firstRoundVotes = voteCount.getCurrentVotes();

            assertEquals(1, firstRoundVotes.get(blue.getId()), "Blue should have 1 votes in first round");
            assertEquals(1, firstRoundVotes.get(red.getId()), "Red should have 1 vote in first round");
            assertEquals(1, firstRoundVotes.get(green.getId()), "Green should have 1 vote in first round");
            assertEquals(
                1, firstRoundVotes.getOrDefault(yellow.getId(), 0), "Yellow should have 1 votes in first round");
        }

        @Test
        void processCandidates_shouldSucceed_withValidVoteSlate_3_withRound_1()
        {
            voteSlateValid_3();

            BallotBox ballotBox = processCandidates(election.getCandidates());

            VoteCount voteCount = conductRound(ballotBox, new ArrayList<>(), 1, 0);

            assertEquals(1, voteCount.getRoundNumber(), "The round should be 1.");
            assertEquals(4, voteCount.getCurrentVotesSize(), "There should be 4 votes in the round.");

            Map<UUID, Integer> firstRoundVotes = voteCount.getCurrentVotes();

            assertEquals(3, firstRoundVotes.get(blue.getId()), "Blue should have 1 votes in first round");
            assertEquals(0, firstRoundVotes.getOrDefault(red.getId(), 0), "Red should have 1 vote in first round");
            assertEquals(0, firstRoundVotes.getOrDefault(green.getId(), 0), "Green should have 1 vote in first round");
            assertEquals(1, firstRoundVotes.get(yellow.getId()), "Yellow should have 1 vote in first round");
        }
    }

    @Nested
    class InstantRunoffServiceTests
    {
        @Test
        void conductElection_shouldSucceed_withValidVoteSlate_1()
        {
            // Round one, blue wins but not outright. Yellow has least, elim.

            // New slates for Round 2
            // Jim blue > red > green
            // Jane green > blue > red
            // John blue > green > red
            // Jade red > green > blue

            // Round two is essentially a repeat, but green and red are tied for last. Elim. Blue remains.

            // Round 3 is blue's because:
            // Jim blue
            // Jane blue
            // John blue
            // Jade blue

            InstantRunoffService instantRunoffService = new InstantRunoffService();

            voteSlateValid_1();

            ElectionResult result = instantRunoffService.conductElection(election);

            assertNotNull(result, "The ElectionResult should not be null.");
            assertEquals(blue.getId(), result.getWinnerId(), "The victor should be blue.");

            List<RoundResult> roundResults = result.getRounds();

            assertEquals(3, roundResults.size(), "The election should have 3 rounds.");

            // Round 1
            // The yellow book should be eliminated.
            RoundResult roundOne = roundResults.getFirst();
            log.info(roundOne.toString());
            assertTrue(
                roundOne.getEliminatedCandidateIds().contains(yellow.getId()),
                "Yellow should be eliminated in Round 1."
            );
            assertEquals(NO_TIE_ELIMINATION_MESSAGE, roundOne.getEliminationMessage());

            // Round 2
            RoundResult roundTwo = roundResults.get(1);
            log.info(roundTwo.toString());
            assertTrue(
                roundTwo.getEliminatedCandidateIds().contains(red.getId()) && roundTwo.getEliminatedCandidateIds()
                                                                                      .contains(green.getId()),
                "Green and Red should be eliminated in Round 2."
            );
            assertEquals(TIE_ELIMINATION_MESSAGE, roundTwo.getEliminationMessage());

            // Round 3
            RoundResult roundThree = roundResults.get(2);
            log.info(roundThree.toString());
            assertEquals(WINNER_ATTRITION, roundThree.getEliminationMessage());
            assertNull(roundThree.getEliminatedCandidateIds(), "Victory round should not have eliminations.");
        }

        @Test
        void conductElection_shouldSucceed_withValidVoteSlate_2()
        {
            // Round one is an all way tie.

            // Jim_ blue > red > yellow > green
            // Jane green > red > blue > yellow
            // John red > green > yellow > blue
            // Jade yellow > blue > green > red

            // Round 2 with lookahead...yellow is eliminated.
            // Jim_ blue > red > yellow > green
            // Jane green >red > blue > yellow
            // John red > green > yellow > blue
            // Jade yellow > blue > green > red

            // Round 3...red and green are eliminated.
            // Jim_ blue > red > green
            // Jane green >red > blue
            // John red > green > blue
            // Jade blue > green > red

            // Round 4
            // Jim_ blue
            // Jane blue
            // John blue
            // Jade blue

            InstantRunoffService instantRunoffService = new InstantRunoffService();

            voteSlateValid_2();

            ElectionResult result = instantRunoffService.conductElection(election);

            assertNotNull(result, "The ElectionResult should not be null.");
            assertEquals(blue.getId(), result.getWinnerId(), "The victor should be blue.");

            List<RoundResult> roundResults = result.getRounds();

            assertEquals(4, roundResults.size(), "The election should have 4 rounds.");

            // Round 1
            // Flub
            RoundResult roundOne = roundResults.getFirst();
            assertEquals(
                roundOne.getEliminatedCandidateIds(), Collections.emptyList(),
                "Flub round should not have eliminations"
            );
            assertEquals(TIE_ALL_WAY_TIE_ELIMINATION_MESSAGE, roundOne.getEliminationMessage());

            // Round 2
            RoundResult roundTwo = roundResults.get(1);
            assertTrue(
                roundTwo.getEliminatedCandidateIds().contains(yellow.getId()),
                "Yellow should be eliminated in Round 2."
            );
            assertEquals(NO_TIE_ELIMINATION_MESSAGE, roundTwo.getEliminationMessage());

            // Round 3
            RoundResult roundThree = roundResults.get(2);
            assertTrue(
                roundThree.getEliminatedCandidateIds().contains(red.getId()) && roundThree.getEliminatedCandidateIds()
                                                                                          .contains(green.getId()),
                "Green and Red should be eliminated in Round 3."
            );
            assertEquals(TIE_ELIMINATION_MESSAGE, roundThree.getEliminationMessage());

            // Round 4
            RoundResult roundFour = roundResults.get(3);
            assertEquals(WINNER_ATTRITION, roundFour.getEliminationMessage());
            assertNull(roundFour.getEliminatedCandidateIds(), "Victory round should not have eliminations.");
        }

        @Test
        void conductElection_shouldSucceed_withValidVoteSlate_3()
        {
            // Outright majority on Blue.

            InstantRunoffService instantRunoffService = new InstantRunoffService();

            voteSlateValid_3();

            ElectionResult result = instantRunoffService.conductElection(election);

            assertNotNull(result, "The ElectionResult should not be null.");
            assertEquals(blue.getId(), result.getWinnerId(), "The victor should be blue.");

            List<RoundResult> roundResults = result.getRounds();

            assertEquals(1, roundResults.size(), "The election should have 1 round.");

            // Round 1
            // The blue book should have won.
            RoundResult roundOne = roundResults.getFirst();
            assertEquals(WINNER_MAJORITY, roundOne.getEliminationMessage());
            assertNull(roundOne.getEliminatedCandidateIds(), "Victory round should not have eliminations.");
        }

        @Test
        void conductElection_shouldFail_dueToTie_withValidVoteSlate_4()
        {
            // Full tie
            InstantRunoffService instantRunoffService = new InstantRunoffService();

            voteSlateValid_4();

            Exception e = assertThrows(
                ElectionCannotBeCompletedException.class, () -> instantRunoffService.conductElection(election));
            assertEquals(FULL_WAY_TIE, e.getMessage());
        }

        @Test
        void conductElection_shouldFail_dueToNull_withNoElection()
        {
            election = null;
            InstantRunoffService instantRunoffService = new InstantRunoffService();

            Exception e = assertThrows(
                ElectionCannotBeCompletedException.class, () -> instantRunoffService.conductElection(election));
            assertEquals(NO_ELECTION_MESSAGE, e.getMessage());
        }

        @Test
        void conductElection_shouldFail_dueToNull_withEmptyCandidateList()
        {
            election.setCandidates(new ArrayList<>());
            InstantRunoffService instantRunoffService = new InstantRunoffService();

            Exception e = assertThrows(
                ElectionCannotBeCompletedException.class, () -> instantRunoffService.conductElection(election));
            assertEquals(NO_CANDIDATES_MESSAGE, e.getMessage());
        }

        @Test
        void conductElection_shouldFail_dueToNull_withNullCandidateList()
        {
            election.setCandidates(null);
            InstantRunoffService instantRunoffService = new InstantRunoffService();

            Exception e = assertThrows(
                ElectionCannotBeCompletedException.class, () -> instantRunoffService.conductElection(election));
            assertEquals(NO_CANDIDATES_MESSAGE, e.getMessage());
        }

        @Test
        void conductElection_shouldFail_dueToNull_withNoVotes()
        {
            InstantRunoffService instantRunoffService = new InstantRunoffService();

            Exception e = assertThrows(
                ElectionCannotBeCompletedException.class, () -> instantRunoffService.conductElection(election));
            assertEquals(NO_VOTES_MESSAGE, e.getMessage());
        }
    }

    private void voteSlateValid_1()
    {
        /*
         * Vote tallies by candidate and rank:
         *
         * | Candidate | Rank 1 | Rank 2 | Rank 3 | Rank 4 |
         * |-----------|--------|--------|--------|--------|
         * | Blue      | 2      | 0      | 2      | 0      |
         * | Red       | 1      | 1      | 0      | 2      |
         * | Green     | 1      | 2      | 1      | 0      |
         * | Yellow    | 0      | 1      | 1      | 2      |
         *
         * IR: Blue, Attrition.
         */

        // Jim preferences: blue > red > green > yellow
        processVotes(
            blue, red, green, yellow,
            jim
        );

        // Jane preferences: green > yellow > blue > red
        processVotes(
            green, yellow, blue, red,
            jane
        );

        // John preferences: blue > green > yellow > red
        processVotes(
            blue, green, yellow, red,
            john
        );

        // Jade preferences: red > green > blue > yellow
        processVotes(
            red, green, blue, yellow,
            jade
        );
    }

    private void voteSlateValid_2()
    {
        /*
         * Vote tallies by candidate and rank:
         *
         * | Candidate | Rank 1 | Rank 2 | Rank 3 | Rank 4 |
         * |-----------|--------|--------|--------|--------|
         * | Blue      | 1      | 1      | 1      | 1      |
         * | Red       | 1      | 2      | 0      | 1      |
         * | Green     | 1      | 1      | 1      | 1      |
         * | Yellow    | 1      | 0      | 0      | 1      |
         *
         * IR: Blue, Attrition.
         */

        // Jim preferences: blue > red > yellow > green
        processVotes(
            blue, red, yellow, green,
            jim
        );

        // Jane preferences: green > red > blue > yellow
        processVotes(
            green, red, blue, yellow,
            jane
        );

        // John preferences: red > green > yellow > blue
        processVotes(
            red, green, yellow, blue,
            john
        );

        // Jade preferences: yellow > blue > green > red
        processVotes(
            yellow, blue, green, red,
            jade
        );
    }

    private void voteSlateValid_3()
    {
        /*
         * Vote tallies by candidate and rank:
         *
         * | Candidate | Rank 1 | Rank 2 | Rank 3 | Rank 4 |
         * |-----------|--------|--------|--------|--------|
         * | Blue      | 1      | 1      | 1      | 1      |
         * | Red       | 1      | 2      | 0      | 1      |
         * | Green     | 1      | 1      | 1      | 1      |
         * | Yellow    | 1      | 0      | 0      | 1      |
         *
         * IR: Blue, Majority.
         */

        // Jim preferences: blue > red > yellow > green
        processVotes(
            blue, red, yellow, green,
            jim
        );

        // Jane preferences: blue > red > green > yellow
        processVotes(
            blue, red, green, yellow,
            jane
        );

        // John preferences: blue > green > yellow > red
        processVotes(
            blue, green, yellow, red,
            john
        );

        // Jade preferences: yellow > blue > green > red
        processVotes(
            yellow, blue, green, red,
            jade
        );
    }

    private void voteSlateValid_4()
    {
        // Full tie.

        processVotes(
            blue, red, green, yellow,
            jim
        );

        processVotes(
            red, yellow, yellow, blue,
            jane
        );

        processVotes(
            yellow, green, blue, red,
            john
        );

        processVotes(
            green, blue, red, green,
            jade
        );
    }

    private void processVotes(
        Candidate one,
        Candidate two,
        Candidate three,
        Candidate four,
        KeycloakUser voter
    )
    {
        Vote vote_1 = new Vote(voter, one, 1);
        Vote vote_2 = new Vote(voter, two, 2);
        Vote vote_3 = new Vote(voter, three, 3);
        Vote vote_4 = new Vote(voter, four, 4);

        // These work.
        List<Vote> votes = List.of(vote_1, vote_2, vote_3, vote_4);

        votes.forEach(vote -> vote.getCandidate().addVote(vote));
    }
}