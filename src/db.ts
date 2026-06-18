import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let firebaseApp: ReturnType<typeof initializeApp> | null = null;
let firestoreDb: ReturnType<typeof getFirestore> | null = null;

function getDb() {
  if (!firestoreDb) {
    firebaseApp = firebaseApp || initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp);
  }
  return firestoreDb;
}

// Data types matching requirement exactly
export interface Student {
  id: string;
  nisn: string; // Keep as optional/supported
  fullName: string;
  email: string;
  whatsapp: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthPlaceDate: string; // Combined if needed, or individually below
  birthPlace: string;
  birthDate: string;
  nik: string;
  noKk: string;
  address: string;
  village: string; // Desa
  subdistrict: string; // Kecamatan
  regency: string; // Kabupaten
  fatherName: string;
  motherName: string;
  chosenProgram: string; // e.g., 'Paket C Kelas 12'
  packetStudy: string; // 'Paket A' | 'Paket B' | 'Paket C'
  studentClass: string; // 'Kelas 4'.. 'Kelas 12'
  programDuration: string; // '1 Tahun' | '2 Tahun' | '3 Tahun' | 'Paket Langsung'
  academicYear: string; // e.g., "2026/2027"
  status: 'Menunggu Verifikasi' | 'Terverifikasi' | 'Undangan Terkirim' | 'Gagal';
  registeredAt: string;
  
  // Document Upload paths / simulated links
  ktpDocUrl?: string; // Upload KTP Link
  kkDocUrl?: string; // Upload KK Link
  ijazahDocUrl?: string; // Upload Ijazah Terakhir Link
  documentUrl?: string; // Backward compatibility

  // Reference Code and marketing
  referenceCode?: string;
  infoSource?: string;

  // Google Drive folder integration
  folderId?: string;
  folderUrl?: string;
  subfolderIds?: Record<string, string>; // e.g. "01_KTP" -> actual subfolder folderId
}

export interface IjazahConfirmation {
  id: string;
  fullName: string;
  nisnOrParticipantNum: string;
  email: string;
  whatsapp: string;
  programClass: string;
  graduationYear: string;
  diplomaStatus: 'Belum diproses' | 'Siap diambil' | 'Sudah diambil' | 'Ditolak / perlu revisi';
  pickUpDate: string; // YYYY-MM-DD
  pickedUpBy: 'Siswa' | 'Wali';
  pickUpPersonName: string;
  pickUpPersonId: string; // KTP / Identity number
  notes?: string;
  submittedAt: string;
}

export interface StudentAccount {
  email: string;
  passwordHash: string; // Simulated secure hashed value
  role: 'siswa' | 'guru' | 'admin' | 'owner' | 'developer';
  fullName: string;
  registeredAt: string;
  active?: boolean;
  assignedPrograms?: string[];
  notes?: string;
}

export interface ClassroomMapping {
  programName: string;
  classroomId: string;
  classroomName: string;
}

export interface ProgramItem {
  id: string;
  name: string;
  active: boolean;
  category: 'Paket' | 'Nonpaket' | 'Keterampilan';
  notes?: string;
}

export interface ReferralCodeItem {
  code: string;
  ownerName: string;
  whatsapp: string;
  bonusType: string;
  bonusAmount: number;
  totalStudents: number;
  bonusStatus: 'belum dibayar' | 'sudah dibayar';
  paymentHistory: { amount: number; paidAt: string; note?: string }[];
}

export interface PostingHistory {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  postedAt: string;
  type: 'MATERIAL' | 'ASSIGNMENT';
}

export interface AdminLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  actionType: string;
  description: string;
}

