package com.messagingapp.service;

import com.messagingapp.dto.CaseCommunicationDto;
import com.messagingapp.entity.CaseCommunication;
import org.springframework.stereotype.Component;

@Component
public class CommunicationMapper {

    public CaseCommunicationDto toDto(CaseCommunication entity) {
        return new CaseCommunicationDto(
            entity.getId(),
            entity.getCaseId(),
            entity.getMessageText(),
            entity.getSenderType().name(),
            entity.getSenderName(),
            entity.getSenderId(),
            entity.getParentMessageId(),
            entity.isVisibleToInvestigator(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
