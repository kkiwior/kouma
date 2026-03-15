# Helm Chart Reference

The Kouma Helm chart deploys all required services to a Kubernetes cluster. It is published as an OCI artifact to the GitHub Container Registry.

## Chart Location

| | |
| --- | --- |
| **Registry** | `oci://ghcr.io/kkiwior/charts/kouma` |
| **Source** | [`charts/kouma`](https://github.com/kkiwior/kouma/tree/main/charts/kouma) |

## Installation

```bash
helm install kouma oci://ghcr.io/kkiwior/charts/kouma
```

Install a specific version:

```bash
helm install kouma oci://ghcr.io/kkiwior/charts/kouma --version 1.2.3
```

Upgrade an existing release:

```bash
helm upgrade kouma oci://ghcr.io/kkiwior/charts/kouma -f values.yaml
```

## Values Reference

### Global

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `nameOverride` | string | `""` | Override the chart name |
| `fullnameOverride` | string | `""` | Override the full resource name |
| `imagePullSecrets` | list | `[]` | Image pull secrets for all images |

### MongoDB (Bundled)

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `mongodb.enabled` | bool | `true` | Deploy a bundled MongoDB instance |
| `mongodb.image.repository` | string | `mongo` | MongoDB image repository |
| `mongodb.image.tag` | string | `"7"` | MongoDB image tag |
| `mongodb.persistence.enabled` | bool | `true` | Enable persistent storage |
| `mongodb.persistence.size` | string | `10Gi` | Storage size |
| `mongodb.persistence.storageClass` | string | `""` | Storage class (empty = cluster default) |
| `mongodb.auth.rootUsername` | string | `mgadmin` | MongoDB root username |
| `mongodb.auth.rootPassword` | string | `Password1` | MongoDB root password |
| `mongodb.auth.username` | string | `kouma-user` | Application username |
| `mongodb.auth.password` | string | `kouma-password` | Application password |
| `mongodb.auth.database` | string | `kouma` | Database name |

### External MongoDB

Used when `mongodb.enabled` is `false`.

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `externalMongodb.uri` | string | `""` | Full MongoDB connection URI |
| `externalMongodb.host` | string | `""` | MongoDB host |
| `externalMongodb.port` | int | `27017` | MongoDB port |
| `externalMongodb.username` | string | `""` | MongoDB username |
| `externalMongodb.password` | string | `""` | MongoDB password |
| `externalMongodb.database` | string | `kouma` | Database name |
| `externalMongodb.existingSecret` | string | `""` | Existing secret with MongoDB URI |
| `externalMongodb.existingSecretKey` | string | `mongodb-uri` | Key in the existing secret |

### Exchange Volume

Shared file storage for screenshots between engine, dashboard, and nginx.

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `exchange.persistence.enabled` | bool | `true` | Enable persistent storage |
| `exchange.persistence.size` | string | `5Gi` | Storage size |
| `exchange.persistence.accessMode` | string | `ReadWriteMany` | Access mode |
| `exchange.persistence.storageClass` | string | `""` | Storage class |

### Common Configuration

Shared settings applied to both dashboard and engine.

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `common.fsHostUrl` | string | `""` | File server host URL (auto-detected if empty) |
| `common.apiKeySecret` | string | `""` | Shared secret for API key generation |
| `common.extraEnv` | list | `[]` | Extra environment variables for dashboard and engine |

### Ingress

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `ingress.enabled` | bool | `false` | Enable Kubernetes Ingress |
| `ingress.className` | string | `""` | Ingress class name (e.g., `nginx`, `traefik`) |
| `ingress.annotations` | object | `{}` | Ingress annotations |
| `ingress.hosts` | list | `[{host: kouma.local}]` | List of ingress hosts |
| `ingress.tls` | list | `[]` | TLS configuration |

### Nginx

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `nginx.enabled` | bool | `true` | Deploy nginx reverse proxy |
| `nginx.image.repository` | string | `nginx` | Nginx image repository |
| `nginx.image.tag` | string | `alpine` | Nginx image tag |
| `nginx.service.type` | string | `ClusterIP` | Service type |
| `nginx.service.port` | int | `80` | Service port |
| `nginx.service.nodePort` | string | `""` | NodePort (when type is NodePort) |

### Dashboard

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `dashboard.replicaCount` | int | `1` | Number of dashboard replicas |
| `dashboard.image.repository` | string | `ghcr.io/kkiwior/kouma/dashboard` | Dashboard image |
| `dashboard.image.tag` | string | `""` | Image tag (defaults to `appVersion`) |
| `dashboard.service.port` | int | `3001` | Service port |
| `dashboard.auth.mode` | string | `none` | Auth mode: `none`, `passcode`, `microsoft`, `google` |
| `dashboard.auth.passcodeKey` | string | `""` | Passcode (when mode is `passcode`) |
| `dashboard.auth.tokenKey` | string | `""` | Cookie / token name |
| `dashboard.auth.accessTokenSecret` | string | `""` | JWT signing secret |
| `dashboard.auth.microsoft.clientId` | string | `""` | Azure AD client ID |
| `dashboard.auth.microsoft.clientSecret` | string | `""` | Azure AD client secret |
| `dashboard.auth.microsoft.tenantId` | string | `""` | Azure AD tenant ID |
| `dashboard.auth.google.clientId` | string | `""` | Google client ID |
| `dashboard.auth.google.clientSecret` | string | `""` | Google client secret |
| `dashboard.auth.oauthAllowedDomains` | string | `""` | Comma-separated allowed email domains |
| `dashboard.extraEnv` | list | `[]` | Extra environment variables |
| `dashboard.resources` | object | `{}` | Resource requests/limits |
| `dashboard.nodeSelector` | object | `{}` | Node selector |
| `dashboard.tolerations` | list | `[]` | Tolerations |
| `dashboard.affinity` | object | `{}` | Affinity rules |

### Engine

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `engine.replicaCount` | int | `1` | Number of engine replicas |
| `engine.image.repository` | string | `ghcr.io/kkiwior/kouma/engine` | Engine image |
| `engine.image.tag` | string | `""` | Image tag (defaults to `appVersion`) |
| `engine.service.port` | int | `3002` | Service port |
| `engine.extraEnv` | list | `[]` | Extra environment variables |
| `engine.resources` | object | `{}` | Resource requests/limits |
| `engine.nodeSelector` | object | `{}` | Node selector |
| `engine.tolerations` | list | `[]` | Tolerations |
| `engine.affinity` | object | `{}` | Affinity rules |

## Examples

### Production with Ingress and Microsoft OAuth

```yaml
ingress:
    enabled: true
    className: nginx
    hosts:
        - host: kouma.example.com
    tls:
        - secretName: kouma-tls
          hosts:
              - kouma.example.com

nginx:
    enabled: false

dashboard:
    auth:
        mode: microsoft
        microsoft:
            clientId: your-client-id
            clientSecret: your-client-secret
            tenantId: your-tenant-id
        oauthAllowedDomains: example.com

engine:
    resources:
        requests:
            memory: 512Mi
            cpu: 250m
        limits:
            memory: 2Gi
```

### External MongoDB with existing secret

```yaml
mongodb:
    enabled: false

externalMongodb:
    existingSecret: my-mongodb-secret
    existingSecretKey: connection-string
```

### NodePort access without Ingress

```yaml
nginx:
    service:
        type: NodePort
        nodePort: "30123"
```
