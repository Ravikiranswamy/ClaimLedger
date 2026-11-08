package com.claimledger.service;

import com.claimledger.engine.AuthorityResolutionEngine;
import com.claimledger.engine.AuthorityResolutionResult;
import com.claimledger.model.Claim;
import com.claimledger.model.Evidence;
import com.claimledger.model.Submission;
import com.claimledger.model.enums.ActionType;
import com.claimledger.model.enums.SubmissionStatus;
import com.claimledger.model.enums.VerificationStatus;
import com.claimledger.repository.ClaimRepository;
import com.claimledger.repository.EvidenceRepository;
import com.claimledger.repository.ReviewActionRepository;
import com.claimledger.repository.SubmissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ClaimVerificationService {

    private static final Logger log = LoggerFactory.getLogger(ClaimVerificationService.class);

    private final RagRetrievalService ragRetrievalService;
    private final AuthorityResolutionEngine authorityResolutionEngine;
    private final ClaimExtractionService claimExtractionService;
    private final ClaimRepository claimRepository;
    private final EvidenceRepository evidenceRepository;
    private final SubmissionRepository submissionRepository;
    private final ReviewActionRepository reviewActionRepository;

    public ClaimVerificationService(
            RagRetrievalService ragRetrievalService,
            AuthorityResolutionEngine authorityResolutionEngine,
            ClaimExtractionService claimExtractionService,
            ClaimRepository claimRepository,
            EvidenceRepository evidenceRepository,
            SubmissionRepository submissionRepository,
            ReviewActionRepository reviewActionRepository
    ) {
        this.ragRetrievalService = ragRetrievalService;
        this.authorityResolutionEngine = authorityResolutionEngine;
        this.claimExtractionService = claimExtractionService;
        this.claimRepository = claimRepository;
        this.evidenceRepository = evidenceRepository;
        this.submissionRepository = submissionRepository;
        this.reviewActionRepository = reviewActionRepository;
    }

    /**
     * Executes claim extraction and deterministic authority resolution for the given submission.
     */
    @Transactional
    public Submission verifySubmission(Submission submission, UUID actorId) {
        log.info("Starting verification for submission id: '{}', title: '{}'", submission.getId(), submission.getTitle());

        submission.setStatus(SubmissionStatus.ANALYZING);
        submissionRepository.save(submission);

        // Delete existing claims and evidence for re-analysis
        claimRepository.deleteBySubmissionId(submission.getId());

        String content = submission.getContent();
        if (content == null || content.isBlank()) {
            submission.setStatus(SubmissionStatus.FLAGGED);
            return submissionRepository.save(submission);
        }

        // 1. Extract claims
        List<ClaimExtractionService.ExtractedClaim> extractedClaims = claimExtractionService.extractClaims(content);
        log.info("Extracted {} claims from submission", extractedClaims.size());

        List<Claim> savedClaims = new ArrayList<>();
        boolean hasViolation = false;
        boolean hasConflict = false;
        boolean hasUnverified = false;

        // Determine scope context from submission
        AuthorityResolutionEngine.ResolutionScopeContext scopeContext =
                new AuthorityResolutionEngine.ResolutionScopeContext(
                        submission.getDepartmentId(),
                        null,
                        "GLOBAL",
                        "ALL",
                        LocalDate.now()
                );

        for (ClaimExtractionService.ExtractedClaim ec : extractedClaims) {
            // 2. Retrieve relevant evidence chunks from pgvector
            List<RagRetrievalService.RetrievedChunk> retrievedChunks =
                    ragRetrievalService.retrieveRelevantChunks(ec.claimText(), 5);

            List<AuthorityResolutionEngine.DocumentEvidenceCandidate> candidates =
                    ragRetrievalService.toCandidates(retrievedChunks);

            // 3. DETERMINISTIC Authority Resolution Engine (Pure Java)
            AuthorityResolutionResult resolution =
                    authorityResolutionEngine.resolveAuthority(ec.claimText(), candidates, scopeContext);

            // 4. Create and persist Claim
            Claim claim = new Claim();
            claim.setSubmissionId(submission.getId());
            claim.setClaimText(ec.claimText());
            claim.setClaimType(ec.claimType());
            claim.setVerificationStatus(resolution.getVerificationStatus());
            claim.setExplanation(resolution.getExplanation());
            claim.setSuggestedCorrection(resolution.getSuggestedCorrection());
            claim.setAiConfidence(ec.aiConfidence());

            // Compute exact character span offsets in original submission content
            int startIdx = content.indexOf(ec.claimText());
            if (startIdx == -1) {
                startIdx = content.toLowerCase().indexOf(ec.claimText().toLowerCase());
            }
            int endIdx = startIdx != -1 ? startIdx + ec.claimText().length() : 0;
            if (startIdx == -1) startIdx = 0;

            claim.setStartIndex(startIdx);
            claim.setEndIndex(endIdx);

            Claim persistedClaim = claimRepository.save(claim);
            savedClaims.add(persistedClaim);

            // 5. Persist Evidence for each retrieved chunk
            for (RagRetrievalService.RetrievedChunk chunk : retrievedChunks) {
                Evidence evidence = new Evidence();
                evidence.setClaimId(persistedClaim.getId());
                evidence.setDocumentId(chunk.document().getId());
                evidence.setChunkId(chunk.chunkId());
                evidence.setExcerpt(chunk.content());
                evidence.setPageNumber(chunk.pageNumber());
                evidence.setRelevanceScore(BigDecimal.valueOf(chunk.relevanceScore()));
                evidence.setAuthorityTier(chunk.document().getAuthorityTier());

                boolean isWinner = resolution.getAuthoritativeDocument() != null &&
                        resolution.getAuthoritativeDocument().getId().equals(chunk.document().getId());
                evidence.setAuthoritative(isWinner);

                evidenceRepository.save(evidence);
            }

            // Track flags
            if (resolution.getVerificationStatus() == VerificationStatus.VIOLATION) {
                hasViolation = true;
            } else if (resolution.getVerificationStatus() == VerificationStatus.CONFLICT) {
                hasConflict = true;
            } else if (resolution.getVerificationStatus() == VerificationStatus.UNVERIFIED) {
                hasUnverified = true;
            }
        }

        // 6. Update Submission Lifecycle Status
        if (hasViolation || hasConflict || hasUnverified) {
            submission.setStatus(SubmissionStatus.FLAGGED);
        } else if (!savedClaims.isEmpty()) {
            submission.setStatus(SubmissionStatus.VERIFIED);
        } else {
            submission.setStatus(SubmissionStatus.FLAGGED);
        }

        Submission updated = submissionRepository.save(submission);

        // Record review audit action
        String auditComment = String.format("Automated analysis complete: %d claims analyzed. Result: %s (Violations: %b, Conflicts: %b, Unverified: %b)",
                savedClaims.size(), submission.getStatus(), hasViolation, hasConflict, hasUnverified);
        reviewActionRepository.save(new com.claimledger.model.ReviewAction(
                UUID.randomUUID(), submission.getId(), actorId, ActionType.ANALYZED, auditComment
        ));

        log.info("Analysis completed for submission {}. Final status: {}", submission.getId(), submission.getStatus());
        return updated;
    }
}
