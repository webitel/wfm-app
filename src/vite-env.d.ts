// https://vite.dev/guide/env-and-mode#intellisense-for-typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_STAGING_ENV: string;
	// [Claude] 'true' = the WFM API is served by the in-memory mock (src/app/api/wfm/mock).
	readonly VITE_WFM_MOCK?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
