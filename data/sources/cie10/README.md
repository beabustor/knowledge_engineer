# Third-party Excel snapshot / Copia de Excel de terceros

**English:** `cie10.xls` is an unmodified snapshot from
[verasativa/CIE-10](https://github.com/verasativa/CIE-10/blob/master/cie10.xls).
`provenance.json` records the source commit and SHA-256. No explicit license was
found in that repository; reuse rights remain unverified and this project's MIT
license does not apply to the file. The upstream README references DEIS Chile
updates through December 2013 and a separate scraped CSV source. Do not describe
this snapshot as WHO 2019, CIE-10-ES or a current official release.

The browser loads it from the same static site on first analysis; no query text
is sent to a third party. Parsing produces 13,750 unique normalized codes from
12,424 sheet rows (including header); both three- and four-character columns
are used. Undotted four-character codes are normalized, e.g. R509 → R50.9.
Spanish labels are retained; unknown English labels show the code rather than
pretend to be translated. Included synonym mappings are local editorial rules.
Source data, matches and coding decisions must not be conflated.

**Español:** `cie10.xls` es una copia sin modificar de
[verasativa/CIE-10](https://github.com/verasativa/CIE-10/blob/master/cie10.xls).
`provenance.json` conserva commit y SHA-256. No se encontró una licencia explícita;
los derechos de reutilización siguen sin verificar y la licencia MIT del proyecto
no cubre el archivo. El README de origen referencia actualizaciones DEIS Chile a
diciembre de 2013 y otra fuente para el CSV obtenido mediante scraping. No presentar
esta copia como OMS 2019, CIE-10-ES ni edición oficial vigente.

El navegador carga la copia del propio sitio al primer análisis; no envía la
consulta a terceros. Se obtienen 13.750 códigos únicos normalizados de 12.424 filas
(incluida cabecera), usando ambas columnas de códigos. Se normaliza, por ejemplo,
R509 → R50.9. Se conservan etiquetas españolas; sin traducción inglesa se muestra
el código. Los alias incluidos son reglas editoriales locales. No confundir datos
de origen, coincidencias textuales y decisiones de codificación clínica.
