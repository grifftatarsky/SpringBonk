package com.gpt.springbonk.constant.enumeration.system.multiple;

import com.gpt.springbonk.constant.enumeration.system.VotingSystemCriterion;

public enum MultipleWinnerVotingSystemCriterion implements VotingSystemCriterion {
  PROPORTIONAL,
  MONOTONE,
  CONSISTENCY,
  PARTICIPATION,
  NO_FAVORITE_BETRAYAL,
  SEMI_HONEST,
  UNIVERSALLY_LIKED_CANDIDATES
}
