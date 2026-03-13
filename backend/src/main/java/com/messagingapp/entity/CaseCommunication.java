package com.messagingapp.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name = "case_communication")
public class CaseCommunication {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "comm_seq")
    @SequenceGenerator(name = "comm_seq", sequenceName = "seq_case_communication_id", allocationSize = 1)
    private Long id;

    @Column(name = "case_id", nullable = false, length = 50)
    private String caseId;

    @Column(name = "message_text", nullable = false, columnDefinition = "TEXT")
    private String messageText;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "sender_type", nullable = false, columnDefinition = "sender_type_enum")
    private SenderType senderType;

    @Column(name = "sender_name")
    private String senderName;

    @Column(name = "sender_id", length = 100)
    private String senderId;

    @Column(name = "parent_message_id")
    private Long parentMessageId;

    @Column(name = "external_id", unique = true, length = 100)
    private String externalId;

    @Column(name = "is_visible_to_investigator")
    private boolean visibleToInvestigator = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCaseId() { return caseId; }
    public void setCaseId(String caseId) { this.caseId = caseId; }
    public String getMessageText() { return messageText; }
    public void setMessageText(String messageText) { this.messageText = messageText; }
    public SenderType getSenderType() { return senderType; }
    public void setSenderType(SenderType senderType) { this.senderType = senderType; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public Long getParentMessageId() { return parentMessageId; }
    public void setParentMessageId(Long parentMessageId) { this.parentMessageId = parentMessageId; }
    public String getExternalId() { return externalId; }
    public void setExternalId(String externalId) { this.externalId = externalId; }
    public boolean isVisibleToInvestigator() { return visibleToInvestigator; }
    public void setVisibleToInvestigator(boolean visibleToInvestigator) { this.visibleToInvestigator = visibleToInvestigator; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
