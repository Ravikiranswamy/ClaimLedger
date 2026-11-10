package com.claimledger.service;

import com.claimledger.model.enums.ClaimType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class ClaimExtractionService {

    private static final Logger log = LoggerFactory.getLogger(ClaimExtractionService.class);

    private final GeminiClientService geminiClient;
    private final ObjectMapper objectMapper;

    public record ExtractedClaim(
            String claimText,
            ClaimType claimType,
            BigDecimal aiConfidence
    ) {}

    public ClaimExtractionService(GeminiClientService geminiClient, ObjectMapper objectMapper) {
        this.geminiClient = geminiClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Extracts individual brand, pricing, and factual claims from content.
     */
    public List<ExtractedClaim> extractClaims(String content) {
        if (content == null || content.isBlank()) {
            return Collections.emptyList();
        }

        // 1. Try Gemini AI extraction if available
        if (geminiClient.isGeminiConfigured()) {
            List<ExtractedClaim> aiClaims = extractClaimsViaGemini(content);
            if (!aiClaims.isEmpty()) {
                log.info("Gemini extracted {} claims from submission", aiClaims.size());
                return aiClaims;
            }
        }

        // 2. Fallback to deterministic NLP heuristic extraction
        log.info("Using deterministic rule-based claim extraction");
        return extractClaimsHeuristic(content);
    }

    private List<ExtractedClaim> extractClaimsViaGemini(String content) {
        String prompt = String.format("""
                You are a Brand Governance Claim Extractor.
                Analyze the following marketing or business text and extract all individual factual statements,
                pricing numbers, SLA uptime promises, feature guarantees, promotions, and terminology usage.
                
                Text to analyze:
                \"\"\"%s\"\"\"
                
                Return a JSON array where each object has:
                - "claim_text": string (the exact factual claim)
                - "claim_type": string (one of: PRICE, FEATURE, PROMOTION, TERMINOLOGY, TONE, FACTUAL, OTHER)
                - "ai_confidence": number between 0.0 and 1.0
                
                Return ONLY the valid JSON array. Do not include markdown codeblocks or extra text.
                """, content);

        Optional<String> responseOpt = geminiClient.generateText(prompt);
        if (responseOpt.isEmpty()) {
            return Collections.emptyList();
        }

        String rawJson = responseOpt.get().trim();
        if (rawJson.startsWith("```json")) {
            rawJson = rawJson.substring(7);
        }
        if (rawJson.startsWith("```")) {
            rawJson = rawJson.substring(3);
        }
        if (rawJson.endsWith("```")) {
            rawJson = rawJson.substring(0, rawJson.length() - 3);
        }
        rawJson = rawJson.trim();

        try {
            JsonNode root = objectMapper.readTree(rawJson);
            if (root.isArray()) {
                List<ExtractedClaim> claims = new ArrayList<>();
                for (JsonNode item : root) {
                    String text = item.path("claim_text").asText();
                    String typeStr = item.path("claim_type").asText("FACTUAL").toUpperCase();
                    double confidence = item.path("ai_confidence").asDouble(0.95);

                    ClaimType type;
                    try {
                        type = ClaimType.valueOf(typeStr);
                    } catch (IllegalArgumentException e) {
                        type = ClaimType.FACTUAL;
                    }

                    if (!text.isBlank()) {
                        claims.add(new ExtractedClaim(text, type, BigDecimal.valueOf(confidence)));
                    }
                }
                return claims;
            }
        } catch (Exception e) {
            log.warn("Failed to parse Gemini response as JSON: {}. Response was: {}", e.getMessage(), rawJson);
        }

        return Collections.emptyList();
    }

    private List<ExtractedClaim> extractClaimsHeuristic(String content) {
        List<ExtractedClaim> claims = new ArrayList<>();
        // Split content by sentence terminators
        String[] sentences = content.split("(?<=[.!?])\\s+");

        Pattern pricePattern = Pattern.compile("(?i)(\\$|€|£|₹|\\bprice\\b|\\bcost\\b|\\bmonth\\b|\\bannual\\b|\\bfree\\b|\\bdiscount\\b)");
        Pattern featurePattern = Pattern.compile("(?i)(\\buptime\\b|\\bsla\\b|\\bguarantee\\b|\\bfeatures\\b|\\bsecurity\\b|\\bcapacity\\b|\\bencryption\\b|\\bsupport\\b)");
        Pattern promoPattern = Pattern.compile("(?i)(\\boffer\\b|\\bdeal\\b|\\bpromotion\\b|\\blimited\\b|\\bsave\\b|\\bspecial\\b|\\b100% error-free\\b|\\bfoolproof\\b|\\bzero risk\\b|\\bfastest\\b|\\bbest\\b|\\b#1\\b)");
        Pattern termPattern = Pattern.compile("(?i)(\\btrademark\\b|\\bcopyright\\b|\\bofficial\\b|\\bcertified\\b|\\bcompliant\\b|\\bNexora Pro\\b|\\bNexora Standard\\b|\\bNexora Lite\\b|\\bNexora Basic\\b|\\bAI Judge\\b|\\bGrammar Cop\\b|\\bCheat Checker\\b)");
        Pattern tonePattern = Pattern.compile("(?i)(\\bscam\\b|\\bjunk\\b|\\bfoolish\\b|\\bidiotic\\b|\\bstupid\\b|\\bregret it\\b|\\binsult\\b|\\bdisrespectful\\b)");

        for (String sentence : sentences) {
            String trimmed = sentence.trim();
            if (trimmed.length() < 10) continue;

            ClaimType type = ClaimType.FACTUAL;
            BigDecimal confidence = BigDecimal.valueOf(0.90);

            if (pricePattern.matcher(trimmed).find()) {
                type = ClaimType.PRICE;
                confidence = BigDecimal.valueOf(0.98);
            } else if (tonePattern.matcher(trimmed).find()) {
                type = ClaimType.TONE;
                confidence = BigDecimal.valueOf(0.96);
            } else if (termPattern.matcher(trimmed).find()) {
                type = ClaimType.TERMINOLOGY;
                confidence = BigDecimal.valueOf(0.95);
            } else if (promoPattern.matcher(trimmed).find()) {
                type = ClaimType.PROMOTION;
                confidence = BigDecimal.valueOf(0.92);
            } else if (featurePattern.matcher(trimmed).find()) {
                type = ClaimType.FEATURE;
                confidence = BigDecimal.valueOf(0.95);
            }

            claims.add(new ExtractedClaim(trimmed, type, confidence));
        }

        return claims;
    }
}
