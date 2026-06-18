import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, HardDrive, FolderOpen, RefreshCw, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { DriveConfig, getDriveStorageInfo, initDriveStructure, listFilesInFolder, loadDriveConfig, saveDriveConfig } from '../driveStorage';

interface DriveCenterProps {
  accessToken: string | null;
  ownerEmail?: string | null;
}

function formatBytes(raw?: string) {
  const bytes = Number(raw || 0);
  if (!bytes || Number.isNaN(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`;
}

export default function DriveCenter({ accessToken, ownerEmail }: DriveCenterProps) {
  const [driveConfig, setDriveConfig] = useState<DriveConfig | null>(null);
  const [storage, setStorage] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const rootLink = useMemo(() => driveConfig?.rootFolderId ? `https://drive.google.com/drive/folders/${driveConfig.rootFolderId}` : '', [driveConfig]);

  useEffect(() => {
    const cached = loadDriveConfig(ownerEmail || storage?.user?.emailAddress || driveConfig?.ownerEmail || null);
    if (cached) setDriveConfig(cached);
  }, [ownerEmail, storage?.user?.emailAddress, driveConfig?.ownerEmail]);

  const loadInfo = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const info = await getDriveStorageInfo(accessToken);
      setStorage(info);
      const resolvedOwnerEmail = ownerEmail || info?.user?.emailAddress || driveConfig?.ownerEmail || null;
      const cached = loadDriveConfig(resolvedOwnerEmail);
      if (cached) setDriveConfig(cached);
      if (driveConfig?.rootFolderId) {
        const rootFiles = await listFilesInFolder(driveConfig.rootFolderId, accessToken);
        setFiles(rootFiles);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal membaca info Drive');
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostics = async () => {
    if (!accessToken) {
      setDiagnostic({ ok: false, reason: 'Token OAuth belum tersedia.' });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const info = await getDriveStorageInfo(accessToken);
      const resolvedOwnerEmail = ownerEmail || info?.user?.emailAddress || null;
      const cached = loadDriveConfig(resolvedOwnerEmail);
      const activeConfig = cached || driveConfig;
      const rootFiles = activeConfig?.rootFolderId ? await listFilesInFolder(activeConfig.rootFolderId, accessToken) : [];
      const mismatch = Boolean(activeConfig?.ownerEmail && resolvedOwnerEmail && activeConfig.ownerEmail.toLowerCase() !== resolvedOwnerEmail.toLowerCase());
      setStorage(info);
      setDriveConfig(activeConfig || null);
      setFiles(rootFiles);
      setDiagnostic({
        ok: true,
        ownerEmail: resolvedOwnerEmail,
        hasCachedConfig: Boolean(cached),
        configOwnerEmail: activeConfig?.ownerEmail || null,
        configRootFolderId: activeConfig?.rootFolderId || null,
        configSheetCount: activeConfig ? Object.keys(activeConfig.sheets || {}).length : 0,
        rootFileCount: rootFiles.length,
        mismatch,
        quota: info?.storageQuota || null
      });
      if (mismatch) {
        setMessage('Cache Drive berhasil dibaca, tetapi owner email tidak cocok. Gunakan akun owner yang sama untuk koneksi Drive.');
      } else {
        setMessage('Diagnostik Drive selesai.');
      }
    } catch (e: any) {
      setDiagnostic({ ok: false, reason: e.message || 'Diagnostik Drive gagal' });
      setError(e.message || 'Gagal melakukan diagnosis Drive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) loadInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, driveConfig?.rootFolderId]);

  const handleSetup = async () => {
    if (!accessToken) return setError('Login OAuth dulu sebelum sambungkan Drive.');
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const cfg = await initDriveStructure(accessToken, true);
      const ownerEmail = storage?.user?.emailAddress || cfg.ownerEmail || null;
      const nextCfg = { ...cfg, ownerEmail: ownerEmail || undefined };
      setDriveConfig(nextCfg);
      saveDriveConfig(nextCfg, ownerEmail || nextCfg.ownerEmail || null);
      setMessage('Drive owner berhasil diprovision ulang.');
      await loadInfo();
    } catch (e: any) {
      setError(e.message || 'Gagal membuat struktur Drive');
    } finally {
      setLoading(false);
    }
  };

  const quota = storage?.storageQuota || {};
  const used = Number(quota.usageInDrive || 0) + Number(quota.usageInDriveTrash || 0);
  const limit = Number(quota.limit || 0);
  const percent = limit ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-[#0f0f13] p-6 md:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-serif italic text-white font-semibold">Google Drive Center</h2>
            </div>
            <p className="text-xs text-white/50">Kelola struktur Drive owner, buka folder langsung, dan cek kapasitas penyimpanan.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadInfo} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs font-semibold flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button onClick={runDiagnostics} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs font-semibold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> Diagnostik
            </button>
            <button onClick={handleSetup} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" /> Buat / Sambung Drive
            </button>
          </div>
        </div>

        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
        {message && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2"><CheckCircle className="w-4 h-4" />{message}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/5 bg-black/30 p-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40">Owner</div>
            <div className="text-sm text-white font-semibold">{storage?.user?.displayName || '-'}</div>
            <div className="text-[11px] text-white/50">{storage?.user?.emailAddress || '-'}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/30 p-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40">Penyimpanan</div>
            <div className="text-sm text-white font-semibold">{formatBytes(quota.usageInDrive)} / {formatBytes(quota.limit)}</div>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} /></div>
            <div className="text-[11px] text-white/50 mt-1">{percent.toFixed(0)}% terpakai</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/30 p-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40">Root Folder</div>
            <div className="text-sm text-white font-semibold break-all">{driveConfig?.rootFolderId || 'Belum diprovision'}</div>
            {rootLink && <a className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 mt-2" href={rootLink} target="_blank" rel="noreferrer">Buka folder <ExternalLink className="w-3 h-3" /></a>}
          </div>
        </div>

        {diagnostic && (
          <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-xs text-white/75 space-y-2">
            <div className="font-semibold text-white">Hasil Diagnostik</div>
            <div>Owner API: {diagnostic.ownerEmail || '-'}</div>
            <div>Cache config: {diagnostic.hasCachedConfig ? 'Ada' : 'Tidak ada'}</div>
            <div>Owner config: {diagnostic.configOwnerEmail || '-'}</div>
            <div>Root folder: {diagnostic.configRootFolderId || '-'}</div>
            <div>Total file root: {diagnostic.rootFileCount ?? 0}</div>
            <div>Mismatch owner: {diagnostic.mismatch ? 'Ya' : 'Tidak'}</div>
          </div>
        )}
      </div>

      {driveConfig && (
        <div className="rounded-2xl border border-white/5 bg-[#0f0f13] p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Struktur Folder</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(driveConfig.subfolders).map(([name, id]) => (
              <a key={name} href={`https://drive.google.com/drive/folders/${id}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3 hover:bg-white/5">
                <div>
                  <div className="text-white text-sm font-semibold">{name}</div>
                  <div className="text-[11px] text-white/40 break-all">{id}</div>
                </div>
                <ExternalLink className="w-4 h-4 text-indigo-400" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/5 bg-[#0f0f13] p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Isi Root Folder</h3>
        {loading ? (
          <div className="text-xs text-white/50">Memuat data Drive...</div>
        ) : files.length ? (
          <div className="space-y-2">
            {files.map((file) => (
              <a key={file.id} href={file.webViewLink || `https://drive.google.com/open?id=${file.id}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3 hover:bg-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-white text-sm truncate">{file.name}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-indigo-400 shrink-0" />
              </a>
            ))}
          </div>
        ) : (
          <div className="text-xs text-white/50">Belum ada file, atau root folder belum diprovision.</div>
        )}
      </div>
    </div>
  );
}
