import React, { useState } from 'react';
import { Sparkles, Send, Edit3, Save, CheckCircle, RefreshCw } from 'lucide-react';
import { ClassroomMapping, PostingHistory } from '../db';
import { generateLesson } from '../gemini';

interface AICourseworkProps {
  mappings: ClassroomMapping[];
  accessToken: string | null;
  onPostCreated: (post: Omit<PostingHistory, 'id' | 'postedAt'>) => void;
  googleClassroomsList: Array<{ id: string; name: string }>;
  isPostingToRealGoogleClassroom: boolean;
  setIsPostingToRealGoogleClassroom: (val: boolean) => void;
  createCourseWork: (
    courseId: string,
    title: string,
    description: string,
    formUrl: string,
    formTitle: string,
    accessToken: string
  ) => Promise<any>;
  createCourseWorkMaterial: (
    courseId: string,
    title: string,
    description: string,
    formUrl: string,
    formTitle: string,
    accessToken: string
  ) => Promise<any>;
}

interface GeneratedData {
  judul: string;
  ringkasan: string;
  penjelasan: string;
  tugas: string;
  refleksi: string;
  caption: string;
}

export default function AICoursework({
  mappings,
  accessToken,
  onPostCreated,
  googleClassroomsList,
  isPostingToRealGoogleClassroom,
  setIsPostingToRealGoogleClassroom,
  createCourseWork,
  createCourseWorkMaterial
}: AICourseworkProps) {
  const [chosenProgram, setChosenProgram] = useState(mappings[0]?.programName || 'Agribisnis Tanaman Pangan');
  const [subject, setSubject] = useState('Budidaya Tanaman');
  const [topic, setTopic] = useState('Pengujian Kadar pH Tanah Sawah');
  const [gradeLevel, setGradeLevel] = useState('Paket C Kelas 11');

  const [loading, setLoading] = useState(false);
  const [generatingSuccess, setGeneratingSuccess] = useState(false);
  const [editedData, setEditedData] = useState<GeneratedData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [postType, setPostType] = useState<'MATERIAL' | 'ASSIGNMENT'>('MATERIAL');
  const [postLoading, setPostLoading] = useState(false);
  const [postSuccess, setPostSuccess] = useState('');
  const [postError, setPostError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratingSuccess(false);
    setPostSuccess('');
    setPostError('');
    setIsEditing(false);

    try {
      const data = await generateLesson(subject, topic, gradeLevel);
      setEditedData(data);
      setGeneratingSuccess(true);
    } catch (err: any) {
      console.error(err);
      setPostError(`Gagal membuat konten: ${err.message || 'Server overload'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  const handlePostToClassroom = async () => {
    if (!editedData) return;
    setPostLoading(true);
    setPostSuccess('');
    setPostError('');

    // Locate Classroom Course ID mapping
    const currentMapping = mappings.find(m => m.programName === chosenProgram);
    const courseId = currentMapping?.classroomId || 'sb_1';
    const courseName = currentMapping?.classroomName || 'Course Sandbox';

    try {
      let responsePayload: any = null;
      let usedRealAPI = false;

      // Check if real Google Classroom API can be invoked
      if (accessToken && isPostingToRealGoogleClassroom) {
        const descriptionText = postType === 'ASSIGNMENT'
          ? `${editedData.caption}\n\n📖 RINGKASAN:\n${editedData.ringkasan}\n\n✏️ PENJELASAN:\n${editedData.penjelasan}\n\n❓ REFLEKSI:\n${editedData.refleksi}\n\n📝 TUGAS:\n${editedData.tugas}`
          : `${editedData.caption}\n\n📖 RINGKASAN:\n${editedData.ringkasan}\n\n✏️ PENJELASAN:\n${editedData.penjelasan}\n\n❓ REFLEKSI:\n${editedData.refleksi}`;

        try {
          if (postType === 'ASSIGNMENT') {
            responsePayload = await createCourseWork(
              courseId,
              editedData.judul,
              descriptionText,
              "https://forms.google.com",
              "Evaluasi Tugas Mandiri Siswa",
              accessToken
            );
          } else {
            responsePayload = await createCourseWorkMaterial(
              courseId,
              editedData.judul,
              descriptionText,
              "https://forms.google.com",
              "Bahan Evaluasi Form Mandiri",
              accessToken
            );
          }
          usedRealAPI = true;
        } catch (classroomAPIErr: any) {
          console.warn('Real Google Classroom posting failed, switching to sandbox mode logger...', classroomAPIErr);
          throw new Error(`Koneksi Google API gagal: ${classroomAPIErr.message || 'Missing permissions'}`);
        }
      }

      // Track post into system database
      onPostCreated({
        courseId,
        courseName,
        title: editedData.judul,
        type: postType
      });

      setPostSuccess(
        usedRealAPI 
          ? `Materi "${editedData.judul}" berhasil diposting langsung ke akun Google Classroom Utama Anda! ID: ${responsePayload?.id || 'OK'}`
          : `Materi "${editedData.judul}" berhasil disimulasikan dan dicatat di lembar RIWAYAT POSTING MATERI!`
      );

    } catch (err: any) {
      setPostError(err.message || 'Gagal mengeksekusi posting ke Google Classroom.');
    } finally {
      setPostLoading(false);
    }
  };

  return (
    <div id="ai-curriculum-panel" className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
      
      {/* Module Title Banner */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-serif italic text-base text-white font-semibold">Gemini AI Generator Kurikulum & Tugas</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Bahan Ajar Harian & Formulir Tugas Otomatis</p>
          </div>
        </div>

        {/* Real Google Switch if token exists */}
        {accessToken && (
          <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-[11px]">
            <input
              type="checkbox"
              checked={isPostingToRealGoogleClassroom}
              onChange={(e) => setIsPostingToRealGoogleClassroom(e.target.checked)}
              className="accent-indigo-500"
            />
            <span className="text-white/80 font-medium">Post ke Classroom Asli</span>
          </label>
        )}
      </div>

      {postError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
          {postError}
        </div>
      )}

      {/* Input controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-black/30 p-4 rounded-xl border border-white/5">
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-white/50 block font-semibold">Grup Program / Kelas</label>
          <select
            value={chosenProgram}
            onChange={(e) => setChosenProgram(e.target.value)}
            className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3 py-2 text-white outline-none focus:border-indigo-500 cursor-pointer"
          >
            {mappings.map(m => (
              <option key={m.programName} value={m.programName}>{m.programName}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-white/50 block font-semibold">Mata Pelajaran</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3 py-2 text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-white/50 block font-semibold">Topik Pembelajaran</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3 py-2 text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-white/50 block font-semibold">Tingkatan Siswa</label>
          <input
            type="text"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3 py-2 text-white outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
      >
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        <span>{loading ? 'Sedang Memformulasikan Konten via Gemini API...' : 'Generate Rencana Pengajaran & Tugas Instant'}</span>
      </button>

      {/* Generation Outcome */}
      {editedData && (
        <div className="border border-indigo-500/20 bg-indigo-950/10 rounded-xl p-5 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div className="space-y-0.5">
              <span className="text-[9px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">Hasil AI Generated</span>
              <h4 className="font-serif italic text-white text-lg font-semibold">{editedData.judul}</h4>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[11px] font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span>{isEditing ? 'Simpan Editan' : 'Edit Redaksi'}</span>
              </button>
            </div>
          </div>

          {/* Form edit fields */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-white/40 block">Judul Utama</label>
                <input
                  type="text"
                  value={editedData.judul}
                  onChange={(e) => setEditedData({ ...editedData, judul: e.target.value })}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2 text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-white/40 block">Ringkasan Materi (1-2 Paragraf)</label>
                <textarea
                  rows={3}
                  value={editedData.ringkasan}
                  onChange={(e) => setEditedData({ ...editedData, ringkasan: e.target.value })}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2 text-white outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-white/40 block">Penjelasan Lengkap (Poin & Uraian)</label>
                <textarea
                  rows={6}
                  value={editedData.penjelasan}
                  onChange={(e) => setEditedData({ ...editedData, penjelasan: e.target.value })}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2 text-white outline-none resize-none font-mono text-[11px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-white/40 block">Tugas Mandiri Ke Rumah</label>
                <textarea
                  rows={3}
                  value={editedData.tugas}
                  onChange={(e) => setEditedData({ ...editedData, tugas: e.target.value })}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2 text-white outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-white/40 block">Pertanyaan Refleksi</label>
                <textarea
                  rows={2}
                  value={editedData.refleksi}
                  onChange={(e) => setEditedData({ ...editedData, refleksi: e.target.value })}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2 text-white outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-white/40 block">Caption Untuk Posting Feed</label>
                <textarea
                  rows={4}
                  value={editedData.caption}
                  onChange={(e) => setEditedData({ ...editedData, caption: e.target.value })}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2 text-white outline-none resize-none font-mono text-[11px]"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-white">
              
              <div className="space-y-4">
                <div className="space-y-1 bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className="text-[8px] uppercase font-mono text-emerald-400 font-bold">1. Ringkasan Pelajaran</span>
                  <p className="text-[11px] text-white/85 leading-relaxed leading-relaxed font-sans">{editedData.ringkasan}</p>
                </div>

                <div className="space-y-1 bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className="text-[8px] uppercase font-mono text-indigo-400 font-bold">2. Penjelasan Mendalam</span>
                  <p className="text-[11px] text-white/70 whitespace-pre-line leading-relaxed font-mono">{editedData.penjelasan}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1 bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className="text-[8px] uppercase font-mono text-amber-400 font-bold">3. Tugas Mandiri Siswa</span>
                  <p className="text-[11px] text-white/85 leading-relaxed font-sans">{editedData.tugas}</p>
                </div>

                <div className="space-y-1 bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className="text-[8px] uppercase font-mono text-rose-400 font-bold">4. Pertanyaan Refleksi</span>
                  <p className="text-[11px] text-white/85 leading-relaxed font-serif italic">"{editedData.refleksi}"</p>
                </div>

                <div className="space-y-1 bg-black/20 p-3 rounded-lg border border-white/5 select-all">
                  <span className="text-[8px] uppercase font-mono text-purple-400 font-bold">5. Caption Status Copy-Paste</span>
                  <p className="text-[10px] text-white/60 whitespace-pre-wrap leading-relaxed font-mono">{editedData.caption}</p>
                </div>
              </div>

            </div>
          )}

          {/* Posting control bar */}
          <div className="bg-black/30 p-4 border border-white/5 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-white/50">Posting Sebagai:</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer select-none">
                  <input
                    type="radio"
                    name="postType"
                    checked={postType === 'MATERIAL'}
                    onChange={() => setPostType('MATERIAL')}
                    className="accent-indigo-500"
                  />
                  <span>Materi Pembelajaran (Material)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer select-none">
                  <input
                    type="radio"
                    name="postType"
                    checked={postType === 'ASSIGNMENT'}
                    onChange={() => setPostType('ASSIGNMENT')}
                    className="accent-indigo-500"
                  />
                  <span>Format Tugas (Assignment)</span>
                </label>
              </div>
            </div>

            <button
              onClick={handlePostToClassroom}
              disabled={postLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0 disabled:opacity-40"
            >
              {postLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{postLoading ? 'Sedang Memasukkan ke Google...' : 'Posting ke Aliran Kelas'}</span>
            </button>
          </div>

          {postSuccess && (
            <div id="ai-post-success" className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{postSuccess}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
