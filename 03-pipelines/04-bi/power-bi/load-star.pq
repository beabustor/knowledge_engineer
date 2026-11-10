// Power Query M template, NOT executed in Power BI Desktop.
// Create a Text parameter DataFolder pointing to the exported CSV folder.
let
 Read = (name as text) as table => Table.PromoteHeaders(
   Csv.Document(File.Contents(DataFolder & "/" & name & ".csv"),
     [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]), [PromoteAllScalars=true]),
 FactPurchase = Table.TransformColumnTypes(Read("fact_purchase"),
   {{"quantity",Int64.Type},{"amount_cents",Int64.Type}}),
 DimMapping = Table.TransformColumnTypes(Read("dim_mapping"),{{"reviewed",Int64.Type}}),
 DimSupplier = Read("dim_supplier"),
 DimCategory = Read("dim_category"),
 DimMonth = Table.TransformColumnTypes(Read("dim_month"),{{"month_start",type date}})
in
 [FactPurchase=FactPurchase,DimMapping=DimMapping,DimSupplier=DimSupplier,
  DimCategory=DimCategory,DimMonth=DimMonth]
// Name this record query Star. Create separate queries = Star[FactPurchase], etc.
