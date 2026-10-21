"""Original deterministic fixtures; not actual supplier data or official ontology updates."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[2]/'01-data/02-impact-scenario'
FAMILIES=[
('Solvents','Disolventes','Water|Water|Agua;Ethanol|Ethanol|Etanol;Methanol|Methanol|Metanol;Isopropanol|Isopropanol|Isopropanol;Acetone|Acetone|Acetona;Acetonitrile|Acetonitrile|Acetonitrilo'),
('Acids','Ácidos','AceticAcid|Acetic acid|Ácido acético;CitricAcid|Citric acid|Ácido cítrico;HydrochloricAcid|Hydrochloric acid|Ácido clorhídrico;SulfuricAcid|Sulfuric acid|Ácido sulfúrico;PhosphoricAcid|Phosphoric acid|Ácido fosfórico;NitricAcid|Nitric acid|Ácido nítrico'),
('Salts','Sales','SodiumChloride|Sodium chloride|Cloruro de sodio;PotassiumChloride|Potassium chloride|Cloruro de potasio;SodiumCarbonate|Sodium carbonate|Carbonato de sodio;SodiumBicarbonate|Sodium bicarbonate|Bicarbonato de sodio;CalciumChloride|Calcium chloride|Cloruro de calcio;MagnesiumSulfate|Magnesium sulfate|Sulfato de magnesio'),
('Glassware','Material de vidrio','Beaker|Beaker|Vaso de precipitados;Flask|Flask|Matraz;MeasuringCylinder|Measuring cylinder|Probeta;GlassVial|Glass vial|Vial de vidrio;Funnel|Funnel|Embudo;ReagentBottle|Reagent bottle|Frasco de reactivos'),
('Protection','Protección','ProtectiveGlove|Protective glove|Guante de protección;Goggles|Safety goggles|Gafas protectoras;LabCoat|Laboratory coat|Bata de laboratorio;FaceShield|Face shield|Pantalla facial;DisposableMask|Disposable mask|Mascarilla desechable;ShoeCovers|Shoe covers|Cubrecalzado'),
('Consumables','Consumibles','PipetteTips200|Pipette tips 200 µL|Puntas de pipeta 200 µL;PipetteTips300|Pipette tips 300 µL|Puntas de pipeta 300 µL;Microtube|Microtube|Microtubo;FilterPaper|Filter paper|Papel de filtro;Syringe|Syringe|Jeringa;SampleBag|Sample bag|Bolsa de muestras'),
('Equipment','Equipos','DigitalThermometer|Digital thermometer|Termómetro digital;MercuryThermometer|Mercury thermometer|Termómetro de mercurio;Balance|Precision balance|Balanza de precisión;PHMeter|pH meter|Medidor de pH;Centrifuge|Centrifuge|Centrífuga;Stirrer|Magnetic stirrer|Agitador magnético'),
('Cleaning','Limpieza','Detergent|Laboratory detergent|Detergente de laboratorio;Bleach|Bleach|Lejía;Tissues|Cleaning tissues|Toallitas de limpieza;Brush|Cleaning brush|Cepillo de limpieza;WasteBag|Waste bag|Bolsa de residuos;Absorbent|Absorbent granules|Gránulos absorbentes')]

def generate():
 ROOT.mkdir(exist_ok=True)
 concepts=[{'id':'Supplies','labels':{'en':'Laboratory supplies','es':'Suministros de laboratorio'},'broader':[]}]
 leaves=[]
 for family,es,items in FAMILIES:
  concepts.append({'id':family,'labels':{'en':family,'es':es},'broader':['Supplies']})
  for item in items.split(';'):
   id,en,label_es=item.split('|');c={'id':id,'labels':{'en':en,'es':label_es},'broader':[family]}
   if id in ('Water','Ethanol'):c['reference']='http://purl.obolibrary.org/obo/CHEBI_'+('15377' if id=='Water' else '16236')
   concepts.append(c);leaves.append(c)
 v1={'version':'scenario-v1','synthetic':True,'concepts':concepts}
 v2=json.loads(json.dumps(v1));v2['version']='scenario-v2';byid={c['id']:c for c in v2['concepts']}
 byid['Water']['labels']={'en':'Laboratory water','es':'Agua de laboratorio'}
 for id,targets in {'Acetone':['AcetoneGeneral'],'ProtectiveGlove':['NitrileGlove','LatexGlove'],'PipetteTips200':['PipetteTipsUniversal'],'PipetteTips300':['PipetteTipsUniversal']}.items():byid[id].update(deprecated=True,replacements=targets)
 for id,en,es,parent in [('AcetoneGeneral','Acetone, general grade','Acetona, grado general','Solvents'),('NitrileGlove','Nitrile glove','Guante de nitrilo','Protection'),('LatexGlove','Latex glove','Guante de látex','Protection'),('PipetteTipsUniversal','Pipette tips (capacity on product)','Puntas de pipeta (capacidad en producto)','Consumables')]:v2['concepts'].append({'id':id,'labels':{'en':en,'es':es},'broader':[parent]})
 byid['GlassVial']['broader']=['Consumables'];v2['concepts']=[c for c in v2['concepts'] if c['id']!='MercuryThermometer']
 mappings=[];records=[]
 for index,leaf in enumerate(leaves):
  for supplier in range(3):
   for variant in range(2):
    id=f'M{len(mappings)+1:04d}';attrs={}
    if leaf['id']=='ProtectiveGlove':attrs['material']='nitrile' if variant==0 else 'latex'
    if leaf['id'].startswith('PipetteTips'):attrs['capacity_uL']=200 if leaf['id'].endswith('200') else 300
    mappings.append({'id':id,'supplier':['Atlas Lab','Boreal Supply','Cobalt Science'][supplier],'sku':f'{supplier+1}-{index+1:03d}-{variant+1}','sourceLabel':leaf['labels']['en']+(' · standard' if variant==0 else ' · bulk'),'target':leaf['id'],'attributes':attrs,'review':'baseline-curated-fixture'})
    for j in range(30):
     qty=1+(j+variant)%7;unit=150+index*37+supplier*23+variant*41
     records.append({'id':f'P{len(records)+1:05d}','mapping':id,'department':['Research','Quality','Teaching'][j%3],'month':f'2026-{j%6+1:02d}','quantity':qty,'amountCents':qty*unit})
 objects={'catalog-v1.json':v1,'catalog-v2.json':v2,'mappings.json':mappings,'records.json':{'columns':list(records[0]),'rows':[list(r.values()) for r in records]}}
 for f,value in objects.items():(ROOT/f).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n')
 manifest={'origin':'Original synthetic scenario; not official W3C/ChEBI release changes or real supplier data','license':'MIT','generator':'03-pipelines/01-impact/generate.py','counts':{'v1_concepts':len(concepts),'v2_concepts':len(v2['concepts']),'supplier_mappings':len(mappings),'purchase_lines':len(records),'suppliers':3},'sha256':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in objects},'financial_unit':'synthetic EUR cents, not measured customer savings'}
 (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest['counts']))

if __name__=='__main__':generate()
