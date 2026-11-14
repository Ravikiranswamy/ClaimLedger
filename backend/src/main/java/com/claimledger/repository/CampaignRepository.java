package com.claimledger.repository;

import com.claimledger.model.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CampaignRepository extends JpaRepository<Campaign, UUID> {

    Optional<Campaign> findByCodeAndOrganisationId(String code, UUID organisationId);

    List<Campaign> findByOrganisationIdOrderByCreatedAtDesc(UUID organisationId);
}

