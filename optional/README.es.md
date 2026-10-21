# Extensiones opcionales de servidor — DESACTIVADAS

[English](README.md) · [Español](README.es.md)

La demo y GitHub Pages no importan, despliegan ni activan estos módulos.
`config.example.json` desactiva todas las funciones. Importar código no realiza
llamadas de pago, aprovisionamiento, consultas masivas ni entrenamiento.

## Capacidades y límites

| Carpeta | Preparado | Pendiente para producción |
| --- | --- | --- |
| `api/` | Servidor local de salud y estado | Autenticación, autorización, cuotas, TLS y rutas de consulta |
| `terminology/` | Adaptador opcional FHIR ValueSet `$expand` | Servidor autorizado, edición/ValueSet CIE-10, contrato API y revisión de derechos |
| `ai/` | Adaptadores OpenAI Responses y Anthropic Messages; ayuda para prompts fundamentados | Modelo elegido, cuenta API, análisis de respuestas y validación clínica |
| `bulk/` | Planificador local limitado, solo simulación | Cola duradera, trabajadores, cancelación y contabilidad de costes |
| `storage/` | Plan de nombres y rutas | Adaptadores de almacenamiento, IAM, cifrado, conservación y borrado |

Son puntos de partida, no una plataforma de inferencia de producción. Ninguna ruta HTTP invoca IA. Activar solo `api` ofrece
`/health` y `/capabilities`; activar además `public_lookup` permite el proxy
de fuentes públicas con cuotas descrito al final. Azure e identidades cloud se documentan como futuras
integraciones, no como autenticación implementada.

## Activación paso a paso

1. Mantener independiente la web gratuita. Copiar la configuración a
   `optional/config.local.json`, ignorada por Git. No poner credenciales en frontend.
2. Elegir una sola función y comprobar fuente autorizada, edición, condiciones
   de API, región, tratamiento de datos y coste previsto antes de activarla.
3. Para el servidor local, cambiar solo `api.enabled=true` y ejecutar
   `python -m optional.api.server --config optional/config.local.json`.
   Comprobar `/health` localmente; por defecto escucha solo en loopback.
4. Para terminología, configurar un servidor FHIR HTTPS autorizado, `allowed_host`,
   `value_set_url` de la edición y `license_verified=true`. Activar `terminology`.
   Probar primero `build_request` sin red y luego invocar `search` explícitamente
   con texto sintético. Solo llama a `$expand`: no autentica con la OMS,
   no infiere enfermedades ni sustituye CIE-10 por CIE-11.
5. Para IA, elegir proveedor y modelo disponible. Guardar la clave en el servidor
   y activar tanto `ai.enabled` como `ai.allow_paid_requests`. `complete` hace una
   petición sin reintentos. No exponerla sin autenticación. Recuperar primero
   candidatos de una terminología autorizada y usar `grounded_prompt` con esa lista.
   Convertir la respuesta específica del proveedor en JSON y aplicar
   `validate_selection`: rechaza IDs inventados, pero no errores clínicos.
6. Probar casos sintéticos: negación, ambigüedad, ausencia de coincidencias,
   credenciales caducadas, timeout, edición no soportada, cuotas y errores.
   Añadir evaluación experta antes de uso clínico. No enviar descripciones reales
   de pacientes sin resolver tratamiento de datos y base legal aplicable.
7. Implementar rutas protegidas y pasarela antes de exponer a Internet: cuotas,
   autorización por usuario, seguimiento, borrado y alertas de presupuesto.
   Dejar desactivado el resto. Para detener: desactivar y revocar credenciales.

## Autenticación y modelos

- OpenAI API: `OPENAI_API_KEY` en servidor; endpoint `/v1/responses`.
- Anthropic API: `ANTHROPIC_API_KEY` en servidor; endpoint `/v1/messages`.
- Suscripciones web de ChatGPT/Claude y sesiones de usuario no son claves API.
  Acceso API, disponibilidad de modelos y condiciones se contratan por separado.
  No se extraen cookies ni se reutilizan tokens de sesiones de consumidor.
