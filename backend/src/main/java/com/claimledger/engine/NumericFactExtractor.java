package com.claimledger.engine;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pure Java deterministic Numeric Fact Extractor.
 * Extracts numbers with their units, currency symbols, and context words.
 * Used to detect conflicts between equal-authority documents and identify violations.
 */
public class NumericFactExtractor {

    // Matches numbers with optional currency symbols or percentages, e.g. $120, 99.9%, 50,000, 14 days
    private static final Pattern NUMERIC_PATTERN = Pattern.compile(
            "(?i)(\\$|€|£|₹)?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(%|per month|/month|users?|days?|hours?|pages?)?"
    );

    public record NumericFact(
            String rawToken,
            BigDecimal value,
            String prefix,
            String unit,
            String context
    ) {}

    /**
     * Extracts all numeric facts with nearby contextual keywords from the given text.
     */
    public static List<NumericFact> extractFacts(String text) {
        List<NumericFact> facts = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return facts;
        }

        Matcher matcher = NUMERIC_PATTERN.matcher(text);
        while (matcher.find()) {
            String prefix = matcher.group(1) != null ? matcher.group(1).trim() : "";
            String numStr = matcher.group(2).replace(",", "");
            String unit = matcher.group(3) != null ? matcher.group(3).trim().toLowerCase() : "";

            try {
                BigDecimal value = new BigDecimal(numStr);
                // Extract surrounding 30 characters as context window
                int start = Math.max(0, matcher.start() - 30);
                int end = Math.min(text.length(), matcher.end() + 30);
                String context = text.substring(start, end).toLowerCase();

                facts.add(new NumericFact(matcher.group(0).trim(), value, prefix, unit, context));
            } catch (NumberFormatException ignored) {
            }
        }
        return facts;
    }

    /**
     * Checks whether two texts disagree on numeric facts for common metrics (e.g. price, uptime, capacity).
     */
    public static boolean hasNumericConflict(String textA, String textB) {
        List<NumericFact> factsA = extractFacts(textA);
        List<NumericFact> factsB = extractFacts(textB);

        for (NumericFact fa : factsA) {
            for (NumericFact fb : factsB) {
                // If they share currency or unit or context keywords (e.g. price / month / uptime)
                if (isComparable(fa, fb) && fa.value().compareTo(fb.value()) != 0) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Finds conflicting facts between a claim and an authoritative excerpt.
     * Returns an Optional description of the conflict or mismatch.
     */
    public static Optional<String> findMismatch(String claimText, String authoritativeExcerpt) {
        List<NumericFact> claimFacts = extractFacts(claimText);
        List<NumericFact> docFacts = extractFacts(authoritativeExcerpt);

        for (NumericFact cf : claimFacts) {
            for (NumericFact df : docFacts) {
                if (isComparable(cf, df) && cf.value().compareTo(df.value()) != 0) {
                    return Optional.of(String.format("Claim states '%s' but authoritative document states '%s'",
                            cf.rawToken(), df.rawToken()));
                }
            }
        }
        return Optional.empty();
    }

    private static boolean isComparable(NumericFact f1, NumericFact f2) {
        // Same currency prefix ($ vs $)
        if (!f1.prefix().isEmpty() && f1.prefix().equals(f2.prefix())) {
            return true;
        }
        // Same unit (% vs %, days vs days)
        if (!f1.unit().isEmpty() && f1.unit().equalsIgnoreCase(f2.unit())) {
            return true;
        }
        // Shared critical metric keywords in context
        String[] keywords = {"price", "cost", "fee", "rate", "uptime", "sla", "sla:", "guarantee", "capacity", "limit", "discount"};
        for (String kw : keywords) {
            if (f1.context().contains(kw) && f2.context().contains(kw)) {
                return true;
            }
        }
        return false;
    }
}
