import React, { useState } from 'react';
import { 
  Student, 
  IjazahConfirmation, 
  StudentAccount, 
  ClassroomMapping, 
  PostingHistory, 
  AdminLog 
} from '../db';
import { Database, FileSpreadsheet, Search, Download, Check, AlertCircle } from 'lucide-react';

interface SheetsSimulatorProps {
  students: Student[];
  ijazahs: IjazahConfirmation[];
  accounts: StudentAccount[];
  mappings: ClassroomMapping[];
  posts: PostingHistory[];
  logs: AdminLog[];
}

type TabType = 
  | 'database_siswa' 
  | 'rekap_pendaftaran' 
  | 'konfirmasi_ijazah' 
  | 'data_akun_siswa' 
  | 'mapping_classroom' 
  | 'riwayat_posting' 
  | 'log_aktivitas_admin';

interface TabDefinition {
  id: TabType;
  label: string;
  count: number;
}

export default function SheetsSimulator({
  students,
  ijazahs,
  accounts,
  mappings,
  posts,
  logs
}: SheetsSimulatorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('database_siswa');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const tabs: TabDefinition[] = [
    { id: 'database_siswa', label: '1. DATABASE SISWA', count: students.length },
    { id: 'rekap_pendaftaran', label: '2. REKAP PENDAFTARAN', count: students.length },
    { id: 'konfirmasi_ijazah', label: '3. KONFIRMASI IJAZAH', count: ijazahs.length },
    { id: 'data_akun_siswa', label: '4. DATA AKUN SISWA', count: accounts.length },
    { id: 'mapping_classroom', label: '5. MAPPING CLASSROOM', count: mappings.length },
    { id: 'riwayat_posting', label: '6. RIWAYAT POSTING', count: posts.length },
    { id: 'log_aktivitas_admin', label: '7. LOG AKTIVITAS ADMIN', count: logs.length }
  ];

  // CSV Exporter Utility
  const handleExportCSV = (tab: TabType) => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (tab === 'database_siswa') {
      headers = ["ID Siswa", "NISN", "Nama_Lengkap", "Email", "WhatsApp", "Gender", "Tempat_Lahir_Tanggal", "Alamat", "Program_Studi", "Paket_Belajar", "Tahun_Ajaran", "Status_PPDB", "Tgl_Daftar"];
      rows = students.map(s => [s.id, s.nisn, s.fullName, s.email, s.whatsapp, s.gender, s.birthPlaceDate, s.address, s.chosenProgram, s.packetStudy, s.academicYear, s.status, s.registeredAt]);
    } else if (tab === 'rekap_pendaftaran') {
      headers = ["ID", "Nama_Pendaftar", "Email_Siswa", "Program_Studi", "Status_Awal", "Tgl_Masuk"];
      rows = students.map(s => [s.id, s.fullName, s.email, s.chosenProgram, s.status, s.registeredAt]);
    } else if (tab === 'konfirmasi_ijazah') {
      headers = ["ID_Ijazah", "Nama_Lulusan", "NISN_Ujian", "Email", "WhatsApp", "Program_Lulus", "Tahun_Lulus", "Status_Kelayakan", "Tanggal_Hadir", "Penerima_Fisik", "Nama_Wakil", "Identitas_KTP", "Keterangan_Tambahan"];
      rows = ijazahs.map(i => [i.id, i.fullName, i.nisnOrParticipantNum, i.email, i.whatsapp, i.programClass, i.graduationYear, i.diplomaStatus, i.pickUpDate, i.pickedUpBy, i.pickUpPersonName, i.pickUpPersonId, i.notes || '']);
    } else if (tab === 'data_akun_siswa') {
      headers = ["Email_Siswa", "Password_Hash", "Akses_Role", "Nama_Lengkap", "Dibuat_Pada"];
      rows = accounts.map(a => [a.email, a.passwordHash, a.role, a.fullName, a.registeredAt]);
    } else if (tab === 'mapping_classroom') {
      headers = ["Nama_Program", "Google_Classroom_ID", "Nama_Mata_Pelajaran"];
      rows = mappings.map(m => [m.programName, m.classroomId, m.classroomName]);
    } else if (tab === 'riwayat_posting') {
      headers = ["ID_Posting", "Form_Classroom_ID", "Nama_Kursus", "Judul_Materi_Harian", "Waktu_Post", "Tipe_Post"];
      rows = posts.map(p => [p.id, p.courseId, p.courseName, p.title, p.postedAt, p.type]);
    } else if (tab === 'log_aktivitas_admin') {
      headers = ["ID_Audit_Log", "Stempel_Waktu", "Operator_Email", "Aktivitas_Sistem", "Penjelasan_Aksi"];
      rows = logs.map(l => [l.id, l.timestamp, l.adminEmail, l.actionType, l.description]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GoogleSheet_${tab}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(tab);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div id="sheets-simulator-container" className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-6">
      
      {/* Simulation Header banner */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif italic text-base text-white font-semibold">Integrator Google Sheets™ Mandiri</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono">
              Live Database Synchronization & Rows Audit Log
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari baris spreadsheet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#070709] max-w-xs border border-white/10 rounded-xl text-[11px] pl-8 pr-3.5 py-1.5 text-white outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            onClick={() => handleExportCSV(activeTab)}
            className="bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 hover:text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {downloadSuccess === activeTab ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sheet Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchTerm('');
            }}
            className={`px-3 py-2 rounded-lg text-[10px] font-mono font-semibold transition-colors shrink-0 cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-emerald-600 font-bold text-white shadow-sm' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab.label}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black/30 text-white/70 font-sans text-[9px] font-medium">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid Content rendering like Excel */}
      <div className="bg-[#070709] border border-white/10 rounded-xl overflow-hidden shadow-inner font-sans">
        
        {/* Google sheets style cells bar */}
        <div className="bg-[#0f0f13] px-3.5 py-2 border-b border-white/5 flex items-center gap-2 text-[10px] font-mono text-white/50">
          <span className="bg-[#24242d] text-white/80 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-white/10 uppercase font-mono">fx</span>
          <span className="text-white/60">SUM(active_row_range) | Synced with Firestore Live</span>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'database_siswa' && (
            <table className="w-full text-left text-[11px] border-collapse font-sans">
              <thead className="bg-[#0f0f13] text-white/70 font-mono tracking-wide uppercase border-b border-white/10">
                <tr className="divide-x divide-white/5 text-[9px]">
                  <th className="px-4 py-2 w-8 text-center text-slate-500 font-mono text-[9px]">#</th>
                  <th className="px-4 py-2 font-normal">ID SISWA</th>
                  <th className="px-4 py-2 font-normal">NISN</th>
                  <th className="px-4 py-2 font-normal">NAMA LENGKAP</th>
                  <th className="px-4 py-2 font-normal">GMAIL SISWA</th>
                  <th className="px-4 py-2 font-normal">NO WHATSAPP</th>
                  <th className="px-4 py-2 font-normal">JENIS KELAMIN</th>
                  <th className="px-4 py-2 font-normal">TEMPAT TGL LAHIR</th>
                  <th className="px-4 py-2 font-normal">ALAMAT TINGGAL</th>
                  <th className="px-4 py-2 font-normal">KELAS / PROGRAM</th>
                  <th className="px-4 py-2 font-normal">PAKET AJAR</th>
                  <th className="px-4 py-2 font-normal">TAHUN AJARAN</th>
                  <th className="px-4 py-2 font-normal text-center">STATUS ADMISI</th>
                  <th className="px-4 py-2 font-normal">WAKTU DAFTAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {students
                  .filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((stud, idx) => (
                    <tr key={stud.id} className="divide-x divide-white/5 hover:bg-white/[0.01]">
                      <td className="px-2 py-1.5 text-center bg-[#0f0f13] text-slate-500 font-mono text-[9px] w-8">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-400 select-all">{stud.id}</td>
                      <td className="px-3 py-1.5 font-mono text-white/90">{stud.nisn}</td>
                      <td className="px-3 py-1.5 font-semibold text-white">{stud.fullName}</td>
                      <td className="px-3 py-1.5 text-slate-300 font-mono">{stud.email}</td>
                      <td className="px-3 py-1.5 text-slate-300 font-mono">{stud.whatsapp}</td>
                      <td className="px-3 py-1.5">{stud.gender}</td>
                      <td className="px-3 py-1.5 max-w-[120px] truncate" title={stud.birthPlaceDate}>{stud.birthPlaceDate}</td>
                      <td className="px-3 py-1.5 max-w-[150px] truncate" title={stud.address}>{stud.address}</td>
                      <td className="px-3 py-1.5 text-emerald-400 font-medium">{stud.chosenProgram}</td>
                      <td className="px-3 py-1.5 font-mono">{stud.packetStudy}</td>
                      <td className="px-3 py-1.5 font-mono">{stud.academicYear}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
                          stud.status === 'Undangan Terkirim' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          stud.status === 'Terverifikasi' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        }`}>
                          {stud.status}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[9px] max-w-[100px] truncate">{stud.registeredAt}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'rekap_pendaftaran' && (
            <table className="w-full text-left text-[11px] border-collapse font-sans font-sans">
              <thead className="bg-[#0f0f13] text-white/70 font-mono tracking-wide uppercase border-b border-white/10 text-[9px]">
                <tr className="divide-x divide-white/5">
                  <th className="px-4 py-2 w-8 text-center text-slate-500">#</th>
                  <th className="px-4 py-2 font-normal">ID REG_REKAP</th>
                  <th className="px-4 py-2 font-normal">NAMA LENGKAP</th>
                  <th className="px-4 py-2 font-normal">EMAIL GMAIL</th>
                  <th className="px-4 py-2 font-normal">PROGRAM INTI</th>
                  <th className="px-4 py-2 font-normal">STATUS SINKRON</th>
                  <th className="px-4 py-2 font-normal">WAKTU REKAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {students
                  .filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((stud, idx) => (
                    <tr key={stud.id} className="divide-x divide-white/5 hover:bg-white/[0.01]">
                      <td className="px-2 py-1.5 text-center bg-[#0f0f13] text-slate-500 font-mono text-[9px] w-8">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-400 select-all">{stud.id}</td>
                      <td className="px-3 py-1.5 font-semibold text-white">{stud.fullName}</td>
                      <td className="px-3 py-1.5 text-slate-300 font-mono">{stud.email}</td>
                      <td className="px-3 py-1.5 text-amber-400 font-serif italic">{stud.chosenProgram}</td>
                      <td className="px-3 py-1.5 text-emerald-400 font-bold">AUTOMATIC_SYNC</td>
                      <td className="px-3 py-1.5 font-mono text-[9px]">{stud.registeredAt}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'konfirmasi_ijazah' && (
            <table className="w-full text-left text-[11px] border-collapse font-sans">
              <thead className="bg-[#0f0f13] text-white/70 font-mono tracking-wide uppercase border-b border-white/10 text-[9px]">
                <tr className="divide-x divide-white/5">
                  <th className="px-4 py-2 w-8 text-center text-slate-500">#</th>
                  <th className="px-4 py-2 font-normal">ID IJAZAH</th>
                  <th className="px-4 py-2 font-normal">NAMA LENGKAP</th>
                  <th className="px-4 py-2 font-normal">NISN / NO PESERTA</th>
                  <th className="px-4 py-2 font-normal">EMAIL</th>
                  <th className="px-4 py-2 font-normal">WHATSAPP</th>
                  <th className="px-4 py-2 font-normal">KELAS LULUS</th>
                  <th className="px-4 py-2 font-normal text-center">TAHUN LULUS</th>
                  <th className="px-4 py-2 font-normal text-center">STATUS IJAZAH</th>
                  <th className="px-4 py-2 font-normal">TANGGAL AMBIL</th>
                  <th className="px-4 py-2 font-normal">PENGAMBIL</th>
                  <th className="px-4 py-2 font-normal">NAMA UTAMA</th>
                  <th className="px-4 py-2 font-normal">KTP PENGAMBIL</th>
                  <th className="px-4 py-2 font-normal">CATATAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {ijazahs
                  .filter(i => i.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || i.nisnOrParticipantNum.includes(searchTerm))
                  .map((ij, idx) => (
                    <tr key={ij.id} className="divide-x divide-white/5 hover:bg-white/[0.01]">
                      <td className="px-2 py-1.5 text-center bg-[#0f0f13] text-slate-500 font-mono text-[9px] w-8">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-400 select-all">{ij.id}</td>
                      <td className="px-3 py-1.5 font-semibold text-white">{ij.fullName}</td>
                      <td className="px-3 py-1.5 font-mono text-white/90">{ij.nisnOrParticipantNum}</td>
                      <td className="px-3 py-1.5 text-slate-300 font-mono">{ij.email}</td>
                      <td className="px-3 py-1.5 text-slate-300 font-mono">{ij.whatsapp}</td>
                      <td className="px-3 py-1.5 text-emerald-400">{ij.programClass}</td>
                      <td className="px-3 py-1.5 font-mono text-center">{ij.graduationYear}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
                          ij.diplomaStatus === 'Sudah diambil' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          ij.diplomaStatus === 'Siap diambil' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                          ij.diplomaStatus === 'Ditolak / perlu revisi' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        }`}>
                          {ij.diplomaStatus}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-mono text-white/90">{ij.pickUpDate}</td>
                      <td className="px-3 py-1.5">{ij.pickedUpBy}</td>
                      <td className="px-3 py-1.5 text-white">{ij.pickUpPersonName}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-400">{ij.pickUpPersonId}</td>
                      <td className="px-3 py-1.5 max-w-[120px] truncate text-white/60" title={ij.notes}>{ij.notes || '-'}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'data_akun_siswa' && (
            <table className="w-full text-left text-[11px] border-collapse font-sans">
              <thead className="bg-[#0f0f13] text-white/70 font-mono tracking-wide uppercase border-b border-white/10 text-[9px]">
                <tr className="divide-x divide-white/5">
                  <th className="px-4 py-2 w-8 text-center text-slate-500">#</th>
                  <th className="px-4 py-2 font-normal">EMAIL (PRIMARY KEY)</th>
                  <th className="px-4 py-2 font-normal">SECURE SHA-PASSWORD HASH</th>
                  <th className="px-4 py-2 font-normal">GRUP ROLE</th>
                  <th className="px-4 py-2 font-normal">NAMA LENGKAP PENGHUNI</th>
                  <th className="px-4 py-2 font-normal">BUAT AKUN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {accounts
                  .filter(a => a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || a.email.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((acc, idx) => (
                    <tr key={acc.email} className="divide-x divide-white/5 hover:bg-white/[0.01]">
                      <td className="px-2 py-1.5 text-center bg-[#0f0f13] text-slate-500 font-mono text-[9px] w-8">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-mono text-white font-semibold">{acc.email}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-400 text-xs">{acc.passwordHash}</td>
                      <td className="px-3 py-1.5 font-bold uppercase text-[9px] tracking-widest text-amber-500 font-mono">{acc.role}</td>
                      <td className="px-3 py-1.5 text-white">{acc.fullName}</td>
                      <td className="px-3 py-1.5 font-mono text-[9px]">{acc.registeredAt}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'mapping_classroom' && (
            <table className="w-full text-left text-[11px] border-collapse font-sans">
              <thead className="bg-[#0f0f13] text-white/70 font-mono tracking-wide uppercase border-b border-white/10 text-[9px]">
                <tr className="divide-x divide-white/5">
                  <th className="px-4 py-2 w-8 text-center text-slate-500">#</th>
                  <th className="px-4 py-2 font-normal">NAMA PROGRAM (MAP KEY)</th>
                  <th className="px-4 py-2 font-normal">GOOGLE CLASSROOM COURSE ID</th>
                  <th className="px-4 py-2 font-normal">NAMA KELAS GOOGLE CLASSROOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {mappings
                  .filter(m => m.programName.toLowerCase().includes(searchTerm.toLowerCase()) || m.classroomName.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((map, idx) => (
                    <tr key={map.programName} className="divide-x divide-white/5 hover:bg-white/[0.01]">
                      <td className="px-2 py-1.5 text-center bg-[#0f0f13] text-slate-500 font-mono text-[9px] w-8">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-semibold text-white">{map.programName}</td>
                      <td className="px-3 py-1.5 font-mono text-emerald-400 text-xs font-bold">{map.classroomId}</td>
                      <td className="px-3 py-1.5 text-slate-200">{map.classroomName}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'riwayat_posting' && (
            <table className="w-full text-left text-[11px] border-collapse font-sans">
              <thead className="bg-[#0f0f13] text-white/70 font-mono tracking-wide uppercase border-b border-white/10 text-[9px]">
                <tr className="divide-x divide-white/5">
                  <th className="px-4 py-2 w-8 text-center text-slate-500">#</th>
                  <th className="px-4 py-2 font-normal">ID POSTING</th>
                  <th className="px-4 py-2 font-normal">CLASSROOM ID</th>
                  <th className="px-4 py-2 font-normal">NAMA KELAS</th>
                  <th className="px-4 py-2 font-normal">JUDUL MATERI/TUGAS</th>
                  <th className="px-4 py-2 font-normal">WAKTU POSTING</th>
                  <th className="px-4 py-2 font-normal text-center">TIPE KONTEN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {posts
                  .map((p, idx) => (
                    <tr key={p.id} className="divide-x divide-white/5 hover:bg-white/[0.01]">
                      <td className="px-2 py-1.5 text-center bg-[#0f0f13] text-slate-500 font-mono text-[9px] w-8">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-400 select-all">{p.id}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-400 text-xs">{p.courseId}</td>
                      <td className="px-3 py-1.5 text-slate-300 font-serif italic">{p.courseName}</td>
                      <td className="px-3 py-1.5 font-semibold text-white">{p.title}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px]">{p.postedAt}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono leading-none font-bold tracking-wide uppercase ${
                          p.type === 'ASSIGNMENT' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        }`}>
                          {p.type}
                        </span>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'log_aktivitas_admin' && (
            <table className="w-full text-left text-[11px] border-collapse font-sans">
              <thead className="bg-[#0f0f13] text-white/70 font-mono tracking-wide uppercase border-b border-white/10 text-[9px]">
                <tr className="divide-x divide-white/5">
                  <th className="px-4 py-2 w-8 text-center text-slate-500">#</th>
                  <th className="px-4 py-2 font-normal">ID LOG</th>
                  <th className="px-4 py-2 font-normal">STEMPEL WAKTU</th>
                  <th className="px-4 py-2 font-normal">EMAIL OPERATOR</th>
                  <th className="px-4 py-2 font-normal">TIPE AKTIVITAS</th>
                  <th className="px-4 py-2 font-normal">KETERANGAN DETAIIL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {logs
                  .map((log, idx) => (
                    <tr key={log.id} className="divide-x divide-white/5 hover:bg-white/[0.01]">
                      <td className="px-2 py-1.5 text-center bg-[#0f0f13] text-slate-500 font-mono text-[9px] w-8">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-400 select-all">{log.id}</td>
                      <td className="px-3 py-1.5 font-mono text-white/90">{log.timestamp}</td>
                      <td className="px-3 py-1.5 text-slate-300 font-mono">{log.adminEmail}</td>
                      <td className="px-3 py-1.5 text-amber-500 font-mono text-[9px] font-bold uppercase tracking-wider">{log.actionType}</td>
                      <td className="px-3 py-1.5 text-white/90">{log.description}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 text-[10px] text-white/40 leading-relaxed max-w-2xl bg-[#070709] p-3 rounded-xl border border-white/5">
        <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          Semua perubahan data pada form pendaftaran, konfirmasi ijazah, atau edit di dashboard admin akan secara otomatis memperbarui rows sheet simulasi di atas secara instan. Format tabel dikalibrasi sesuai API standar ekspor Google Sheets.
        </span>
      </div>
    </div>
  );
}
