package com.claimledger.dto.preflight;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public class PreFlightRequest {

    @NotBlank(message = "Text is required for pre-flight analysis")
    private String text;

    /**
     * Mode:
     * LIGHTWEIGHT = Fast heuristic extraction + local RAG (sub-second target)
     * FULL = Comprehensive pipeline with full extraction & deep evidence
     */
    private String mode = "LIGHTWEIGHT";

    private String campaignCode;

    private UUID departmentId;

    public PreFlightRequest() {}

    public PreFlightRequest(String text, String mode, String campaignCode, UUID departmentId) {
        this.text = text;
        this.mode = mode != null ? mode : "LIGHTWEIGHT";
        this.campaignCode = campaignCode;
        this.departmentId = departmentId;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getCampaignCode() {
        return campaignCode;
    }

    public void setCampaignCode(String campaignCode) {
        this.campaignCode = campaignCode;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }
}

