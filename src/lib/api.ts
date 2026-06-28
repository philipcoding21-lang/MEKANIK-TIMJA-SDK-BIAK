import { 
  User, 
  Pemeriksaan, 
  Dokumen, 
  Temuan, 
  MasterSatwas, 
  DashboardStats,
  ActivityLog 
} from "../types";
import { googleSheetsApi } from "./googleSheets";
import { getAccessToken } from "./firebaseAuth";

const BASE_URL = "/api";

// Cached configuration inside API context to drive offline/direct-routing
let cachedConfig: { 
  DATA_PERSISTENCE_MODE: string; 
  GAS_WEB_APP_URL: string; 
  SPREADSHEET_ID: string;
  PAGU_ANGGARAN?: number;
  REALISASI_ANGGARAN?: number;
  TARGET_REALISASI?: number;
  TARGET_Q1?: number;
  TARGET_Q2?: number;
  TARGET_Q3?: number;
  TARGET_Q4?: number;
  REALISASI_Q1?: number;
  REALISASI_Q2?: number;
  REALISASI_Q3?: number;
  REALISASI_Q4?: number;
} | null = null;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Request failed");
  }
  return json.data as T;
}

// Interceptor predicate
function isDirectSheetMode(): boolean {
  return cachedConfig?.DATA_PERSISTENCE_MODE === "direct-sheet" && !!cachedConfig?.SPREADSHEET_ID;
}

