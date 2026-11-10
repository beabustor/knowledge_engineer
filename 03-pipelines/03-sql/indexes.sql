-- Composite key matches the bounded lookup demonstrated by diagnostics.
CREATE INDEX idx_purchase_mapping_month ON purchase(mapping_id,month);
CREATE INDEX idx_mapping_target ON product_mapping(target);
CREATE INDEX idx_broader_parent ON broader(version,parent,child);
