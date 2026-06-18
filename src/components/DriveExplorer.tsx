import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  RefreshCw, 
  Folder, 
  FolderOpen, 
  FileSpreadsheet, 
  File, 
  Download, 
  Upload, 
  Database,
  ExternalLink,
  Info,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  DriveConfig, 
  initDriveStructure, 
  listFilesInFolder, 
  syncLocalDatabaseToDrive, 
  pullDatabaseFromDrive, 
  createDriveBackup 
} from '../driveStorage';

interface DriveExplorerProps {
  accessToken: string | null;
  onSyncComplete: (syncedData: any) => void;
  getAppState: () => any;
  onAddLog: (actionType: string, description: string) => void;
}

export default function DriveExplorer({ 
  accessToken, 
  onSyncComplete, 
  getAppState, 
  onAddLog 
}: DriveExplorerProps) {
  const [driveConfig, setDriveConfig] = useState<DriveConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initSuccess, setInitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Tree state: which folder IDs are expanded
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  // Cached files inside each expanded folder
  const [folderContents, setFolderContents] = useState<Record<string, any[]>>({});
  const [loadingFolderId, setLoadingFolderId] = useState<string | null>(null);

  // Syncing buttons state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupStatusText, setBackupStatusText] = useState('');

  // Load cached drive configuration from localStorage on paint
  useEffect(() => {
    const cached = localStorage.getItem('pkbm_drive_config');
    if (cached) {
      try {
        setDriveConfig(JSON.parse(cached));
      } catch (_) {
        // clear corrupted cache
        localStorage.removeItem('pkbm_drive_config');
      }
    }
  }, []);

  // Handle Drive setup
  const handleInitializeDrive = async () => {
    if (!accessToken) {
      setErrorMsg('Akses token Google kosong. Silakan masuk terlebih dahulu menggunakan metode Google OAuth!');
      return;
    }

    setIsLoading(true);
    setInitSuccess(false);
    setErrorMsg('');

    try {
      const config = await initDriveStructure(accessToken);
      setDriveConfig(config);
      setInitSuccess(true);
      onAddLog('DRIVE_INIT', 'Menginisialisasi struktur root folder APP MANAJEMEN SISWA dan subfolder Google Drive.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Misteri: Gagal menghubungi Google Drive API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconnectDrive = async () => {
    localStorage.removeItem('pkbm_drive_config');
    setDriveConfig(null);
    setExpandedFolders({});
    setFolderContents({});
    setErrorMsg('');
    setInitSuccess(false);
    await handleInitializeDrive();
  };

  // Toggle expand custom subfolder
  const handleToggleFolder = async (folderName: string, folderId: string) => {
    const isExpanded = !!expandedFolders[folderId];
    
    // Toggle state
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !isExpanded
    }));

    // If expanding, load files inside this folder from the actual API
    if (!isExpanded && accessToken) {
      setLoadingFolderId(folderId);
      try {
        const files = await listFilesInFolder(folderId, accessToken);
        setFolderContents(prev => ({
          ...prev,
          [folderId]: files
        }));
      } catch (err: any) {
        console.error(`Gagal memuat list file di folder ${folderName}:`, err);
      } finally {
        setLoadingFolderId(null);
      }
    }
  };

  // Sync current memory database into Google Drive spreadsheeets
  const handlePushSync = async () => {
    if (!accessToken || !driveConfig) return;
    setSyncLoading(true);
    setSyncStatusText('');
    
    try {
      const state = getAppState();
      await syncLocalDatabaseToDrive(driveConfig, state, accessToken);
      setSyncStatusText('Berhasil memposting 100% data lokal ke seluruk Google Sheets!');
      onAddLog('DRIVE_SYNC_PUSH', 'Sinkronisasi Manual: Push data lokal ke Google Drive Sheets.');
      setTimeout(() => setSyncStatusText(''), 5000);
    } catch (err: any) {
      setErrorMsg(`Push sinkronisasi gagal: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // Pull latest rows from Google Drive spreadsheets back into the application
  const handlePullSync = async () => {
    if (!accessToken || !driveConfig) return;
    setSyncLoading(true);
    setSyncStatusText('');

    try {
      const pulledData = await pullDatabaseFromDrive(driveConfig, accessToken);
      onSyncComplete(pulledData);
      setSyncStatusText('Berhasil menarik data riwayat pendaftaran, ijazah, & akun terbaru dari Google Sheets!');
      onAddLog('DRIVE_SYNC_PULL', 'Sinkronisasi Manual: Menarik data terbaru dari Google Drive Sheets.');
      setTimeout(() => setSyncStatusText(''), 5000);
    } catch (err: any) {
      setErrorMsg(`Pull sinkronisasi gagal: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // Run full dynamic JSON content and CSV compilation back to 09_BACKUP
  const handleTriggerBackup = async () => {
    if (!accessToken || !driveConfig) return;
    setBackupLoading(true);
    setBackupStatusText('');

    try {
      const state = getAppState();
      const urls = await createDriveBackup(driveConfig, state, accessToken);
      setBackupStatusText('Backup Sukses! JSON & CSV tersimpan di folder 09_BACKUP.');
      onAddLog('DRIVE_BACKUP', 'Membuat file arsip cadangan (JSON/CSV) ke folder 09_BACKUP.');
      
      // Auto reload backup folder list if expanded
      const backupFolderId = driveConfig.subfolders['09_BACKUP'];
      if (expandedFolders[backupFolderId]) {
        const files = await listFilesInFolder(backupFolderId, accessToken);
        setFolderContents(prev => ({
          ...prev,
          [backupFolderId]: files
        }));
      }

      setTimeout(() => setBackupStatusText(''), 6000);
    } catch (err: any) {
      setErrorMsg(`Backup gagal dilakukan: ${err.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  // Inline styling classes
  const isSetup = !!driveConfig;

  return (
    <div id="drive-integration-panel" className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-serif italic text-white font-semibold">Integrasi Cloud Google Drive & Sheets</h3>
          </div>
          <p className="text-[11px] text-white/50 leading-relaxed max-w-xl">
            Semua database terlampir di Google Drive pribadi Anda untuk keterbukaan data dan fleksibilitas manipulasi di ekosistem sekolah / PKBM Srikandi.
          </p>
        </div>

        {/* Sync Buttons */}
        {accessToken && isSetup && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={handlePullSync}
              disabled={syncLoading}
              className="bg-black/40 hover:bg-black/60 border border-white/10 hover:border-emerald-500/30 text-white font-semibold px-3 py-1.5 rounded-xl text-[10px] cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Tarik Data Sheets</span>
            </button>

            <button
              onClick={handlePushSync}
              disabled={syncLoading}
              className="bg-emerald-600/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 text-emerald-400 font-semibold px-3 py-1.5 rounded-xl text-[10px] cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Upload className="w-3 h-3" />
              <span>Kirim Data Sheets</span>
            </button>
          </div>
        )}
      </div>

      {/* SYNC NOTIFIER BAR */}
      {syncStatusText && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400 flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{syncStatusText}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* CORE CONTROL AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CONNECTION STATUS PANEL & BACKUP */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
            
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${accessToken && isSetup ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Status Integrasi G-Suite</span>
            </div>

            {accessToken && isSetup ? (
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-white">TERHUBUNG KE GOOGLE DRIVE</h4>
                  <p className="text-[10px] text-emerald-400 font-mono">Folder: APP MANAJEMEN SISWA milik owner yang sedang login</p>
                </div>

                <div className="text-[10.5px] text-white/60 space-y-1 leading-relaxed">
                  <p>✓ Database utama 100% tersimpan rapi.</p>
                  <p>✓ Upload dokumen KK / Ijazah otomatis dialokasikan ke folder masing-masing siswa di bawah subfolder <strong className="text-white">07_UPLOAD_DOKUMEN_SISWA/</strong></p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-white/80">SANDBOX SIMULATOR MODE</h4>
                  <p className="text-[10px] text-amber-500 font-mono">Status: Membaca Database Lokal</p>
                </div>

                <p className="text-[10.5px] text-white/50 leading-relaxed">
                  Semua data tersimpan aman di penyimpanan lokal peramban. Hubungkan ke Google Drive untuk mengaktifkan sinkronisasi otomatis multi-perangkat sekolah dan pembentukan dokumen real-time.
                </p>

                {accessToken ? (
                  <button
                    onClick={handleInitializeDrive}
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isSetup ? 'Buat Ulang Struktur Drive' : 'Sambungkan ke Google Drive'}</span>
                  </button>
                ) : (
                  <div className="p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[10px] text-amber-500 flex gap-1.5 items-start">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Lakukan masuk "Google Account (OAuth)" terlebih dahulu untuk mengaktifkan konektivitas sinkronisasi Google Sheet.</span>
                  </div>
                )}

                {accessToken && isSetup && (
                  <button
                    onClick={handleReconnectDrive}
                    disabled={isLoading}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-semibold py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sambung Ulang Drive Owner</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* BACKUP TRIGGER PANEL */}
          {accessToken && isSetup && (
            <div className="bg-[#0b0b0e] border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-serif text-white font-bold uppercase tracking-wider">Pusat Backup & Cadangan</h4>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">
                Mengekspor seluruh riwayat database pendaftaran, roster accounts, mapping Classroom, dan log aktivitas menjadi file arsip JSON dan Excel ringkasan (CSV) ke folder <strong className="text-white">09_BACKUP/</strong>.
              </p>

              <button
                onClick={handleTriggerBackup}
                disabled={backupLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {backupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Buat Cadangan Baru (Drive Backup)</span>
              </button>

              {backupStatusText && (
                <p className="text-[10px] text-emerald-400 text-center font-semibold mt-1 animate-pulse">
                  ✓ {backupStatusText}
                </p>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: INTERACTIVE FILE TREE EXPLORER */}
        <div className="lg:col-span-7 space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">Live Google Drive Tree Explorer</span>
          
          <div className="bg-[#070709] border border-white/5 rounded-xl p-4 min-h-[280px] max-h-[450px] overflow-y-auto space-y-2.5 scrollbar-thin">
            
            {/* Root Folder Icon */}
            <div className="flex items-center gap-2 text-white font-serif italic text-sm font-semibold border-b border-white/5 pb-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>APP MANAJEMEN SISWA</span>
              {isSetup && (
                <span className="text-[9px] font-mono text-white/30 truncate ml-auto">id: {driveConfig.rootFolderId}</span>
              )}
            </div>

            {/* Folder list */}
            {isSetup && driveConfig ? (
              <div className="pl-2 space-y-2 text-xs">
                {Object.keys(driveConfig.subfolders).map((subfolderName) => {
                  const subfolderId = driveConfig.subfolders[subfolderName];
                  const isExpanded = !!expandedFolders[subfolderId];
                  const contents = folderContents[subfolderId] || [];

                  return (
                    <div key={subfolderName} className="space-y-1 font-sans">
                      
                      {/* Subfolder Title row */}
                      <button
                        onClick={() => handleToggleFolder(subfolderName, subfolderId)}
                        className="w-full text-left flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/5 py-1 px-1.5 rounded transition-all cursor-pointer group"
                      >
                        {isExpanded ? (
                          <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Folder className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <span className="font-semibold text-white/90 group-hover:text-emerald-300">{subfolderName}</span>
                        
                        {loadingFolderId === subfolderId && (
                          <RefreshCw className="w-3 h-3 text-white/40 animate-spin" />
                        )}
                        
                        <span className="text-[8px] font-mono text-white/20 truncate ml-auto">expand / load</span>
                      </button>

                      {/* Expanded Subfiles */}
                      {isExpanded && (
                        <div className="pl-6 border-l border-white/5 space-y-1 py-1">
                          {contents.map((file) => {
                            const isSpreadsheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
                            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                            return (
                              <div 
                                key={file.id} 
                                className="flex items-center justify-between text-[11px] text-white/60 hover:text-white py-0.5 px-1 hover:bg-white/[0.02] rounded"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  {isSpreadsheet ? (
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  ) : isFolder ? (
                                    <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  ) : (
                                    <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  )}
                                  <span className="truncate">{file.name}</span>
                                </div>

                                {file.webViewLink && (
                                  <a 
                                    href={file.webViewLink} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap pl-2 flex items-center gap-0.5"
                                  >
                                    <span>Buka</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            );
                          })}

                          {contents.length === 0 && loadingFolderId !== subfolderId && (
                            <span className="text-[10px] text-white/30 italic pl-1 block">Folder kosong / belum ada berkas</span>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-white/30 space-y-1.5 font-sans">
                <Database className="w-8 h-8 text-white/10 mx-auto" />
                <p>Belum terintegrasi dengan Google Drive.</p>
                <p className="text-[10px] text-white/20">Struktur folder & database di atas akan direkam otomatis di sirkuit cloud Drive Anda begitu diinisialisasi.</p>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
