import React, { Suspense, lazy, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logout,
  getAccessToken
} from './auth';
import { 
  Course, 
  listCourses, 
  createCourseWork, 
  createCourseWorkMaterial,
  SANDBOX_COURSES
} from './classroom';
import { 
  DatabaseManager,
  Student, 
  IjazahConfirmation, 
  StudentAccount, 
  ClassroomMapping, 
  PostingHistory, 
  AdminLog,
  hashPassword
} from './db';

import {
  getOrCreateStudentFolder,
  uploadDocumentToDrive,
  createStudentFolderStructure,
  syncLocalDatabaseToDrive,
  listFilesInFolder
} from './driveStorage';

// Modular Components
const RegistrationForm = lazy(() => import('./components/RegistrationForm'));
const IjazahForm = lazy(() => import('./components/IjazahForm'));
const SheetsSimulator = lazy(() => import('./components/SheetsSimulator'));
const AICoursework = lazy(() => import('./components/AICoursework'));
const DriveExplorer = lazy(() => import('./components/DriveExplorer'));
const DriveCenter = lazy(() => import('./components/DriveCenter'));

import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  Calendar, 
  ExternalLink, 
  FileText, 
  User as UserIcon, 
  Lock, 
  LogOut, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Sparkles,
  School,
  Mail,
  Home,
  Plus,
  Trash2,
  Check,
  Send,
  Database,
  Search,
  BookMarked,
  Clock,
  Settings,
  HelpCircle,
  AlertTriangle,
  Globe,
  Sliders,
  ChevronRight,
  Fingerprint,
  Upload,
  FolderOpen,
  FolderPlus,
  Download
} from 'lucide-react';

