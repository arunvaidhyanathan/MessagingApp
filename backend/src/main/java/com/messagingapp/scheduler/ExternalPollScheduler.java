package com.messagingapp.scheduler;

import com.messagingapp.entity.CaseCommunication;
import com.messagingapp.entity.SenderType;
import com.messagingapp.repository.CaseCommunicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Polls the external SOAP system every 15 minutes for new FollowupQuestion responses.
 *
 * NOTE: Replace the stub references to FollowupQuestionGet and SoapClient
 * with your actual JAXB-generated classes and Spring-WS client implementation.
 */
@Service
public class ExternalPollScheduler {

    private static final Logger log = LoggerFactory.getLogger(ExternalPollScheduler.class);

    private final CaseCommunicationRepository repo;

    public ExternalPollScheduler(CaseCommunicationRepository repo) {
        this.repo = repo;
    }

    @Scheduled(fixedRateString = "${app.scheduler.poll-rate-ms}")
    @Transactional
    public void pollExternalSystem() {
        log.info("Polling external system for new follow-up responses...");

        // TODO: Replace with actual SOAP client call:
        // List<FollowupQuestionGet> externalData = soapClient.getResponses();
        // For each item, call processItem(item);
    }

    /**
     * Processes a single FollowupQuestion item from the external XML response.
     * Call this method from pollExternalSystem() for each item returned by the SOAP client.
     *
     * @param externalId    The FollowupQuestionId from the XML
     * @param questionText  The question body text
     * @param employeeName  The sender's name
     * @param caseId        The related internal case ID
     * @param answerText    The answer body (null if no answer yet)
     */
    @Transactional
    public void processItem(String externalId, String questionText,
                            String employeeName, String caseId, String answerText) {
        if (repo.existsByExternalId(externalId)) {
            log.debug("Skipping already-processed externalId: {}", externalId);
            return;
        }

        CaseCommunication question = new CaseCommunication();
        question.setExternalId(externalId);
        question.setMessageText(questionText);
        question.setSenderType(SenderType.EXTERNAL);
        question.setSenderName(employeeName);
        question.setCaseId(caseId);

        // IMPORTANT: persist first to get the DB-generated ID,
        // then use that ID as the parent reference for the reply.
        CaseCommunication saved = repo.save(question);
        log.info("Persisted new external question, id={}, externalId={}", saved.getId(), externalId);

        if (answerText != null && !answerText.isBlank()) {
            saveReply(saved, answerText);
        }
    }

    private void saveReply(CaseCommunication parent, String answerText) {
        CaseCommunication reply = new CaseCommunication();
        reply.setMessageText(answerText);
        reply.setSenderType(SenderType.INTERNAL);
        reply.setParentMessageId(parent.getId());
        reply.setCaseId(parent.getCaseId());
        repo.save(reply);
        log.info("Persisted reply linked to parent id={}", parent.getId());
    }
}
