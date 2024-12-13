package com.gpt.springbonk.exception;


public class DuplicateCandidateException extends RuntimeException
{
    public DuplicateCandidateException(String message)
    {
        super(message);
    }
}