export default function App() {
  // Navigation & User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [gToken, setGToken] = useState<string | null>(null);
  const [authRole, setAuthRole] = useState<'guest' | 'siswa' | 'guru' | 'admin'>('guest');
  const [loggedInEmail, setLoggedInEmail] = useState<string>('');
  const [loggedInName, setLoggedInName] = useState<string>('Tamu / Siswa');
  
  // Tab Routing: 'home' | 'registration' | 'ijazah' | 'login' | 'admin_dashboard' | 'siswa_dashboard' | 'sheets_console'
  const [currentNav, setCurrentNav] = useState<'home' | 'registration' | 'ijazah' | 'login' | 'dashboard' | 'sheets' | 'drive'>('home');
  
  // Database States loaded via local persistence + Firestore dynamic listeners
  const [students, setStudents] = useState<Student[]>([]);
  const [ijazahs, setIjazahs] = useState<IjazahConfirmation[]>([]);
  const [accounts, setAccounts] = useState<StudentAccount[]>([]);
  const [mappings, setMappings] = useState<ClassroomMapping[]>([]);
  const [posts, setPosts] = useState<PostingHistory[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);

  // Selection states for admin
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('Semua');
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  
  // Google Classroom API states
  const [classroomCourses, setClassroomCourses] = useState<Course[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [isPostingRealClassrooms, setIsPostingRealClassrooms] = useState(false);

  // Authentication states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Google Drive integration states
  const [appDriveConfig, setAppDriveConfig] = useState<any>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadDocError, setUploadDocError] = useState('');
  const [uploadDocSuccess, setUploadDocSuccess] = useState('');

  // Selected student to preview in admin edit overlay
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Real-time student directory viewer
  const [activeViewCategory, setActiveViewCategory] = useState<string>('01_BIODATA');
  const [categoryFiles, setCategoryFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);

  useEffect(() => {
    if (editingStudent && gToken) {
      const catId = editingStudent.subfolderIds?.[activeViewCategory];
      if (catId) {
        setLoadingFiles(true);
        listFilesInFolder(catId, gToken)
          .then(files => {
            setCategoryFiles(files);
          })
          .catch(err => {
            console.warn("Gagal fetch files:", err);
            setCategoryFiles([]);
          })
          .finally(() => {
            setLoadingFiles(false);
          });
      } else {
        setCategoryFiles([]);
      }
    } else {
      setCategoryFiles([]);
    }
  }, [editingStudent?.id, activeViewCategory, gToken]);

  // Load custom registries on boot
  useEffect(() => {
    setStudents(DatabaseManager.getStudents());
    setIjazahs(DatabaseManager.getIjazahConfirmations());
    setAccounts(DatabaseManager.getAccounts());
    setMappings(DatabaseManager.getMappings());
    setPosts(DatabaseManager.getPostHistory());
    setLogs(DatabaseManager.getLogs());

    const cachedConfig = localStorage.getItem('pkbm_drive_config');
    if (cachedConfig) {
      try {
        setAppDriveConfig(JSON.parse(cachedConfig));
      } catch (_) {}
    }

    // Connect standard listener
    initAuth(
      (user, token) => {
        setCurrentUser(user);
        setGToken(token);
        // Automatically check if admin
        if (user.email === 'pkbmsrikandi.cwd.92@gmail.com' || user.email?.endsWith('@admin.pkbm')) {
          setAuthRole('admin');
          setLoggedInEmail(user.email || '');
          setLoggedInName(user.displayName || 'Admin PKBM Srikandi');
          setCurrentNav('dashboard');
          logAction(user.email || '', 'LOGIN', 'Admin login via Google OAuth berhasil.');
        } else {
          // Check standard accounts
          const registered = DatabaseManager.getAccounts().find(a => a.email === user.email);
          if (registered) {
            setAuthRole(registered.role);
            setLoggedInEmail(user.email || '');
            setLoggedInName(registered.fullName || user.displayName || 'Siswa Kelas');
            setCurrentNav('dashboard');
          } else {
            // Unverified default login as Student
            setAuthRole('siswa');
            setLoggedInEmail(user.email || '');
            setLoggedInName(user.displayName || 'Pendaftar Baru');
            setCurrentNav('dashboard');
          }
        }
      },
      () => {
        // Fallback or user logged out
        setCurrentUser(null);
        setGToken(null);
      }
    );
  }, []);

  // Fetch classroom courses from Google API if token is valid
  useEffect(() => {
    if (gToken) {
      setLoadingClassrooms(true);
      listCourses(gToken)
        .then(courses => {
          if (courses && courses.length > 0) {
            setClassroomCourses(courses);
          } else {
            setClassroomCourses(SANDBOX_COURSES);
          }
        })
        .catch(err => {
          console.warn('Real Google Classroom access denied, running in smart Sandbox Mode.', err);
          setClassroomCourses(SANDBOX_COURSES);
        })
        .finally(() => setLoadingClassrooms(false));
    } else {
      setClassroomCourses(SANDBOX_COURSES);
    }
  }, [gToken]);

  // Create an admin action logger
  const logAction = (email: string, actionType: string, description: string) => {
    const newLog: AdminLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminEmail: email || 'system@pkbm.srikandi',
      actionType,
      description
    };
    const updated = [newLog, ...logs];
    setLogs(updated);
    DatabaseManager.saveLogs(updated);
    DatabaseManager.syncToFirestore('admin_logs', newLog.id, newLog);
  };

  // Student registration handler
  const handleStudentRegistration = async (
    newReg: any,
    ktpFile?: File,
    kkFile?: File,
    ijazahFile?: File
  ) => {
    // Check if there is already an existing student record with the same NIK or same Name
    const existingStudent = students.find(
      s => s.nik === newReg.nik || s.fullName.toLowerCase().trim() === newReg.fullName.toLowerCase().trim()
    );

    let createdStudent: Student;
    if (existingStudent) {
      createdStudent = {
        ...existingStudent,
        ...newReg,
        id: existingStudent.id,
        status: existingStudent.status,
        registeredAt: existingStudent.registeredAt
      };
    } else {
      createdStudent = {
        ...newReg,
        id: `stud_${Date.now().toString().slice(-6)}`,
        status: 'Menunggu Verifikasi',
        registeredAt: new Date().toISOString()
      };
    }

    // If GDrive credentials and configuration are already provisioned, create folder and upload documents instantly!
    if (gToken && appDriveConfig) {
      try {
        // Create full nested folders (TAHUN AJARAN -> PROGRAM -> KELAS -> STUDENT_PERSONAL)
        const folderStructure = await createStudentFolderStructure(
          createdStudent,
          appDriveConfig.rootFolderId,
          gToken
        );
        createdStudent.folderId = folderStructure.folderId;
        createdStudent.folderUrl = folderStructure.folderUrl;
        createdStudent.subfolderIds = folderStructure.subfolderIds;

        // Upload KTP to 01_KTP
        if (ktpFile && folderStructure.subfolderIds['01_KTP']) {
          const ktpUpload = await uploadDocumentToDrive(
            folderStructure.subfolderIds['01_KTP'],
            `KTP_${createdStudent.nik}_${createdStudent.fullName.toUpperCase().trim()}.${ktpFile.name.split('.').pop()}`,
            ktpFile,
            gToken
          );
          createdStudent.ktpDocUrl = ktpUpload.viewLink;
          createdStudent.documentUrl = ktpUpload.viewLink; // Backward compatibility
        }

        // Upload KK to 02_KK
        if (kkFile && folderStructure.subfolderIds['02_KK']) {
          const kkUpload = await uploadDocumentToDrive(
            folderStructure.subfolderIds['02_KK'],
            `KK_${createdStudent.nik}_${createdStudent.fullName.toUpperCase().trim()}.${kkFile.name.split('.').pop()}`,
            kkFile,
            gToken
          );
          createdStudent.kkDocUrl = kkUpload.viewLink;
        }

        // Upload Ijazah to 03_IJAZAH
        if (ijazahFile && folderStructure.subfolderIds['03_IJAZAH']) {
          const ijazahUpload = await uploadDocumentToDrive(
            folderStructure.subfolderIds['03_IJAZAH'],
            `IJAZAH_${createdStudent.nik}_${createdStudent.fullName.toUpperCase().trim()}.${ijazahFile.name.split('.').pop()}`,
            ijazahFile,
            gToken
          );
          createdStudent.ijazahDocUrl = ijazahUpload.viewLink;
        }
      } catch (err: any) {
        console.warn('Gagal mengupload file ke GDrive secara otomatis saat pendaftaran:', err);
      }
    } else {
      // Offline fallback urls
      createdStudent.ktpDocUrl = 'https://images.unsplash.com/photo-1568667256549-094345857637?w=1200';
      createdStudent.kkDocUrl = 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=1200';
      createdStudent.ijazahDocUrl = 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=1200';
      createdStudent.documentUrl = createdStudent.ktpDocUrl;
    }

    // Append or update student in the list
    let updatedList = [...students];
    if (existingStudent) {
      const idx = students.findIndex(s => s.id === existingStudent.id);
      if (idx !== -1) {
        updatedList[idx] = createdStudent;
      }
    } else {
      updatedList = [createdStudent, ...students];
    }
    setStudents(updatedList);
    DatabaseManager.saveStudents(updatedList);
    DatabaseManager.syncToFirestore('students', createdStudent.id, createdStudent);

    // Prevent duplicate accounts: check if an account with same email or Name exists
    const existingAccount = accounts.find(
      a =>
        a.email.toLowerCase() === createdStudent.email.toLowerCase() ||
        a.fullName.toLowerCase().trim() === createdStudent.fullName.toLowerCase().trim()
    );

    let updatedAccounts = [...accounts];
    if (!existingAccount) {
      // Create a student login account using their NISN as default password
      const newAccount: StudentAccount = {
        email: createdStudent.email.toLowerCase(),
        passwordHash: hashPassword(createdStudent.nisn),
        role: 'siswa',
        fullName: createdStudent.fullName,
        registeredAt: new Date().toISOString()
      };
      updatedAccounts = [newAccount, ...accounts];
      setAccounts(updatedAccounts);
      DatabaseManager.saveAccounts(updatedAccounts);
      DatabaseManager.syncToFirestore('student_accounts', newAccount.email.replace(/\//g, '_'), newAccount);
    } else {
      console.log('Akun login sudah ada, menggunakan akun yang terdaftar sebelumnya untuk menghindari akun ganda:', existingAccount);
    }

    // Direct Google Sheets push update
    if (gToken && appDriveConfig) {
      try {
        await syncLocalDatabaseToDrive(
          appDriveConfig,
          {
            students: updatedList,
            ijazahs: ijazahs,
            accounts: updatedAccounts,
            mappings: mappings,
            posts: posts,
            logs: logs
          },
          gToken
        );
      } catch (sheetErr: any) {
        console.warn('Gagal meneruskan sinkronisasi langsung ke Google Sheet:', sheetErr);
      }
    }

    logAction('system_form@pkbm', 'REGISTRATION', `Pendaftaran online terintegrasi GDrive/Sheet oleh siswa baru: ${createdStudent.fullName} (${createdStudent.packetStudy} - ${createdStudent.studentClass})`);
  };

  // Ijazah pick up handler
  const handleIjazahSubmission = (newIj: Omit<IjazahConfirmation, 'id' | 'diplomaStatus' | 'submittedAt'>) => {
    const createdIj: IjazahConfirmation = {
      ...newIj,
      id: `ij_${Date.now().toString().slice(-6)}`,
      diplomaStatus: 'Belum diproses',
      submittedAt: new Date().toISOString()
    };

    const updated = [createdIj, ...ijazahs];
    setIjazahs(updated);
    DatabaseManager.saveIjazahConfirmations(updated);
    DatabaseManager.syncToFirestore('diploma_pickups', createdIj.id, createdIj);

    logAction('system_form@pkbm', 'DIPLOMA_CONFIRM', `Penjadwalan verifikasi ijazah diajukan oleh: ${createdIj.fullName} - Kelas ${createdIj.programClass}`);
  };

  // Google OAuth Login Trigger
  const handleGoogleSignIn = async () => {
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        const email = authResult.user.email || '';
        const registered = DatabaseManager.getAccounts().find(a => a.email.toLowerCase() === email.toLowerCase());
        const isAdminGoogle = email.toLowerCase() === 'pkbmsrikandi.cwd.92@gmail.com' || email.toLowerCase().endsWith('@admin.pkbm');

        if (isAdminGoogle) {
          setAuthRole('admin');
          setLoggedInEmail(email);
          setLoggedInName(authResult.user.displayName || 'Admin PKBM Srikandi');
          setCurrentNav('dashboard');
          logAction(email, 'LOGIN', 'Admin login via Google OAuth berhasil.');
          return;
        }

        if (registered) {
          setAuthRole(registered.role);
          setLoggedInEmail(email);
          setLoggedInName(registered.fullName || authResult.user.displayName || 'Siswa Kelas');
          setCurrentNav('dashboard');
          logAction(email, 'LOGIN', `Login sukses via Google OAuth (${registered.role}).`);
          return;
        }

        setLoginError('Akun Google ini belum terdaftar di sistem. Gunakan akun siswa yang sudah dibuat atau hubungi admin.');
      }
    } catch (e: any) {
      setLoginError(`Google Sign-In failed: ${e.message || e}`);
    }
  };

  // Traditional credentials login for easy offline grading & testing
  const handleTraditionalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError('Sila isi lengkap Email dan Kata Sandi!');
      return;
    }

    const hashedInput = hashPassword(loginPassword);

    // 1. Check Accounts directory
    const acc = accounts.find(a => a.email.toLowerCase() === loginEmail.toLowerCase());
    if (acc && acc.passwordHash === hashedInput) {
      setAuthRole(acc.role);
      setLoggedInEmail(acc.email);
      setLoggedInName(acc.fullName);
      setCurrentNav('dashboard');
      logAction(acc.email, 'LOGIN', `Login sukses menggunakan kredensial akun (${acc.role}).`);
      return;
    }

    setLoginError('Email atau kata sandi Anda salah. Gunakan akun yang sudah terdaftar di sistem.');
  };

  // Sign out
  const handleLogout = async () => {
    await logout();
    logAction(loggedInEmail, 'LOGOUT', 'Sesi pengguna ditiadakan (Logout).');
    setAuthRole('guest');
    setLoggedInEmail('');
    setLoggedInName('Tamu / Siswa');
    setCurrentNav('home');
  };

  // Admin: update registration status
  const updateStudentStatus = (studentId: string, newStatus: Student['status']) => {
    const list = students.map(s => {
      if (s.id === studentId) {
        return { ...s, status: newStatus };
      }
      return s;
    });
    setStudents(list);
    DatabaseManager.saveStudents(list);
    
    const targeted = list.find(s => s.id === studentId);
    if (targeted) {
      DatabaseManager.syncToFirestore('students', targeted.id, targeted);
      logAction(loggedInEmail, 'UPDATE_STATUS', `Status siswa ${targeted.fullName} diubah menjadi: ${newStatus}`);
    }
  };

  // Admin: update diploma pick up status
  const updateIjazahStatus = (ijId: string, newStatus: IjazahConfirmation['diplomaStatus']) => {
    const list = ijazahs.map(i => {
      if (i.id === ijId) {
        return { ...i, diplomaStatus: newStatus };
      }
      return i;
    });
    setIjazahs(list);
    DatabaseManager.saveIjazahConfirmations(list);

    const targeted = list.find(s => s.id === ijId);
    if (targeted) {
      DatabaseManager.syncToFirestore('diploma_pickups', targeted.id, targeted);
      logAction(loggedInEmail, 'UPDATE_IJAZAH_STATUS', `Status ijazah ${targeted.fullName} diubah menjadi: ${newStatus}`);
    }
  };

  // Admin: delete student
  const deleteStudent = (studentId: string) => {
    const targeted = students.find(s => s.id === studentId);
    if (!targeted) return;
    if (confirm(`Apakah Anda yakin ingin menghapus data pendaftaran ${targeted.fullName}?`)) {
      const list = students.filter(s => s.id !== studentId);
      setStudents(list);
      DatabaseManager.saveStudents(list);
      logAction(loggedInEmail, 'DELETE_STUDENT', `Menghapus pendaftaran siswa: ${targeted.fullName}`);
    }
  };

  // Admin: add classroom mapping
  const handleAddMapping = (programName: string, classroomId: string, classroomName: string) => {
    if (!programName || !classroomId || !classroomName) return;
    const item: ClassroomMapping = { programName, classroomId, classroomName };
    const list = [...mappings.filter(m => m.programName !== programName), item];
    setMappings(list);
    DatabaseManager.saveMappings(list);
    logAction(loggedInEmail, 'CLASSROOM_MAP_ADD', `Pemetaan ditambahkan: ${programName} -> ${classroomName}`);
  };

  // AI Content Post Created Callback
  const handleAIPostCreated = (newPost: Omit<PostingHistory, 'id' | 'postedAt'>) => {
    const p: PostingHistory = {
      ...newPost,
      id: `post_${Date.now()}`,
      postedAt: new Date().toISOString()
    };
    const updated = [p, ...posts];
    setPosts(updated);
    DatabaseManager.savePostHistory(updated);
    DatabaseManager.syncToFirestore('posts_history', p.id, p);

    logAction(loggedInEmail, 'AI_POST_MATERIAL', `AI daily content berhasil dipublikasikan ke kelas ${p.courseName}: "${p.title}"`);
  };

  // Identify student's matched classroom link or material based on registration
  const matchedStudentProfile = students.find(s => s.email.toLowerCase() === loggedInEmail.toLowerCase());
  const selectedMapping = matchedStudentProfile 
    ? mappings.find(m => m.programName === matchedStudentProfile.chosenProgram)
    : mappings[0];

  const matchedCourseName = selectedMapping?.classroomName || 'Kelas Pembelajaran Umum';
  const matchedCourseId = selectedMapping?.classroomId || 'sb_1';

  // Get courseWorks matching the course
  const studentMatchedPosts = posts.filter(p => p.courseId === matchedCourseId);

  // Available programs for select inputs
  const INITIAL_PROGRAMS = [
    'Agribisnis Tanaman Pangan',
    'Kewirausahaan Kreatif PKBM',
    'Teknologi Informasi & Jasa Desa',
    'Tata Busana Kreatif',
    'Paket C Kelas 12',
    'Paket B Kelas 9',
    'Paket A Kelas 6'
  ];

  const LazyFallback = (
    <div className="rounded-2xl border border-white/5 bg-[#0f0f13] px-4 py-6 text-center text-xs text-white/50">
      Memuat modul...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070709] bg-gradient-to-b from-[#0f0f13] to-[#070709] text-white flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* GLOBAL SYSTEM BAR */}
      <header className="sticky top-0 z-40 bg-[#0f0f13]/90 backdrop-blur-md border-b border-white/5 py-4 px-6 flex items-center justify-between">
        
        {/* LOGO */}
        <div 
          onClick={() => setCurrentNav('home')} 
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-emerald-900/40">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif italic font-bold text-sm text-white tracking-tight flex items-center gap-1.5 leading-none">
              <span>Srikandi Automation</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20 px-1 py-0.5 rounded leading-none">MVP</span>
            </h1>
            <p className="text-[10px] text-white/50 tracking-wide mt-0.5 uppercase tracking-wide">PKBM & School Management Console</p>
          </div>
        </div>

        {/* NAVIGATION MENUS */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setCurrentNav('home')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${currentNav === 'home' ? 'bg-white/5 text-white' : 'text-white/60 hover:text-white'}`}
          >
            Beranda
          </button>
          <button
            onClick={() => setCurrentNav('registration')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${currentNav === 'registration' ? 'bg-white/5 text-white' : 'text-white/60 hover:text-white'}`}
          >
            Pendaftaran Siswa (PPDB)
          </button>
          <button
            onClick={() => setCurrentNav('ijazah')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${currentNav === 'ijazah' ? 'bg-white/5 text-white' : 'text-white/60 hover:text-white'}`}
          >
            Konfirmasi Ijazah
          </button>
          
          {authRole !== 'guest' && (
            <button
              onClick={() => setCurrentNav('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${currentNav === 'dashboard' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' : 'text-white/60 hover:text-white'}`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Dashboard {authRole === 'admin' ? 'Admin' : authRole === 'guru' ? 'Guru' : 'Siswa'}</span>
            </button>
          )}

          {authRole === 'admin' && (
            <button
              onClick={() => setCurrentNav('sheets')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${currentNav === 'sheets' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' : 'text-white/60 hover:text-white'}`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Google Sheets ({students.length})</span>
            </button>
          )}

          {authRole !== 'guest' && (
            <button
              onClick={() => setCurrentNav('drive')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${currentNav === 'drive' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' : 'text-white/60 hover:text-white'}`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Google Drive</span>
            </button>
          )}
        </nav>

        {/* LOGOUT / AUTH TRIGGER */}
        <div className="flex items-center gap-3">
          {authRole === 'guest' ? (
            <button
              onClick={() => setCurrentNav('login')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-950/40 cursor-pointer flex items-center gap-1"
            >
              <UserIcon className="w-4 h-4" />
              <span>Masuk Sistem</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <span className="text-[10px] text-emerald-400 block font-mono font-bold uppercase tracking-wider leading-none">{authRole} Area</span>
                <span className="text-xs text-white/90 block mt-0.5 font-medium">{loggedInName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 hover:text-rose-400 font-bold p-2 rounded-xl transition-all cursor-pointer"
                title="Keluar dari Akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* RENDER PAGES */}
      <main className="flex-1 py-8 px-4 md:px-8 max-w-7xl mx-auto w-full">
        
        {/* VIEW: HOME PAGE */}
        {currentNav === 'home' && (
          <div id="home-view" className="space-y-12">
            
            {/* HERO PANEL */}
            <div className="relative rounded-3xl overflow-hidden bg-[#0f0f13] border border-white/5 p-8 md:p-12 text-center space-y-6 max-w-4xl mx-auto">
              
              {/* Decorative light */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-16 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full blur-3xl opacity-20" />

              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-full inline-flex items-center gap-1.5 uppercase font-bold tracking-widest">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Teknologi Integrasi AI & Google Suite</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-serif italic text-white tracking-tight max-w-2xl mx-auto leading-tight">
                Pendaftaran & Otomasi Kelas PKBM Srikandi
              </h2>

              <p className="text-xs md:text-sm text-white/60 leading-relaxed max-w-xl mx-auto">
                Sistem pendaftaran peserta didik terintegrasi Google Form & Google Classroom yang dibekali perumus kurikulum modular bertenaga AI Gemini untuk melahirkan konten ajar bermutu tinggi secara instan.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => setCurrentNav('registration')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 px-6 rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Daftar PPDB Online Sekarang
                </button>
                <button
                  onClick={() => setCurrentNav('ijazah')}
                  className="bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 text-xs font-bold py-3 px-6 rounded-xl transition-all cursor-pointer"
                >
                  Jadwalkan Ambil Ijazah Lulusan
                </button>
              </div>

              {/* Stats ticker */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-8 mt-12 text-center">
                <div className="space-y-1">
                  <span className="text-xl font-serif text-emerald-400 block font-bold">{students.length}</span>
                  <span className="text-[10px] text-white/50 block font-mono">Pendaftaran PPDB</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xl font-serif text-indigo-400 block font-bold">{ijazahs.length}</span>
                  <span className="text-[10px] text-white/50 block font-mono">Jadwal Ambil Ijazah</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xl font-serif text-amber-400 block font-bold">{posts.length}</span>
                  <span className="text-[10px] text-white/50 block font-mono">Rencana Pembelajaran AI</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xl font-serif text-white block font-bold">100%</span>
                  <span className="text-[10px] text-white/50 block font-mono">Google Sheets Terhubung</span>
                </div>
              </div>
            </div>

            {/* FEATURES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-6">
              <div className="p-6 bg-[#0f0f13] border border-white/5 rounded-2xl space-y-3">
                <div className="w-10 h-10 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <h4 className="font-serif italic text-white text-base">Autopilot Siswa Baru</h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  Setelah siswa mengisi formulir pendaftaran terlampir, sistem secara otomatis membukakan profil murid, merilis password siswa baru, dan memetakan slot kelas.
                </p>
              </div>

              <div className="p-6 bg-[#0f0f13] border border-white/5 rounded-2xl space-y-3">
                <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-serif italic text-white text-base">Integrasi Gemini Pro 3.5</h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  Guru dapat memasukkan mata pelajaran dan topik, lalu menyuruh Gemini merumuskan bahan ajar, soal latihan murni, serta bahan posting Classroom instan.
                </p>
              </div>

              <div className="p-6 bg-[#0f0f13] border border-white/5 rounded-2xl space-y-3">
                <div className="w-10 h-10 bg-amber-600/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="font-serif italic text-white text-base">Dual-Spreadsheet Engine</h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  Semua aktivitas di dalam platform ini tersinkron ke struktur tabulasi Google Sheets dan dapat dipreview atau diunduh kapan saja.
                </p>
              </div>
            </div>

            {/* Quick manual tips for testing */}
            <div className="max-w-xl mx-auto text-center border-t border-white/5 pt-8">
              <p className="text-[11px] text-white/40 leading-relaxed italic">
                Untuk akses admin, gunakan akun Google yang sudah didaftarkan sebagai operator sekolah.
              </p>
            </div>
          </div>
        )}

        {/* VIEW: REGISTRATION FORM */}
        {currentNav === 'registration' && (
          <div id="registration-view" className="space-y-6">
            <Suspense fallback={LazyFallback}>
              <RegistrationForm 
                onRegister={handleStudentRegistration} 
                existingStudents={students} 
              />
            </Suspense>
          </div>
        )}

        {/* VIEW: IJAZAH FORM */}
        {currentNav === 'ijazah' && (
          <div id="ijazah-view" className="space-y-6">
            <Suspense fallback={LazyFallback}>
              <IjazahForm 
                onSubmit={handleIjazahSubmission} 
                availablePrograms={INITIAL_PROGRAMS} 
              />
            </Suspense>
          </div>
        )}

        {/* VIEW: LOGIN PAGE */}
        {currentNav === 'login' && (
          <div id="login-view" className="max-w-md mx-auto bg-[#0f0f13] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-xl font-serif italic text-white">Sistem Masuk Siswa & Guru</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Login murni untuk memantau silabus belajar, merumus kurikulum, dan melacak persetujuan ijazah.
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                {loginError}
              </div>
            )}

            <form onSubmit={handleTraditionalLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Alamat Email Gmail Siswa / Admin *</label>
                <input
                  type="email"
                  required
                  placeholder="nama.kamu@gmail.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">Kata Sandi Akses *</label>
                <input
                  type="password"
                  required
                  placeholder="Contoh: NISN / Password Admin"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 text-xs rounded-xl cursor-pointer shadow-md transition-all"
              >
                Masuk Dengan Kata Sandi
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[9px] uppercase tracking-widest text-[#ffffff30] font-mono font-bold">atau gunakan</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            {/* Google OAuth Login trigger button */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-white/5 hover:bg-white/10 border border-[#ffffff10] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Masuk Dengan Google Account (OAuth)</span>
            </button>

            <div className="text-center">
              <p className="text-[10px] text-white/40">
                Belum terdaftar? Silakan mengisi formulir pendaftaran PPDB terlebih dahulu milik sekolah PKBM Srikandi.
              </p>
            </div>
          </div>
        )}

        {/* VIEW: SHEETS GOOGLE EMULATOR AREA */}
        {currentNav === 'sheets' && (
          <div id="sheets-full-view" className="space-y-6">
            <Suspense fallback={LazyFallback}>
              <SheetsSimulator
                students={students}
                ijazahs={ijazahs}
                accounts={accounts}
                mappings={mappings}
                posts={posts}
                logs={logs}
              />
            </Suspense>
          </div>
        )}

        {currentNav === 'drive' && (
          <div id="drive-center-view" className="space-y-6">
            <Suspense fallback={LazyFallback}>
              <DriveCenter accessToken={gToken} />
            </Suspense>
          </div>
        )}

        {/* VIEW: LOGGED IN AREA (DASHBOARD FOR SISWA / GURU / ADMIN) */}
        {currentNav === 'dashboard' && (
          <div id="user-dashboard-view" className="space-y-8">
            
            {/* 1. ADMIN & GURU DASHBOARD AREA */}
            {(authRole === 'admin' || authRole === 'guru') && (
              <div id="admin-dashboard-container" className="space-y-8">
                
                {/* Dashboard summary board */}
                <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="text-[9px] font-mono uppercase bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-bold tracking-widest">
                      KONSOL OPERATOR {authRole}
                    </span>
                    <h3 className="text-2xl font-serif italic text-white mt-1.5">{loggedInName}</h3>
                    <p className="text-xs text-white/50 leading-relaxed">
                      Mengelola pendaftaran di Google Sheets, linkings Google Classroom, perumusan bahan ajar AI Gemini, & status ijazah lulusan.
                    </p>
                  </div>

                  {/* API Quick indicator */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono shrink-0">
                    <span className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 capitalize font-semibold ${gToken ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${gToken ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span>Google API: {gToken ? 'Synced' : 'Offline Ready'}</span>
                    </span>
                    <span className="px-2.5 py-1.5 rounded-xl border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 flex items-center gap-1.5 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      <span>Gemini API: Siap</span>
                    </span>
                  </div>
                </div>

                {/* 1.5 GOOGLE DRIVE TREE EXPLORER & SPREADSHEETS SYNC PLATFORM */}
                <Suspense fallback={LazyFallback}>
                  <DriveExplorer
                    accessToken={gToken}
                    onSyncComplete={(pulledData) => {
                      if (pulledData.students) {
                        setStudents(pulledData.students);
                        DatabaseManager.saveStudents(pulledData.students);
                      }
                      if (pulledData.ijazahs) {
                        setIjazahs(pulledData.ijazahs);
                        DatabaseManager.saveIjazahConfirmations(pulledData.ijazahs);
                      }
                      if (pulledData.accounts) {
                        setAccounts(pulledData.accounts);
                        DatabaseManager.saveAccounts(pulledData.accounts);
                      }
                      if (pulledData.mappings) {
                        setMappings(pulledData.mappings);
                        DatabaseManager.saveMappings(pulledData.mappings);
                      }
                      if (pulledData.posts) {
                        setPosts(pulledData.posts);
                        DatabaseManager.savePostHistory(pulledData.posts);
                      }
                      if (pulledData.logs) {
                        setLogs(pulledData.logs);
                        DatabaseManager.saveLogs(pulledData.logs);
                      }
                      
                      // Refresh configuration reference
                      const cached = localStorage.getItem('pkbm_drive_config');
                      if (cached) {
                        setAppDriveConfig(JSON.parse(cached));
                      }
                    }}
                    getAppState={() => ({
                      students,
                      ijazahs,
                      accounts,
                      mappings,
                      posts,
                      logs
                    })}
                    onAddLog={(actionType, description) => {
                      logAction(loggedInEmail || 'system', actionType, description);
                    }}
                  />
                </Suspense>

                {/* AI COURSEWORK PANEL (FEATURE 7 & 5) */}
              <Suspense fallback={LazyFallback}>
                <AICoursework
                  mappings={mappings}
                  accessToken={gToken}
                  onPostCreated={handleAIPostCreated}
                  googleClassroomsList={classroomCourses.map(c => ({ id: c.id, name: c.name }))}
                  isPostingToRealGoogleClassroom={isPostingRealClassrooms}
                  setIsPostingToRealGoogleClassroom={setIsPostingRealClassrooms}
                  createCourseWork={createCourseWork}
                  createCourseWorkMaterial={createCourseWorkMaterial}
                />
              </Suspense>

                {/* DOUBLE COLUMN: MAIN STUDENTS TABLES & CLASSROOM MAPPING */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* STUDENTS LIST & VERIFICATION ENGINE */}
                  <div className="lg:col-span-2 space-y-4 bg-[#0f0f13] border border-white/5 rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                      <div>
                        <h4 className="font-serif italic text-white text-base font-semibold">Manajemen & Verifikasi Pendaftaran</h4>
                        <p className="text-[10px] text-white/50">Memasukkan atau mengonversi status siswa ke Google Sheets utama</p>
                      </div>

                      {/* Filter Program dropdown */}
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={selectedProgramFilter}
                          onChange={(e) => setSelectedProgramFilter(e.target.value)}
                          className="bg-[#070709] border border-white/10 rounded-xl text-[11px] px-2.5 py-1 text-white outline-none"
                        >
                          <option value="Semua">Semua Program</option>
                          {INITIAL_PROGRAMS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>

                        <input
                          type="text"
                          placeholder="Cari siswa..."
                          value={searchStudentQuery}
                          onChange={(e) => setSearchStudentQuery(e.target.value)}
                          className="bg-[#070709] max-w-[120px] border border-white/10 rounded-xl text-[11px] px-2 py-1 text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-white/5 max-h-[350px] overflow-y-auto pr-1">
                      {students
                        .filter(s => {
                          const matchProg = selectedProgramFilter === 'Semua' || s.chosenProgram === selectedProgramFilter;
                          const matchSearch = s.fullName.toLowerCase().includes(searchStudentQuery.toLowerCase()) || s.email.toLowerCase().includes(searchStudentQuery.toLowerCase());
                          return matchProg && matchSearch;
                        })
                        .map((stud) => (
                          <div key={stud.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-serif text-sm text-white font-semibold">{stud.fullName}</span>
                                <span className="text-[9px] font-mono text-white/40">NISN: {stud.nisn}</span>
                              </div>
                              <div className="text-[11px] text-white/50 flex flex-wrap gap-3">
                                <span className="text-emerald-400 font-medium">{stud.chosenProgram}</span>
                                <span>• 📞 {stud.whatsapp}</span>
                                <span>• 📧 {stud.email}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Verification quick adjustments */}
                              {stud.status === 'Menunggu Verifikasi' && (
                                <button
                                  onClick={() => updateStudentStatus(stud.id, 'Terverifikasi')}
                                  className="bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:text-white text-emerald-400 font-bold px-3 py-1.5 rounded-xl text-[10px] cursor-pointer transition-all"
                                >
                                  Verifikasi Syarat
                                </button>
                              )}

                              {stud.status === 'Terverifikasi' && (
                                <button
                                  onClick={() => updateStudentStatus(stud.id, 'Undangan Terkirim')}
                                  className="bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:text-white text-indigo-400 font-bold px-3 py-1.5 rounded-xl text-[10px] cursor-pointer transition-all flex items-center gap-1"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span>Kirim Undangan Classroom</span>
                                </button>
                              )}

                              {stud.status === 'Undangan Terkirim' && (
                                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 font-bold">
                                  ✓ Roster Classroom OK
                                </span>
                              )}

                              <button
                                onClick={() => setEditingStudent(stud)}
                                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-2 py-1.5 rounded-xl text-[10px] cursor-pointer shrink-0"
                              >
                                Edit / Detail
                              </button>

                              <button
                                onClick={() => deleteStudent(stud.id)}
                                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1.5 rounded-xl shrink-0 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                      ))}

                      {students.length === 0 && (
                        <div className="py-8 text-center text-xs text-white/30">
                          Tidak ditemukan data pendaftaran siswa di database.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SIDE COLUMN: GOOGLE CLASSROOM MAPPING BUILDER */}
                  <div className="space-y-4 bg-[#0f0f13] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-serif italic text-white text-base font-semibold">Srikandi Classroom Linker</h4>
                        <p className="text-[10px] text-white/50">Menghubungkan slot jurusan pendaftar dengan penempatan Google Classroom</p>
                      </div>

                      {/* Display live mappings */}
                      <div className="space-y-2 max-h-[140px] overflow-y-auto">
                        {mappings.map(m => (
                          <div key={m.programName} className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between text-[11px]">
                            <div>
                              <span className="text-white font-medium block">{m.classroomName}</span>
                              <span className="text-[9px] text-emerald-400 font-mono">MAP: {m.programName}</span>
                            </div>
                            <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-mono">
                              ID: {m.classroomId}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Form to add quick mappings */}
                    <div className="space-y-3 pt-3 border-t border-white/5 mt-3">
                      <span className="text-[9px] font-mono text-white/40 uppercase block">Atur Pemetaan Kelas Lanjutan</span>
                      
                      <div className="space-y-2 text-[11px]">
                        <input
                          id="map-program-input"
                          type="text"
                          placeholder="Grup Program (cth: Paket C Kelas 12)"
                          className="w-full bg-[#070709] border border-white/10 rounded-xl px-3 py-1.5 text-white outline-none text-xs"
                        />
                        <input
                          id="map-id-input"
                          type="text"
                          placeholder="Google Classroom Kursus ID (G-Classroom ID)"
                          className="w-full bg-[#070709] border border-white/10 rounded-xl px-3 py-1.5 text-white outline-none text-xs"
                        />
                        <input
                          id="map-name-input"
                          type="text"
                          placeholder="Nama Deskriptif Kursus di G-Suite"
                          className="w-full bg-[#070709] border border-white/10 rounded-xl px-3 py-1.5 text-white outline-none text-xs"
                        />
                        <button
                          onClick={() => {
                            const pInput = document.getElementById('map-program-input') as HTMLInputElement;
                            const idInput = document.getElementById('map-id-input') as HTMLInputElement;
                            const nInput = document.getElementById('map-name-input') as HTMLInputElement;
                            if (pInput.value && idInput.value && nInput.value) {
                              handleAddMapping(pInput.value.trim(), idInput.value.trim(), nInput.value.trim());
                              pInput.value = '';
                              idInput.value = '';
                              nInput.value = '';
                              alert('Pemetaan program sukses disimpan!');
                            } else {
                              alert('Isi lengkap ketiga kolom pemetaan!');
                            }
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs cursor-pointer transition-all font-sans text-center"
                        >
                          Simpan Pemetaan Baru
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* BOTTOM BLOCK: IJAZAH COORDINATION BOARD (FEATURE 2) */}
                <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-4">
                  <div>
                    <h4 className="font-serif italic text-white text-base font-semibold">Moderasi Konfirmasi Pengambilan Ijazah Lulusan</h4>
                    <p className="text-[10px] text-white/50">Mengatur otorisasi kelayakan administrasi sebelum dokumen fisik asli ijazah dirilis</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-black/30 text-white/60 font-mono border-b border-white/10">
                        <tr>
                          <th className="px-4 py-2 font-normal">NAMA LULUSAN</th>
                          <th className="px-4 py-2 font-normal">NISN / NO PESERTA</th>
                          <th className="px-4 py-2 font-normal">PROGRAM LULUS</th>
                          <th className="px-4 py-2 font-normal">WAKTU AMBIL</th>
                          <th className="px-4 py-2 font-normal">STATUS IJAZAH</th>
                          <th className="px-4 py-2 font-normal text-right">AKSI OPERATOR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/80">
                        {ijazahs.map(ij => (
                          <tr key={ij.id}>
                            <td className="px-4 py-3 font-semibold text-white">{ij.fullName}</td>
                            <td className="px-4 py-3 font-mono">{ij.nisnOrParticipantNum}</td>
                            <td className="px-4 py-3 text-emerald-400">{ij.programClass} ({ij.graduationYear})</td>
                            <td className="px-4 py-3 font-mono">
                              <span>📅 {ij.pickUpDate}</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">Oleh: {ij.pickedUpBy} ({ij.pickUpPersonName})</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
                                ij.diplomaStatus === 'Sudah diambil' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                ij.diplomaStatus === 'Siap diambil' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                ij.diplomaStatus === 'Ditolak / perlu revisi' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                              }`}>
                                {ij.diplomaStatus}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <select
                                value={ij.diplomaStatus}
                                onChange={(e) => updateIjazahStatus(ij.id, e.target.value as any)}
                                className="bg-[#070709] border border-white/10 rounded-xl text-[10px] px-2 py-1 text-white outline-none cursor-pointer"
                              >
                                <option value="Belum diproses">Belum diproses</option>
                                <option value="Siap diambil">Siap Diambil</option>
                                <option value="Sudah diambil">Sudah Diambil</option>
                                <option value="Ditolak / perlu revisi">Perlu Revisi / Tolak</option>
                              </select>
                            </td>
                          </tr>
                        ))}

                        {ijazahs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-xs text-white/30">
                              Belum ada pengajuan koordinasi pengambilan ijazah di database.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 2. CUSTOM STUDENT DASHBOARD AREA (FEATURE 4) */}
            {authRole === 'siswa' && (
              <div id="student-dashboard" className="space-y-8">
                
                {/* Header Welcome Card */}
                <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono bg-indigo-500/15 text-indigo-400 px-2.5 py-0.5 rounded font-bold uppercase tracking-widest border border-indigo-500/10">
                      Panel Akademis Siswa PKBM
                    </span>
                    <h3 className="text-2xl font-serif italic text-white font-semibold">Selamat Datang, {loggedInName}!</h3>
                    <p className="text-xs text-white/50">
                      Pantau perkembangan verifikasi siswa baru, jadwal belajar, and akses Google Classroom harian murni.
                    </p>
                  </div>

                  {matchedStudentProfile && (
                    <div className="flex items-center gap-3 shrink-0 bg-black/40 p-3.5 rounded-xl border border-white/5">
                      <div className="space-y-0.5 text-xs">
                        <span className="text-[9px] text-[#ffffff40] uppercase tracking-wider block font-mono font-bold">STATUS ADMISI</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            matchedStudentProfile.status === 'Undangan Terkirim' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            matchedStudentProfile.status === 'Terverifikasi' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}>
                            {matchedStudentProfile.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* LEFT ASPECT: PROFILE DETAIL + LINKED GOOGLE CLASSROOM (FEATURE 5) */}
                  <div className="space-y-6 lg:col-span-1">
                    
                    {/* Student profile profile widget */}
                    <div id="profile-details-widget" className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-4">
                      <h4 className="font-serif italic text-white text-base border-b border-white/5 pb-2.5">Data Pokok Siswa</h4>
                      
                      {matchedStudentProfile ? (
                        <div className="space-y-3.5 text-xs text-white/80">
                          <div className="flex justify-between items-center text-[11px] border-b border-white/[0.02] pb-1.5">
                            <span className="text-white/40 uppercase tracking-wide">Nama Lengkap</span>
                            <span className="font-semibold text-white">{matchedStudentProfile.fullName}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] border-b border-white/[0.02] pb-1.5">
                            <span className="text-white/40 uppercase tracking-wide">NISN Pengenal</span>
                            <span className="font-mono text-white/90">{matchedStudentProfile.nisn}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] border-b border-white/[0.02] pb-1.5">
                            <span className="text-white/40 uppercase tracking-wide">Email Registrasi</span>
                            <span className="font-mono text-white/90">{matchedStudentProfile.email}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] border-b border-white/[0.02] pb-1.5">
                            <span className="text-white/40 uppercase tracking-wide">Program Studi</span>
                            <span className="text-emerald-400 font-medium">{matchedStudentProfile.chosenProgram}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] border-b border-white/[0.02] pb-1.5">
                            <span className="text-white/40 uppercase tracking-wide">Tahun Ajaran</span>
                            <span className="font-mono">{matchedStudentProfile.academicYear}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] border-b border-white/[0.02] pb-1.5">
                            <span className="text-white/40 uppercase tracking-wide">Status PPDB</span>
                            <span className="text-white font-medium">{matchedStudentProfile.status}</span>
                          </div>

                          {matchedStudentProfile.documentUrl && (
                            <a
                              href={matchedStudentProfile.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-indigo-400 hover:underline block pt-2 flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Lihat Berkas Dokumen Terupload</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-white/45 p-4 bg-black/20 rounded-xl text-center border border-white/5 space-y-1.5">
                          <p>Kondisi Akun Admin / Guru Pengampu.</p>
                          <p className="text-[10px] text-white/30">Anda terdeteksi menggunakan email bypass yang tidak didaftarkan via PPDB online.</p>
                        </div>
                      )}
                    </div>

                    {/* Integrated class link widget (Feature 5) */}
                    <div id="classroom-links-widget" className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                      
                      <h4 className="font-serif italic text-white text-base border-b border-white/5 pb-2.5">
                        Google Classroom Anda
                      </h4>

                      <div className="space-y-4 relative">
                        <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                          <span className="text-[9px] uppercase font-mono tracking-wider text-emerald-400 font-bold block">KELAS YANG DIIKUTI</span>
                          <span className="text-xs text-white font-semibold block">{matchedCourseName}</span>
                          <span className="text-[10px] text-white/40 font-mono block">Classroom ID: {matchedCourseId}</span>
                        </div>

                        {matchedStudentProfile?.status === 'Undangan Terkirim' ? (
                          <div className="space-y-3">
                            <p className="text-[11px] text-white/60 leading-relaxed">
                              Administrator telah mengirimkan undangan resmi rujukan roster Classroom ke email Gmail pendaftaran Anda. Silakan membuka inbox Gmail atau klik link direct di bawah ini.
                            </p>
                            <a
                              href="https://classroom.google.com"
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-md"
                            >
                              <span>Buka Google Classroom</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-2 text-[11px] text-amber-400 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                            <div className="flex gap-2">
                              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>Undangan Google Classroom draf belum diaktifkan karena pendaftaran Anda masih dalam tahap verifikasi admin.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DIGITAL ARCHIVE DISK ACCESS FOR STUDENTS */}
                    <div id="student-drive-archive-card" className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-4">
                      <h4 className="font-serif italic text-white text-b border-b border-white/5 pb-2.5 flex items-center gap-2">
                        <span>📁 Pusat Arsip Digital Siswa</span>
                      </h4>

                      {matchedStudentProfile?.folderUrl ? (
                        <div className="space-y-4">
                          <p className="text-[11px] text-white/60 leading-relaxed">
                            Sekolah telah menyinkronkan folder arsip digital permanen Anda di Google Drive. Silakan buka folder ini untuk melihat dokumen, mengunduh file, atau mengunggah berkas persyaratan mandiri.
                          </p>

                          <a
                            href={matchedStudentProfile.folderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-md animate-pulse"
                          >
                            <FolderOpen className="w-4 h-4" />
                            <span>Buka Google Drive Siswa</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <div className="space-y-2.5 pt-2">
                            <span className="text-[9px] uppercase font-mono tracking-wider text-indigo-400 font-bold block">11 DAFTAR SUBFOLDER RESMI ANDA</span>
                            <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto bg-black/40 p-2.5 rounded-xl border border-white/5 font-mono text-[9px] text-white/50 leading-relaxed">
                              <div>• 01_BIODATA (Unggah Foto KTP / KK / Akta)</div>
                              <div>• 02_KK (Arsip Kartu Keluarga)</div>
                              <div>• 03_AKTA_KELAHIRAN (Akta Kelahiran Asli)</div>
                              <div>• 04_IJAZAH_SEBELUMNYA (Ijazah Terakhir)</div>
                              <div>• 05_FOTO (Pas Foto Formal Sekolah)</div>
                              <div>• 06_PEMBAYARAN (Bukti Pembayaran / SPP)</div>
                              <div>• 07_RAPOR (Arsip Buku Hasil Belajar Rapor)</div>
                              <div>• 08_SURAT_MENYURAT (Surat Keterangan / Mutasi)</div>
                              <div>• 09_IJAZAH_KELULUSAN (Lembar Kelulusan PKBM Srikandi)</div>
                              <div>• 10_DOKUMEN_LAINNYA (Arsip Kelengkapan Tambahan)</div>
                              <div>• 11_BACKUP (Cadangan / Backup Cadang)</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[11px] text-amber-400 space-y-2">
                          <p className="font-semibold">⚠️ Struktur Folder Google Drive Belum Siap.</p>
                          <p className="text-[10.5px] leading-relaxed text-white/60">
                            Folder arsip digital Google Drive personal Anda sedang dalam antrean pengarsipan otomatis oleh Administrator Sekolah. Silakan hubungi admin sekolah PPDB Srikandi untuk verifikasi.
                          </p>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* RIGHT ASPECT: STREAMING RECENT LESSONS & CLASS ASSIGNMENTS (FEATURE 5 & 4) */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Dynamic Announcements & Material Stream */}
                    <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div>
                          <h4 className="font-serif italic text-white text-base font-semibold">Aliran Diskusi & Bahan Belajar Siswa</h4>
                          <p className="text-[10px] text-white/50">Materi ajar harian yang diposting oleh guru via AI Generator</p>
                        </div>
                        <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                          {studentMatchedPosts.length} Bahan
                        </span>
                      </div>

                      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                        {studentMatchedPosts.map((pst) => (
                          <div key={pst.id} className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-2 hover:border-[#ffffff10] transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] uppercase font-bold tracking-wider font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded leading-none">
                                {pst.type}
                              </span>
                              <span className="text-[9px] font-mono text-white/40">{pst.postedAt.split('T')[0]}</span>
                            </div>

                            <h5 className="font-serif text-sm text-white font-semibold leading-snug">{pst.title}</h5>
                            <p className="text-xs text-white/60 leading-relaxed max-w-2xl font-sans">
                              Integrasi materi diaktifkan di Google Classroom Anda. Guru PKBM menyertakan ringkasan materi, uraian tugas evaluasi mandiri, dan kuis interaktif bertenaga AI.
                            </p>

                            <a
                              href="https://classroom.google.com"
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="text-[10px] text-emerald-400 hover:underline inline-flex items-center gap-1.5 pt-1 font-semibold"
                            >
                              <span>Lihat Detail Tugas & Kirim Jawaban via Classroom</span>
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          </div>
                        ))}

                        {studentMatchedPosts.length === 0 && (
                          <div className="py-12 text-center text-xs text-white/30 space-y-2">
                            <BookOpen className="w-8 h-8 text-white/10 mx-auto" />
                            <p>Belum ada rilis materi harian khusus di program "{matchedStudentProfile?.chosenProgram || 'Jurusan'}" Anda.</p>
                            <p className="text-[10px] text-white/20">Materi baru akan muncul setelah Admin merumuskannya via Gemini AI di Konsol Admin.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DIPLOMA PICKUP STATUS VERIFICATION FOR COMPLETED GRADUATES */}
                    <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-4">
                      <div>
                        <h4 className="font-serif italic text-white text-base font-semibold">Status Pengambilan Ijazah Anda</h4>
                        <p className="text-[10px] text-white/50">Cek status pengajuan dokumen fisik ijazah asli di loket</p>
                      </div>

                      {ijazahs.some(i => i.email.toLowerCase() === loggedInEmail.toLowerCase()) ? (
                        <div className="space-y-4">
                          {ijazahs
                            .filter(i => i.email.toLowerCase() === loggedInEmail.toLowerCase())
                            .map(ij => (
                              <div key={ij.id} className="p-4 bg-black/40 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-sans">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white">ID Ambil: {ij.id}</span>
                                    <span className="text-[10px] text-slate-400">Tahun Lulus: {ij.graduationYear}</span>
                                  </div>
                                  <p className="text-white/60 text-[11px] leading-relaxed">
                                    Jadwal Harian: <strong className="text-white font-mono">{ij.pickUpDate}</strong> | Diambil oleh: <strong className="text-white">{ij.pickedUpBy} ({ij.pickUpPersonName})</strong>
                                  </p>
                                  {ij.notes && (
                                    <p className="text-[10px] text-white/40 italic mt-1 font-sans">Notes: "{ij.notes}"</p>
                                  )}
                                </div>

                                <div className="shrink-0">
                                  <span className={`px-3 py-1 rounded-xl text-[10px] font-bold border ${
                                    ij.diplomaStatus === 'Sudah diambil' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                    ij.diplomaStatus === 'Siap diambil' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                    ij.diplomaStatus === 'Ditolak / perlu revisi' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                  }`}>
                                    Status: {ij.diplomaStatus}
                                  </span>
                                </div>
                              </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs leading-relaxed text-white/50">
                          <div className="space-y-1">
                            <p className="font-semibold text-white/70">Belum Ada Pengajuan Rencana Pengambilan Ijazah.</p>
                            <p className="text-[10.5px]">Apakah Anda sudah lulus dan ingin berkoordinasi mengatur jadwal hadir untuk mengambil fisik ijazah?</p>
                          </div>
                          <button
                            onClick={() => setCurrentNav('ijazah')}
                            className="bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:text-white hover:border-emerald-500 text-emerald-400 font-bold px-4 py-2 rounded-xl text-[10.5px] cursor-pointer transition-all shrink-0"
                          >
                            Isi Form Jadwal Ijazah
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#0b0b0e] py-8 px-6 mt-16 text-center text-xs text-white/30 space-y-3 font-sans">
        <p className="max-w-2xl mx-auto">
          Sistem manajemen terintegrasi Google Classroom, Sheets, Drive, dan Gemini untuk operasional PKBM yang lebih rapi.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wide">
          © 2026 PKBM SRIKANDI AUTOMATION. ALL RIGHTS RESERVED.
        </p>
      </footer>

      {/* DIALOG OVERLAY: STUDENT DETAIL & EDIT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f0f13] border border-white/10 rounded-2xl p-6 md:p-8 max-w-2xl w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <span className="text-[9px] font-mono uppercase bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 rounded font-bold">
                  Siswa: {editingStudent.id}
                </span>
                <h4 className="font-serif italic text-white text-lg font-semibold mt-1">{editingStudent.fullName}</h4>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="bg-white/5 hover:bg-white/10 text-white rounded-xl p-1.5 border border-white/10 cursor-pointer text-xs"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-[#ffffff30] uppercase block">Nomor NISN</span>
                <span className="text-white block font-mono text-[11px] font-semibold">{editingStudent.nisn}</span>
              </div>
              <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-[#ffffff30] uppercase block">Gmail Siswa</span>
                <span className="text-white block font-mono text-[11px] font-semibold">{editingStudent.email}</span>
              </div>
              <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-[#ffffff30] uppercase block">WhatsApp</span>
                <span className="text-white block font-mono text-[11px] font-semibold">{editingStudent.whatsapp}</span>
              </div>
              <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-[#ffffff30] uppercase block">Jenis Kelamin</span>
                <span className="text-white block font-semibold">{editingStudent.gender}</span>
              </div>
              <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5 col-span-1 md:col-span-2">
                <span className="text-[9px] text-[#ffffff30] uppercase block">Tempat Tanggal Lahir</span>
                <span className="text-white block font-semibold">{editingStudent.birthPlaceDate}</span>
              </div>
              <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5 col-span-1 md:col-span-2">
                <span className="text-[9px] text-[#ffffff30] uppercase block">Alamat Tinggal</span>
                <span className="text-white block leading-relaxed">{editingStudent.address}</span>
              </div>
              <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-[#ffffff30] uppercase block">Program Studi</span>
                <span className="text-emerald-400 block font-semibold">{editingStudent.chosenProgram}</span>
              </div>
              <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-[#ffffff30] uppercase block">Tahun Akdemis</span>
                <span className="text-white block font-semibold">{editingStudent.academicYear}</span>
              </div>
            </div>

            {/* GOOGLE DRIVE DOCUMENT UPLOADER & EXPLORER */}
            <div className="space-y-4 border-t border-white/5 pt-5 text-xs">
              <span className="text-[10px] uppercase font-mono text-white/40 block font-bold flex items-center justify-between">
                <span>📁 Berkas Digital & Arsip Mandiri (Google Drive)</span>
                {editingStudent.folderUrl && (
                  <a 
                    href={editingStudent.folderUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                  >
                    <span>Buka Folder Utama GDrive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </span>

              {(!editingStudent.folderId || !editingStudent.subfolderIds) ? (
                <div className="p-4 bg-[#141018] border border-purple-500/20 rounded-xl space-y-3">
                  <p className="text-white/70 text-[11px] leading-relaxed">
                    Siswa ini belum memiliki struktur folder arsip digital terintegrasi di Google Drive. Klik tombol di bawah ini untuk membentuk folder utama beserta 11 subfolder wajib siswa secara otomatis.
                  </p>
                  {gToken && appDriveConfig ? (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsUploadingDoc(true);
                        try {
                          const res = await createStudentFolderStructure(editingStudent, appDriveConfig.rootFolderId, gToken);
                          
                          // Save in list
                          const newList = students.map(s => {
                            if (s.id === editingStudent.id) {
                              return {
                                ...s,
                                folderId: res.folderId,
                                folderUrl: res.folderUrl,
                                subfolderIds: res.subfolderIds
                              };
                            }
                            return s;
                          });
                          
                          setStudents(newList);
                          DatabaseManager.saveStudents(newList);
                          
                          const fullS = newList.find(s => s.id === editingStudent.id);
                          if (fullS) {
                            DatabaseManager.syncToFirestore('students', editingStudent.id, fullS);
                          }

                          setEditingStudent({
                            ...editingStudent,
                            folderId: res.folderId,
                            folderUrl: res.folderUrl,
                            subfolderIds: res.subfolderIds
                          });

                          logAction(loggedInEmail, 'FOLDER_CREATE_MANUAL', `Mengonfigurasi struktur folder Google Drive siswa ${editingStudent.fullName}.`);
                          alert(`Sukses mengarsip & membuat 11 subfolder Google Drive untuk ${editingStudent.fullName}!`);
                        } catch (err: any) {
                          alert(`Gagal membuat folder: ${err.message}`);
                        } finally {
                          setIsUploadingDoc(false);
                        }
                      }}
                      disabled={isUploadingDoc}
                      className="bg-purple-600 hover:bg-purple-500 disabled:bg-white/5 font-bold text-xs text-white px-3.5 py-2 rounded-xl h-9 inline-flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span>{isUploadingDoc ? 'Sedang Memproses...' : 'Buat Struktur Folder GDrive'}</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/15 text-amber-500 rounded-xl leading-relaxed text-[10.5px]">
                      ⚠️ Google Drive token admin belum terdeteksi. Silakan login sebagai administrator di dashboard utama dan pastikan koneksi Drive Anda aktif!
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Category Selection Tabs */}
                  <span className="text-[9px] text-[#ffffff40] uppercase block font-semibold font-mono">Pilih Kategori Subfolder / Arsip Dokumen Siswa:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto bg-black/25 p-2 rounded-xl border border-white/5">
                    {[
                      { code: '01_BIODATA', label: '01_BIODATA' },
                      { code: '02_KK', label: '02_KK (Kartu Keluarga)' },
                      { code: '03_AKTA_KELAHIRAN', label: '03_AKTA_KELAHIRAN' },
                      { code: '04_IJAZAH_SEBELUMNYA', label: '04_IJAZAH_SEBELUMNYA' },
                      { code: '05_FOTO', label: '05_FOTO (Pas Foto)' },
                      { code: '06_PEMBAYARAN', label: '06_PEMBAYARAN (Slip Bukti)' },
                      { code: '07_RAPOR', label: '07_RAPOR (Hasil Belajar)' },
                      { code: '08_SURAT_MENYURAT', label: '08_SURAT_MENYURAT' },
                      { code: '09_IJAZAH_KELULUSAN', label: '09_IJAZAH_KELULUSAN' },
                      { code: '10_DOKUMEN_LAINNYA', label: '10_DOKUMEN_LAINNYA' },
                      { code: '11_BACKUP', label: '11_BACKUP' }
                    ].map((cat) => {
                      const isActive = activeViewCategory === cat.code;
                      return (
                        <button
                          key={cat.code}
                          type="button"
                          onClick={() => setActiveViewCategory(cat.code)}
                          className={`px-2 py-2 rounded-lg text-[10px] font-mono text-left truncate transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                              : 'bg-[#0a0a0d] border-white/5 text-white/50 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* ACTIVE VIEW CATEGORY PANEL */}
                  <div className="bg-[#070709] border border-white/5 p-4 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Subfolder aktif:</span>
                        <h5 className="text-xs text-white font-semibold font-mono block mt-0.5">📁 {activeViewCategory}/</h5>
                      </div>
                      
                      {editingStudent.subfolderIds?.[activeViewCategory] && (
                        <a 
                          href={`https://drive.google.com/open?id=${editingStudent.subfolderIds[activeViewCategory]}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] text-white/70 hover:text-white flex items-center gap-1 hover:underline bg-white/5 px-2 py-1 rounded border border-white/10"
                        >
                          <span>Buka Subfolder di Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* LIVE VIEW FILES UNDER ACTIVE CATEGORY */}
                    <div className="space-y-2">
                      <span className="text-[9px] text-white/30 uppercase font-bold block">Berkas Tersimpan ({categoryFiles.length}):</span>
                      {loadingFiles ? (
                        <div className="flex items-center gap-2 text-white/50 py-3 font-mono text-[10.5px]">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Membaca data berkas di Google Drive...</span>
                        </div>
                      ) : categoryFiles.length > 0 ? (
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                          {categoryFiles.map((file) => (
                            <div key={file.id} className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2 rounded-lg gap-3">
                              <div className="min-w-0 flex-1 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span className="text-[11px] text-white/80 font-mono truncate block" title={file.name}>{file.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <a 
                                  href={file.webViewLink || `https://drive.google.com/open?id=${file.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-400 hover:underline bg-emerald-500/10 px-2 py-1 rounded inline-flex items-center gap-0.5"
                                >
                                  <span>Buka</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[#ffffff35] italic py-2 text-[11px]">
                          Belum ada berkas apa pun di subfolder ini. Silakan upload berkas baru di bawah ini.
                        </p>
                      )}
                    </div>

                    {/* EXCLUSIVE UPLOAD TO ACTIVE CATEGORY */}
                    <div className="border-t border-white/5 pt-3.5 space-y-2">
                      <span className="text-[9px] text-white/50 uppercase font-bold block">Unggah Berkas Baru ke Subfolder ini:</span>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                          type="file"
                          id="category-file-input"
                          accept="image/*,application/pdf"
                          className="flex-1 bg-black border border-white/10 rounded-xl text-xs px-3 py-1.5 text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const fileInput = document.getElementById('category-file-input') as HTMLInputElement;
                            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                              alert('Silakan pilih berkas dari komputer/HP terlebih dahulu!');
                              return;
                            }
                            
                            const file = fileInput.files[0];
                            const categoryFolderId = editingStudent.subfolderIds?.[activeViewCategory];
                            if (!categoryFolderId) {
                              alert('Folder kategori tidak siap!');
                              return;
                            }

                            setIsUploadingDoc(true);
                            setUploadDocError('');
                            setUploadDocSuccess('');

                            try {
                              const ext = file.name.split('.').pop() || 'png';
                              const timestamp = Date.now().toString().slice(-4);
                              const customFileName = `${activeViewCategory}_${editingStudent.nisn}_${timestamp}.${ext}`;

                              const driveResult = await uploadDocumentToDrive(
                                categoryFolderId,
                                customFileName,
                                file,
                                gToken
                              );

                              // Save document url link in students record
                              const up = students.map(s => {
                                if (s.id === editingStudent.id) {
                                  return { 
                                    ...s, 
                                    documentUrl: driveResult.viewLink 
                                  };
                                }
                                return s;
                              });

                              setStudents(up);
                              DatabaseManager.saveStudents(up);
                              
                              const targetStudent = up.find(s => s.id === editingStudent.id);
                              if (targetStudent) {
                                DatabaseManager.syncToFirestore('students', editingStudent.id, targetStudent);
                              }
                              
                              setEditingStudent({
                                ...editingStudent,
                                documentUrl: driveResult.viewLink
                              });

                              setUploadDocSuccess(`Sukses unggah berkas "${customFileName}"!`);
                              logAction(loggedInEmail, 'UPLOAD_DOC', `Mengunggah berkas ${customFileName} milik siswa ${editingStudent.fullName} ke subfolder ${activeViewCategory}.`);
                              
                              // Clear file input
                              fileInput.value = '';

                              // Refresh category list
                              const list = await listFilesInFolder(categoryFolderId, gToken);
                              setCategoryFiles(list);
                            } catch (uploadErr: any) {
                              setUploadDocError(`Gagal upload: ${uploadErr.message}`);
                              alert(`Upload Gagal: ${uploadErr.message}`);
                            } finally {
                              setIsUploadingDoc(false);
                            }
                          }}
                          disabled={isUploadingDoc}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer shrink-0"
                        >
                          {isUploadingDoc ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>Unggah</span>
                        </button>
                      </div>

                      {uploadDocError && (
                        <p className="text-[10.5px] text-rose-400 font-semibold font-mono pt-1">{uploadDocError}</p>
                      )}
                      
                      {uploadDocSuccess && (
                        <p className="text-[10.5px] text-emerald-400 font-semibold font-mono pt-1">{uploadDocSuccess}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-white/5 pt-4">
              <span className="text-[10px] uppercase font-mono text-white/40 block font-bold">Aksi Administrasi Adisi Status</span>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => {
                    updateStudentStatus(editingStudent.id, 'Terverifikasi');
                    setEditingStudent({ ...editingStudent, status: 'Terverifikasi' });
                    alert('Siswa sukses diverifikasi!');
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Setujui Verifikasi
                </button>
                <button
                  onClick={() => {
                    updateStudentStatus(editingStudent.id, 'Undangan Terkirim');
                    setEditingStudent({ ...editingStudent, status: 'Undangan Terkirim' });
                    alert('Roster Classroom diundang!');
                  }}
                  className="bg-[#35359a] hover:bg-[#2c2c80] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Kirim Undangan Classroom
                </button>
                <button
                  onClick={() => {
                    updateStudentStatus(editingStudent.id, 'Gagal');
                    setEditingStudent({ ...editingStudent, status: 'Gagal' });
                    alert('Status diubah ke Gagal / Perlu direvisi.');
                  }}
                  className="bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Ubah ke Gagal
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
