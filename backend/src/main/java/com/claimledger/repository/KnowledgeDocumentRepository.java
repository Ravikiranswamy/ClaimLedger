package com.claimledger.repository;

import com.claimledger.model.KnowledgeDocument;
import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.AuthorityTier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KnowledgeDocumentRepository extends JpaRepository<KnowledgeDocument, UUID> {

    List<KnowledgeDocument> findByOrganisationId(UUID organisationId);

    List<KnowledgeDocument> findByDepartmentId(UUID departmentId);

    List<KnowledgeDocument> findByApprovalStatus(ApprovalStatus approvalStatus);

    List<KnowledgeDocument> findByApprovalStatusAndAuthorityTier(ApprovalStatus approvalStatus, AuthorityTier authorityTier);

    @Query("SELECT d FROM KnowledgeDocument d WHERE d.approvalStatus = 'APPROVED' AND (d.departmentId = :departmentId OR d.departmentId IS NULL)")
    List<KnowledgeDocument> findActiveApprovedByDepartmentOrOrgWide(@Param("departmentId") UUID departmentId);

    @Query("SELECT d FROM KnowledgeDocument d WHERE d.approvalStatus = 'APPROVED'")
    List<KnowledgeDocument> findAllActiveApproved();
}
