package com.gpt.springbonk.security.keycloak;


import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.model.Shelf;
import com.gpt.springbonk.repository.ShelfRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import static com.gpt.springbonk.constant.ShelfConstants.NOMINATIONS;
import static com.gpt.springbonk.constant.ShelfConstants.UNSHELVED;

@Service
@Transactional
@RequiredArgsConstructor
public class KeycloakUserService
{

    private final KeycloakUserRepository keycloakUserRepository;
    private final ShelfRepository shelfRepository;

    public KeycloakUser createUser(
        @NotNull KeycloakUser user
    ) {
        user.setCreated(LocalDateTime.now());
        user.setLastAction(LocalDateTime.now());

        KeycloakUser savedUser = keycloakUserRepository.save(user);

        createDefaultShelf(UNSHELVED, savedUser);
        createDefaultShelf(NOMINATIONS, savedUser);

        return savedUser;
    }

    public KeycloakUser getUserById(
        @NotNull UUID id
    ) {
        return keycloakUserRepository.findById(id).orElseThrow(
            () -> new ResourceNotFoundException("User not found with id: " + id)
        );
    }

    public Optional<KeycloakUser> findUserById(
        @NotNull UUID id
    ) {
        return keycloakUserRepository.findById(id);
    }

    public KeycloakUser getUserByUsername(
        @NotNull String username
    ) {
        return keycloakUserRepository.findByUsername(username).orElseThrow(
            () -> new ResourceNotFoundException("User not found with username: " + username)
        );
    }

    public Optional<KeycloakUser> findUserByUsername(
        @NotNull String username
    ) {
        return keycloakUserRepository.findByUsername(username);
    }

    public void updateLastAction(
        @NotNull UUID userId
    ) {
        KeycloakUser user = getUserById(userId);
        user.setLastAction(LocalDateTime.now());
        keycloakUserRepository.save(user);
    }

    public boolean existsByUsername(
        @NotNull String username
    ) {
        return keycloakUserRepository.existsByUsername(username);
    }

    public boolean existsById(
        @NotNull UUID id
    ) {
        return keycloakUserRepository.existsById(id);
    }

    // UTILITY ONLY.
    // Users are stored and managed in keycloak.
    // This would not truly delete a user.
    public void deleteUser(
        @NotNull UUID id
    ) {
        KeycloakUser user = getUserById(id);
        // The cascade on the user-shelf relationship will handle shelf deletion
        keycloakUserRepository.delete(user);
    }

    // UTILITY ONLY.
    // As per delete, this would not modify a user.
    // However, we could call this on login to update their details from any changes in the app.
    public KeycloakUser updateUser(
        @NotNull UUID id,
        @NotNull KeycloakUser userDetails
    ) {
        KeycloakUser user = getUserById(id);

        user.setUsername(userDetails.getUsername());
        user.setFirstName(userDetails.getFirstName());
        user.setLastName(userDetails.getLastName());
        user.setEmail(userDetails.getEmail());
        user.setRoles(userDetails.getRoles());
        user.setLastAction(LocalDateTime.now());

        return keycloakUserRepository.save(user);
    }

    // NOTE: This shouldn't be used outside of this class unless a special situation.
    // A user's shelves should be non-default.
    public void createDefaultShelf(
        @NotNull String defaultShelfName,
        @NotNull KeycloakUser user
    ) {
        Shelf defaultShelf = new Shelf(defaultShelfName);
        defaultShelf.setUser(user);
        defaultShelf.setDefaultShelf(true);
        shelfRepository.saveAndFlush(defaultShelf);
    }
}