// Client-side computation of statistics directly from data list
function calculateDashboardStats(pemeriksaan: Pemeriksaan[]): DashboardStats {
  const totalPemeriksaan = pemeriksaan.length;
  let totalTaat = 0;
  let totalTidakTaat = 0;
  let totalNilai = 0;
  let nilaiTertinggi = 0;
  let nilaiTerendah = pemeriksaan.length > 0 ? 100 : 0;

  pemeriksaan.forEach((r) => {
    if (r.status_ketaatan === "TAAT") {
      totalTaat++;
    } else {
      totalTidakTaat++;
    }
    const val = Number(r.nilai_total) || 0;
    totalNilai += val;
    if (val > nilaiTertinggi) nilaiTertinggi = val;
    if (val < nilaiTerendah) nilaiTerendah = val;
  });

  const rataRataNilai = totalPemeriksaan > 0 ? Number((totalNilai / totalPemeriksaan).toFixed(2)) : 0;

  // Monthly counts
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const monthlyCounts = Array(12).fill(0);
  pemeriksaan.forEach((r) => {
    if (r.tanggal) {
      const dateObj = new Date(r.tanggal);
      const m = dateObj.getMonth();
      if (m >= 0 && m < 12) {
        monthlyCounts[m]++;
      }
    }
  });

  const chartPemeriksaanBulanan = months.map((bulan, idx) => ({
    bulan,
    jumlah: monthlyCounts[idx],
  }));

  const chartKetaatan = [
    { name: "Taat", value: totalTaat },
    { name: "Tidak Taat", value: totalTidakTaat },
  ];

  // Nilai per Satwas
  const satwasMap: Record<string, { total: number; count: number }> = {};
  pemeriksaan.forEach((pr) => {
    const s = pr.satwas || "Lainnya";
    const v = Number(pr.nilai_total) || 0;
    if (!satwasMap[s]) {
      satwasMap[s] = { total: 0, count: 0 };
    }
    satwasMap[s].total += v;
    satwasMap[s].count++;
  });

  const chartNilaiSatwas = Object.keys(satwasMap).map((key) => ({
    satwas: key,
    rataRata: Number((satwasMap[key].total / satwasMap[key].count).toFixed(2)),
    jumlah: satwasMap[key].count,
  }));

  const chartTrendTahunan = [
    { tahun: "2024", rataRata: 75.2 },
    { tahun: "2025", rataRata: 78.5 },
    { tahun: "2026", rataRata: rataRataNilai || 82.8 },
  ];

  const paguVal = Number(cachedConfig?.PAGU_ANGGARAN) || 1250000000;
  const realisasiVal = Number(cachedConfig?.REALISASI_ANGGARAN) || 825000000;
  const targetVal = Number(cachedConfig?.TARGET_REALISASI) || 1000000000;
  const sisaVal = paguVal - realisasiVal;
  const persentaseVal = paguVal > 0 ? Number(((realisasiVal / paguVal) * 100).toFixed(2)) : 0;
  const persentaseTargetVal = targetVal > 0 ? Number(((realisasiVal / targetVal) * 100).toFixed(2)) : 0;

  const targetQ1Val = cachedConfig?.TARGET_Q1 !== undefined ? Number(cachedConfig.TARGET_Q1) : 250000000;
  const targetQ2Val = cachedConfig?.TARGET_Q2 !== undefined ? Number(cachedConfig.TARGET_Q2) : 250000000;
  const targetQ3Val = cachedConfig?.TARGET_Q3 !== undefined ? Number(cachedConfig.TARGET_Q3) : 250000000;
  const targetQ4Val = cachedConfig?.TARGET_Q4 !== undefined ? Number(cachedConfig.TARGET_Q4) : 250000000;

  const realisasiQ1Val = cachedConfig?.REALISASI_Q1 !== undefined ? Number(cachedConfig.REALISASI_Q1) : 220000000;
  const realisasiQ2Val = cachedConfig?.REALISASI_Q2 !== undefined ? Number(cachedConfig.REALISASI_Q2) : 230000000;
  const realisasiQ3Val = cachedConfig?.REALISASI_Q3 !== undefined ? Number(cachedConfig.REALISASI_Q3) : 200000000;
  const realisasiQ4Val = cachedConfig?.REALISASI_Q4 !== undefined ? Number(cachedConfig.REALISASI_Q4) : 175000000;

  return {
    totalPemeriksaan,
    totalTaat,
    totalTidakTaat,
    rataRataNilai,
    nilaiTertinggi,
    nilaiTerendah,
    chartPemeriksaanBulanan,
    chartKetaatan,
    chartNilaiSatwas,
    chartTrendTahunan,
    paguAnggaran: paguVal,
    realisasiAnggaran: realisasiVal,
    sisaAnggaran: sisaVal,
    persentasePenyerapan: persentaseVal,
    targetRealisasi: targetVal,
    persentasePenyerapanTarget: persentaseTargetVal,
    targetQ1: targetQ1Val,
    targetQ2: targetQ2Val,
    targetQ3: targetQ3Val,
    targetQ4: targetQ4Val,
    realisasiQ1: realisasiQ1Val,
    realisasiQ2: realisasiQ2Val,
    realisasiQ3: realisasiQ3Val,
    realisasiQ4: realisasiQ4Val,
  };
}

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<User> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Username atau password salah");
    }
    return json.user as User;
  },

  // Config management
  getConfig: async () => {
    const data = await request<{ DATA_PERSISTENCE_MODE: string; GAS_WEB_APP_URL: string; SPREADSHEET_ID: string }>(`${BASE_URL}/config`);
    cachedConfig = data;
    return data;
  },

  updateConfig: async (data: { DATA_PERSISTENCE_MODE: string; GAS_WEB_APP_URL: string; SPREADSHEET_ID: string }) => {
    const result = await request<any>(`${BASE_URL}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    cachedConfig = data;
    return result;
  },

  // Users management
  getUsers: async (): Promise<User[]> => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        try {
          return await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Users") as User[];
        } catch (err: any) {
          console.warn("Direct-sheet getUsers failed, falling back to local DB:", err.message);
        }
      }
    }
    return request<User[]>(`${BASE_URL}/users`);
  },

  createUser: async (user: Partial<User>) => {
    const payload = {
      id: user.id || `u_${Date.now()}`,
      ...user
    };
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Users", payload);
        return payload as User;
      }
    }
    return request<User>(`${BASE_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateUser: async (id: string, user: Partial<User>) => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Users", id, user);
        return { id, ...user } as User;
      }
    }
    return request<User>(`${BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
  },

  deleteUser: async (id: string) => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Users", id);
        return { success: true };
      }
    }
    return request<any>(`${BASE_URL}/users/${id}`, {
      method: "DELETE",
    });
  },

  // Pemeriksaan
  getPemeriksaan: async (): Promise<Pemeriksaan[]> => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        try {
          return await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan") as Pemeriksaan[];
        } catch (err: any) {
          console.warn("Direct-sheet getPemeriksaan failed, falling back to local DB:", err.message);
        }
      }
    }
    return request<Pemeriksaan[]>(`${BASE_URL}/pemeriksaan`);
  },

  createPemeriksaan: async (form: Partial<Pemeriksaan>) => {
    const payload = {
      id: form.id || `p_${Date.now()}`,
      created_at: new Date().toISOString(),
      ...form
    };
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan", payload);
        return payload as Pemeriksaan;
      }
    }
    return request<Pemeriksaan>(`${BASE_URL}/pemeriksaan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updatePemeriksaan: async (id: string, form: Partial<Pemeriksaan>) => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan", id, form);
        return { id, ...form } as Pemeriksaan;
      }
    }
    return request<Pemeriksaan>(`${BASE_URL}/pemeriksaan/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
  },

  deletePemeriksaan: async (id: string) => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        // Cascade delete parent
        await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan", id);
        
        // Cascade delete Documents matching pemeriksaan_id
        try {
          const docs = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Dokumen");
          for (const d of docs) {
            if (String(d.pemeriksaan_id) === String(id)) {
              await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Dokumen", d.id);
            }
          }
        } catch (err) {
          console.error("Cascade documents delete skip:", err);
        }

        // Cascade delete Temuan matching pemeriksaan_id
        try {
          const tems = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Temuan");
          for (const t of tems) {
            if (String(t.pemeriksaan_id) === String(id)) {
              await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Temuan", t.id);
            }
          }
        } catch (err) {
          console.error("Cascade temuan delete skip:", err);
        }

        return { success: true };
      }
    }
    return request<any>(`${BASE_URL}/pemeriksaan/${id}`, {
      method: "DELETE",
    });
  },

  // Dokumen
  getDokumen: async (): Promise<Dokumen[]> => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        try {
          return await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Dokumen") as Dokumen[];
        } catch (err: any) {
          console.warn("Direct-sheet getDokumen failed, falling back to local DB:", err.message);
        }
      }
    }
    return request<Dokumen[]>(`${BASE_URL}/dokumen`);
  },

  createDokumen: async (doc: Partial<Dokumen>) => {
    const payload = {
      id: doc.id || `d_${Date.now()}`,
      status: doc.status || "Verifikasi",
      ...doc
    };
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Dokumen", payload);
        return payload as Dokumen;
      }
    }
    return request<Dokumen>(`${BASE_URL}/dokumen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateDokumen: async (id: string, doc: Partial<Dokumen>) => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Dokumen", id, doc);
        return { id, ...doc } as Dokumen;
      }
    }
    return request<Dokumen>(`${BASE_URL}/dokumen/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
  },

  deleteDokumen: async (id: string) => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Dokumen", id);
        return { success: true };
      }
    }
    return request<any>(`${BASE_URL}/dokumen/${id}`, {
      method: "DELETE",
    });
  },

  // Temuan
  getTemuan: async (): Promise<Temuan[]> => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        try {
          return await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Temuan") as Temuan[];
        } catch (err: any) {
          console.warn("Direct-sheet getTemuan failed, falling back to local DB:", err.message);
        }
      }
    }
    return request<Temuan[]>(`${BASE_URL}/temuan`);
  },

  createTemuan: async (item: Partial<Temuan>) => {
    const payload = {
      id: item.id || `t_${Date.now()}`,
      status_tindak_lanjut: item.status_tindak_lanjut || "Open",
      tanggal_update: new Date().toISOString().split("T")[0],
      ...item
    };
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Temuan", payload);
        return payload as Temuan;
      }
    }
    return request<Temuan>(`${BASE_URL}/temuan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateTemuan: async (id: string, item: Partial<Temuan>) => {
    const payload = {
      tanggal_update: new Date().toISOString().split("T")[0],
      ...item
    };
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Temuan", id, payload);
        return { id, ...payload } as Temuan;
      }
    }
    return request<Temuan>(`${BASE_URL}/temuan/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  deleteTemuan: async (id: string) => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Temuan", id);
        return { success: true };
      }
    }
    return request<any>(`${BASE_URL}/temuan/${id}`, {
      method: "DELETE",
    });
  },

  // Master Satwas
  getSatwas: async (): Promise<MasterSatwas[]> => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        try {
          const rows = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "MasterSatwas");
          if (rows.length > 0) {
            return rows as MasterSatwas[];
          }
        } catch (err: any) {
          console.warn("Direct-sheet getSatwas failed, falling back to local DB:", err.message);
        }
      }
    }
    return request<MasterSatwas[]>(`${BASE_URL}/satwas`);
  },

  // Dashboard Stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    if (isDirectSheetMode()) {
      const token = await getAccessToken();
      if (token) {
        try {
          const pems = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan");
          return calculateDashboardStats(pems as Pemeriksaan[]);
        } catch (err: any) {
          console.warn("Direct-sheet getDashboardStats failed, falling back to local DB calculation:", err.message);
        }
      }
    }
    return request<DashboardStats>(`${BASE_URL}/dashboard`);
  },

  // Activity Logs
  getLogs: async (): Promise<ActivityLog[]> => {
    return request<ActivityLog[]>(`${BASE_URL}/logs`);
  },

  createLog: async (log: Omit<ActivityLog, "id" | "timestamp">) => {
    return request<ActivityLog>(`${BASE_URL}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
  },
};
