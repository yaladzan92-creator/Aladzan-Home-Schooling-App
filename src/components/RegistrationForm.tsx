import React, { useState, useRef } from 'react';
import { Student } from '../db';
import { getClassTabName } from '../driveStorage';
import { FileText, Send, CheckCircle2, Upload, FileUp, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';

interface RegistrationFormProps {
  onRegister: (
    studentData: Omit<Student, 'id' | 'status' | 'registeredAt'>,
    ktpFile?: File,
    kkFile?: File,
    ijazahFile?: File
  ) => Promise<void>;
  existingStudents: Student[];
}

export default function RegistrationForm({ onRegister, existingStudents }: RegistrationFormProps) {
  const [fullName, setFullName] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nik, setNik] = useState('');
  const [noKk, setNoKk] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [subdistrict, setSubdistrict] = useState('');
  const [regency, setRegency] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  
  const [packetStudy, setPacketStudy] = useState('Paket C');
  const [studentClass, setStudentClass] = useState('Kelas 12');
  const [programDuration, setProgramDuration] = useState('3 Tahun');
  
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [infoSource, setInfoSource] = useState('Instagram');

  // File objects
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [kkFile, setKkFile] = useState<File | null>(null);
  const [ijazahFile, setIjazahFile] = useState<File | null>(null);

  // Drag highlights
  const [dragKtp, setDragKtp] = useState(false);
  const [dragKk, setDragKk] = useState(false);
  const [dragIjazah, setDragIjazah] = useState(false);

  // Statuses
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Auto-set Dynamic class options based on Packet
  const getClassOptions = () => {
    if (packetStudy === 'Paket A') {
      return ['Kelas 4', 'Kelas 5', 'Kelas 6'];
    } else if (packetStudy === 'Paket B') {
      return ['Kelas 7', 'Kelas 8', 'Kelas 9'];
    } else {
      return ['Kelas 10', 'Kelas 11', 'Kelas 12'];
    }
  };

  const handlePacketChange = (val: string) => {
    setPacketStudy(val);
    if (val === 'Paket A') {
      setStudentClass('Kelas 6');
    } else if (val === 'Paket B') {
      setStudentClass('Kelas 9');
    } else {
      setStudentClass('Kelas 12');
    }
  };

  // Helper to generate a simulated standard file for easy testing
  const populateMockFiles = () => {
    const fakeKTP = new File(['fakektpcontent'], 'ktp_siswa_simulated.png', { type: 'image/png' });
    const fakeKK = new File(['fakekkcontent'], 'kk_siswa_simulated.pdf', { type: 'application/pdf' });
    const fakeIjazah = new File(['fakeijazahcontent'], 'ijazah_terakhir_siswa_simulated.pdf', { type: 'application/pdf' });
    
    setKtpFile(fakeKTP);
    setKkFile(fakeKK);
    setIjazahFile(fakeIjazah);
  };

  // Help populate complete mock values for easy evaluator test
  const handleAutoFillForm = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    setFullName('Ahmad Fauzi ' + randomSuffix);
    setBirthPlace('Bandung');
    setBirthDate('2007-08-15');
    setNik('3273' + Math.floor(100000000000 + Math.random() * 900000000000).toString());
    setNoKk('3273' + Math.floor(100000000000 + Math.random() * 900000000000).toString());
    setAddress('Jl. Cisitu Indah V No. ' + Math.floor(1 + Math.random() * 50));
    setVillage('Dago');
    setSubdistrict('Coblong');
    setRegency('Kota Bandung');
    setFatherName('Dedi Suherman');
    setMotherName('Siti Aminah');
    setPacketStudy('Paket C');
    setStudentClass('Kelas 12');
    setProgramDuration('3 Tahun');
    setWhatsapp('0812' + randomSuffix + '8890');
    setEmail('fauzi.' + randomSuffix + '@gmail.com');
    setReferenceCode('REFSRIKANDI');
    setInfoSource('Rekomendasi Teman');
    populateMockFiles();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setLoadingText('Memvalidasi data formulir...');

    // Form Validations
    if (
      !fullName || !birthPlace || !birthDate || !nik || !noKk ||
      !address || !village || !subdistrict || !regency ||
      !fatherName || !motherName || !whatsapp || !email
    ) {
      setError('Mohon lengkapi seluruh isian formulir bertanda bintang (*).');
      setLoading(false);
      return;
    }

    // Number digits validation (16 digits check for NIK and KK)
    const rawNik = nik.trim();
    if (rawNik.length !== 16 || !/^\d+$/.test(rawNik)) {
      setError('Pendaftaran Gagal: NIK wajib berupa 16 digit angka saja!');
      setLoading(false);
      return;
    }

    const rawKk = noKk.trim();
    if (rawKk.length !== 16 || !/^\d+$/.test(rawKk)) {
      setError('Pendaftaran Gagal: Nomor Kartu Keluarga (KK) wajib berupa 16 digit angka saja!');
      setLoading(false);
      return;
    }

    // File check required validation
    if (!ktpFile || !kkFile || !ijazahFile) {
      setError('Pendaftaran Gagal: Dokumen fisik KTP, Kartu Keluarga, dan Ijazah Terakhir wajib diupload!');
      setLoading(false);
      return;
    }

    // DUPLICATION PREVENTER RULE: NIK, KK, Email, WhatsApp
    const lowerEmail = email.trim().toLowerCase();
    const cleanWhatsapp = whatsapp.trim().replace(/[^0-9]/g, '');

    const dupNik = existingStudents.find(s => s.nik === rawNik);
    if (dupNik) {
      setError(`Pendaftaran Gagal: NIK "${rawNik}" sudah pernah terdaftar dalam sistem DATA INDUK SISWA atas nama "${dupNik.fullName}"!`);
      setLoading(false);
      return;
    }

    const dupKk = existingStudents.find(s => s.noKk === rawKk);
    if (dupKk) {
      setError(`Pendaftaran Gagal: Nomor KK "${rawKk}" sudah terdaftar dalam file induk PKBM!`);
      setLoading(false);
      return;
    }

    const dupEmail = existingStudents.find(s => s.email.toLowerCase() === lowerEmail);
    if (dupEmail) {
      setError(`Pendaftaran Gagal: Alamat Email "${email}" sudah digunakan oleh siswa aktif!`);
      setLoading(false);
      return;
    }

    const dupPhone = existingStudents.find(s => s.whatsapp.replace(/[^0-9]/g, '') === cleanWhatsapp);
    if (dupPhone) {
      setError(`Pendaftaran Gagal: Nomor WhatsApp "${whatsapp}" sudah terdaftar. Gunakan nomor lain!`);
      setLoading(false);
      return;
    }

    try {
      setLoadingText('Mempersiapkan struktur folder GDrive & mengunggah dokumen siswa...');
      
      // Call parent onRegister, which returns a promise resolving after Sheets sync and GDrive structured file transfers
      await onRegister({
        fullName: fullName.trim(),
        birthPlace: birthPlace.trim(),
        birthDate: birthDate,
        birthPlaceDate: `${birthPlace.trim()}, ${birthDate}`,
        gender: 'Laki-laki', // Keep default or support if needed
        nik: rawNik,
        noKk: rawKk,
        address: address.trim(),
        village: village.trim(),
        subdistrict: subdistrict.trim(),
        regency: regency.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        packetStudy,
        studentClass,
        programDuration,
        chosenProgram: `${packetStudy} ${studentClass}`,
        academicYear: '2026/2027',
        whatsapp: whatsapp.trim(),
        email: lowerEmail,
        referenceCode: referenceCode.trim() || undefined,
        infoSource: infoSource,
        nisn: Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')
      }, ktpFile, kkFile, ijazahFile);

      setSuccess(true);
    } catch (err: any) {
      setError(`Terjadi Error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div id="reg-success-card" className="p-8 text-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="font-serif italic text-white text-xl">PPDB Srikandi Berhasil!</h3>
        <p className="text-xs text-white/70 leading-relaxed font-mono">
          Data pendaftaran telah terinput ke tab **DATA_INDUK** dan otomatis terklasifikasi ke tab **{getClassTabName(studentClass, packetStudy)}** di Google Spreadsheet. 
          Folder Google Drive perorangan juga telah dibuat lengkap dengan subfolder 01_KTP, 02_KK, dan 03_IJAZAH.
        </p>
        <button
          onClick={() => {
            setSuccess(false);
            setFullName('');
            setNik('');
            setNoKk('');
            setEmail('');
            setWhatsapp('');
            setKtpFile(null);
            setKkFile(null);
            setIjazahFile(null);
          }}
          className="mx-auto block text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all cursor-pointer"
        >
          Kirim Pendaftaran Baru
        </button>
      </div>
    );
  }

  return (
    <div id="student-registration-container" className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-serif italic text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>Formulir PPDB PKBM Srikandi</span>
          </h3>
          <p className="text-[11px] text-white/50 mt-1">
            Persyaratan registrasi terintegrasi otomatis dengan 11 Tab Google Sheet dan 5 Subfolder Google Drive.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAutoFillForm}
            className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[10.5px] font-bold py-1.5 px-3.5 rounded-lg border border-indigo-500/30 transition-all flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Isi Contoh Formulir</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="font-mono">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm text-white/80 font-mono text-center max-w-md mx-auto">{loadingText}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* BAGIAN I: DATA MAHASISWA DAN KELAHIRAN */}
          <div className="bg-[#14141a]/55 p-5 rounded-xl border border-white/5 space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400 font-mono">I. IDENTITAS CALON SISWA</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Nama Lengkap Sesuai Ijazah *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: AHMAD FAUZI"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Tempat Lahir *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bandung"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Tanggal Lahir *</label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Nomor NIK (KTP Siswa) *</label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  placeholder="16 Digit NIK"
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Nomor Kartu Keluarga (KK) *</label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  placeholder="16 Digit No. KK"
                  value={noKk}
                  onChange={(e) => setNoKk(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
            </div>
          </div>

          {/* BAGIAN II: ALAMAT LENGKAP GEOGRAFIS */}
          <div className="bg-[#14141a]/55 p-5 rounded-xl border border-white/5 space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400 font-mono">II. ALAMAT LENGKAP TEMPAT TINGGAL</h4>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Alamat Lengkap (Jalan, RT/RW, Dusun) *</label>
              <textarea
                required
                rows={2}
                placeholder="Tuliskan nama jalan dan RT/RW tempat tinggal Anda"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Desa / Kelurahan *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Desa"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Kecamatan *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Kecamatan"
                  value={subdistrict}
                  onChange={(e) => setSubdistrict(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Kabupaten / Kota *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Kabupaten/Kota"
                  value={regency}
                  onChange={(e) => setRegency(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* BAGIAN III: DATA ORANG TUA */}
          <div className="bg-[#14141a]/55 p-5 rounded-xl border border-white/5 space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400 font-mono">III. DATA ORANG TUA KANDUNG</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Nama Ayah Kandung *</label>
                <input
                  type="text"
                  required
                  placeholder="Tuliskan nama ayah lengkap"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Nama Ibu Kandung Sesuai KK *</label>
                <input
                  type="text"
                  required
                  placeholder="Tuliskan nama ibu kandung"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* BAGIAN IV: AKADEMIK DAN PROGRAM PILIHAN */}
          <div className="bg-[#14141a]/55 p-5 rounded-xl border border-white/5 space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400 font-mono">IV. PROGRAM AKADEMIK YANG DITUJU</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Program *</label>
                <select
                  value={packetStudy}
                  onChange={(e) => handlePacketChange(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors cursor-pointer text-ellipsis truncate"
                >
                  <option value="Paket A">Paket A (Setara SD)</option>
                  <option value="Paket B">Paket B (Setara SMP)</option>
                  <option value="Paket C">Paket C (Setara SMA)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Kelas Tujuan *</label>
                <select
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  {getClassOptions().map(cl => (
                    <option key={cl} value={cl}>{cl}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Jenjang Program *</label>
                <select
                  value={programDuration}
                  onChange={(e) => setProgramDuration(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="1 Tahun">1 Tahun</option>
                  <option value="2 Tahun">2 Tahun</option>
                  <option value="3 Tahun">3 Tahun</option>
                  <option value="Paket Langsung">Paket Langsung</option>
                </select>
              </div>
            </div>
          </div>

          {/* BAGIAN V: KONTAK, EMAIL DAN PEMASARAN */}
          <div className="bg-[#14141a]/55 p-5 rounded-xl border border-white/5 space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400 font-mono">V. KOORDINASI KOMUNIKASI & REFERENSI</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">No HP / WhatsApp (Aktif) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 081234567890"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Alamat Email Gmail Calon Siswa *</label>
                <input
                  type="email"
                  required
                  placeholder="Tuliskan email akhiran @gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Kode Referensi Mitra (Jika Ada)</label>
                <input
                  type="text"
                  placeholder="Contoh: REFSRIKANDI"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Sumber Informasi PPDB</label>
                <select
                  value={infoSource}
                  onChange={(e) => setInfoSource(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Rekomendasi Teman">Rekomendasi Teman</option>
                  <option value="Spanduk / Brosur">Spanduk / Brosur</option>
                  <option value="Google Search">Google Search</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>
          </div>

          {/* BAGIAN VI: FILE UPLOAD DRAG-AND-DROP */}
          <div className="bg-[#14141a]/55 p-5 rounded-xl border border-white/5 space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400 font-mono">VI. SYARAT UNGGAH BERKAS FISIK (WAJIB)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* FILE 1: KTP */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragKtp(true); }}
                onDragLeave={() => setDragKtp(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragKtp(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setKtpFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  dragKtp ? 'border-emerald-500 bg-emerald-500/5' : ktpFile ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => e.target.files && setKtpFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-1.5 pointer-events-none">
                  {ktpFile ? (
                    <>
                      <FileUp className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="text-[11px] text-emerald-300 font-medium font-mono truncate">{ktpFile.name}</p>
                      <p className="text-[9px] text-emerald-400 font-semibold uppercase">KTP Calon Siswa Terpilih</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-white/30 mx-auto" />
                      <p className="text-[11px] text-white/70 font-semibold block">Upload KTP Calon Siswa *</p>
                      <p className="text-[9px] text-white/40">Seret file di sini / Klik</p>
                    </>
                  )}
                </div>
              </div>

              {/* FILE 2: KK */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragKk(true); }}
                onDragLeave={() => setDragKk(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragKk(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setKkFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  dragKk ? 'border-emerald-500 bg-emerald-500/5' : kkFile ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => e.target.files && setKkFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-1.5 pointer-events-none">
                  {kkFile ? (
                    <>
                      <FileUp className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="text-[11px] text-emerald-300 font-medium font-mono truncate">{kkFile.name}</p>
                      <p className="text-[9px] text-emerald-400 font-semibold uppercase">Kartu Keluarga Terpilih</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-white/30 mx-auto" />
                      <p className="text-[11px] text-white/70 font-semibold block">Upload Kartu Keluarga *</p>
                      <p className="text-[9px] text-white/40">Seret file di sini / Klik</p>
                    </>
                  )}
                </div>
              </div>

              {/* FILE 3: IJAZAH */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragIjazah(true); }}
                onDragLeave={() => setDragIjazah(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragIjazah(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setIjazahFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  dragIjazah ? 'border-emerald-500 bg-emerald-500/5' : ijazahFile ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => e.target.files && setIjazahFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-1.5 pointer-events-none">
                  {ijazahFile ? (
                    <>
                      <FileUp className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="text-[11px] text-emerald-300 font-medium font-mono truncate">{ijazahFile.name}</p>
                      <p className="text-[9px] text-emerald-400 font-semibold uppercase">Ijazah Terakhir Terpilih</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-white/30 mx-auto" />
                      <p className="text-[11px] text-white/70 font-semibold block">Upload Ijazah Terakhir *</p>
                      <p className="text-[9px] text-white/40">Seret file di sini / Klik</p>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer inline-flex"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Formulir Pendaftaran & Buat Akun Siswa</span>
          </button>
        </form>
      )}
    </div>
  );
}
