package com.messagingapp.repository;

import com.messagingapp.entity.GeoNode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GeoNodeRepository extends JpaRepository<GeoNode, Long> {
    List<GeoNode> findByActiveTrueOrderByLevelAscSortOrderAsc();
}
