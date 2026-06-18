import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Google Gen AI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Endpoint to generate automated learning content using Gemini
app.post('/api/generate-lesson', async (req, res) => {
  try {
    const { subject, topic, gradeLevel, targetAudience } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and Topic are required' });
    }

    if (!ai) {
      // Return a graceful simulated response if API key is not configured, to keep app usable
      console.warn('GEMINI_API_KEY is not configured on the server. Returning high-quality lesson template.');
      return res.json({
        success: true,
        isSimulated: true,
        data: {
          judul: `Materi Harian: ${topic}`,
          ringkasan: `Ringkasan pembelajaran tentang ${topic} untuk kelas ${gradeLevel || 'Paket C'}.`,
          penjelasan: `Pembahasan mendalam ${topic} di bidang ${subject}. Menguraikan cara kerja, penerapan praktis, dan pentingnya materi ini dalam kehidupan sehari-hari siswa di ${targetAudience || 'PKBM Srikandi'}.`,
          tugas: `Pilihlah salah satu objek studi kelompok di sekitar Anda yang relevan dengan ${topic}. Buat analisis sederhana sepanjang 1 halaman dan diskusikan di forum kelas.`,
          refleksi: `Bagaimana pemahaman Anda tentang ${topic} dapat membantu dalam memecahkan masalah praktis di lingkungan sekitar Anda? Berikan 1 contoh nyata.`,
          caption: `📚 MATERI BARU: ${topic}\n\nHalo teman-teman belajar! Hari ini kita akan membahas mengenai ${topic}.\n\nSilakan baca ringkasan & penjelasan materi yang dilampirkan, lalu jawab pertanyaan refleksi dan kumpulkan tugas tepat waktu ya.\n\nSelamat Belajar! ✨`
        }
      });
    }

    const systemPrompt = `Anda adalah asisten desainer kurikulum dan guru senior yang sangat kreatif di Indonesia (khususnya untuk PKBM / Sekolah Non-Formal).
Buat materi harian dalam Bahasa Indonesia yang sederhana, interaktif, mudah dipahami siswa, dan siap diposting ke Google Classroom.

Topik yang diminta: "${topic}" dalam mata pelajaran "${subject}" untuk tingkat "${gradeLevel || 'Paket C'}".
Gunakan gaya bahasa yang memotivasi, ramah, dan bersahabat.`;

    const instructions = `Buat konten pembelajaran harian terstruktur dengan skema JSON yang terdiri dari:
- judul: Judul materi pembelajaran yang menarik.
- ringkasan: 1-2 paragraf ringkasan padat dan jelas.
- penjelasan: Penjelasan materi secara detail namun terstruktur dengan poin-poin sederhana.
- tugas: Tugas mandiri atau praktis yang relevan dan bisa dikerjakan di rumah.
- refleksi: 1 pertanyaan reflektif mendalam agar siswa bisa mengaitkan materi dengan kehidupan mereka.
- caption: Teks status/caption posting lengkap yang siap di-copypaste untuk feed Classroom.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${instructions}\n\nTopik: ${topic}\nMata Pelajaran: ${subject}\nTingkat: ${gradeLevel || 'Umum'}` }] }
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

    const outputText = response.text;
    if (!outputText) {
      throw new Error('Emply response received from Gemini model');
    }

    const parsedData = JSON.parse(outputText.trim());
    return res.json({
      success: true,
      data: parsedData
    });

  } catch (error: any) {
    console.error('Error in /api/generate-lesson:', error);
    return res.status(500).json({ error: error.message || 'Fatal error generating lesson content' });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
