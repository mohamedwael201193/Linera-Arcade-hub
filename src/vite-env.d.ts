/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LINERA_NETWORK: string
  readonly VITE_LINERA_FAUCET_URL: string
  readonly VITE_LINERA_VALIDATOR_URL: string
  readonly VITE_LINERA_GOL_APP_ID: string
  readonly VITE_LINERA_PREDICTION_APP_ID: string
  readonly VITE_LINERA_PROFILE_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
