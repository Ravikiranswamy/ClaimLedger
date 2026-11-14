package com.claimledger.service;

import com.claimledger.dto.campaign.CampaignRequest;
import com.claimledger.dto.campaign.CampaignResponse;
import com.claimledger.exception.BadRequestException;
import com.claimledger.model.Campaign;
import com.claimledger.model.enums.Role;
import com.claimledger.repository.CampaignRepository;
import com.claimledger.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CampaignServiceTest {

    @Mock
    private CampaignRepository campaignRepository;

    private CampaignService campaignService;

    private static final UUID ORG_ID = UUID.fromString("a1b2c3d4-0000-0000-0000-000000000001");
    private static final UUID ADMIN_ID = UUID.fromString("00000001-0000-0000-0000-000000000001");
    private static final UUID CREATOR_ID = UUID.fromString("00000002-0000-0000-0000-000000000002");

    @BeforeEach
    void setUp() {
        campaignService = new CampaignService(campaignRepository);
    }

    private UserPrincipal makePrincipal(UUID userId, Role role) {
        return new UserPrincipal(
                userId,
                "test@nexora.com",
                "password",
                "Test User",
                role,
                null,
                ORG_ID,
                List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))
        );
    }

    @Test
    @DisplayName("Campaign Governance Security Rule: Creator CANNOT register campaigns — only ADMIN or DEPT_MANAGER may")
    void testCreatorCannotSelfGrantCampaignException() {
        UserPrincipal creator = makePrincipal(CREATOR_ID, Role.CREATOR);
        CampaignRequest request = new CampaignRequest();
        request.setCode("FAKE_DIWALI");
        request.setName("Fake Diwali Special");
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusDays(30));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                campaignService.registerCampaign(request, creator)
        );
        assertTrue(ex.getMessage().contains("Campaign Governance Violation"), "Must reject creator self-grant attempt");
        verify(campaignRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin may register a campaign with valid date range")
    void testAdminCanRegisterCampaign() {
        UserPrincipal admin = makePrincipal(ADMIN_ID, Role.ADMIN);
        CampaignRequest request = new CampaignRequest();
        request.setCode("DIWALI_SPECIAL");
        request.setName("Diwali Festive 2026");
        request.setDescription("Authorised seasonal discount.");
        request.setAllowedProductScope("Nexora Pro");
        request.setAllowedDiscountPrice("₹799");
        request.setStartDate(LocalDate.of(2026, 10, 1));
        request.setEndDate(LocalDate.of(2026, 12, 31));

        when(campaignRepository.findByCodeAndOrganisationId("DIWALI_SPECIAL", ORG_ID))
                .thenReturn(Optional.empty());
        when(campaignRepository.save(any(Campaign.class))).thenAnswer(inv -> inv.getArgument(0));

        CampaignResponse response = campaignService.registerCampaign(request, admin);
        assertNotNull(response);
        assertEquals("DIWALI_SPECIAL", response.getCode());
        verify(campaignRepository, times(1)).save(any(Campaign.class));
    }

    @Test
    @DisplayName("Campaign validation: expired campaign returns EXPIRED status (cannot be used in submission)")
    void testExpiredCampaignIsRejected() {
        Campaign expiredCampaign = new Campaign(
                UUID.randomUUID(), "SUMMER_FLASH_2025", "Summer Flash Sale 2025 (Expired)", null,
                ORG_ID, null, "Nexora Pro", "₹699",
                LocalDate.of(2025, 5, 1), LocalDate.of(2025, 6, 30),
                true, ADMIN_ID
        );

        when(campaignRepository.findByCodeAndOrganisationId("SUMMER_FLASH_2025", ORG_ID))
                .thenReturn(Optional.of(expiredCampaign));

        CampaignService.CampaignValidationResult result =
                campaignService.validateCampaignForSubmission("SUMMER_FLASH_2025", ORG_ID);

        assertEquals(CampaignService.CampaignValidationResult.Status.EXPIRED, result.getStatus());
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("expired"));
    }

    @Test
    @DisplayName("Campaign validation: unregistered campaign code is INVALID (not a self-grant bypass)")
    void testUnregisteredCampaignCodeIsInvalid() {
        when(campaignRepository.findByCodeAndOrganisationId("FAKE_CODE", ORG_ID))
                .thenReturn(Optional.empty());

        CampaignService.CampaignValidationResult result =
                campaignService.validateCampaignForSubmission("FAKE_CODE", ORG_ID);

        assertEquals(CampaignService.CampaignValidationResult.Status.INVALID, result.getStatus());
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("not registered"));
    }

    @Test
    @DisplayName("Campaign validation: null/blank campaign code returns NOT_REFERENCED (not an error)")
    void testNullCampaignCodeIsNotReferenced() {
        CampaignService.CampaignValidationResult result =
                campaignService.validateCampaignForSubmission(null, ORG_ID);

        assertEquals(CampaignService.CampaignValidationResult.Status.NOT_REFERENCED, result.getStatus());
        assertTrue(result.isNotReferenced());
        verify(campaignRepository, never()).findByCodeAndOrganisationId(any(), any());
    }
}
