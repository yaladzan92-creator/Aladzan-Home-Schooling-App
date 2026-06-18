import React, { useState } from 'react';
import { IjazahConfirmation } from '../db';
import { GraduationCap, Send, CheckCircle2 } from 'lucide-react';

interface IjazahFormProps {
  onSubmit: (data: Omit<IjazahConfirmation, 'id' | 'diplomaStatus' | 'submittedAt'>) => void;
  availablePrograms: string[];
}

export default function IjazahForm({ onSubmit, availablePrograms }: IjazahFormProps) {
  const [fullName, setFullName] = useState('');
  const [nisnOrParticipantNum, setNisnOrParticipantNum] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [programClass, setProgramClass] = useState(availablePrograms[0] || 'Agribisnis Tanaman Pangan');
  const [graduationYear, setGraduationYear] = useState('2025');
  const [pickUpDate, setPickUpDate] = useState('');
  const [pickedUpBy, setPickedUpBy] = useState<'Siswa' | 'Wali'>('Siswa');
  const [pickUpPersonName, setPickUpPersonName] = useState('');
  const [pickUpPersonId, setPickUpPersonId] = useState('');
  const [notes, setNotes] = useState('');
  
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !nisnOrParticipantNum || !email || !whatsapp || !pickUpDate || !pickUpPersonName || !pickUpPersonId) {
      setError('Mohon lengkapi semua field bertanda bintang (*).');
      return;
    }

    onSubmit({
      fullName: fullName.trim(),
      nisnOrParticipantNum: nisnOrParticipantNum.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      programClass,
      graduationYear,
      pickUpDate,
      pickedUpBy,
      pickUpPersonName: pickUpPersonName.trim(),
      pickUpPersonId: pickUpPersonId.trim(),
      notes: notes.trim()
    });

    setSuccess(true);
    // Reset Form
    setFullName('');
    setNisnOrParticipantNum('');
    setEmail('');
    setWhatsapp('');
    setPickUpDate('');
    setPickUpPersonName('');
    setPickUpPersonId('');
    setNotes('');
  };

  const handleSetSelf = () => {
    setPickUpPersonName(fullName);
    setPickedUpBy('Siswa');
  };

  if (success) {
    return (
      <div id="ijazah-success-card" className="p-8 text-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="font-serif italic text-white text-xl">Konfirmasi Pengambilan Terkirim!</h3>
        <p className="text-xs text-white/60 leading-relaxed">
          Permintaan jadwal Anda telah berhasil dicatat pada lembar **KONFIRMASI IJAZAH** dengan status **"Belum diproses"**. 
          Siswa dapat memantau status persetujuan ("Siap Diambil", "Sudah Diambil", dsb.) langsung di Dashboard Siswa mereka setelah masuk.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mx-auto block text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-xl transition-all cursor-pointer"
        >
          Kumpulkan Penjadwalan Lain
        </button>
      </div>
    );
  }

  return (
    <div id="diploma-form-container" className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 max-w-3xl mx-auto col-span-1">
      <div>
        <h3 className="text-xl font-serif italic text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-400" />
          <span>Formulir Rencana Pengambilan Ijazah</span>
        </h3>
        <p className="text-xs text-white/50 mt-1">
          Bila Anda sudah dinyatakan LULUS, silakan mengisi formulir koordinasi ini untuk menjadwalkan pengambilan fisik dokumen Ijazah Asli di loket PKBM.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Nama Lengkap Siswa *</label>
            <input
              type="text"
              required
              placeholder="Sesuai Ijazah Pendidikan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">NISN / Nomor Peserta Ujian *</label>
            <input
              type="text"
              required
              placeholder="Contoh: 004123..."
              value={nisnOrParticipantNum}
              onChange={(e) => setNisnOrParticipantNum(e.target.value)}
              className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Email Pengguna *</label>
            <input
              type="email"
              required
              placeholder="siswa@classroom.demo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Nomor WhatsApp Aktif *</label>
            <input
              type="tel"
              required
              placeholder="Contoh: 08123xxxxxx"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1 col-span-1">
            <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Program / Kelas Lulus</label>
            <select
              value={programClass}
              onChange={(e) => setProgramClass(e.target.value)}
              className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="Paket A Kelas 6">Paket A (Sederajat SD)</option>
              <option value="Paket B Kelas 9">Paket B (Sederajat SMP)</option>
              <option value="Paket C Kelas 12">Paket C (Sederajat SMA)</option>
              {availablePrograms.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 col-span-1">
            <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Tahun Kelulusan</label>
            <select
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="2025">Lulusan 2025</option>
              <option value="2024">Lulusan 2024</option>
              <option value="2023">Lulusan 2023</option>
            </select>
          </div>

          <div className="space-y-1 col-span-1">
            <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Rencana Tanggal Hadir *</label>
            <input
              type="date"
              required
              value={pickUpDate}
              onChange={(e) => setPickUpDate(e.target.value)}
              className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors font-mono cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-2 border-t border-white/5 pt-4">
          <label className="text-[10px] uppercase tracking-wider text-white/40 block font-semibold">Detail Penerima Ijazah Fisik</label>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">Status Pengambil</label>
              <div className="flex gap-3 pt-1">
                <label className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer">
                  <input
                    type="radio"
                    name="pickedUpBy"
                    checked={pickedUpBy === 'Siswa'}
                    onChange={() => setPickedUpBy('Siswa')}
                    className="accent-emerald-500"
                  />
                  <span>Siswa Sendiri</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer">
                  <input
                    type="radio"
                    name="pickedUpBy"
                    checked={pickedUpBy === 'Wali'}
                    onChange={() => setPickedUpBy('Wali')}
                    className="accent-emerald-500"
                  />
                  <span>Wali / Orang Tua</span>
                </label>
              </div>
            </div>

            <div className="col-span-1">
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[9px] uppercase tracking-wider text-white/40 block font-semibold">Nama Pengambil *</label>
                  {pickedUpBy === 'Siswa' && (
                    <button
                      type="button"
                      onClick={handleSetSelf}
                      className="text-[9px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      Sama dgn Siswa
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Nama Pengambil Fisik"
                  value={pickUpPersonName}
                  onChange={(e) => setPickUpPersonName(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3 py-2 text-white outline-none"
                />
              </div>
            </div>

            <div className="col-span-1">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-white/40 block font-semibold">No Identitas Pengambil (NIK KTP) *</label>
                <input
                  type="text"
                  required
                  placeholder="16 Digit No KTP"
                  value={pickUpPersonId}
                  onChange={(e) => setPickUpPersonId(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3 py-2 text-white outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Catatan / Keterangan Penunjang</label>
          <textarea
            rows={1.5}
            placeholder="Keterangan tambahan atau surat kuasa bila diwakili..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2 text-white outline-none edit-textarea resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Kirim Penjadwalan Konfirmasi</span>
        </button>
      </form>
    </div>
  );
}
