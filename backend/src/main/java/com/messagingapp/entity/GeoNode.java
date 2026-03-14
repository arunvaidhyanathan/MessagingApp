package com.messagingapp.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "geo_node")
public class GeoNode {

    @Id
    private Long id;

    @Column(nullable = false, length = 20)
    private String code;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private int level;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "sort_order")
    private int sortOrder;

    @Column(nullable = false)
    private boolean active;

    public Long getId()       { return id; }
    public String getCode()   { return code; }
    public String getLabel()  { return label; }
    public int getLevel()     { return level; }
    public Long getParentId() { return parentId; }
    public int getSortOrder() { return sortOrder; }
    public boolean isActive() { return active; }
}