// Simulated simple hashing for local passwords
export function hashPassword(pwd: string): string {
  let hash = 0;
  for (let i = 0; i < pwd.length; i++) {
    const char = pwd.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'sha-' + Math.abs(hash).toString(16);
}

// Initial fallback mock data for seamless first run
const INITIAL_STUDENTS: Student[] = [
  {
    id: 'stud_1',
    nisn: '0054321098',
    fullName: 'Budi Santoso',
    email: 'budi.santoso@classroom.demo',
    whatsapp: '081234567890',
    gender: 'Laki-laki',
    birthPlaceDate: 'Bogor, 12 April 2005',
    birthPlace: 'Bogor',
    birthDate: '2005-04-12',
    nik: '3201011204050001',
    noKk: '3201011212000002',
    address: 'Jl. Raya Pajajaran No. 25, Bogor',
    village: 'Baranangsiang',
    subdistrict: 'Bogor Timur',
    regency: 'Kota Bogor',
    fatherName: 'Suryadi Santoso',
    motherName: 'Lina Santoso',
    chosenProgram: 'Paket C Kelas 12',
    packetStudy: 'Paket C',
    studentClass: 'Kelas 12',
    programDuration: '3 Tahun',
    academicYear: '2026/2027',
    documentUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=200',
    status: 'Undangan Terkirim',
    registeredAt: '2026-06-15T08:30:00Z'
  },
  {
    id: 'stud_2',
    nisn: '0069876543',
    fullName: 'Siti Aminah',
    email: 'siti.aminah@classroom.demo',
    whatsapp: '085678901234',
    gender: 'Perempuan',
    birthPlaceDate: 'Sukabumi, 24 Mei 2006',
    birthPlace: 'Sukabumi',
    birthDate: '2006-05-24',
    nik: '3202022405060003',
    noKk: '3202022412000004',
    address: 'Kp. Baru RT 02/RW 04, Cisaat, Sukabumi',
    village: 'Cisaat',
    subdistrict: 'Cisaat',
    regency: 'Kabupaten Sukabumi',
    fatherName: 'Rahmat Hidayat',
    motherName: 'Siti Aminah',
    chosenProgram: 'Paket C Kelas 12',
    packetStudy: 'Paket C',
    studentClass: 'Kelas 12',
    programDuration: '3 Tahun',
    academicYear: '2026/2027',
    documentUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=200',
    status: 'Terverifikasi',
    registeredAt: '2026-06-16T10:15:00Z'
  },
  {
    id: 'stud_3',
    nisn: '0058882111',
    fullName: 'Dewi Lestari',
    email: 'dewi.lestari@classroom.demo',
    whatsapp: '089912345678',
    gender: 'Perempuan',
    birthPlaceDate: 'Jakarta, 10 Oktober 2005',
    birthPlace: 'Jakarta',
    birthDate: '2005-10-10',
    nik: '3174031010050005',
    noKk: '3174031012000006',
    address: 'Ciganjur No. 8, Jakarta Selatan',
    village: 'Ciganjur',
    subdistrict: 'Jagakarsa',
    regency: 'Jakarta Selatan',
    fatherName: 'Sudrajat Lestari',
    motherName: 'Endang Lestari',
    chosenProgram: 'Paket C Kelas 11',
    packetStudy: 'Paket C',
    studentClass: 'Kelas 11',
    programDuration: '2 Tahun',
    academicYear: '2026/2027',
    documentUrl: '',
    status: 'Menunggu Verifikasi',
    registeredAt: '2026-06-16T14:40:00Z'
  }
];

const INITIAL_IJAZAH_CONFIRMATIONS: IjazahConfirmation[] = [
  {
    id: 'ij_1',
    fullName: 'Bambang Triyono',
    nisnOrParticipantNum: '0041234567',
    email: 'bambang.tri@gmail.com',
    whatsapp: '081398765432',
    programClass: 'Paket C Kelas 12',
    graduationYear: '2025',
    diplomaStatus: 'Siap diambil',
    pickUpDate: '2026-06-25',
    pickedUpBy: 'Siswa',
    pickUpPersonName: 'Bambang Triyono',
    pickUpPersonId: '3273012345670001',
    notes: 'Akan diambil pagi hari sekitar jam 09.00 WIB.',
    submittedAt: '2026-06-16T09:00:00Z'
  }
];

const INITIAL_ACCOUNTS: StudentAccount[] = [
  {
    email: 'pkbmsrikandi.cwd.92@gmail.com',
    passwordHash: hashPassword('GantiPasswordAdmin2026!'),
    role: 'owner',
    fullName: 'Admin PKBM Srikandi',
    registeredAt: '2026-06-10T00:00:00Z',
    active: true
  },
  {
    email: 'budi.santoso@classroom.demo',
    passwordHash: hashPassword('siswa123'),
    role: 'siswa',
    fullName: 'Budi Santoso',
    registeredAt: '2026-06-15T09:00:00Z'
  }
];

const INITIAL_MAPPINGS: ClassroomMapping[] = [
  { programName: 'Agribisnis Tanaman Pangan', classroomId: 'sb_1', classroomName: 'Agribisnis Tanaman Pangan - XI' },
  { programName: 'Kewirausahaan Kreatif PKBM', classroomId: 'sb_2', classroomName: 'Kewirausahaan Kreatif PKBM - XII' }
];

const INITIAL_PROGRAMS: ProgramItem[] = [
  { id: 'prog_paket_a', name: 'Paket A', active: true, category: 'Paket' },
  { id: 'prog_paket_b', name: 'Paket B', active: true, category: 'Paket' },
  { id: 'prog_paket_c', name: 'Paket C', active: true, category: 'Paket' },
  { id: 'prog_digital_marketing', name: 'Digital Marketing', active: true, category: 'Keterampilan' },
  { id: 'prog_membaca', name: 'Pembiasaan Membaca', active: true, category: 'Keterampilan' },
  { id: 'prog_content_creator', name: 'Content Creator', active: true, category: 'Keterampilan' }
];

const INITIAL_REFERRALS: ReferralCodeItem[] = [
  {
    code: 'REFSRIKANDI',
    ownerName: 'Tim Referal PKBM Srikandi',
    whatsapp: '081234567890',
    bonusType: 'Uang Tunai',
    bonusAmount: 50000,
    totalStudents: 0,
    bonusStatus: 'belum dibayar',
    paymentHistory: []
  }
];

const INITIAL_POST_HISTORY: PostingHistory[] = [
  {
    id: 'post_1',
    courseId: 'sb_1',
    courseName: 'Agribisnis Tanaman Pangan - XI',
    title: 'Materi 1: Analisis Kualitas Tanah & pH',
    postedAt: '2026-06-15T09:00:00Z',
    type: 'MATERIAL'
  }
];

const INITIAL_LOGS: AdminLog[] = [
  {
    id: 'log_1',
    timestamp: '2026-06-16T10:00:00Z',
    adminEmail: 'pkbmsrikandi.cwd.92@gmail.com',
    actionType: 'LOGIN',
    description: 'Admin login berhasil.'
  }
];

// Helper to initialize custom storage layers
export class DatabaseManager {
  static getStudents(): Student[] {
    const val = localStorage.getItem('pkbm_students');
    if (!val) {
      localStorage.setItem('pkbm_students', JSON.stringify(INITIAL_STUDENTS));
      return INITIAL_STUDENTS;
    }
    return JSON.parse(val);
  }

  static saveStudents(list: Student[]) {
    localStorage.setItem('pkbm_students', JSON.stringify(list));
  }

  static getIjazahConfirmations(): IjazahConfirmation[] {
    const val = localStorage.getItem('pkbm_ijazah');
    if (!val) {
      localStorage.setItem('pkbm_ijazah', JSON.stringify(INITIAL_IJAZAH_CONFIRMATIONS));
      return INITIAL_IJAZAH_CONFIRMATIONS;
    }
    return JSON.parse(val);
  }

  static saveIjazahConfirmations(list: IjazahConfirmation[]) {
    localStorage.setItem('pkbm_ijazah', JSON.stringify(list));
  }

  static getAccounts(): StudentAccount[] {
    const val = localStorage.getItem('pkbm_accounts');
    if (!val) {
      localStorage.setItem('pkbm_accounts', JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    return JSON.parse(val);
  }

  static saveAccounts(list: StudentAccount[]) {
    localStorage.setItem('pkbm_accounts', JSON.stringify(list));
  }

  static getMappings(): ClassroomMapping[] {
    const val = localStorage.getItem('pkbm_mappings');
    if (!val) {
      localStorage.setItem('pkbm_mappings', JSON.stringify(INITIAL_MAPPINGS));
      return INITIAL_MAPPINGS;
    }
    return JSON.parse(val);
  }

  static saveMappings(list: ClassroomMapping[]) {
    localStorage.setItem('pkbm_mappings', JSON.stringify(list));
  }

  static getPrograms(): ProgramItem[] {
    const val = localStorage.getItem('pkbm_programs');
    if (!val) {
      localStorage.setItem('pkbm_programs', JSON.stringify(INITIAL_PROGRAMS));
      return INITIAL_PROGRAMS;
    }
    return JSON.parse(val);
  }

  static savePrograms(list: ProgramItem[]) {
    localStorage.setItem('pkbm_programs', JSON.stringify(list));
  }

  static getReferralCodes(): ReferralCodeItem[] {
    const val = localStorage.getItem('pkbm_referrals');
    if (!val) {
      localStorage.setItem('pkbm_referrals', JSON.stringify(INITIAL_REFERRALS));
      return INITIAL_REFERRALS;
    }
    return JSON.parse(val);
  }

  static saveReferralCodes(list: ReferralCodeItem[]) {
    localStorage.setItem('pkbm_referrals', JSON.stringify(list));
  }

  static getPostHistory(): PostingHistory[] {
    const val = localStorage.getItem('pkbm_post_history');
    if (!val) {
      localStorage.setItem('pkbm_post_history', JSON.stringify(INITIAL_POST_HISTORY));
      return INITIAL_POST_HISTORY;
    }
    return JSON.parse(val);
  }

  static savePostHistory(list: PostingHistory[]) {
    localStorage.setItem('pkbm_post_history', JSON.stringify(list));
  }

  static getLogs(): AdminLog[] {
    const val = localStorage.getItem('pkbm_logs');
    if (!val) {
      localStorage.setItem('pkbm_logs', JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    return JSON.parse(val);
  }

  static saveLogs(list: AdminLog[]) {
    localStorage.setItem('pkbm_logs', JSON.stringify(list));
  }

  // Cloud/Firestore write triggers (called alongside local persistence)
  static async syncToFirestore(collectionName: string, docId: string, data: any) {
    try {
      await setDoc(doc(getDb(), collectionName, docId), {
        ...data,
        syncedAt: new Date().toISOString()
      });
      console.log(`Successfully synchronized ${collectionName}/${docId} to Firebase Firestore!`);
    } catch (e) {
      console.warn(`Firestore sync warning (likely unconfigured offline mode):`, e);
    }
  }
}
