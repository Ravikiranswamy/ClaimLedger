package com.claimledger.service;

import com.claimledger.dto.submission.*;
import com.claimledger.exception.AccessDeniedException;
import com.claimledger.exception.BadRequestException;
import com.claimledger.exception.ResourceNotFoundException;
import com.claimledger.model.*;
import com.claimledger.model.enums.ActionType;
import com.claimledger.model.enums.ContentType;
import com.claimledger.model.enums.Role;
import com.claimledger.model.enums.SubmissionStatus;
import com.claimledger.repository.*;
import com.claimledger.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.*;

@Service
public class SubmissionWorkflowService {

    private static final Logger log = LoggerFactory.getLogger(SubmissionWorkflowService.class);

    private final SubmissionRepository submissionRepository;
    private final ClaimRepository claimRepository;
    private final EvidenceRepository evidenceRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final KnowledgeDocumentRepository documentRepository;
    private final ReviewActionRepository reviewActionRepository;
    private final ClaimVerificationService claimVerificationService;
    private final PdfExtractionService pdfExtractionService;
    private final FileStorageService fileStorageService;

    public SubmissionWorkflowService(
            SubmissionRepository submissionRepository,
            ClaimRepository claimRepository,
            EvidenceRepository evidenceRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            KnowledgeDocumentRepository documentRepository,
            ReviewActionRepository reviewActionRepository,
            ClaimVerificationService claimVerificationService,
            PdfExtractionService pdfExtractionService,
            FileStorageService fileStorageService
    ) {
        this.submissionRepository = submissionRepository;
        this.claimRepository = claimRepository;
        this.evidenceRepository = evidenceRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.reviewActionRepository = reviewActionRepository;
        this.claimVerificationService = claimVerificationService;
        this.pdfExtractionService = pdfExtractionService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Creates a new submission and triggers verification analysis.
     */
    @Transactional
    public SubmissionResponse createSubmission(
            SubmissionCreateRequest request,
            MultipartFile file,
            UserPrincipal currentUser
    ) {
        Submission submission = new Submission();
        submission.setTitle(request.getTitle());
        submission.setSubmittedBy(currentUser.getId());
        submission.setRevisionNumber(1);
        submission.setStatus(SubmissionStatus.DRAFT);

        UUID departmentId = request.getDepartmentId() != null ? request.getDepartmentId() : currentUser.getDepartmentId();
        submission.setDepartmentId(departmentId);

        if (request.getContentType() == ContentType.PDF) {
            if (file == null || file.isEmpty()) {
                throw new BadRequestException("PDF file is required when content type is PDF.");
            }
            try {
                String storedPath = fileStorageService.storeFile(file, "submissions");
                submission.setFilePath(storedPath);
                submission.setContentType(ContentType.PDF);
                String extractedText = pdfExtractionService.extractFullText(new File(storedPath));
                submission.setContent(extractedText);
            } catch (IOException e) {
                throw new BadRequestException("Failed to read PDF submission: " + e.getMessage());
            }
        } else {
            submission.setContentType(ContentType.TEXT);
            submission.setContent(request.getContent());
        }

        Submission saved = submissionRepository.save(submission);

        // Record submission review action
        reviewActionRepository.save(new ReviewAction(
                UUID.randomUUID(), saved.getId(), currentUser.getId(), ActionType.SUBMITTED, "Initial submission created"
        ));

        // Automatically run verification analysis
        Submission analyzed = claimVerificationService.verifySubmission(saved, currentUser.getId());

        return getSubmissionResponse(analyzed.getId());
    }

    /**
     * Lists submissions with role-based scoping:
     * - ADMIN and REVIEWER see all submissions.
     * - CREATOR and DEPT_MANAGER only see submissions belonging to their department.
     */
    @Transactional(readOnly = true)
    public List<SubmissionResponse> listSubmissions(UserPrincipal currentUser) {
        List<Submission> submissions;

        if (currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.REVIEWER) {
            submissions = submissionRepository.findAllByOrderByCreatedAtDesc();
        } else {
            if (currentUser.getDepartmentId() != null) {
                submissions = submissionRepository.findByDepartmentIdOrderByCreatedAtDesc(currentUser.getDepartmentId());
            } else {
                submissions = submissionRepository.findBySubmittedByOrderByCreatedAtDesc(currentUser.getId());
            }
        }

        return submissions.stream()
                .map(s -> getSubmissionResponse(s.getId()))
                .toList();
    }

    /**
     * Retrieves full submission details with claims and evidence.
     */
    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionById(UUID submissionId, UserPrincipal currentUser) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + submissionId));

        validateAccess(submission, currentUser);
        return getSubmissionResponse(submission.getId());
    }

    /**
     * Allows a creator to submit revised content, bumping the revision number and re-triggering analysis.
     */
    @Transactional
    public SubmissionResponse reviseSubmission(
            UUID submissionId,
            SubmissionReviseRequest request,
            UserPrincipal currentUser
    ) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + submissionId));

        validateAccess(submission, currentUser);

        // Update content and increment revision number
        submission.setContent(request.getContent());
        submission.setRevisionNumber(submission.getRevisionNumber() + 1);
        submission.setStatus(SubmissionStatus.DRAFT);
        Submission updated = submissionRepository.save(submission);

        // Record revision review action
        String comment = request.getRevisionComment() != null ? request.getRevisionComment() : "Creator submitted revision #" + updated.getRevisionNumber();
        reviewActionRepository.save(new ReviewAction(
                UUID.randomUUID(), updated.getId(), currentUser.getId(), ActionType.CREATOR_REVISED, comment
        ));

        // Automatically re-run claim extraction & authority resolution on the revised content
        Submission analyzed = claimVerificationService.verifySubmission(updated, currentUser.getId());

        return getSubmissionResponse(analyzed.getId());
    }

    /**
     * Helper to construct complete SubmissionResponse DTO with claims and evidence.
     */
    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionResponse(UUID submissionId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + submissionId));

        String deptName = "Unassigned";
        if (submission.getDepartmentId() != null) {
            deptName = departmentRepository.findById(submission.getDepartmentId())
                    .map(Department::getName)
                    .orElse("Department (" + submission.getDepartmentId() + ")");
        }

        String submitterName = "Unknown";
        if (submission.getSubmittedBy() != null) {
            submitterName = userRepository.findById(submission.getSubmittedBy())
                    .map(User::getFullName)
                    .orElse("User (" + submission.getSubmittedBy() + ")");
        }

        List<Claim> claims = claimRepository.findBySubmissionId(submissionId);
        List<ClaimResponse> claimResponses = new ArrayList<>();

        for (Claim claim : claims) {
            List<Evidence> evidenceList = evidenceRepository.findByClaimId(claim.getId());
            List<EvidenceResponse> evidenceResponses = evidenceList.stream()
                    .map(e -> {
                        String docName = documentRepository.findById(e.getDocumentId())
                                .map(KnowledgeDocument::getName)
                                .orElse("Document");
                        return EvidenceResponse.fromEntity(e, docName);
                    })
                    .toList();

            claimResponses.add(ClaimResponse.fromEntity(claim, evidenceResponses));
        }

        return SubmissionResponse.fromEntity(submission, deptName, submitterName, claimResponses);
    }

    private void validateAccess(Submission submission, UserPrincipal currentUser) {
        if (currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.REVIEWER) {
            return;
        }
        if (submission.getDepartmentId() != null && submission.getDepartmentId().equals(currentUser.getDepartmentId())) {
            return;
        }
        if (submission.getSubmittedBy().equals(currentUser.getId())) {
            return;
        }
        throw new AccessDeniedException("You do not have permission to access submissions from this department.");
    }
}
