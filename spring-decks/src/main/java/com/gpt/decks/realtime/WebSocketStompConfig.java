package com.gpt.decks.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP over WebSocket. Clients connect to {@code /ws}, send commands to
 * {@code /app/games/{id}/**} (routed to {@link GameSocketController}), and
 * subscribe to {@code /topic/games/{id}} for events. The in-memory simple broker
 * is single-instance; scaling swaps it for a RabbitMQ STOMP broker relay.
 *
 * <p>CONNECT frames are authenticated by {@link StompAuthChannelInterceptor}
 * (the one-time ticket binds the session to the Keycloak subject).
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketStompConfig implements WebSocketMessageBrokerConfigurer {

  private final StompAuthChannelInterceptor authInterceptor;

  @Override
  public void configureMessageBroker(MessageBrokerRegistry registry) {
    // /topic = public game events; /user/queue = per-player redacted state.
    registry.enableSimpleBroker("/topic", "/queue");
    registry.setApplicationDestinationPrefixes("/app");
    registry.setUserDestinationPrefix("/user");
  }

  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
  }

  @Override
  public void configureClientInboundChannel(ChannelRegistration registration) {
    registration.interceptors(authInterceptor);
  }
}
