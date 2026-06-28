import React, { useState } from "react";
import { Temuan, Pemeriksaan } from "../types";
import { Plus, Search, Edit2, Trash2, ShieldAlert, Sparkles, Calendar, X } from "lucide-react";

interface TemuanListProps {
  temuan: Temuan[];
  pemeriksaanList: Pemeriksaan[];
  userRole: string;
  onAddClick: () => void;
  onEditClick: (item: Temuan) => void;
  onDeleteClick: (id: string, uraian: string) => void;
}

export const TemuanList: React.FC<TemuanListProps> = ({
  temuan,
  pemeriksaanList,
  userRole,
  onAddClick,
  onEditClick,
  onDeleteClick,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Lookup helper
  const getPemeriksaanInfo = (pemeriksaanId: string) => {
    return pemeriksaanList.find((p) => p.id === pemeriksaanId);
  };

  const filteredTemuan = temuan.filter((t) => {
    const parentRecord = getPemeriksaanInfo(t.pemeriksaan_id);
    const companyName = parentRecord ? parentRecord.pelaku_usaha : "";
    
    const matchesSearch =
      t.uraian_temuan.toLowerCase().includes(search.toLowerCase()) ||
      companyName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" ? true : t.status_tindak_lanjut === statusFilter;

    const itemDate = parentRecord?.tanggal || t.tanggal_update;
    const matchStartDate = startDate ? itemDate >= startDate : true;
    const matchEndDate = endDate ? itemDate <= endDate : true;

    return matchesSearch && matchesStatus && matchStartDate && matchEndDate;
  });

  const canManage = userRole === "Administrator" || userRole === "Satwas";

  return (
    <div className="space-y-6">
      {/* Search and status filters block */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari uraian temuan atau pelaku usaha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold"
            />
          </div>

          {/* Quick status tabs filter */}
          <div className="inline-flex bg-slate-100 p-1 rounded-lg">
            {["All", "Open", "Dalam Proses", "Selesai"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-605"
                }`}
              >
                {st === "All" ? "Semua" : st}
              </button>
            ))}
          </div>

          {/* Date range filters */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mulai:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white text-xs font-bold text-slate-700 cursor-pointer"
              />
            </div>
            
            <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selesai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white text-xs font-bold text-slate-700 cursor-pointer"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="p-1 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded transition cursor-pointer"
                title="Reset Tanggal"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Add button */}
        {canManage && (
          <button
            onClick={onAddClick}
            className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm self-start whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Registrasi Temuan
          </button>
        )}
      </div>

      {/* Grid of Issues Cards */}
      {filteredTemuan.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <ShieldAlert className="w-10 h-10 text-slate-350" />
          <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Uraian Temuan</h4>
          <p className="text-xs text-slate-400 max-w-sm">No unresolved issues fitting the current criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTemuan.map((t) => {
            const parent = getPemeriksaanInfo(t.pemeriksaan_id);
            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:shadow-md transition-all relative flex flex-col justify-between"
              >
                <div>
                  {/* Status header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                      Tanggal Giat: {pemeriksaanList.find((p) => p.id === t.pemeriksaan_id)?.tanggal || t.tanggal_update}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        t.status_tindak_lanjut === "Selesai"
                          ? "bg-emerald-50 text-emerald-700"
                          : t.status_tindak_lanjut === "Dalam Proses"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {t.status_tindak_lanjut}
                    </span>
                  </div>

                  {/* Info Box */}
                  <div className="mt-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">Pelaku Usaha</span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{parent ? parent.pelaku_usaha : "Unlinked Record"}</h4>
                    <span className="text-[10px] text-slate-400 mt-0.5 block italic">{parent ? parent.jenis_usaha : "-"}</span>
                  </div>

                  {/* Finding Description */}
                  <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Rincian Temuan Lapangan</span>
                    <p className="text-xs text-slate-750 font-semibold leading-relaxed">{t.uraian_temuan}</p>
                  </div>

                  {/* Recommendation action box */}
                  {parent?.rekomendasi && (
                    <div className="mt-3 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Rekomendasi UPT SDKP</span>
                      <p className="text-slate-600 font-medium italic">"{parent.rekomendasi}"</p>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t pt-3.5 mt-2">
                  <span className="text-[10px] text-slate-450 font-mono font-medium">Update: {t.tanggal_update}</span>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditClick(t)}
                        title="Tindak Lanjut atau Edit"
                        className="py-1 px-2.5 bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold rounded-lg cursor-pointer border border-sky-100 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Tindak Lanjut
                      </button>
                      {userRole === "Administrator" && (
                        <button
                          onClick={() => onDeleteClick(t.id, t.uraian_temuan.slice(0, 20))}
                          title="Hapus Temuan"
                          className="p-1 px-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
