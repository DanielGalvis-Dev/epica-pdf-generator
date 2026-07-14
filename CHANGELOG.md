# Changelog — Polaria PDF Generator

Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) | Versionado: [Semantic Versioning](https://semver.org/lang/es/)

## [Unreleased]

Sin cambios registrados todavía sobre la versión `1.0.0` (`backend/package.json`). Cualquier cambio de comportamiento visible para el usuario o para quien consuma la API debe agregarse acá en el mismo PR que lo origina.

## [1.0.0] — 2026-06-26

Primera versión funcional del generador: genera PDFs de Épica y Sprint a partir de un Markdown, usando OpenAI para extraer/estructurar el contenido y Playwright para renderizar el PDF final.

### Added

- Se agregó la funcionalidad principal del generador: subir un archivo Markdown, extraer y estructurar su contenido con IA (OpenAI), y renderizar el resultado como PDF con el diseño oficial de Polaria (Handlebars + Playwright/Chromium).
- Se agregó soporte para dos tipos de documento, cada uno con su propio formulario de extracción y diseño: **Épica** (resumen ejecutivo mensual: objetivo, alcance, KPIs, riesgo, equipo y horas) y **Sprint** (resumen agrupado por miembro → proyecto → issue).
- Se agregó un endpoint de vista previa de ejemplo (`/api/:docType/sample-preview`) que muestra el diseño de cada documento con datos de muestra, sin necesidad de subir un Markdown ni de llamar a la IA.

### Changed

- Se mejoró la configuración de generación de PDF (tamaño de página por plantilla) usada al renderizar los documentos.

### Fixed

- Se corrigió un cierre prematuro del navegador (Chromium) durante la generación del PDF que podía interrumpir la descarga de forma intermitente.
