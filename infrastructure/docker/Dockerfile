# Optional scaffold; no build occurs in Pages CI.
FROM python:3.12-slim
WORKDIR /app
COPY optional /app/optional
USER 65532:65532
EXPOSE 8080
# Requires operator-provided configuration; no defaults silently enable a service.
ENTRYPOINT ["python", "-m", "optional.api.server", "--host", "0.0.0.0", "--config", "/config/config.json"]
