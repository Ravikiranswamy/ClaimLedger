package com.claimledger.service;

import com.claimledger.dto.auth.AuthResponse;
import com.claimledger.dto.auth.LoginRequest;
import com.claimledger.dto.auth.RegisterRequest;
import com.claimledger.dto.auth.UserResponse;
import com.claimledger.exception.BadRequestException;
import com.claimledger.exception.ResourceNotFoundException;
import com.claimledger.model.Department;
import com.claimledger.model.Organisation;
import com.claimledger.model.ReviewAction;
import com.claimledger.model.User;
import com.claimledger.model.enums.ActionType;
import com.claimledger.model.enums.Role;
import com.claimledger.repository.DepartmentRepository;
import com.claimledger.repository.OrganisationRepository;
import com.claimledger.repository.ReviewActionRepository;
import com.claimledger.repository.UserRepository;
import com.claimledger.security.JwtTokenProvider;
import com.claimledger.security.UserPrincipal;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private static final UUID DEFAULT_ORG_ID = UUID.fromString("a1b2c3d4-0000-0000-0000-000000000001");

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final OrganisationRepository organisationRepository;
    private final DepartmentRepository departmentRepository;
    private final ReviewActionRepository reviewActionRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            AuthenticationManager authenticationManager,
            JwtTokenProvider tokenProvider,
            UserRepository userRepository,
            OrganisationRepository organisationRepository,
            DepartmentRepository departmentRepository,
            ReviewActionRepository reviewActionRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
        this.organisationRepository = organisationRepository;
        this.departmentRepository = departmentRepository;
        this.reviewActionRepository = reviewActionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String rawEmail = request.getEmail().trim().toLowerCase();
        // Support @claimledger.dev alias for @nexora.com demo accounts
        String email = rawEmail.endsWith("@claimledger.dev")
                ? rawEmail.replace("@claimledger.dev", "@nexora.com")
                : rawEmail;

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = tokenProvider.generateToken(principal);

        return new AuthResponse(token, UserResponse.fromUser(user));
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase();

        // 1. Validate that the email is not already registered
        if (userRepository.findByEmail(cleanEmail).isPresent()) {
            throw new BadRequestException("An account with email '" + cleanEmail + "' already exists. Please sign in instead.");
        }

        // 2. Create a new organisation with a unique organisation ID
        UUID orgId = UUID.randomUUID();
        String baseSlug = request.getCompanyName().trim().toLowerCase().replaceAll("[^a-z0-9]+", "-");
        if (baseSlug.isEmpty()) baseSlug = "org";
        String uniqueSlug = baseSlug + "-" + UUID.randomUUID().toString().substring(0, 6);

        Organisation organisation = new Organisation(orgId, request.getCompanyName().trim(), uniqueSlug);
        organisation.setDescription("Brand governance workspace for " + request.getCompanyName().trim());
        organisation.setContactEmail(cleanEmail);
        organisation = organisationRepository.save(organisation);

        // 3. Initialise editable default departments: Marketing, Sales, and HR
        Department mkt = new Department(UUID.randomUUID(), "Marketing", orgId);
        Department sales = new Department(UUID.randomUUID(), "Sales", orgId);
        Department hr = new Department(UUID.randomUUID(), "HR", orgId);
        departmentRepository.saveAll(List.of(mkt, sales, hr));

        // 4. Create the registered user account & assign Organisation Admin role
        User admin = new User(
                UUID.randomUUID(),
                cleanEmail,
                passwordEncoder.encode(request.getPassword()),
                request.getFullName().trim(),
                Role.ADMIN,
                null, // Admin has universal organisation scope
                orgId
        );
        admin = userRepository.save(admin);

        // 5. Initialise an independent, genuine workspace creation audit entry
        try {
            ReviewAction creationLog = new ReviewAction(
                    UUID.randomUUID(),
                    null,
                    null,
                    admin.getId(),
                    ActionType.USER_CREATED,
                    "Organisation workspace created with initial Admin account."
            );
            reviewActionRepository.save(creationLog);
        } catch (Exception ignored) {
        }

        // 6. Automatic authentication & JWT token generation
        UserPrincipal principal = UserPrincipal.create(admin);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
        String token = tokenProvider.generateToken(principal);

        return new AuthResponse(token, UserResponse.fromUser(admin));
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + principal.getId()));
        return UserResponse.fromUser(user);
    }
}
