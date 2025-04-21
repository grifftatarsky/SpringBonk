package com.gpt.springbonk.exception;

public class DuplicateVoteException extends RuntimeException {
  public DuplicateVoteException(String message) {
    super(message);
  }
}
