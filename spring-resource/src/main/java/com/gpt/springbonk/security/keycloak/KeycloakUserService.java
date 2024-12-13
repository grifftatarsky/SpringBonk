package com.gpt.springbonk.security.keycloak;


import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.model.Shelf;
import com.gpt.springbonk.repository.ShelfRepository;
import com.gpt.springbonk.service.ShelfService;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@Transactional
@RequiredArgsConstructor
public class KeycloakUserService
{

    private final KeycloakUserRepository keycloakUserRepository;
    private final ShelfRepository shelfRepository;

    public KeycloakUser createUser(KeycloakUser user)
    {
        // Set initial timestamps
        user.setCreated(LocalDateTime.now());
        user.setLastAction(LocalDateTime.now());

        // Save the user first
        KeycloakUser savedUser = keycloakUserRepository.save(user);

        // Create default "unshelved" shelf for the new user
        createDefaultShelf(savedUser);

        return savedUser;
    }

    public KeycloakUser getUserById(UUID id)
    {
        return keycloakUserRepository.findById(id)
                                     .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    public Optional<KeycloakUser> findUserById(UUID id)
    {
        return keycloakUserRepository.findById(id);
    }

    public KeycloakUser getUserByUsername(String username)
    {
        return keycloakUserRepository.findByUsername(username)
                                     .orElseThrow(() -> new ResourceNotFoundException(
                                         "User not found with username: " + username));
    }

    public Optional<KeycloakUser> findUserByUsername(String username)
    {
        return keycloakUserRepository.findByUsername(username);
    }

    public void updateLastAction(UUID userId)
    {
        KeycloakUser user = getUserById(userId);
        user.setLastAction(LocalDateTime.now());
        keycloakUserRepository.save(user);
    }

    public boolean existsByUsername(String username)
    {
        return keycloakUserRepository.existsByUsername(username);
    }

    public boolean existsById(UUID id)
    {
        return keycloakUserRepository.existsById(id);
    }

    public void deleteUser(UUID id)
    {
        KeycloakUser user = getUserById(id);
        // The cascade on the user-shelf relationship will handle shelf deletion
        keycloakUserRepository.delete(user);
    }

    public KeycloakUser updateUser(UUID id, KeycloakUser userDetails)
    {
        KeycloakUser user = getUserById(id);

        user.setUsername(userDetails.getUsername());
        user.setFirstName(userDetails.getFirstName());
        user.setLastName(userDetails.getLastName());
        user.setEmail(userDetails.getEmail());
        user.setRoles(userDetails.getRoles());
        user.setLastAction(LocalDateTime.now());

        return keycloakUserRepository.save(user);
    }

    public void createDefaultShelf(KeycloakUser user)
    {
        Shelf defaultShelf = new Shelf("Unshelved");
        defaultShelf.setUser(user);
        defaultShelf.setDefaultShelf(true);
        shelfRepository.saveAndFlush(defaultShelf);
    }
}