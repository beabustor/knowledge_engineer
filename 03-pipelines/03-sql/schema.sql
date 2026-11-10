-- SQLite teaching warehouse. Grain: one row per original purchase line, amounts in cents.
PRAGMA foreign_keys = ON;
CREATE TABLE supplier(id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE dim_month(month TEXT PRIMARY KEY);
CREATE TABLE concept(
 version TEXT NOT NULL, id TEXT NOT NULL, label_en TEXT NOT NULL, label_es TEXT NOT NULL,
 deprecated INTEGER NOT NULL CHECK(deprecated IN(0,1)), PRIMARY KEY(version,id)
);
CREATE TABLE broader(
 version TEXT NOT NULL, child TEXT NOT NULL, parent TEXT NOT NULL,
 PRIMARY KEY(version,child,parent),
 FOREIGN KEY(version,child) REFERENCES concept(version,id),
 FOREIGN KEY(version,parent) REFERENCES concept(version,id)
);
CREATE TABLE product_mapping(
 id TEXT PRIMARY KEY, supplier_id TEXT NOT NULL REFERENCES supplier(id),
 sku TEXT NOT NULL, target TEXT NOT NULL, material TEXT,
 UNIQUE(supplier_id,sku)
);
CREATE TABLE purchase(
 id TEXT PRIMARY KEY, mapping_id TEXT NOT NULL REFERENCES product_mapping(id),
 department TEXT NOT NULL, month TEXT NOT NULL REFERENCES dim_month(month),
 quantity INTEGER NOT NULL CHECK(quantity>0 AND typeof(quantity)='integer'),
 amount_cents INTEGER NOT NULL CHECK(amount_cents>=0 AND typeof(amount_cents)='integer')
);
CREATE TABLE review_decision(
 mapping_id TEXT NOT NULL REFERENCES product_mapping(id),
 version TEXT NOT NULL, target TEXT NOT NULL,
 actor TEXT NOT NULL CHECK(length(trim(actor))>0),
 reason TEXT NOT NULL CHECK(length(trim(reason))>0),
 PRIMARY KEY(mapping_id,version),
 FOREIGN KEY(version,target) REFERENCES concept(version,id)
);
-- Old mapping targets intentionally have no FK to a single release: catalog drift is measured.
-- Both the before/after release and any explicitly reviewed target retain their own version.
-- SQLite enforcement is explicit; warehouses may not enforce equivalent constraints.
CREATE TRIGGER review_active_insert BEFORE INSERT ON review_decision
WHEN EXISTS(SELECT 1 FROM concept WHERE version=NEW.version AND id=NEW.target AND deprecated=1)
BEGIN SELECT RAISE(ABORT,'Reviewed target is retired'); END;
CREATE TRIGGER review_active_update BEFORE UPDATE ON review_decision
WHEN EXISTS(SELECT 1 FROM concept WHERE version=NEW.version AND id=NEW.target AND deprecated=1)
BEGIN SELECT RAISE(ABORT,'Reviewed target is retired'); END;
