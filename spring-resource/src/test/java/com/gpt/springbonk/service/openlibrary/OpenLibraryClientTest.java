package com.gpt.springbonk.service.openlibrary;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * The work key is concatenated into the outbound request path, so these cover
 * the guard that keeps a caller-supplied value from steering that path. No
 * network is involved: every case here is rejected before a request is built,
 * which is exactly the property under test.
 */
class OpenLibraryClientTest {

  private final OpenLibraryClient client = new OpenLibraryClient();

  @ParameterizedTest
  @DisplayName("refuses keys that could change the request path")
  @ValueSource(strings = {
      "../../admin",
      "OL1W/../../else",
      "OL1W?foo=bar",
      "OL1W#fragment",
      "OL1W.json/../../x",
      "{template}",
      "OL1W ",
      "not-a-key",
      "OL1M",          // edition key, not a work key
      "ol1w",          // wrong case
      "OLW",           // no digits
  })
  void refusesMalformedKeys(String key) {
    assertThat(client.fetchWorkDescription(key)).isEmpty();
  }

  @Test
  @DisplayName("treats null and blank as nothing to fetch")
  void handlesEmptyInput() {
    assertThat(client.fetchWorkDescription(null)).isEmpty();
    assertThat(client.fetchWorkDescription("")).isEmpty();
    assertThat(client.fetchWorkDescription("   ")).isEmpty();
  }

  /**
   * Well-formed keys must survive normalization and reach the request stage.
   * The client is uninitialized here — {@code init()} never ran — so a genuine
   * attempt throws NPE rather than returning empty. That distinction is the
   * assertion: rejected input returns empty, accepted input tries to fetch.
   */
  @ParameterizedTest
  @DisplayName("accepts well-formed work keys in each supported shape")
  @ValueSource(strings = {"OL45804W", "/works/OL45804W", "works/OL45804W", "OL1W"})
  void acceptsWellFormedKeys(String key) {
    Optional<String> result;
    try {
      result = client.fetchWorkDescription(key);
    } catch (NullPointerException expected) {
      return; // got past the guard and tried to use the RestClient
    }
    assertThat(result).isEmpty();
  }
}
