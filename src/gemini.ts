import { GoogleGenAI, Type } from '@google/genai';

export interface GeneratedLesson {
  judul: string;
  ringkasan: string;
  penjelasan: string;
  tugas: string;
  refleksi: string;
  caption: string;
}

let ai: GoogleGenAI | null = null;

function getApiKey() {
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
  const storedKey = localStorage.getItem('pkbm_gemini_api_key') || '';
  return (envKey || storedKey).trim();
}

function getAiClient() {
  if (ai) return ai;
  const apiKey = getApiKey();
  if (!apiKey) return null;
  ai = new GoogleGenAI({ apiKey });
  return ai;
}

function fallbackLesson(subject: string, topic: string, gradeLevel?: string): GeneratedLesson {
  return {
    judul: `Materi Harian: ${topic}`,
    ringkasan: `Ringkasan pembelajaran tentang ${topic} untuk kelas ${gradeLevel || 'Paket C'}.`,
    penjelasan: `Pembahasan ${topic} di bidang ${subject}. Uraikan konsep inti, penerapan praktis, dan manfaatnya dalam kehidupan sehari-hari siswa.`,
    tugas: `Pilih satu contoh sederhana yang berkaitan dengan ${topic}. Buat ringkasan 1 halaman dan presentasikan hasilnya di kelas.`,
    refleksi: `Bagaimana pemahaman Anda tentang ${topic} bisa membantu memecahkan masalah nyata di sekitar Anda?`,
    caption: `📚 MATERI BARU: ${topic}\n\nHalo teman-teman belajar! Hari ini kita akan membahas ${topic}.\n\nSilakan baca ringkasan, penjelasan, lalu kerjakan tugas dan refleksinya ya.\n\nSelamat belajar! ✨`
  };
}

export async function generateLesson(subject: string, topic: string, gradeLevel?: string): Promise<GeneratedLesson> {
  const client = getAiClient();
  if (!client) {
    return fallbackLesson(subject, topic, gradeLevel);
  }

  const systemPrompt = `Anda adalah asisten desainer kurikulum dan guru senior yang sangat kreatif di Indonesia (khususnya untuk PKBM / Sekolah Non-Formal).
Buat materi harian dalam Bahasa Indonesia yang sederhana, interaktif, mudah dipahami siswa, dan siap diposting ke Google Classroom.`;

  const instructions = `Buat konten pembelajaran harian terstruktur dengan skema JSON yang terdiri dari:
- judul
- ringkasan
- penjelasan
- tugas
- refleksi
- caption`;

  const response = await client.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [
      {
        role: 'user',
        parts: [{
          text: `${instructions}\n\nTopik: ${topic}\nMata Pelajaran: ${subject}\nTingkat: ${gradeLevel || 'Umum'}`
        }]
      }
    ],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        required: ['judul', 'ringkasan', 'penjelasan', 'tugas', 'refleksi', 'caption'],
        properties: {
          judul: { type: Type.STRING },
          ringkasan: { type: Type.STRING },
          penjelasan: { type: Type.STRING },
          tugas: { type: Type.STRING },
          refleksi: { type: Type.STRING },
          caption: { type: Type.STRING }
        }
      }
    }
  });

  if (!response.text) return fallbackLesson(subject, topic, gradeLevel);
  return JSON.parse(response.text.trim()) as GeneratedLesson;
}
