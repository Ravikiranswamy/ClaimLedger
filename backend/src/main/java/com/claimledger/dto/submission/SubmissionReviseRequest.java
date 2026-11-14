package com.claimledger.dto.submission;

import com.claimledger.model.enums.ContentType;
import jakarta.validation.constraints.NotBlank;

public class SubmissionReviseRequest {

    private String content;

    private String creatorNotes;

    private String revisionComment;

    private ContentType contentType = ContentType.TEXT;

    public SubmissionReviseRequest() {
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getCreatorNotes() {
        return creatorNotes;
    }

    public void setCreatorNotes(String creatorNotes) {
        this.creatorNotes = creatorNotes;
    }

    public String getRevisionComment() {
        return revisionComment;
    }

    public void setRevisionComment(String revisionComment) {
        this.revisionComment = revisionComment;
    }

    public ContentType getContentType() {
        return contentType;
    }

    public void setContentType(ContentType contentType) {
        this.contentType = contentType;
    }
}
