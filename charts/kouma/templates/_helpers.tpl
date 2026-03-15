{{/*
Expand the name of the chart.
*/}}
{{- define "kouma.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "kouma.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "kouma.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "kouma.labels" -}}
helm.sh/chart: {{ include "kouma.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ include "kouma.name" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end }}

{{/*
Dashboard labels
*/}}
{{- define "kouma.dashboard.labels" -}}
{{ include "kouma.labels" . }}
{{ include "kouma.dashboard.selectorLabels" . }}
{{- end }}

{{/*
Dashboard selector labels
*/}}
{{- define "kouma.dashboard.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kouma.fullname" . }}-dashboard
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: dashboard
{{- end }}

{{/*
Engine labels
*/}}
{{- define "kouma.engine.labels" -}}
{{ include "kouma.labels" . }}
{{ include "kouma.engine.selectorLabels" . }}
{{- end }}

{{/*
Engine selector labels
*/}}
{{- define "kouma.engine.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kouma.fullname" . }}-engine
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: engine
{{- end }}

{{/*
MongoDB labels
*/}}
{{- define "kouma.mongodb.labels" -}}
{{ include "kouma.labels" . }}
{{ include "kouma.mongodb.selectorLabels" . }}
{{- end }}

{{/*
MongoDB selector labels
*/}}
{{- define "kouma.mongodb.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kouma.fullname" . }}-mongodb
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: mongodb
{{- end }}

{{/*
Nginx labels
*/}}
{{- define "kouma.nginx.labels" -}}
{{ include "kouma.labels" . }}
{{ include "kouma.nginx.selectorLabels" . }}
{{- end }}

{{/*
Nginx selector labels
*/}}
{{- define "kouma.nginx.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kouma.fullname" . }}-nginx
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: nginx
{{- end }}

{{/*
MongoDB host
*/}}
{{- define "kouma.mongodb.host" -}}
{{- if .Values.mongodb.enabled }}
{{- printf "%s-mongodb" (include "kouma.fullname" .) }}
{{- else if .Values.externalMongodb.host }}
{{- .Values.externalMongodb.host }}
{{- else }}
{{- "" }}
{{- end }}
{{- end }}

{{/*
MongoDB port
*/}}
{{- define "kouma.mongodb.port" -}}
{{- if .Values.mongodb.enabled }}
{{- "27017" }}
{{- else }}
{{- default "27017" (.Values.externalMongodb.port | toString) }}
{{- end }}
{{- end }}

{{/*
MongoDB database name
*/}}
{{- define "kouma.mongodb.database" -}}
{{- if .Values.mongodb.enabled }}
{{- .Values.mongodb.auth.database }}
{{- else }}
{{- default "kouma" .Values.externalMongodb.database }}
{{- end }}
{{- end }}

{{/*
MongoDB URI
*/}}
{{- define "kouma.mongodb.uri" -}}
{{- if and (not .Values.mongodb.enabled) .Values.externalMongodb.uri }}
{{- .Values.externalMongodb.uri }}
{{- else if .Values.mongodb.enabled }}
{{- printf "mongodb://%s:%s@%s:%s/%s" .Values.mongodb.auth.username .Values.mongodb.auth.password (include "kouma.mongodb.host" .) (include "kouma.mongodb.port" .) (include "kouma.mongodb.database" .) }}
{{- else }}
{{- printf "mongodb://%s:%s@%s:%s/%s" .Values.externalMongodb.username .Values.externalMongodb.password (include "kouma.mongodb.host" .) (include "kouma.mongodb.port" .) (include "kouma.mongodb.database" .) }}
{{- end }}
{{- end }}

{{/*
File server host URL (external URL for accessing screenshots)
*/}}
{{- define "kouma.fsHostUrl" -}}
{{- if .Values.common.fsHostUrl }}
{{- .Values.common.fsHostUrl }}
{{- else if .Values.ingress.enabled }}
{{- $host := (index .Values.ingress.hosts 0).host }}
{{- if .Values.ingress.tls }}
{{- printf "https://%s" $host }}
{{- else }}
{{- printf "http://%s" $host }}
{{- end }}
{{- else if .Values.nginx.enabled }}
{{- printf "http://%s-nginx:%v" (include "kouma.fullname" .) .Values.nginx.service.port }}
{{- else }}
{{- printf "http://%s-dashboard:%v" (include "kouma.fullname" .) .Values.dashboard.service.port }}
{{- end }}
{{- end }}

{{/*
Shared ConfigMap name
*/}}
{{- define "kouma.configmapName" -}}
{{- printf "%s-config" (include "kouma.fullname" .) }}
{{- end }}

{{/*
Shared Secret name
*/}}
{{- define "kouma.secretName" -}}
{{- if and (not .Values.mongodb.enabled) .Values.externalMongodb.existingSecret }}
{{- .Values.externalMongodb.existingSecret }}
{{- else }}
{{- printf "%s-secret" (include "kouma.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Dashboard image
*/}}
{{- define "kouma.dashboard.image" -}}
{{- printf "%s:%s" .Values.dashboard.image.repository (default .Chart.AppVersion .Values.dashboard.image.tag) }}
{{- end }}

{{/*
Engine image
*/}}
{{- define "kouma.engine.image" -}}
{{- printf "%s:%s" .Values.engine.image.repository (default .Chart.AppVersion .Values.engine.image.tag) }}
{{- end }}

{{/*
Exchange PVC name
*/}}
{{- define "kouma.exchangePvcName" -}}
{{- printf "%s-exchange" (include "kouma.fullname" .) }}
{{- end }}

{{/*
MongoDB PVC name
*/}}
{{- define "kouma.mongodbPvcName" -}}
{{- printf "%s-mongodb" (include "kouma.fullname" .) }}
{{- end }}
