interface PeekConfig {
  licenseApiBase: string;
  checkoutUrl: string;
  creemProductId: string;
  creemMode: "test" | "prod";
  receiptPublicJwk: JsonWebKey | null;
}

export const PEEK_CONFIG: Readonly<PeekConfig> = Object.freeze({
  licenseApiBase: "https://peek-license-api.example.workers.dev",
  checkoutUrl: "",
  creemProductId: "prod_REPLACE_ME",
  creemMode: "test",
  receiptPublicJwk: null,
});

export function isLicenseConfigured(): boolean {
  return (
    !PEEK_CONFIG.licenseApiBase.includes("example.workers.dev") &&
    PEEK_CONFIG.creemProductId !== "prod_REPLACE_ME" &&
    PEEK_CONFIG.receiptPublicJwk !== null
  );
}
