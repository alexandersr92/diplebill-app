# DipleBill Mobile — Agent Guide

Este archivo es el manual para agentes de IA que trabajen en DipleBill Mobile.

## Resumen del Proyecto

DipleBill Mobile es la app iOS/Android del sistema POS DipleBill, construida con React Native + Expo.
Comparte el mismo backend Laravel (`inventory_api`) y sigue las mismas convenciones del proyecto web (`diplebill-electron`).

## Tech Stack

- React Native 0.86 + TypeScript + Expo SDK 57
- Expo Router v3 (file-based routing, similar a Next.js)
- NativeWind v4 (Tailwind CSS para React Native)
- Redux Toolkit con slices y async thunks
- Axios con Bearer token auth (via `expo-secure-store`)
- React Native Reanimated + Gesture Handler

## Repo Layout

- `app/` rutas de Expo Router (file-based)
  - `(auth)/` grupo de autenticación (login, seller-login)
  - `(app)/` grupo principal (tabs: nueva venta, facturas)
- `src/modules/` módulos de feature (auth, billing, clients, etc.)
- `src/store/` Redux store y typed hooks
- `src/helpers/` helpers compartidos (axiosInstance)
- `src/components/` componentes UI compartidos

## Aliases de Paths

- `@/*` => `src/*`
- `@modules/*` => `src/modules/*`

## Convenciones Core

- Texto de UI en **español**
- Prettier: single quotes, semicolons, no trailing commas, width 100, 2 spaces (igual que web)
- Componentes: PascalCase
- Helpers/servicios: camelCase
- **No usar** `console.log` en producción
- Usar tokens de color de NativeWind — no hardcodear colores hex directamente en componentes (excepto en archivos de configuración o layout raíz)

## Autenticación (Flujo de 2 Pasos)

1. **Admin Login** → `POST /v1/login` → token guardado en `expo-secure-store` (key: `admin_token`)
2. **Seller Login** → `POST /v1/sellers/seller-login` → sesión del vendedor en Redux

El mismo flujo que el proyecto Electron — el backend no cambia.

## Estado Redux

- `authSlice` — autenticación admin + vendedor
- Los demás slices (billing, clients, stores) serán integrados desde el proyecto web por el otro programador

## API

- URL base desde `EXPO_PUBLIC_API_URL` en `.env`
- Instancia en `src/helpers/axiosInstance.ts` (inyecta Bearer token automáticamente)

## Comandos Comunes

- `npm run start` — Metro bundler
- `npm run ios` — Simulador iOS
- `npm run android` — Emulador Android
- `npm run format` — Prettier

## Zonas de Alto Riesgo

- `app/_layout.tsx` — Provider raíz, no mover sin coordinación
- `src/store/store.ts` — Root reducer, sincronizar con el otro programador al agregar slices
- `src/helpers/axiosInstance.ts` — Auth token, base URL
