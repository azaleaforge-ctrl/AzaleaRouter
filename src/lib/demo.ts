export const DEMO_LABELS = {
  data: "Data demo ilustratif",
  financial: "Saldo dan transaksi simulasi",
  action: "Aksi simulasi — tidak ada perubahan nyata",
  token: "Token demo — tidak dapat digunakan",
  legal: "Draf — memerlukan tinjauan hukum",
  catalog: "Katalog fiktif — bukan ketersediaan atau harga nyata",
  status: "Status simulasi — bukan uptime nyata",
} as const;

export type DemoLabelKey = keyof typeof DEMO_LABELS;
