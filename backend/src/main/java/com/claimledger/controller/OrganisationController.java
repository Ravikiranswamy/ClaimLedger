package com.claimledger.controller;

import com.claimledger.dto.organisation.*;
import com.claimledger.model.Department;
import com.claimledger.model.Organisation;
import com.claimledger.repository.DepartmentRepository;
import com.claimledger.repository.KnowledgeDocumentRepository;
import com.claimledger.repository.OrganisationRepository;
import com.claimledger.repository.UserRepository;
import com.claimledger.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class OrganisationController {

    private final OrganisationRepository organisationRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final KnowledgeDocumentRepository knowledgeDocumentRepository;

    // In-memory authority rules configuration backing the deterministic verification engine
    private static AuthorityRulesConfig authorityRulesConfig = new AuthorityRulesConfig(
            true, // requireExplicitApproval
            true, // strictDateValidity
            true, // allowScopedTier2Exceptions
            true, // tier1OverridesSubordinate
            true  // flagNumericContradictions
    );

    public OrganisationController(
            OrganisationRepository organisationRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            KnowledgeDocumentRepository knowledgeDocumentRepository
    ) {
        this.organisationRepository = organisationRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.knowledgeDocumentRepository = knowledgeDocumentRepository;
    }

    private Organisation getResolvedOrganisation(UserPrincipal principal) {
        if (principal != null && principal.getOrganisationId() != null) {
            return organisationRepository.findById(principal.getOrganisationId())
                    .orElseGet(() -> organisationRepository.findAll().stream().findFirst()
                            .orElseGet(() -> new Organisation(UUID.fromString("a1b2c3d4-0000-0000-0000-000000000001"), "Nexora Technologies", "nexora")));
        }
        return organisationRepository.findAll().stream().findFirst()
                .orElseGet(() -> new Organisation(UUID.fromString("a1b2c3d4-0000-0000-0000-000000000001"), "Nexora Technologies", "nexora"));
    }

    @GetMapping("/organisation")
    public ResponseEntity<OrganisationProfileResponse> getOrganisation(@AuthenticationPrincipal UserPrincipal principal) {
        Organisation org = getResolvedOrganisation(principal);
        return ResponseEntity.ok(new OrganisationProfileResponse(
                org.getId(),
                org.getName(),
                org.getSlug(),
                org.getDescription(),
                org.getWebsite(),
                org.getContactEmail(),
                org.getCreatedAt()
        ));
    }

    @PutMapping("/organisation")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrganisationProfileResponse> updateOrganisation(
            @RequestBody UpdateOrganisationRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Organisation org = getResolvedOrganisation(principal);
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            org.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            org.setDescription(request.getDescription().trim());
        }
        if (request.getWebsite() != null) {
            org.setWebsite(request.getWebsite().trim());
        }
        if (request.getContactEmail() != null) {
            org.setContactEmail(request.getContactEmail().trim());
        }
        org = organisationRepository.save(org);

        return ResponseEntity.ok(new OrganisationProfileResponse(
                org.getId(),
                org.getName(),
                org.getSlug(),
                org.getDescription(),
                org.getWebsite(),
                org.getContactEmail(),
                org.getCreatedAt()
        ));
    }

    @GetMapping("/departments")
    public ResponseEntity<List<DepartmentDto>> listDepartments(@AuthenticationPrincipal UserPrincipal principal) {
        Organisation org = getResolvedOrganisation(principal);
        List<Department> departments = departmentRepository.findByOrganisationId(org.getId());
        if (departments.isEmpty()) {
            departments = departmentRepository.findAll();
        }

        List<DepartmentDto> dtos = departments.stream().map(d -> {
            long userCount = userRepository.countByDepartmentId(d.getId());
            long docCount = knowledgeDocumentRepository.countByDepartmentId(d.getId());
            return new DepartmentDto(
                    d.getId(),
                    d.getName(),
                    d.getCode(),
                    d.getDescription(),
                    d.getIsActive(),
                    userCount,
                    docCount
            );
        }).collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/departments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DepartmentDto> createDepartment(
            @RequestBody CreateDepartmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Organisation org = getResolvedOrganisation(principal);
        Department department = new Department();
        department.setName(request.getName() != null ? request.getName().trim() : "New Department");
        department.setCode(request.getCode() != null ? request.getCode().trim().toUpperCase() : null);
        department.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        department.setIsActive(true);
        department.setOrganisationId(org.getId());

        department = departmentRepository.save(department);

        return ResponseEntity.ok(new DepartmentDto(
                department.getId(),
                department.getName(),
                department.getCode(),
                department.getDescription(),
                department.getIsActive(),
                0,
                0
        ));
    }

    @PutMapping("/departments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DepartmentDto> updateDepartment(
            @PathVariable("id") UUID id,
            @RequestBody UpdateDepartmentRequest request
    ) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found with id: " + id));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            department.setName(request.getName().trim());
        }
        if (request.getCode() != null) {
            department.setCode(request.getCode().trim().toUpperCase());
        }
        if (request.getDescription() != null) {
            department.setDescription(request.getDescription().trim());
        }
        if (request.getIsActive() != null) {
            department.setIsActive(request.getIsActive());
        }

        department = departmentRepository.save(department);

        long userCount = userRepository.countByDepartmentId(department.getId());
        long docCount = knowledgeDocumentRepository.countByDepartmentId(department.getId());

        return ResponseEntity.ok(new DepartmentDto(
                department.getId(),
                department.getName(),
                department.getCode(),
                department.getDescription(),
                department.getIsActive(),
                userCount,
                docCount
        ));
    }

    @GetMapping("/organisation/authority-rules")
    public ResponseEntity<AuthorityRulesConfig> getAuthorityRules() {
        return ResponseEntity.ok(authorityRulesConfig);
    }

    @PutMapping("/organisation/authority-rules")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthorityRulesConfig> updateAuthorityRules(@RequestBody AuthorityRulesConfig config) {
        authorityRulesConfig = config;
        return ResponseEntity.ok(authorityRulesConfig);
    }
}
