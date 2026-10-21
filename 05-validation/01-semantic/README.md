# Semantic validation / Validación semántica

**English:** Run `python 05-validation/01-semantic/validate.py` with `04-app/requirements-test.txt`
installed. SHACL validates labels, provenance, class/property/individual roles,
domains, ranges, numeric types and candidate mapping safety. Four deliberately
invalid fixtures must fail. OWL RL checks a superclass inference and ensures an
inverse inference is absent. RDF/Turtle, OWL/RDF/XML and SQLite exports are also
compared in `02-model/test_representations.py`.

These are project-profile constraints, not a universal OWL validator or OWL DL
certification. A class/individual collision is forbidden by this project's design,
although OWL can support punning. The reasoning check does not establish full
ontology consistency or clinical validity. Neo4j server execution is not tested.

**Español:** Ejecutar `python 05-validation/01-semantic/validate.py` tras instalar
`04-app/requirements-test.txt`. SHACL comprueba etiquetas, procedencia, separación de
roles, dominios/rangos, tipos numéricos y seguridad de asociaciones candidatas.
Cuatro ejemplos inválidos deben fallar. OWL RL comprueba una inferencia de superclase
y la ausencia de la inferencia inversa. `02-model/test_representations.py` compara
RDF/Turtle, OWL/RDF/XML y SQLite.

Es un perfil del proyecto, no un validador universal ni certificación OWL DL.
La colisión clase/individuo se prohíbe por diseño aquí, aunque OWL admite punning.
No demuestra consistencia ontológica completa ni validez clínica. No se prueban
consultas contra un servidor Neo4j real.
