package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.constant.enumeration.election.Status;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.repository.ElectionRepository;
import com.gpt.springbonk.service.ElectionSchedulingService;
import com.gpt.springbonk.service.ElectionService;
import com.gpt.springbonk.service.event.ElectionChangedEvent;
import com.gpt.springbonk.service.event.ElectionDeletedEvent;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ElectionSchedulingServiceImpl implements ElectionSchedulingService {

  /*
   * SEE:
   * https://docs.spring.io/spring-boot/reference/features/task-execution-and-scheduling.html
   * (Details on virtual threading and scheduling)
   */

  // region DI

  private final TaskScheduler scheduler;
  private final ElectionRepository electionRepository;
  private final ElectionService electionService;

  // endregion

  private final Map<UUID, ScheduledFuture<?>> futures = new ConcurrentHashMap<>();

  /// On startup, (re)hydrate schedule for any still-open elections in the future.
  @EventListener(ApplicationReadyEvent.class)
  @Override
  public void bootstrap() {
    log.info("[ElectionSchedulingService] Rehydrating election closure schedule.");
    electionRepository.findAllOpenEndingAfter(ZonedDateTime.now()).forEach(this::scheduleOrRunNow);
  }

  /// Schedule (or reschedule) a single election (C/U ops).
  @Override
  public void schedule(Election election) {
    cancel(election.getId());
    scheduleOrRunNow(election);
  }

  /// Cancel a scheduled closure (D ops).
  @Override
  public void cancel(UUID electionId) {
    var f = futures.remove(electionId);

    if (f != null) {
      f.cancel(false);
      log.debug("Cancelled scheduled closure for election {}", electionId);
    }
  }

  private void scheduleOrRunNow(Election election) {

    if (election.getEndDateTime() == null) return;

    if (election.getStatus() == Status.CLOSED) return;

    Instant when = election.getEndDateTime().toInstant();

    if (when.isBefore(Instant.now())) {
      runCloseOnVirtualThread(election.getId());
      return;
    }

    ScheduledFuture<?> future = scheduler.schedule(
        () -> runCloseOnVirtualThread(election.getId()),
        when
    );
    futures.put(election.getId(), future);
    log.debug("Scheduled closure for election {} at {}", election.getId(),
        election.getEndDateTime());
  }

  private void runCloseOnVirtualThread(UUID electionId) {
    // CHOICE: Heavy work is done in virtual threads regardless of app-wide configuration.
    Thread.startVirtualThread(() -> {
      try {
        electionService.closeElection(electionId);

        futures.remove(electionId);
      } catch (Exception ex) {
        log.error("Failed to close election {}: {}", electionId, ex.getMessage(), ex);
      }
    });
  }

  @EventListener
  public void onElectionChanged(ElectionChangedEvent evt) {
    log.info("[ElectionSchedulingService] Election changed: {}", evt);
    electionRepository.findById(evt.electionId()).ifPresent(this::schedule);
  }

  @EventListener
  public void onElectionDeleted(ElectionDeletedEvent evt) {
    log.info("[ElectionSchedulingService] Election deleted: {}", evt);
    cancel(evt.electionId());
  }
}
