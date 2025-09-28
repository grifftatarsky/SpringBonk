package com.gpt.springbonk.service;

import com.gpt.springbonk.model.BallotBox;
import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.record.ElectionResultRecord;
import java.util.List;

public abstract class AbstractSingleWinnerElectionService {
  protected abstract BallotBox processBallots(
      List<Candidate> candidates
  );

  protected abstract ElectionResultRecord conductElection(
      Election election
  );
}
