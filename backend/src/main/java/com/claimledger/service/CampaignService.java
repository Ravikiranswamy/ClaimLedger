package com.claimledger.service;

import com.claimledger.dto.campaign.CampaignRequest;
import com.claimledger.dto.campaign.CampaignResponse;
import com.claimledger.exception.BadRequestException;
import com.claimledger.exception.ResourceNotFoundException;
import com.claimledger.model.Campaign;
import com.claimledger.model.enums.Role;
import com.claimledger.repository.CampaignRepository;
import com.claimledger.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CampaignService {

    private static final Logger log = LoggerFactory.getLogger(CampaignService.class);

    private final CampaignRepository campaignRepository;

    public CampaignService(CampaignRepository campaignRepository) {
        this.campaignRepository = campaignRepository;
    }

    /**
     * Registers a new campaign. ONLY ADMIN or DEPT_MANAGER may create campaigns.
     * Creators CANNOT self-declare campaign exceptions — campaigns must be pre-registered
     * by an authorised organisation actor.
     */
    @Transactional
    public CampaignResponse registerCampaign(CampaignRequest request, UserPrincipal currentUser) {
        if (currentUser.getRole() != Role.ADMIN && currentUser.getRole() != Role.DEPT_MANAGER) {
            throw new BadRequestException("Campaign Governance Violation: Only ADMIN or DEPT_MANAGER may register campaigns. Creators cannot self-declare campaign exceptions.");
        }

        if (request.getCode() == null || request.getCode().isBlank()) {
            throw new BadRequestException("Campaign code is required.");
        }
        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new BadRequestException("Campaign start date and end date are required.");
        }
        if (!request.getEndDate().isAfter(request.getStartDate())) {
            throw new BadRequestException("Campaign end date must be after start date.");
        }

        // Check no duplicate code within the same organisation
        Optional<Campaign> existing = campaignRepository.findByCodeAndOrganisationId(
                request.getCode().toUpperCase(), currentUser.getOrganisationId()
        );
        if (existing.isPresent()) {
            throw new BadRequestException("Campaign code '" + request.getCode() + "' already exists in this organisation.");
        }

        Campaign campaign = new Campaign(
                null,
                request.getCode().toUpperCase().trim(),
                request.getName(),
                request.getDescription(),
                currentUser.getOrganisationId(),
                request.getDepartmentId(),
                request.getAllowedProductScope() != null ? request.getAllowedProductScope() : "Nexora Pro",
                request.getAllowedDiscountPrice(),
                request.getStartDate(),
                request.getEndDate(),
                true,
                currentUser.getId()
        );

        Campaign saved = campaignRepository.save(campaign);
        log.info("Campaign registered: code='{}', name='{}' by user={} ({})", saved.getCode(), saved.getName(), currentUser.getId(), currentUser.getRole());

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CampaignResponse> listCampaigns(UserPrincipal currentUser) {
        return campaignRepository.findByOrganisationIdOrderByCreatedAtDesc(currentUser.getOrganisationId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Authority-engine integration point: validates that a submitted campaign code is
     * (1) registered in the DB for this organisation,
     * (2) is currently active (not expired),
     * (3) is approved.
     *
     * Creators cannot bypass this — the backend always validates campaign references,
     * regardless of what code the creator supplies.
     */
    @Transactional(readOnly = true)
    public CampaignValidationResult validateCampaignForSubmission(String campaignCode, UUID organisationId) {
        if (campaignCode == null || campaignCode.isBlank()) {
            return CampaignValidationResult.notReferenced();
        }

        Optional<Campaign> campaignOpt = campaignRepository.findByCodeAndOrganisationId(
                campaignCode.toUpperCase().trim(), organisationId
        );

        if (campaignOpt.isEmpty()) {
            return CampaignValidationResult.invalid(campaignCode,
                    "Campaign '" + campaignCode + "' is not registered for this organisation. A campaign code is a reference, not proof of permission.");
        }

        Campaign campaign = campaignOpt.get();

        if (!campaign.isApproved()) {
            return CampaignValidationResult.invalid(campaignCode,
                    "Campaign '" + campaignCode + "' has not been approved by the organisation administrator.");
        }

        LocalDate today = LocalDate.now();
        if (today.isBefore(campaign.getStartDate())) {
            return CampaignValidationResult.invalid(campaignCode,
                    "Campaign '" + campaignCode + "' has not started yet. Valid from " + campaign.getStartDate() + ".");
        }

        if (today.isAfter(campaign.getEndDate())) {
            return CampaignValidationResult.expired(campaignCode,
                    "Campaign '" + campaignCode + "' expired on " + campaign.getEndDate() + ". This exception is no longer applicable.");
        }

        return CampaignValidationResult.valid(campaign);
    }

    private CampaignResponse toResponse(Campaign campaign) {
        CampaignResponse resp = new CampaignResponse();
        resp.setId(campaign.getId());
        resp.setCode(campaign.getCode());
        resp.setName(campaign.getName());
        resp.setDescription(campaign.getDescription());
        resp.setOrganisationId(campaign.getOrganisationId());
        resp.setDepartmentId(campaign.getDepartmentId());
        resp.setAllowedProductScope(campaign.getAllowedProductScope());
        resp.setAllowedDiscountPrice(campaign.getAllowedDiscountPrice());
        resp.setStartDate(campaign.getStartDate());
        resp.setEndDate(campaign.getEndDate());
        resp.setApproved(campaign.isApproved());
        resp.setCreatedBy(campaign.getCreatedBy());
        resp.setCreatedAt(campaign.getCreatedAt());

        LocalDate today = LocalDate.now();
        boolean active = campaign.isApproved()
                && !today.isBefore(campaign.getStartDate())
                && !today.isAfter(campaign.getEndDate());
        resp.setActive(active);
        resp.setExpired(today.isAfter(campaign.getEndDate()));

        if (resp.isExpired()) {
            resp.setGovernanceNote("EXPIRED: This campaign's exception window has closed. It no longer applies to new submissions.");
        } else if (!campaign.isApproved()) {
            resp.setGovernanceNote("PENDING APPROVAL: This campaign has not been approved by the organisation admin.");
        } else if (active) {
            resp.setGovernanceNote("ACTIVE: Campaign exception window is open. Authorised discount: " + campaign.getAllowedDiscountPrice() + " for " + campaign.getAllowedProductScope() + ".");
        } else {
            resp.setGovernanceNote("UPCOMING: Campaign starts on " + campaign.getStartDate() + ".");
        }

        return resp;
    }

    /**
     * Value object returned by campaign validation.
     */
    public static class CampaignValidationResult {
        public enum Status { VALID, INVALID, EXPIRED, NOT_REFERENCED }

        private final Status status;
        private final String campaignCode;
        private final String message;
        private final Campaign campaign;

        private CampaignValidationResult(Status status, String campaignCode, String message, Campaign campaign) {
            this.status = status;
            this.campaignCode = campaignCode;
            this.message = message;
            this.campaign = campaign;
        }

        public static CampaignValidationResult valid(Campaign campaign) {
            return new CampaignValidationResult(Status.VALID, campaign.getCode(),
                    "Campaign '" + campaign.getCode() + "' is active and approved. Discount: " + campaign.getAllowedDiscountPrice(), campaign);
        }

        public static CampaignValidationResult invalid(String code, String reason) {
            return new CampaignValidationResult(Status.INVALID, code, reason, null);
        }

        public static CampaignValidationResult expired(String code, String reason) {
            return new CampaignValidationResult(Status.EXPIRED, code, reason, null);
        }

        public static CampaignValidationResult notReferenced() {
            return new CampaignValidationResult(Status.NOT_REFERENCED, null, null, null);
        }

        public Status getStatus() { return status; }
        public String getCampaignCode() { return campaignCode; }
        public String getMessage() { return message; }
        public Campaign getCampaign() { return campaign; }
        public boolean isValid() { return status == Status.VALID; }
        public boolean isNotReferenced() { return status == Status.NOT_REFERENCED; }
    }
}

