package com.claimledger.engine;

import java.util.Comparator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pure Java deterministic Version Comparator.
 * Compares versions such as "v4.2", "v2.0", "1.0.3", "v10.1", "2.0-beta" etc.
 */
public class VersionComparator implements Comparator<String> {

    private static final Pattern VERSION_PATTERN = Pattern.compile("(?i)^v?(\\d+(?:\\.\\d+)*)(.*)$");

    @Override
    public int compare(String v1, String v2) {
        if (v1 == null && v2 == null) return 0;
        if (v1 == null) return -1;
        if (v2 == null) return 1;

        String cleanV1 = v1.trim();
        String cleanV2 = v2.trim();

        Matcher m1 = VERSION_PATTERN.matcher(cleanV1);
        Matcher m2 = VERSION_PATTERN.matcher(cleanV2);

        if (m1.matches() && m2.matches()) {
            String[] parts1 = m1.group(1).split("\\.");
            String[] parts2 = m2.group(1).split("\\.");

            int maxLen = Math.max(parts1.length, parts2.length);
            for (int i = 0; i < maxLen; i++) {
                int num1 = i < parts1.length ? parseSafeInt(parts1[i]) : 0;
                int num2 = i < parts2.length ? parseSafeInt(parts2[i]) : 0;

                if (num1 != num2) {
                    return Integer.compare(num1, num2);
                }
            }

            // If numeric parts are equal, compare suffix
            String suffix1 = m1.group(2).trim();
            String suffix2 = m2.group(2).trim();
            return suffix1.compareToIgnoreCase(suffix2);
        }

        // Fallback to case-insensitive comparison
        return cleanV1.compareToIgnoreCase(cleanV2);
    }

    private int parseSafeInt(String str) {
        try {
            return Integer.parseInt(str);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
