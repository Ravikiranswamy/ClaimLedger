package com.claimledger.service;

import com.claimledger.dto.diff.ClaimAttributes;
import com.claimledger.model.enums.ClaimType;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ClaimAttributeExtractionService {

    private static final Pattern PRODUCT_PATTERN = Pattern.compile(
            "\\b(Nexora\\s+(?:Pro|Enterprise|Standard|Lite|Basic))\\b", Pattern.CASE_INSENSITIVE
    );

    private static final Pattern PRICE_PATTERN = Pattern.compile(
            "(₹|\\$|€|£|INR|USD)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)\\s*(?:per|/)?\\s*(?:user|seat)?\\s*(?:per|/)?\\s*(month|mo|year|yr|annum|quarter|monthly|annually)?",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern SLA_PATTERN = Pattern.compile(
            "([0-9]{2}(?:\\.[0-9]{1,3})?%?)\\s*(?:uptime|sla|availability|guarantee)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern COLOR_HEX_PATTERN = Pattern.compile(
            "#[0-9a-fA-F]{6}"
    );

    public ClaimAttributes extractAttributes(String claimText, ClaimType claimType) {
        if (claimText == null || claimText.isBlank()) {
            return new ClaimAttributes("Unknown", "OTHER", "Statement", "", "", "", "", "", List.of());
        }

        String product = "Nexora Pro"; // Default Nexora product if unspecified
        Matcher prodMatcher = PRODUCT_PATTERN.matcher(claimText);
        if (prodMatcher.find()) {
            product = prodMatcher.group(1);
        }

        List<String> qualifiers = new ArrayList<>();
        if (claimText.toLowerCase().contains("annual")) qualifiers.add("Annual Commitment");
        if (claimText.toLowerCase().contains("billed annually")) qualifiers.add("Billed Annually");
        if (claimText.toLowerCase().contains("per user")) qualifiers.add("Per User Seat");

        // 1. PRICE Claims
        if (claimType == ClaimType.PRICE || claimText.contains("₹") || claimText.contains("$") || claimText.toLowerCase().contains("price")) {
            Matcher priceMatcher = PRICE_PATTERN.matcher(claimText);
            if (priceMatcher.find()) {
                String currency = priceMatcher.group(1).trim();
                if (currency.equals("₹")) currency = "INR";
                else if (currency.equals("$")) currency = "USD";

                String amount = priceMatcher.group(2).replace(",", "");
                String period = priceMatcher.group(3) != null ? priceMatcher.group(3).toLowerCase() : "monthly";
                if (period.startsWith("mo")) period = "Monthly";
                else if (period.startsWith("yr") || period.startsWith("ann")) period = "Annually";
                else period = "Monthly";

                String unit = claimText.toLowerCase().contains("user") ? "Per User" : "Standard Seat";

                return new ClaimAttributes(
                        product,
                        "PRICE",
                        "Subscription Price",
                        (currency.equals("INR") ? "₹" : "$") + amount,
                        amount,
                        currency,
                        unit,
                        period,
                        qualifiers
                );
            }
        }

        // 2. SLA / UPTIME / PERFORMANCE Claims
        Matcher slaMatcher = SLA_PATTERN.matcher(claimText);
        if (slaMatcher.find()) {
            String slaVal = slaMatcher.group(1);
            if (!slaVal.endsWith("%")) slaVal += "%";
            return new ClaimAttributes(
                    product,
                    "SLA",
                    "Uptime SLA Commitment",
                    slaVal,
                    slaVal.replace("%", ""),
                    null,
                    "Availability Rate",
                    "Ongoing",
                    qualifiers
            );
        }

        // 3. VISUAL_BRAND (Color Palette / Logo) Claims
        if (claimType == ClaimType.VISUAL_BRAND || claimText.toLowerCase().contains("logo") || claimText.toLowerCase().contains("palette")) {
            if (claimText.toLowerCase().contains("logo") || claimText.toLowerCase().contains("monogram") || claimText.toLowerCase().contains("mark")) {
                String markVal = "Official 'CL' Monogram";
                if (claimText.toLowerCase().contains("unapproved") || claimText.toLowerCase().contains("deviation")) {
                    markVal = "Unapproved External Mark";
                }
                return new ClaimAttributes(
                        product,
                        "VISUAL_LOGO",
                        "Brand Mark Specification",
                        markVal,
                        null,
                        null,
                        "Corporate Asset",
                        null,
                        List.of("50% clear space padding required")
                );
            }

            Matcher hexMatcher = COLOR_HEX_PATTERN.matcher(claimText);
            if (hexMatcher.find()) {
                String hex = hexMatcher.group(0).toUpperCase();
                return new ClaimAttributes(
                        product,
                        "VISUAL_PALETTE",
                        "Dominant Palette Hue",
                        hex,
                        null,
                        null,
                        "CIELAB Color Standard",
                        null,
                        qualifiers
                );
            }
        }

        // 4. TERMINOLOGY / TONE / FEATURE General Claims
        String attrType = claimType != null ? claimType.name() : "FACTUAL";
        String attrName = switch (attrType) {
            case "FEATURE" -> "Product Capability";
            case "PROMOTION" -> "Promotional Statement";
            case "TERMINOLOGY" -> "Approved Terminology";
            case "TONE" -> "Brand Voice & Tone";
            default -> "Factual Statement";
        };

        return new ClaimAttributes(
                product,
                attrType,
                attrName,
                claimText.length() > 60 ? claimText.substring(0, 57) + "..." : claimText,
                null,
                null,
                null,
                null,
                qualifiers
        );
    }
}

