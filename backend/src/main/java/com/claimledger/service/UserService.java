package com.claimledger.service;

import com.claimledger.dto.auth.UserResponse;
import com.claimledger.dto.user.UserCreateRequest;
import com.claimledger.dto.user.UserUpdateRequest;
import com.claimledger.exception.BadRequestException;
import com.claimledger.exception.ResourceNotFoundException;
import com.claimledger.model.ReviewAction;
import com.claimledger.model.User;
import com.claimledger.model.enums.ActionType;
import com.claimledger.repository.ReviewActionRepository;
import com.claimledger.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    private static final UUID DEFAULT_ORG_ID = UUID.fromString("a1b2c3d4-0000-0000-0000-000000000001");

    private final UserRepository userRepository;
    private final ReviewActionRepository reviewActionRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            ReviewActionRepository reviewActionRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.reviewActionRepository = reviewActionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listUsers() {
        return listUsers(null);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listUsers(UUID organisationId) {
        if (organisationId != null) {
            return userRepository.findByOrganisationId(organisationId).stream()
                    .map(UserResponse::fromUser)
                    .toList();
        }
        return userRepository.findAll().stream()
                .map(UserResponse::fromUser)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return UserResponse.fromUser(user);
    }

    @Transactional
    public UserResponse createUser(UserCreateRequest request, UUID actorId, UUID organisationId) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("A user with email " + email + " already exists.");
        }

        String rawPassword = request.getPassword() != null && !request.getPassword().isBlank()
                ? request.getPassword()
                : "Demo@1234";

        UUID orgId = organisationId != null ? organisationId : DEFAULT_ORG_ID;

        User user = new User(
                UUID.randomUUID(),
                email,
                passwordEncoder.encode(rawPassword),
                request.getFullName(),
                request.getRole() != null ? request.getRole() : com.claimledger.model.enums.Role.CREATOR,
                request.getDepartmentId(),
                orgId
        );

        user.setIsActive(true);
        user.setCanApproveKnowledge(request.getCanApproveKnowledge() != null ? request.getCanApproveKnowledge() : false);

        User saved = userRepository.save(user);

        // Audit log user creation
        ReviewAction audit = new ReviewAction(
                UUID.randomUUID(),
                null,
                null,
                actorId,
                ActionType.USER_CREATED,
                "New user invited/created: " + saved.getEmail() + " (" + saved.getRole() + ")"
        );
        reviewActionRepository.save(audit);

        log.info("Created user {} with role {} by admin {}", saved.getEmail(), saved.getRole(), actorId);
        return UserResponse.fromUser(saved);
    }

    @Transactional
    public UserResponse updateUser(UUID id, UserUpdateRequest request, UUID actorId) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        StringBuilder changes = new StringBuilder("User " + user.getEmail() + " updated: ");

        if (request.getRole() != null && request.getRole() != user.getRole()) {
            changes.append("Role changed from ").append(user.getRole()).append(" to ").append(request.getRole()).append("; ");
            user.setRole(request.getRole());
        }

        if (request.getDepartmentId() != null || (request.getDepartmentId() == null && user.getDepartmentId() != null)) {
            changes.append("Department updated; ");
            user.setDepartmentId(request.getDepartmentId());
        }

        if (request.getIsActive() != null && !request.getIsActive().equals(user.getIsActive())) {
            changes.append(request.getIsActive() ? "Account activated; " : "Account suspended; ");
            user.setIsActive(request.getIsActive());
        }

        if (request.getCanApproveKnowledge() != null && !request.getCanApproveKnowledge().equals(user.getCanApproveKnowledge())) {
            changes.append("Knowledge approver permission: ").append(request.getCanApproveKnowledge()).append("; ");
            user.setCanApproveKnowledge(request.getCanApproveKnowledge());
        }

        User updated = userRepository.save(user);

        // Audit log user change
        ReviewAction audit = new ReviewAction(
                UUID.randomUUID(),
                null,
                null,
                actorId,
                ActionType.USER_UPDATED,
                changes.toString()
        );
        reviewActionRepository.save(audit);

        log.info("Updated user {} by admin {}", updated.getEmail(), actorId);
        return UserResponse.fromUser(updated);
    }

    @Transactional
    public UserResponse toggleUserStatus(UUID id, UUID actorId) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        boolean newStatus = !user.getIsActive();
        user.setIsActive(newStatus);
        User updated = userRepository.save(user);

        ReviewAction audit = new ReviewAction(
                UUID.randomUUID(),
                null,
                null,
                actorId,
                ActionType.USER_STATUS_TOGGLED,
                "User " + user.getEmail() + " status set to: " + (newStatus ? "ACTIVE" : "SUSPENDED")
        );
        reviewActionRepository.save(audit);

        return UserResponse.fromUser(updated);
    }
}
