import React, { useState, useEffect } from "react";
import { User, Pemeriksaan, Dokumen, Temuan, MasterSatwas, DashboardStats, UserRole } from "./types";
import { api } from "./lib/api";
import { motion } from "motion/react";

// Sub-component imports
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { KPICards } from "./components/KPICards";
import { 
  PemeriksaanBulananChart, 
  KetaatanPieChart, 
  NilaiSatwasChart, 
  TrendTahunanChart 
} from "./components/DashboardCharts";
import { PemeriksaanList } from "./components/PemeriksaanList";
import { PemeriksaanForm } from "./components/PemeriksaanForm";
import { TemuanList } from "./components/TemuanList";
import { TemuanForm } from "./components/TemuanForm";
import { DokumenList } from "./components/DokumenList";
import { LaporanFilter } from "./components/LaporanFilter";
import { UserManagement } from "./components/UserManagement";
import { ConfigSettings } from "./components/ConfigSettings";
import { ActivityLogList } from "./components/ActivityLogList";

// Direct Sheets auth service
import { initAuth, googleSignIn, googleLogout } from "./lib/firebaseAuth";

// Lucide icon helper for login
import { Anchor, Lock, User as UserIcon, LogIn, ExternalLink, RefreshCw, Chrome, ClipboardCheck, Wallet } from "lucide-react";

