# Infraestructura opcional (plantillas, no despliegues)

[English](README.md) · [Español](README.es.md)

Pages no ejecuta estos archivos. Aplicarlos puede generar recursos y costes
incluso sin consultas. Clústeres, discos, balanceadores, registros, logs y tráfico
pueden facturarse. No se promete nube gratuita. Docker y Kubernetes no se han
validado en un motor o clúster real desde este entorno.

## Docker local paso a paso

1. Leer `optional/README.es.md`. Copiar la configuración a
   `optional/config.local.json` (ignorada) y activar solo `api.enabled=true`.
2. Revisar imagen y dependencias; fijar un digest verificado antes de producción.
   La etiqueta de ejemplo no es un bloqueo inmutable de la cadena de suministro.
3. Activar explícitamente:
   `docker compose -f infrastructure/docker/compose.optional.yml --profile backend up --build`.
4. Comprobar `/health` en el puerto local 8080. No hay rutas de IA/terminología.
5. Detener con el mismo archivo/perfil Compose y `down`.

Elegir un perfil no activa las funciones. La configuración se monta en solo
lectura y no contiene claves. Para integrar adaptadores reales después, usar
secretos de Docker o gestor externo, nunca secretos incorporados a la imagen.

## Kubernetes paso a paso

1. Elegir clúster, namespace, presupuesto y responsable. No aplicar sin revisar.
2. Construir y analizar la imagen; sustituir el digest de ejemplo en
   `kubernetes/api.template.yaml`. Crear el ConfigMap con configuración revisada;
   no introducir secretos en ConfigMap.
3. Por defecto: **cero réplicas**, ClusterIP privado, sin ingress ni autoescalador.
   NetworkPolicy bloquea todo el tráfico. Adaptarla al CNI, controlador de ingreso,
   DNS y destinos autorizados reales. NetworkPolicy estándar no impone listas de
   dominios; para ello se necesita una pasarela/proxy de salida.
4. Añadir gestor de secretos/identidad de carga y pasarela TLS autenticada antes
   de exponer. Validar manifiestos con simulación del servidor del clúster.
5. Para una prueba de salud elegir explícitamente una réplica y comprobar sondas,
   recursos y logs. Volver a cero y eliminar recursos cuando se termine.
6. Añadir rutas de consulta, trabajadores, cola y almacenamiento tras las pruebas.
   Escalar según métricas, manteniendo límites globales del proveedor y de gasto
   compartidos entre réplicas.

No se automatizan kubectl apply, construcción Docker, login cloud ni creación de
recursos. El servidor de ejemplo no es un servicio de consultas de producción.

## Rutas privadas de almacenamiento

`optional/storage/layout.json` define prefijos comunes:
`raw/<source>/<edition>/`, `normalized/`, `ontologies/`, `indexes/`, `jobs/`,
`evaluations/`, `training/`, `models/`, `audit/`, `quarantine/`.

Los planes `cloud/azure/`, `cloud/aws/` y `cloud/gcp/` son JSON inertes, no recursos
Terraform/ARM. Los nombres son ejemplos, no reservas. Región, unicidad global,
SKU, territorio de licencia, IAM, cifrado, red, conservación y copias requieren
decisiones del operador. No montar corpus privados en `web/`, subirlos a Git ni
incluirlos en los artefactos de Pages.