- Azure OpenAI: prever recurso, nombre de despliegue, versión API e identidad
  administrada (preferible) o clave. `AZURE_OPENAI_*` son marcadores reservados;
  el adaptador específico de Azure aún debe implementarse y probarse.
- OAuth/OIDC empresarial: implementar flujos oficialmente soportados, validación
  de redirecciones, ámbitos y tokens en servidor. No existe un OAuth universal.
- Nunca usar `VITE_*` para secretos: el bundle estático es público. `.env` está
  ignorado, pero no sustituye un gestor de secretos al desplegar.

No se fijan modelos de pago. Elegir uno disponible en la cuenta y región y
verificar su esquema de petición. Los límites de prompt/salida son controles
por llamada, no un límite económico garantizado.

## Consultas masivas y almacenamiento

`bulk` solo activa la simulación: 100 elementos y concurrencia 1 por defecto;
no envía trabajos y declara el coste desconocido. Un trabajador real necesita
paginación limitada, contrapresión, límites por proveedor, idempotencia,
reintentos acotados, topes de tokens/dinero, cancelación y cola de errores.
Probar 100 elementos antes de 1.000 y aumentar solo con costes, latencias,
errores y permisos medidos. No hay escalado automático configurado.

`storage/layout.json` define rutas privadas, no recursos reales. Conservar fuentes
autorizadas por edición y separar normalización, índices, evaluación, entrenamiento
y auditoría. No subir corpus licenciados ni consultas crudas a Git público o Pages.
La conservación del texto de consultas está desactivada. Si se activa, definir
finalidad, minimización, cifrado, permisos, plazos, borrado y copias de seguridad.
Las claves de caché deben incluir edición, idioma y versión del pipeline/modelo.
No registrar cuerpos de peticiones, claves API ni identificadores de pacientes.

## Verificación

`python -m unittest discover -s optional/tests -v` ejecuta pruebas locales con
credenciales simuladas, sin llamadas de pago. No se han validado credenciales
reales, despliegues cloud, respuestas de proveedores ni importaciones licenciadas.

## IA local opcional sin tarifa API por consulta

El adaptador Ollama está preparado pero **desactivado**. Solo apunta a
`http://127.0.0.1:11434/api/generate`. Para usarlo después: instalar Ollama de
forma independiente, elegir y obtener un modelo con licencia adecuada y probar
memoria/latencia. Activar explícitamente `ai.enabled=true`, `provider="ollama"`,
el nombre exacto del `model` instalado y `allow_local_requests=true`. Mantener
`allow_paid_requests=false`. Este repositorio no descarga ni arranca modelos.
Un modelo pequeño puede fallar en extracción clínica y requiere evaluación.

Esto evita cuotas por consulta de una API alojada, pero no significa cómputo
ilimitado: RAM/VRAM, CPU/GPU, electricidad, contexto y licencia siguen limitando.
Ollama/llama.cpp son motores locales; WebLLM/Transformers.js son alternativas
posibles en navegador, no integradas aquí. Pages no aloja un servidor Ollama.
La demo gratuita usa reglas y búsqueda Excel, no un LLM. No exponer el motor
local públicamente sin autenticación y límites.

## Proxy terminológico público opcional

`api/server.py` admite además `/lookup?source=ols|cima&term=...` solo con
`public_lookup.enabled=true`. El README raíz detalla cuotas, origen CORS,
privacidad y límites de proxies y proceso único. No se expone IA. Los destinos
están fijados: el cliente no puede elegir una URL externa arbitraria.
La web puede usarlo con la variable pública de compilación `VITE_LOOKUP_API_BASE`.
Es un servidor de desarrollo: antes de exponerlo necesita pasarela TLS de
producción, límites de conexiones/peticiones y contadores compartidos.
