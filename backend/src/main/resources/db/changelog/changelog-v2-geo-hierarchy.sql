--liquibase formatted sql

--changeset dev:6 labels:v2 comment:create geo_node sequence
CREATE SEQUENCE IF NOT EXISTS seq_geo_node_id START WITH 100 INCREMENT BY 1;

--changeset dev:7 labels:v2 comment:create geo_node table
CREATE TABLE geo_node (
    id          BIGINT       PRIMARY KEY DEFAULT nextval('seq_geo_node_id'),
    code        VARCHAR(20)  NOT NULL,
    label       VARCHAR(255) NOT NULL,
    level       INT          NOT NULL CHECK (level BETWEEN 1 AND 4),
    parent_id   BIGINT       REFERENCES geo_node(id),
    sort_order  INT          NOT NULL DEFAULT 0,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_geo_node_code_parent UNIQUE (code, parent_id)
);

CREATE INDEX idx_geo_node_parent ON geo_node(parent_id);
CREATE INDEX idx_geo_node_level  ON geo_node(level);

--changeset dev:8 labels:v2 comment:seed regions (level 1)
INSERT INTO geo_node (id, code, label, level, parent_id, sort_order) VALUES
  (1, 'NAM',  'North America',          1, NULL, 1),
  (2, 'EMEA', 'Europe Middle East Africa', 1, NULL, 2),
  (3, 'JANA', 'Japan & North Asia',     1, NULL, 3),
  (4, 'APAC', 'Asia Pacific',           1, NULL, 4),
  (5, 'LATAM','Latin America',          1, NULL, 5);

--changeset dev:9 labels:v2 comment:seed countries (level 2)
INSERT INTO geo_node (id, code, label, level, parent_id, sort_order) VALUES
  -- NAM
  (10, 'US', 'United States', 2, 1, 1),
  (11, 'CA', 'Canada',        2, 1, 2),
  -- EMEA
  (20, 'GB', 'United Kingdom',2, 2, 1),
  (21, 'DE', 'Germany',       2, 2, 2),
  -- JANA
  (30, 'JP', 'Japan',         2, 3, 1),
  -- APAC
  (40, 'AU', 'Australia',     2, 4, 1),
  -- LATAM
  (50, 'BR', 'Brazil',        2, 5, 1);

--changeset dev:10 labels:v2 comment:seed states (level 3)
INSERT INTO geo_node (id, code, label, level, parent_id, sort_order) VALUES
  -- United States
  (100, 'US-CA', 'California',    3, 10, 1),
  (101, 'US-TX', 'Texas',         3, 10, 2),
  (102, 'US-NY', 'New York',      3, 10, 3),
  -- Canada
  (110, 'CA-ON', 'Ontario',       3, 11, 1),
  (111, 'CA-BC', 'British Columbia', 3, 11, 2),
  -- United Kingdom
  (120, 'GB-ENG','England',       3, 20, 1),
  (121, 'GB-SCT','Scotland',      3, 20, 2),
  -- Germany
  (130, 'DE-BY', 'Bavaria',       3, 21, 1),
  (131, 'DE-BE', 'Berlin',        3, 21, 2),
  -- Japan
  (140, 'JP-13', 'Tokyo',         3, 30, 1),
  (141, 'JP-27', 'Osaka',         3, 30, 2),
  -- Australia
  (150, 'AU-NSW','New South Wales',3, 40, 1),
  (151, 'AU-VIC','Victoria',      3, 40, 2),
  -- Brazil
  (160, 'BR-SP', 'São Paulo',     3, 50, 1),
  (161, 'BR-RJ', 'Rio de Janeiro',3, 50, 2);

--changeset dev:11 labels:v2 comment:seed cities (level 4)
INSERT INTO geo_node (id, code, label, level, parent_id, sort_order) VALUES
  -- California
  (1000, 'LAX', 'Los Angeles',    4, 100, 1),
  (1001, 'SFO', 'San Francisco',  4, 100, 2),
  (1002, 'SAN', 'San Diego',      4, 100, 3),
  -- Texas
  (1010, 'AUS', 'Austin',         4, 101, 1),
  (1011, 'HOU', 'Houston',        4, 101, 2),
  -- New York
  (1020, 'NYC', 'New York City',  4, 102, 1),
  (1021, 'BUF', 'Buffalo',        4, 102, 2),
  -- Ontario
  (1030, 'YYZ', 'Toronto',        4, 110, 1),
  (1031, 'YOW', 'Ottawa',         4, 110, 2),
  -- British Columbia
  (1040, 'YVR', 'Vancouver',      4, 111, 1),
  -- England
  (1050, 'LON', 'London',         4, 120, 1),
  (1051, 'MAN', 'Manchester',     4, 120, 2),
  -- Scotland
  (1060, 'EDI', 'Edinburgh',      4, 121, 1),
  -- Bavaria
  (1070, 'MUC', 'Munich',         4, 130, 1),
  -- Berlin
  (1080, 'BER', 'Berlin',         4, 131, 1),
  -- Tokyo
  (1090, 'TYO', 'Tokyo City',     4, 140, 1),
  -- Osaka
  (1100, 'OSA', 'Osaka City',     4, 141, 1),
  -- New South Wales
  (1110, 'SYD', 'Sydney',         4, 150, 1),
  -- Victoria
  (1120, 'MEL', 'Melbourne',      4, 151, 1),
  -- São Paulo
  (1130, 'GRU', 'São Paulo City', 4, 160, 1),
  -- Rio de Janeiro
  (1140, 'GIG', 'Rio de Janeiro City', 4, 161, 1);
