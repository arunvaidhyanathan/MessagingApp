package com.messagingapp.service;

import com.messagingapp.dto.CaseCommunicationDto;
import com.messagingapp.dto.SendMessageRequest;
import com.messagingapp.entity.CaseCommunication;
import com.messagingapp.entity.SenderType;
import com.messagingapp.repository.CaseCommunicationRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CommunicationService {

    private final CaseCommunicationRepository repo;
    private final CommunicationMapper mapper;

    public CommunicationService(CaseCommunicationRepository repo, CommunicationMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    public List<CaseCommunicationDto> getMessagesByCase(String caseId) {
        return repo.findByCaseIdOrderByCreatedAtAsc(caseId)
                   .stream()
                   .map(mapper::toDto)
                   .toList();
    }

    @Transactional
    public CaseCommunicationDto sendMessage(SendMessageRequest request) {
        CaseCommunication msg = new CaseCommunication();
        msg.setCaseId(request.caseId());
        msg.setMessageText(request.messageText());
        msg.setSenderType(SenderType.INTERNAL);
        msg.setParentMessageId(request.parentMessageId());
        return mapper.toDto(repo.save(msg));
    }

    @Transactional
    public void updateVisibility(Long id, boolean visible) {
        CaseCommunication msg = repo.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Message not found: " + id));
        msg.setVisibleToInvestigator(visible);
        repo.save(msg);
    }
}
