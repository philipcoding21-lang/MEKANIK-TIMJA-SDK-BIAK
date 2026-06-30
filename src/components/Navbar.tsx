import React from "react";
import { Database, CloudLightning, ShieldAlert, Anchor, RefreshCw } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  config: { DATA_PERSISTENCE_MODE: string; GAS_WEB_APP_URL: string };
  onSettingClick: () => void;
  onSyncClick?: () => void;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, config, onSettingClick, onSyncClick, isSyncing = false }) => {
  const getHeaderTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Monitoring, Evaluasi Kegiatan & Anggaran serta Nilai Indeks Kinerja";
      case "pemeriksaan":
        return "Matrik Perhitungan Nilai Pelaku Usaha";
      case "temuan":
        return "Tindak Lanjut & Uraian Temuan Pengawasan";
      case "dokumen":
        return "Repository Berkas & Dokumen Perizinan";
      case "laporan":
        return "Pusat Laporan & Ekspor Data";
      case "users":
        return "Manajemen User & Hak Akses Kontrol";
      case "workspace":
        return "Google Workspace REST API Integrasi (Calendar, Forms, Keep)";
      case "ai-assistant":
        return "Asisten Suara AI (AI Voice Assistant) - Text-to-Speech";
      case "config":
        return "Integrasi Google Spreadsheet & REST API";
      default:
        return "Stasiun PSDKP Biak - Ditjen PSDKP";
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm relative no-print">
      {/* View Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 flex items-center gap-2.5">
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Lambang_Kementerian_Kelautan_dan_Perikanan.png" 
              alt="Logo KKP" 
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="w-px h-4 sm:h-5 bg-slate-300 shrink-0" />
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/2/23/Lambang_Kepolisian_Khusus_Indonesia.png" 
              alt="Logo Polsus" 
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <span className="truncate">{getHeaderTitle()}</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Mekanik Tim Kerja Sumber Daya Kelautan (TIMJA SDK)
        </p>
      </div>

      {/* Persistence Status Chip & Manual Sync */}
      <div className="flex items-center gap-3">
        {onSyncClick && (
          <button
            onClick={onSyncClick}
            disabled={isSyncing}
            className={`flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all ${isSyncing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            title="Sinkronisasi Data Sekarang"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-sky-500" : ""}`} />
          </button>
        )}

        {config.DATA_PERSISTENCE_MODE === "sheet" ? (
          <button
            onClick={onSettingClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold cursor-pointer hover:bg-emerald-100 transition-colors"
            title="Sinkronisasi Google Sheets Aktif"
          >
            <CloudLightning className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
            <span className="font-mono">Google Sheet Sync</span>
          </button>
        ) : (
          <button
            onClick={onSettingClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-850 text-xs font-semibold cursor-pointer hover:bg-orange-100 transition-colors"
            title="Klik untuk menghubungkan ke Google Sheet Anda"
          >
            <Database className="w-3.5 h-3.5 text-orange-500" />
            <span className="font-mono">Local Persistence Mode</span>
          </button>
        )}
      </div>
    </header>
  );
};
