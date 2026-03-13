package com.messagingapp.repository;

import com.messagingapp.entity.CaseCommunication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CaseCommunicationRepository extends JpaRepository<CaseCommunication, Long> {

    boolean existsByExternalId(String externalId);

    List<CaseCommunication> findByCaseIdOrderByCreatedAtAsc(String caseId);
}
