package com.claimledger.dto.diff;

public class TextDiffChunk {
    public enum DiffType {
        UNCHANGED,
        ADDED,
        REMOVED
    }

    private DiffType type;
    private String text;

    public TextDiffChunk() {}

    public TextDiffChunk(DiffType type, String text) {
        this.type = type;
        this.text = text;
    }

    public DiffType getType() {
        return type;
    }

    public void setType(DiffType type) {
        this.type = type;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}

