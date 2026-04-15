package com.gpt.springbonk.service.openlibrary;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Thin client for Open Library's Works API. Used to hydrate the blurb
 * (description) of a book after a user picks it from a search result.
 *
 * Open Library's search API doesn't return `description` (the SOLR index
 * doesn't carry it), so we have to make a follow-up call to
 * {@code https://openlibrary.org/works/{key}.json} to pull the full work
 * record, which DOES include a description.
 *
 * The description can come back in one of two shapes:
 *   - a plain string
 *   - an object like {"type": "/type/text", "value": "..."}
 * We normalize both to a plain string.
 *
 * Per Open Library's guidance for identified callers, every request
 * carries a {@code User-Agent} header with app name + contact email so
 * they can reach us if we start hammering the API. Identified callers
 * get a 3x request budget.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenLibraryClient {
  public static final String USER_AGENT =
      "AKIRA Ranked Choice Book Club Tool (grifftatarsky@gmail.com)";

  private static final String WORKS_BASE = "https://openlibrary.org/works/";

  private final ObjectMapper objectMapper = new ObjectMapper();
  private RestClient restClient;

  @PostConstruct
  void init() {
    this.restClient = RestClient.builder()
        .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
        .defaultHeader(HttpHeaders.ACCEPT, "application/json")
        .build();
  }

  /**
   * Fetch the description for a work by its Open Library key.
   * Returns {@code Optional.empty()} when the work doesn't exist, the
   * description isn't set, or any network/parse error happens (logged).
   *
   * Callers should NOT treat a failure here as fatal — if Open Library is
   * down, we just fall back to an empty blurb in the book record.
   *
   * @param workKey bare work id like {@code OL45804W} — no leading slash.
   */
  public Optional<String> fetchWorkDescription(String workKey) {
    if (workKey == null || workKey.isBlank()) {
      return Optional.empty();
    }
    // Normalize: accept "OL45804W", "/works/OL45804W", "works/OL45804W".
    String normalized = workKey.replaceFirst("^/?works/", "").replaceFirst("^/", "");
    String url = WORKS_BASE + normalized + ".json";
    try {
      String body = restClient.get()
          .uri(url)
          .retrieve()
          .body(String.class);
      if (body == null || body.isBlank()) {
        return Optional.empty();
      }
      JsonNode root = objectMapper.readTree(body);
      JsonNode description = root.get("description");
      if (description == null || description.isNull()) {
        return Optional.empty();
      }
      // Plain string.
      if (description.isTextual()) {
        String value = description.asText();
        return value.isBlank() ? Optional.empty() : Optional.of(value);
      }
      // Object form: {"type": "/type/text", "value": "..."}
      JsonNode value = description.get("value");
      if (value != null && value.isTextual()) {
        String text = value.asText();
        return text.isBlank() ? Optional.empty() : Optional.of(text);
      }
      return Optional.empty();
    } catch (RestClientException e) {
      log.warn("[OpenLibraryClient] Failed to fetch description for {}: {}", workKey, e.getMessage());
      return Optional.empty();
    } catch (Exception e) {
      log.warn("[OpenLibraryClient] Failed to parse description for {}: {}", workKey, e.getMessage());
      return Optional.empty();
    }
  }

  /** DTO holder for the bits of the work JSON we care about. */
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static record WorkDescription(String value) {
  }
}