export default function App() {
  // Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  // App Navigation tab
  const [activeTab, setActiveTab] = useState("dashboard");
  const [pemeriksaanSubTab, setPemeriksaanSubTab] = useState<"kegiatan" | "anggaran">("kegiatan");

  // Core Sync Data
  const [pemeriksaan, setPemeriksaan] = useState<Pemeriksaan[]>([]);
  const [documents, setDocuments] = useState<Dokumen[]>([]);
  const [temuan, setTemuan] = useState<Temuan[]>([]);
  const [satwasList, setSatwasList] = useState<MasterSatwas[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [config, setConfig] = useState<{ 
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
  }>({ 
    DATA_PERSISTENCE_MODE: "local", 
    GAS_WEB_APP_URL: "", 
    SPREADSHEET_ID: "", 
    PAGU_ANGGARAN: 1250000000, 
    REALISASI_ANGGARAN: 825000000, 
    TARGET_REALISASI: 1000000000,
    TARGET_Q1: 250000000,
    TARGET_Q2: 250000000,
    TARGET_Q3: 250000000,
    TARGET_Q4: 250000000,
    REALISASI_Q1: 220000000,
    REALISASI_Q2: 230000000,
    REALISASI_Q3: 200000000,
    REALISASI_Q4: 175000000
  });

  const [loading, setLoading] = useState(false);

  // Form toggles & edit parameters
  const [showPemeriksaanForm, setShowPemeriksaanForm] = useState(false);
  const [editingPemeriksaan, setEditingPemeriksaan] = useState<Pemeriksaan | null>(null);

  const [showTemuanForm, setShowTemuanForm] = useState(false);
  const [editingTemuan, setEditingTemuan] = useState<Temuan | null>(null);
  const [preSelectedPemeriksaanId, setPreSelectedPemeriksaanId] = useState<string | undefined>(undefined);

  // Load session or credentials if saved, and subscribe to Google Auth
  useEffect(() => {
    const savedUser = localStorage.getItem("sdkp_user_session");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("sdkp_user_session");
      }
    }
    fetchConfig();

    // Subscribe to Google Auths
    const unsubscribe = initAuth((firebaseUser, token) => {
      const googleSessionUser: User = {
        id: firebaseUser.uid,
        nama: firebaseUser.displayName || firebaseUser.email || "Google User",
        username: firebaseUser.email || "google_user",
        role: "Administrator" as UserRole, // Grant administrator rights on Google Sign-In
        status: "Aktif" as "Aktif"
      };
      setCurrentUser(googleSessionUser);
      localStorage.setItem("sdkp_user_session", JSON.stringify(googleSessionUser));
    });

    return () => unsubscribe();
  }, []);

  // Fetch critical app content once authenticated
  useEffect(() => {
    if (currentUser) {
      syncAllData();
    }
  }, [currentUser]);

  const fetchConfig = async () => {
    try {
      const cfg = await api.getConfig();
      setConfig(cfg);
    } catch (e) {
      console.error("Config fetch failed:", e);
    }
  };

  const syncAllData = async () => {
    setLoading(true);
    try {
      // Run API parallel loads
      const [pem, docs, tem, sat, usrs, stats] = await Promise.all([
        api.getPemeriksaan(),
        api.getDokumen(),
        api.getTemuan(),
        api.getSatwas(),
        api.getUsers(),
        api.getDashboardStats(),
      ]);

      setPemeriksaan(pem || []);
      setDocuments(docs || []);
      setTemuan(tem || []);
      setSatwasList(sat || []);
      setUsersList(usrs || []);
      setDashboardStats(stats || null);
    } catch (e: any) {
      console.error("Synchronizing failed:", e.message);
    } finally {
      setLoading(false);
    }
  };

  // Auth operations
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setAuthenticating(true);
    try {
      const authenticatedUser = await api.login(loginUsername, loginPassword);
      setCurrentUser(authenticatedUser);
      localStorage.setItem("sdkp_user_session", JSON.stringify(authenticatedUser));
    } catch (err: any) {
      setLoginError(err.message || "Username atau password salah");
    } finally {
      setAuthenticating(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setLoginError("");
    setAuthenticating(true);
    try {
      const result = await googleSignIn();
      if (result) {
        const googleSessionUser: User = {
          id: result.user.uid,
          nama: result.user.displayName || result.user.email || "Google Administrator",
          username: result.user.email || "google_admin",
          role: "Administrator",
          status: "Aktif"
        };
        setCurrentUser(googleSessionUser);
        localStorage.setItem("sdkp_user_session", JSON.stringify(googleSessionUser));
      }
    } catch (err: any) {
      setLoginError(err.message || "Gagal masuk dengan Google Account");
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    localStorage.removeItem("sdkp_user_session");
    setLoginUsername("");
    setLoginPassword("");
    // Log out of Google too
    try {
      await googleLogout();
    } catch (err) {
      console.error("Google Auth session sign out skip:", err);
    }
    // reset tab to dashboard
    setActiveTab("dashboard");
  };

  // Preset login helper to assist user testing
  const handlePresetLogin = (roleUser: string, rolePass: string) => {
    setLoginUsername(roleUser);
    setLoginPassword(rolePass);
  };

  // Config Update
  const handleUpdateConfig = async (newConfig: { 
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
  }) => {
    await api.updateConfig(newConfig);
    setConfig(newConfig);
    if (currentUser) {
      try {
        await api.createLog({
          userId: currentUser.id,
          username: currentUser.nama || currentUser.username,
          userRole: currentUser.role,
          action: "CONFIG",
          menu: "Konfigurasi",
          description: `Mengubah konfigurasi persistensi data ke mode: ${newConfig.DATA_PERSISTENCE_MODE}`,
        });
      } catch (err) {
        console.warn("Gagal mencatat log konfigurasi:", err);
      }
    }
    await syncAllData();
  };

  // USER MANAGEMENT ACTIONS
  const handleCreateUser = async (userForm: Partial<User>) => {
    await api.createUser(userForm);
    if (currentUser) {
      try {
        await api.createLog({
          userId: currentUser.id,
          username: currentUser.nama || currentUser.username,
          userRole: currentUser.role,
          action: "CREATE",
          menu: "Users",
          description: `Mendaftarkan pengguna baru: ${userForm.nama} (${userForm.role})`,
        });
      } catch (err) {
        console.warn("Gagal mencatat log user:", err);
      }
    }
    await syncAllData();
  };
  const handleUpdateUser = async (id: string, userForm: Partial<User>) => {
    await api.updateUser(id, userForm);
    if (currentUser) {
      try {
        await api.createLog({
          userId: currentUser.id,
          username: currentUser.nama || currentUser.username,
          userRole: currentUser.role,
          action: "UPDATE",
          menu: "Users",
          description: `Memperbarui data pengguna: ${userForm.nama} (ID: ${id})`,
        });
      } catch (err) {
        console.warn("Gagal mencatat log user:", err);
      }
    }
    await syncAllData();
  };
  const handleDeleteUser = async (id: string) => {
    await api.deleteUser(id);
    if (currentUser) {
      try {
        await api.createLog({
          userId: currentUser.id,
          username: currentUser.nama || currentUser.username,
          userRole: currentUser.role,
          action: "DELETE",
          menu: "Users",
          description: `Menghapus pengguna dengan ID: ${id}`,
        });
      } catch (err) {
        console.warn("Gagal mencatat log user:", err);
      }
    }
    await syncAllData();
  };

  // PEMERIKSAAN ACTIONS
  const handlePemeriksaanSubmit = async (formData: Partial<Pemeriksaan>) => {
    if (editingPemeriksaan) {
      await api.updatePemeriksaan(editingPemeriksaan.id, formData);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "UPDATE",
            menu: "Pemeriksaan",
            description: `Mengubah data pemeriksaan pelaku usaha ${formData.pelaku_usaha || editingPemeriksaan.pelaku_usaha} (${formData.perusahaan || editingPemeriksaan.perusahaan})`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log pemeriksaan:", err);
        }
      }
    } else {
      await api.createPemeriksaan(formData);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "CREATE",
            menu: "Pemeriksaan",
            description: `Menambahkan pemeriksaan baru untuk pelaku usaha ${formData.pelaku_usaha} (${formData.perusahaan}) dengan total nilai ${formData.nilai_total || 0}`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log pemeriksaan:", err);
        }
      }
    }
    setShowPemeriksaanForm(false);
    setEditingPemeriksaan(null);
    await syncAllData();
  };

  const handlePemeriksaanDelete = async (id: string, targetName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data pemeriksaan pelaku usaha ${targetName}? Tindakan ini juga akan menghapus dokumen dan temuan terhubung.`)) {
      await api.deletePemeriksaan(id);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "DELETE",
            menu: "Pemeriksaan",
            description: `Menghapus data pemeriksaan pelaku usaha ${targetName}`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log pemeriksaan:", err);
        }
      }
      await syncAllData();
    }
  };

  // TEMUAN ACTIONS
  const handleTemuanSubmit = async (formData: Partial<Temuan>) => {
    if (editingTemuan) {
      await api.updateTemuan(editingTemuan.id, formData);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "UPDATE",
            menu: "Temuan",
            description: `Memperbarui tindak lanjut temuan perusahaan ${formData.pemeriksaan_perusahaan || editingTemuan.pemeriksaan_perusahaan} menjadi status: ${formData.status_tindak_lanjut}`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log temuan:", err);
        }
      }
    } else {
      await api.createTemuan(formData);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "CREATE",
            menu: "Temuan",
            description: `Menambahkan uraian temuan baru untuk pemeriksaan ID: ${formData.pemeriksaan_id} dengan status: ${formData.status_tindak_lanjut || "Open"}`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log temuan:", err);
        }
      }
    }
    setShowTemuanForm(false);
    setEditingTemuan(null);
    setPreSelectedPemeriksaanId(undefined);
    await syncAllData();
  };

  const handleTemuanDelete = async (id: string, description: string) => {
    if (confirm(`Hapus sisa temuan: "${description}"?`)) {
      await api.deleteTemuan(id);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "DELETE",
            menu: "Temuan",
            description: `Menghapus uraian temuan: "${description.substring(0, 60)}..."`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log temuan:", err);
        }
      }
      await syncAllData();
    }
  };

  // DOKUMEN ACTIONS
  const handleCreateDoc = async (docForm: Partial<Dokumen>) => {
    await api.createDokumen(docForm);
    if (currentUser) {
      try {
        await api.createLog({
          userId: currentUser.id,
          username: currentUser.nama || currentUser.username,
          userRole: currentUser.role,
          action: "CREATE",
          menu: "Dokumen",
          description: `Mengunggah tautan dokumen checklist ${docForm.jenis_dokumen} untuk pemeriksaan ID: ${docForm.pemeriksaan_id}`,
        });
      } catch (err) {
        console.warn("Gagal mencatat log dokumen:", err);
      }
    }
    await syncAllData();
  };

  const handleVerifyDoc = async (id: string, newStatus: "Verifikasi" | "Ditolak") => {
    await api.updateDokumen(id, { status: newStatus });
    if (currentUser) {
      try {
        const doc = documents.find((d) => d.id === id);
        const docName = doc ? `${doc.jenis_dokumen} (${doc.pemeriksaan_perusahaan})` : `ID: ${id}`;
        await api.createLog({
          userId: currentUser.id,
          username: currentUser.nama || currentUser.username,
          userRole: currentUser.role,
          action: "VERIFY",
          menu: "Dokumen",
          description: `Mengubah verifikasi dokumen ${docName} menjadi status: ${newStatus}`,
        });
      } catch (err) {
        console.warn("Gagal mencatat log dokumen:", err);
      }
    }
    await syncAllData();
  };

  const handleDeleteDoc = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    const docDescription = doc ? `${doc.jenis_dokumen} (${doc.pemeriksaan_perusahaan})` : `ID: ${id}`;
    await api.deleteDokumen(id);
    if (currentUser) {
      try {
        await api.createLog({
          userId: currentUser.id,
          username: currentUser.nama || currentUser.username,
          userRole: currentUser.role,
          action: "DELETE",
          menu: "Dokumen",
          description: `Menghapus dokumen checklist ${docDescription}`,
        });
      } catch (err) {
        console.warn("Gagal mencatat log dokumen:", err);
      }
    }
    await syncAllData();
  };


  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        
        {/* Sky glow graphics elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-x-12 -translate-y-12" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl translate-x-12 translate-y-12" />

        <div className="max-w-md w-full space-y-6 relative z-10">
          
          {/* Main Logo & Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex gap-3 p-3 bg-sky-950/60 border border-sky-800/40 rounded-2xl shadow-xl justify-center items-center">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Lambang_Kementerian_Kelautan_dan_Perikanan.png" 
                alt="Logo KKP" 
                className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="w-px h-8 sm:h-10 bg-sky-800/40 shrink-0" />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/2/23/Lambang_Kepolisian_Khusus_Indonesia.png" 
                alt="Logo Polsus" 
                className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <h2 className="font-sans font-black text-2xl tracking-tight uppercase bg-gradient-to-r from-blue-400 via-sky-300 to-yellow-300 text-transparent bg-clip-text select-all">
              MEKANIK TIMJA SDK
            </h2>
            <p className="text-[11px] font-sans font-bold leading-relaxed tracking-wide text-slate-300 mx-auto max-w-sm">
              Monitoring Evaluasi, Kegiatan & Anggaran serta Kinerja Tim Kerja Sumber Daya Kelautan
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-950/90 border border-slate-800/60 p-6 rounded-3xl shadow-2xl relative">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Username Pengguna</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {loginError && (
                <div className="text-[11px] font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-lg text-center leading-relaxed">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={authenticating}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/10 active:scale-95 transition-all disabled:bg-slate-800 disabled:text-slate-550"
              >
                <LogIn className="w-4 h-4" />
                {authenticating ? "Mengecek Sesi..." : "Masuk Sistem"}
              </button>
            </form>

            {/* Alternatif Sign In with Google */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-2 bg-slate-950 text-slate-500 font-bold uppercase tracking-wider text-[8px]">Atau</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={authenticating}
              className="w-full py-2.5 bg-sky-850 hover:bg-sky-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              <Chrome className="w-4 h-4 text-emerald-400" />
              Masuk dengan Google Account
            </button>

            {/* Quick Testing Accounts Section */}
            <div className="border-t border-slate-850 mt-6 pt-4">
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-450 text-center mb-3">
                Uji Coba Akun Sesuai Peranan (Presets Click)
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => handlePresetLogin("admin", "admin123")}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
                >
                  <span className="text-rose-400">Admin:</span> admin
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetLogin("kepala", "kepala123")}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
                >
                  <span className="text-purple-400">Kepala:</span> kepala
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetLogin("verifikator", "veri123")}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
                >
                  <span className="text-yellow-400">Verifikator:</span> verifikator
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetLogin("manokwari", "satwas123")}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
                >
                  <span className="text-sky-400">Satwas:</span> manokwari
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-500 font-medium">
            Hak Cipta Terlindungi &copy; {new Date().getFullYear()} Balai/Stasiun SDKP Biak Papua.
          </p>
        </div>
      </div>
    );
  }

  // CORE BACKOFFICE LAYOUT
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative font-sans">
      
      {/* 2. Left Navigation Menu */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout} />

      {/* Right Core Content Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 3. Top Header Panel */}
        <Navbar activeTab={activeTab} config={config} onSettingClick={() => setActiveTab("config")} />

        {/* Loading overlay panel */}
        {loading && (
          <div className="absolute top-1 border-b right-6 z-50 bg-sky-900 text-white text-[10px] font-bold px-3 py-1 rounded shadow-lg flex items-center gap-1.5 animate-bounce">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Sinkronisasi Database...
          </div>
        )}

        {/* Main core screen renderer inside container limits */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          
          {/* TAB 1: DASHBOARD MAIN PAGE */}
          {activeTab === "dashboard" && dashboardStats && (
            <div className="space-y-6">
              
              {/* Stats Counters Grid */}
              <KPICards stats={dashboardStats} />



              {/* Grid of Custom SVG Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart 1: Pemeriksaan per Bulan (Bar Chart) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Distribusi Pemeriksaan per Bulan (Giat 2026)</h3>
                  <p className="text-[10px] text-slate-400 mb-4 font-semibold font-sans">Aktivitas kualitatif pengawasan bulanan</p>
                  <PemeriksaanBulananChart data={dashboardStats.chartPemeriksaanBulanan} />
                </div>

                {/* Chart 2: Ketaatan Pelaku Usaha (Doughnut Pie) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Persentase Tingkat Ketaatan Pelaku Usaha</h3>
                  <p className="text-[10px] text-slate-400 mb-4 font-semibold font-sans">Perbandingan status Taat vs. Tidak Taat</p>
                  <KetaatanPieChart data={dashboardStats.chartKetaatan} />
                </div>

                {/* Chart 3: Nilai per Satwas (Progress Horizontal Performance) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Skor Kepatuhan Rata-rata per Satwas Wilayah</h3>
                  <p className="text-[10px] text-slate-400 mb-4 font-semibold font-sans">Analisa performa ketaatan di masing-masing area kerja</p>
                  <NilaiSatwasChart data={dashboardStats.chartNilaiSatwas} />
                </div>

                {/* Chart 4: Annual Trend (Area line chart) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Tren Tingkat Kepatuhan Nasional (2024 - 2026)</h3>
                  <p className="text-[10px] text-slate-400 mb-4 font-semibold font-sans">Perbandingan rata-rata evaluasi nilai tahunan</p>
                  <TrendTahunanChart data={dashboardStats.chartTrendTahunan} />
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: MATRIK PEMERIKSAAN LEDGER */}
          {activeTab === "pemeriksaan" && (
            <div className="space-y-6">
              {/* Sub-menu di atas Matrik Pemeriksaan */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-3xl shadow-xs">
                <div className="space-y-1">
                  <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-sky-500 rounded-xs inline-block" />
                    Kinerja Tim Kerja (Timja) SDK
                  </h2>
                  <p className="text-[10px] text-slate-400 font-semibold font-sans">
                    Kelola data pemeriksaan lapangan dan pantau penyerapan anggaran tahun 2026
                  </p>
                </div>
                
                <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 w-full sm:w-auto">
                  <button
                    onClick={() => setPemeriksaanSubTab("kegiatan")}
                    className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                      pemeriksaanSubTab === "kegiatan"
                        ? "bg-white text-slate-800 shadow-xs font-black border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-cyan-500" />
                    Matrik Pemeriksaan
                  </button>
                  <button
                    onClick={() => setPemeriksaanSubTab("anggaran")}
                    className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                      pemeriksaanSubTab === "anggaran"
                        ? "bg-white text-slate-800 shadow-xs font-black border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                    Alokasi & Penyerapan Anggaran
                  </button>
                </div>
              </div>

              {pemeriksaanSubTab === "kegiatan" ? (
                <PemeriksaanList
                  records={pemeriksaan}
                  satwasList={satwasList}
                  userRole={currentUser.role}
                  temuanList={temuan}
                  onAddClick={() => {
                    setEditingPemeriksaan(null);
                    setShowPemeriksaanForm(true);
                  }}
                  onEditClick={(record) => {
                    setEditingPemeriksaan(record);
                    setShowPemeriksaanForm(true);
                  }}
                  onDeleteClick={handlePemeriksaanDelete}
                  onUploadDocClick={(record) => {
                    setPreSelectedPemeriksaanId(record.id);
                    setActiveTab("dokumen");
                    setShowAddFormTriggerInDocumentList();
                  }}
                  onCreateTemuanClick={(record) => {
                    setPreSelectedPemeriksaanId(record.id);
                    setEditingTemuan(null);
                    setShowTemuanForm(true);
                  }}
                />
              ) : (
                dashboardStats && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-emerald-500 rounded-xs inline-block" />
                          Pemantauan Penyerapan Anggaran per Triwulan (Q1 - Q4)
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Evaluasi akurasi realisasi penyerapan anggaran secara berjangka sepanjang tahun 2026
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
                        Total Target Realisasi: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(dashboardStats.targetRealisasi || 0)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                      {[
                        {
                          label: "Triwulan I (Q1)",
                          target: dashboardStats.targetQ1 ?? 250000000,
                          realisasi: dashboardStats.realisasiQ1 ?? 220000000,
                          gradient: "from-sky-500 to-blue-500",
                          bgColor: "bg-sky-50/40 border-sky-100",
                        },
                        {
                          label: "Triwulan II (Q2)",
                          target: dashboardStats.targetQ2 ?? 250000000,
                          realisasi: dashboardStats.realisasiQ2 ?? 230000000,
                          gradient: "from-cyan-500 to-sky-500",
                          bgColor: "bg-cyan-50/40 border-cyan-100",
                        },
                        {
                          label: "Triwulan III (Q3)",
                          target: dashboardStats.targetQ3 ?? 250000000,
                          realisasi: dashboardStats.realisasiQ3 ?? 200000000,
                          gradient: "from-teal-500 to-emerald-500",
                          bgColor: "bg-teal-50/40 border-teal-100",
                        },
                        {
                          label: "Triwulan IV (Q4)",
                          target: dashboardStats.targetQ4 ?? 250000000,
                          realisasi: dashboardStats.realisasiQ4 ?? 175000000,
                          gradient: "from-indigo-500 to-violet-500",
                          bgColor: "bg-indigo-50/40 border-indigo-100",
                        },
                      ].map((q, idx) => {
                        const ratio = q.target > 0 ? Number(((q.realisasi / q.target) * 100).toFixed(1)) : 0;
                        
                        // Determine warning/color status based on absorption level
                        let statusText = "Kurang Aktif";
                        let statusColor = "bg-amber-50 text-amber-700 border-amber-100";
                        if (ratio >= 90) {
                          statusText = "Sangat Baik (Optimal)";
                          statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                        } else if (ratio >= 75) {
                          statusText = "Baik (Target Tercapai)";
                          statusColor = "bg-sky-50 text-sky-700 border-sky-100";
                        } else if (ratio >= 50) {
                          statusText = "Cukup Aktif";
                          statusColor = "bg-blue-50 text-blue-700 border-blue-100";
                        }

                        return (
                          <div key={idx} className={`p-4 rounded-2xl border ${q.bgColor} flex flex-col justify-between space-y-4 shadow-2xs`}>
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <span className="text-xs font-extrabold text-slate-700 block truncate">{q.label}</span>
                                <span className={`text-[8px] font-black uppercase tracking-wider block mt-1 ${statusColor} px-2 py-0.5 rounded-full border inline-block truncate max-w-full`}>
                                  {statusText}
                                </span>
                              </div>
                              <span className="text-lg font-black text-slate-800 font-mono shrink-0">
                                {ratio}%
                              </span>
                            </div>

                            {/* Progress slider container */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
                                <span>Realisasi</span>
                                <span className="text-slate-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(q.realisasi)}</span>
                              </div>
                              <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(ratio, 100)}%` }}
                                  transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 }}
                                  className={`h-full rounded-full bg-gradient-to-r ${q.gradient}`}
                                />
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-400 font-semibold font-sans pt-0.5">
                                <span>Target: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(q.target)}</span>
                                <span className="text-right truncate max-w-[50%]">Sisa: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.max(0, q.target - q.realisasi))}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 3: TEMUAN MONITOR */}
          {activeTab === "temuan" && (
            <TemuanList
              temuan={temuan}
              pemeriksaanList={pemeriksaan}
              userRole={currentUser.role}
              onAddClick={() => {
                setEditingTemuan(null);
                setPreSelectedPemeriksaanId(undefined);
                setShowTemuanForm(true);
              }}
              onEditClick={(item) => {
                setEditingTemuan(item);
                setPreSelectedPemeriksaanId(undefined);
                setShowTemuanForm(true);
              }}
              onDeleteClick={handleTemuanDelete}
            />
          )}

          {/* TAB 4: REPOSITORY DOKUMEN DRIVE */}
          {activeTab === "dokumen" && (
            <DokumenList
              documents={documents}
              pemeriksaanList={pemeriksaan}
              userRole={currentUser.role}
              onCreateDoc={handleCreateDoc}
              onVerifyDoc={handleVerifyDoc}
              onDeleteDoc={handleDeleteDoc}
            />
          )}

          {/* TAB 5: LAPORAN & CERTIFICATE EXPORT */}
          {activeTab === "laporan" && (
            <LaporanFilter records={pemeriksaan} satwasList={satwasList} />
          )}

          {/* TAB 6: USER REGISTRATION (ADMIN ONLY) */}
          {activeTab === "users" && currentUser.role === "Administrator" && (
            <UserManagement
              users={usersList}
              currentSessionUser={currentUser}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {/* TAB 7: SYSTEM CONFIG API SETTINGS (ADMIN ONLY) */}
          {activeTab === "config" && currentUser.role === "Administrator" && (
            <ConfigSettings config={config} onUpdateConfig={handleUpdateConfig} />
          )}

          {/* TAB 8: AUDIT LOGS (ADMIN ONLY) */}
          {activeTab === "logs" && currentUser.role === "Administrator" && (
            <ActivityLogList />
          )}

        </main>
      </div>

      {/* FORM MODAL 1: PEMERIKSAAN REGISTER FORM */}
      {showPemeriksaanForm && (
        <PemeriksaanForm
          initialRecord={editingPemeriksaan}
          satwasList={satwasList}
          userRole={currentUser.role}
          onSubmit={handlePemeriksaanSubmit}
          onClose={() => {
            setShowPemeriksaanForm(false);
            setEditingPemeriksaan(null);
          }}
        />
      )}

      {/* FORM MODAL 2: TEMUAN REGISTER FORM */}
      {showTemuanForm && (
        <TemuanForm
          initialForm={editingTemuan}
          pemeriksaanList={pemeriksaan}
          preSelectedPemeriksaanId={preSelectedPemeriksaanId}
          onSubmit={handleTemuanSubmit}
          onClose={() => {
            setShowTemuanForm(false);
            setEditingTemuan(null);
            setPreSelectedPemeriksaanId(undefined);
          }}
        />
      )}

    </div>
  );

  // Helper trigger to activate add-form view on documents tab
  function setShowAddFormTriggerInDocumentList() {
    // We can simulate click or state inside DocumentList.
  }
}
