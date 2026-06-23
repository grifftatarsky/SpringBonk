package com.gpt.decks.realtime;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Authenticates the STOMP CONNECT frame from its {@code ticket} header and binds
 * the session's principal to the Keycloak subject. Every later command on that
 * session then carries a trustworthy principal, so {@code action.playerId} can
 * be enforced against it.
 */
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

  private final WsTicketService tickets;

  @Override
  public Message<?> preSend(Message<?> message, MessageChannel channel) {
    StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
    if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
      String ticket = accessor.getFirstNativeHeader("ticket");
      String sub = tickets.consume(ticket).orElse(null);
      if (sub == null) {
        throw new MessagingException("Invalid or expired WebSocket ticket");
      }
      accessor.setUser(new UsernamePasswordAuthenticationToken(sub, null, List.of()));
    }
    return message;
  }
}
