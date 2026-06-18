// Google Drive & Google Sheets Storage Engine
// This file coordinates client-side API requests to Google Workspace using the user's OAuth access token.

export interface DriveConfig {
  rootFolderId: string;
  subfolders: Record<string, string>; // Maps "01_DATABASE" -> folderId, "02_PENDAFTARAN" -> id, etc.
  sheets: Record<string, string>;      // Maps "DATABASE_SISWA" -> spreadsheetId, "REKAP_PENDAFTARAN" -> id, etc.
}

const DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3';
const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// Helper to make authenticated requests
async function googleFetch(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errText = '';
    try {
      const errJson = await response.json();
      errText = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errText = response.statusText;
    }
    throw new Error(`Google API Gagal (${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Searches for a folder by name and parent ID.
 */
async function findFolder(name: string, parentId: string | null, accessToken: string): Promise<string | null> {
  let query = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  const url = `${DRIVE_BASE_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const data = await googleFetch(url, accessToken);
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

/**
 * Creates a folder.
 */
async function createFolder(name: string, parentId: string | null, accessToken: string): Promise<string> {
  const body: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    body.parents = [parentId];
  }
  const data = await googleFetch(`${DRIVE_BASE_URL}/files`, accessToken, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return data.id;
}

/**
 * Searches for a file (like spreadsheet) by name and parent ID.
 */
async function findFile(name: string, mimeType: string, parentId: string, accessToken: string): Promise<string | null> {
  const query = `name = '${name.replace(/'/g, "\\'")}' and mimeType = '${mimeType}' and '${parentId}' in parents and trashed = false`;
  const url = `${DRIVE_BASE_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const data = await googleFetch(url, accessToken);
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

/**
 * Creates a file (Spreadsheet, etc.) within a parent folder.
 */
async function createFileInFolder(name: string, mimeType: string, parentId: string, accessToken: string): Promise<string> {
  const body = {
    name,
    mimeType,
    parents: [parentId]
  };
  const data = await googleFetch(`${DRIVE_BASE_URL}/files`, accessToken, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return data.id;
}

/**
 * Appends rows to a spreadsheet range.
 */
export async function appendRowsToSheet(spreadsheetId: string, range: string, values: any[][], accessToken: string) {
  const url = `${SHEETS_BASE_URL}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
  return googleFetch(url, accessToken, {
    method: 'POST',
    body: JSON.stringify({ values })
  });
}

/**
 * Overwrites/Updates a specific range in a spreadsheet.
 */
export async function updateSheetRange(spreadsheetId: string, range: string, values: any[][], accessToken: string) {
  const url = `${SHEETS_BASE_URL}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  return googleFetch(url, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ values })
  });
}

/**
 * Reads values from a spreadsheet range.
 */
export async function readSheetRange(spreadsheetId: string, range: string, accessToken: string): Promise<any[][]> {
  const url = `${SHEETS_BASE_URL}/${spreadsheetId}/values/${range}`;
  const data = await googleFetch(url, accessToken);
  return data.values || [];
}

/**
 * Resolves the tab name based on student class and package.
 */
export function getClassTabName(studentClass: string, packetStudy: string): string {
  const cls = (studentClass || '').toUpperCase().trim().replace(/\s+/g, '_'); // e.g. KELAS_4
  const pkt = (packetStudy || '').toUpperCase().trim().replace(/\s+/g, '_'); // e.g. PAKET_A
  
  const finalTab = `${cls}_${pkt}`;
  const validTabs = [
    'KELAS_4_PAKET_A', 'KELAS_5_PAKET_A', 'KELAS_6_PAKET_A',
    'KELAS_7_PAKET_B', 'KELAS_8_PAKET_B', 'KELAS_9_PAKET_B',
    'KELAS_10_PAKET_C', 'KELAS_11_PAKET_C', 'KELAS_12_PAKET_C'
  ];

  if (validTabs.includes(finalTab)) {
    return finalTab;
  }
  
  // Safe default fallback matcher
  if (pkt.includes('PAKET_A')) {
    if (cls.includes('4')) return 'KELAS_4_PAKET_A';
    if (cls.includes('5')) return 'KELAS_5_PAKET_A';
    return 'KELAS_6_PAKET_A';
  } else if (pkt.includes('PAKET_B')) {
    if (cls.includes('7')) return 'KELAS_7_PAKET_B';
    if (cls.includes('8')) return 'KELAS_8_PAKET_B';
    return 'KELAS_9_PAKET_B';
  } else {
    if (cls.includes('10')) return 'KELAS_10_PAKET_C';
    if (cls.includes('11')) return 'KELAS_11_PAKET_C';
    return 'KELAS_12_PAKET_C';
  }
}

/**
 * Clears a specific spreadsheet range.
 */
export async function clearSheetRange(spreadsheetId: string, range: string, accessToken: string) {
  const url = `${SHEETS_BASE_URL}/${spreadsheetId}/values/${range}:clear`;
  return googleFetch(url, accessToken, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

/**
 * Ensures all requested tab structures exist on the spreadsheet "DATA INDUK SISWA".
 */
export async function ensureSheetTabs(spreadsheetId: string, accessToken: string) {
  try {
    const url = `${SHEETS_BASE_URL}/${spreadsheetId}?fields=sheets.properties.title`;
    const metadata = await googleFetch(url, accessToken);
    const existingTitles = (metadata.sheets || []).map((s: any) => s.properties.title);

    const requiredTabs = [
      'DATA_INDUK',
      'KELAS_4_PAKET_A',
      'KELAS_5_PAKET_A',
      'KELAS_6_PAKET_A',
      'KELAS_7_PAKET_B',
      'KELAS_8_PAKET_B',
      'KELAS_9_PAKET_B',
      'KELAS_10_PAKET_C',
      'KELAS_11_PAKET_C',
      'KELAS_12_PAKET_C'
    ];

    const studentHeaders = [
      'ID SISWA', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'NIK', 'KTP Doc Url', 
      'No KK', 'KK Doc Url', 'Alamat Lengkap', 'Desa', 'Kecamatan', 'Kabupaten', 
      'Nama Ayah', 'Nama Ibu Kandung', 'Program', 'Kelas Tujuan', 'Jenjang Program', 
      'Ijazah Doc Url', 'No HP / WhatsApp', 'Email Gmail', 'Kode Referensi', 
      'Sumber Informasi', 'Folder ID', 'Link Folder', 'Status', 'Tanggal Terdaftar', 'NISN'
    ];

    const requests: any[] = [];
    const missingTabs = requiredTabs.filter(tab => !existingTitles.includes(tab));

    if (missingTabs.length > 0) {
      missingTabs.forEach(tab => {
        requests.push({
          addSheet: {
            properties: {
              title: tab
            }
          }
        });
      });

      const batchUrl = `${SHEETS_BASE_URL}/${spreadsheetId}:batchUpdate`;
      await googleFetch(batchUrl, accessToken, {
        method: 'POST',
        body: JSON.stringify({ requests })
      });
    }

    // Set header columns inside each tab
    for (const tab of requiredTabs) {
      await updateSheetRange(spreadsheetId, `${tab}!A1`, [studentHeaders], accessToken);
    }
  } catch (err) {
    console.warn('Gagal mempersiapkan tab pendaftaran:', err);
  }
}

/**
 * Initializes the entire Google Drive Folder & Sheet structure.
 * Will look for an existing setup first to prevent duplication.
 */
export async function initDriveStructure(accessToken: string, forceRecreate = false): Promise<DriveConfig> {
  const rootFolderName = 'APP MANAJEMEN SISWA';
  const subfolderNames = [
    '01_DATABASE',
    '02_PENDAFTARAN',
    '03_AKUN_SISWA',
    '04_CLASSROOM',
    '05_IJAZAH',
    '06_MATERI_PEMBELAJARAN',
    '07_UPLOAD_DOKUMEN_SISWA',
    '08_LOG_AKTIVITAS',
    '09_BACKUP'
  ];

  // 1. Locate or create principal folder
  let rootFolderId = await findFolder(rootFolderName, null, accessToken);
  if (!rootFolderId || forceRecreate) {
    rootFolderId = await createFolder(rootFolderName, null, accessToken);
  }

  // 2. Locate or create subfolders
  const subfolders: Record<string, string> = {};
  for (const subName of subfolderNames) {
    let fId = await findFolder(subName, rootFolderId, accessToken);
    if (!fId || forceRecreate) {
      fId = await createFolder(subName, rootFolderId, accessToken);
    }
    subfolders[subName] = fId;
  }

  // 3. Define the required Spreadsheet Schemas
  const sheets: Record<string, string> = {};
  
  // Define sheet names, headers and targets
  const sheetsToCreate = [
    {
      name: 'DATA INDUK SISWA', // Single sheet as required
      parentFolder: '01_DATABASE',
      headers: [
        'ID SISWA', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'NIK', 'KTP Doc Url', 
        'No KK', 'KK Doc Url', 'Alamat Lengkap', 'Desa', 'Kecamatan', 'Kabupaten', 
        'Nama Ayah', 'Nama Ibu Kandung', 'Program', 'Kelas Tujuan', 'Jenjang Program', 
        'Ijazah Doc Url', 'No HP / WhatsApp', 'Email Gmail', 'Kode Referensi', 
        'Sumber Informasi', 'Folder ID', 'Link Folder', 'Status', 'Tanggal Terdaftar', 'NISN'
      ]
    },
    {
      name: 'REKAP_PENDAFTARAN',
      parentFolder: '01_DATABASE',
      headers: [
        'ID', 'Nama Lengkap', 'Email', 'WhatsApp', 'NISN', 
        'Program Pilihan', 'Status Pendaftaran', 'Catatan', 'Tanggal Submit'
      ]
    },
    {
      name: 'DATA_AKUN_SISWA',
      parentFolder: '01_DATABASE',
      headers: [
        'Email', 'Role', 'Nama Lengkap', 'Status Aktivasi', 'Password Hash', 'Tanggal Dibuat'
      ]
    },
    {
      name: 'MAPPING_CLASSROOM',
      parentFolder: '01_DATABASE',
      headers: [
        'Program Pilihan', 'Classroom ID', 'Nama Classroom'
      ]
    },
    {
      name: 'KONFIRMASI_IJAZAH',
      parentFolder: '05_IJAZAH',
      headers: [
        'ID', 'Nama Lengkap', 'NISN / No Peserta', 'Email', 'WhatsApp', 'Program Lulus', 
        'Tahun Lulus', 'Status Pengambilan', 'Tanggal Ambil', 'Diambil Oleh', 
        'Nama Pengambil', 'KTP Pengambil', 'Catatan', 'Tanggal Submit'
      ]
    },
    {
      name: 'RIWAYAT_MATERI_AI',
      parentFolder: '06_MATERI_PEMBELAJARAN',
      headers: [
        'ID', 'Classroom ID', 'Nama Course', 'Judul Materi', 'Tanggal Posting', 'Tipe Post'
      ]
    },
    {
      name: 'LOG_AKTIVITAS',
      parentFolder: '08_LOG_AKTIVITAS',
      headers: [
        'ID', 'Timestamp', 'Email', 'Tipe Aksi', 'Deskripsi'
      ]
    }
  ];

  // 4. Create sheets and write header rows if they are fresh files
  for (const sheetDef of sheetsToCreate) {
    const parentId = subfolders[sheetDef.parentFolder];
    const mimeType = 'application/vnd.google-apps.spreadsheet';
    
    let sheetId = await findFile(sheetDef.name, mimeType, parentId, accessToken);
    let isFresh = false;
    
    if (!sheetId || forceRecreate) {
      sheetId = await createFileInFolder(sheetDef.name, mimeType, parentId, accessToken);
      isFresh = true;
    }
    
    // Maintain backward compatible keys
    const configKey = sheetDef.name === 'DATA INDUK SISWA' ? 'DATABASE_SISWA' : sheetDef.name;
    sheets[configKey] = sheetId;

    if (sheetDef.name === 'DATA INDUK SISWA') {
      await ensureSheetTabs(sheetId, accessToken);
    } else if (isFresh) {
      // Write database headers to other sheets
      await updateSheetRange(sheetId, 'Sheet1!A1', [sheetDef.headers], accessToken);
    }
  }

  const driveConfig: DriveConfig = {
    rootFolderId,
    subfolders,
    sheets
  };

  // Cache configuration in client side local storage for quick offline fallback
  localStorage.setItem('pkbm_drive_config', JSON.stringify(driveConfig));

  return driveConfig;
}

/**
 * Find or create a specific student's folder under 07_UPLOAD_DOKUMEN_SISWA.
 * Format: NISN_NAMA_SISWA
 */
export async function getOrCreateStudentFolder(
  nisn: string,
  fullName: string,
  driveConfig: DriveConfig,
  accessToken: string
): Promise<string> {
  const parentFolderId = driveConfig.subfolders['07_UPLOAD_DOKUMEN_SISWA'];
  if (!parentFolderId) {
    throw new Error('Sistem Google Drive belum diinisialisasi. Lakukan inisialisasi terlebih dahulu!');
  }

  const folderName = `${nisn}_${fullName.toUpperCase().replace(/\s+/g, '_')}`;
  let folderId = await findFolder(folderName, parentFolderId, accessToken);
  if (!folderId) {
    folderId = await createFolder(folderName, parentFolderId, accessToken);
  }
  return folderId;
}

/**
 * Upload an actual document (KTP, KK, Photo, etc.) as a file inside a Student's folder in Google Drive.
 */
export async function uploadDocumentToDrive(
  folderId: string,
  fileName: string,
  fileBlob: Blob,
  accessToken: string
): Promise<{ id: string; viewLink: string }> {
  // 1. Metadata part
  const metadata = {
    name: fileName,
    parents: [folderId]
  };

  // 2. Drive multipart upload
  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', fileBlob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: form
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Upload berkas gagal: ${errorBody}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    viewLink: data.webViewLink || `https://drive.google.com/open?id=${data.id}`
  };
}

/**
 * List files inside any subfolder to permit standard folder monitoring inside dashboard.
 */
export async function listFilesInFolder(folderId: string, accessToken: string): Promise<Array<{ id: string; name: string; webViewLink?: string; createdTime?: string; mimeType?: string }>> {
  const query = `'${folderId}' in parents and trashed = false`;
  const url = `${DRIVE_BASE_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink,createdTime,mimeType)&orderBy=createdTime desc`;
  const data = await googleFetch(url, accessToken);
  return data.files || [];
}

/**
 * Save all local states into respective Google Drive sheets to achieve full persistence.
 */
export async function syncLocalDatabaseToDrive(
  driveConfig: DriveConfig,
  localData: {
    students: any[];
    ijazahs: any[];
    accounts: any[];
    mappings: any[];
    posts: any[];
    logs: any[];
  },
  accessToken: string
): Promise<void> {
  // Helper to safely format rows
  const stringify = (val: any) => (val === undefined || val === null ? '' : String(val));

  // 1. Sync students
  if (driveConfig.sheets['DATABASE_SISWA']) {
    const sheetId = driveConfig.sheets['DATABASE_SISWA'];

    const headers = [
      'ID SISWA', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'NIK', 'KTP Doc Url', 
      'No KK', 'KK Doc Url', 'Alamat Lengkap', 'Desa', 'Kecamatan', 'Kabupaten', 
      'Nama Ayah', 'Nama Ibu Kandung', 'Program', 'Kelas Tujuan', 'Jenjang Program', 
      'Ijazah Doc Url', 'No HP / WhatsApp', 'Email Gmail', 'Kode Referensi', 
      'Sumber Informasi', 'Folder ID', 'Link Folder', 'Status', 'Tanggal Terdaftar', 'NISN'
    ];

    // Overwrite DATA_INDUK tab with all students
    const rows = localData.students.map(s => [
      stringify(s.id),
      stringify(s.fullName),
      stringify(s.birthPlace),
      stringify(s.birthDate),
      stringify(s.nik),
      stringify(s.ktpDocUrl || s.documentUrl),
      stringify(s.noKk),
      stringify(s.kkDocUrl),
      stringify(s.address),
      stringify(s.village),
      stringify(s.subdistrict),
      stringify(s.regency),
      stringify(s.fatherName),
      stringify(s.motherName),
      stringify(s.packetStudy),
      stringify(s.studentClass),
      stringify(s.programDuration),
      stringify(s.ijazahDocUrl),
      stringify(s.whatsapp),
      stringify(s.email),
      stringify(s.referenceCode),
      stringify(s.infoSource),
      stringify(s.folderId),
      stringify(s.folderUrl),
      stringify(s.status),
      stringify(s.registeredAt),
      stringify(s.nisn)
    ]);

    await clearSheetRange(sheetId, 'DATA_INDUK!A1:AA1500', accessToken);
    await updateSheetRange(sheetId, 'DATA_INDUK!A1', [headers, ...rows], accessToken);

    // Distribute dynamically into the matching 9 class tabs
    const classTabs = [
      'KELAS_4_PAKET_A', 'KELAS_5_PAKET_A', 'KELAS_6_PAKET_A',
      'KELAS_7_PAKET_B', 'KELAS_8_PAKET_B', 'KELAS_9_PAKET_B',
      'KELAS_10_PAKET_C', 'KELAS_11_PAKET_C', 'KELAS_12_PAKET_C'
    ];

    for (const tab of classTabs) {
      const classStudents = localData.students.filter(s => {
        const studentTab = getClassTabName(s.studentClass, s.packetStudy);
        return studentTab === tab;
      });

      const tabRows = classStudents.map(s => [
        stringify(s.id),
        stringify(s.fullName),
        stringify(s.birthPlace),
        stringify(s.birthDate),
        stringify(s.nik),
        stringify(s.ktpDocUrl || s.documentUrl),
        stringify(s.noKk),
        stringify(s.kkDocUrl),
        stringify(s.address),
        stringify(s.village),
        stringify(s.subdistrict),
        stringify(s.regency),
        stringify(s.fatherName),
        stringify(s.motherName),
        stringify(s.packetStudy),
        stringify(s.studentClass),
        stringify(s.programDuration),
        stringify(s.ijazahDocUrl),
        stringify(s.whatsapp),
        stringify(s.email),
        stringify(s.referenceCode),
        stringify(s.infoSource),
        stringify(s.folderId),
        stringify(s.folderUrl),
        stringify(s.status),
        stringify(s.registeredAt),
        stringify(s.nisn)
      ]);

      await clearSheetRange(sheetId, `${tab}!A1:AA1000`, accessToken);
      await updateSheetRange(sheetId, `${tab}!A1`, [headers, ...tabRows], accessToken);
    }
  }

  // 2. Sync rekap pendaftaran
  if (driveConfig.sheets['REKAP_PENDAFTARAN']) {
    const rows = localData.students.map(s => [
      stringify(s.id),
      stringify(s.fullName),
      stringify(s.email),
      stringify(s.whatsapp),
      stringify(s.nisn),
      stringify(s.chosenProgram),
      stringify(s.status),
      'Pendaftaran Online Srikandi',
      stringify(s.registeredAt)
    ]);
    const headers = [[
      'ID', 'Nama Lengkap', 'Email', 'WhatsApp', 'NISN', 
      'Program Pilihan', 'Status Pendaftaran', 'Catatan', 'Tanggal Submit'
    ]];
    await updateSheetRange(driveConfig.sheets['REKAP_PENDAFTARAN'], 'Sheet1!A1', [...headers, ...rows], accessToken);
  }

  // 3. Sync accounts
  if (driveConfig.sheets['DATA_AKUN_SISWA']) {
    const rows = localData.accounts.map(a => [
      stringify(a.email),
      stringify(a.role),
      stringify(a.fullName),
      'Aktif',
      stringify(a.passwordHash),
      stringify(a.registeredAt)
    ]);
    const headers = [[
      'Email', 'Role', 'Nama Lengkap', 'Status Aktivasi', 'Password Hash', 'Tanggal Dibuat'
    ]];
    await updateSheetRange(driveConfig.sheets['DATA_AKUN_SISWA'], 'Sheet1!A1', [...headers, ...rows], accessToken);
  }

  // 4. Sync mappings
  if (driveConfig.sheets['MAPPING_CLASSROOM']) {
    const rows = localData.mappings.map(m => [
      stringify(m.programName),
      stringify(m.classroomId),
      stringify(m.classroomName)
    ]);
    const headers = [[
      'Program Pilihan', 'Classroom ID', 'Nama Classroom'
    ]];
    await updateSheetRange(driveConfig.sheets['MAPPING_CLASSROOM'], 'Sheet1!A1', [...headers, ...rows], accessToken);
  }

  // 5. Sync ijazahs
  if (driveConfig.sheets['KONFIRMASI_IJAZAH']) {
    const rows = localData.ijazahs.map(i => [
      stringify(i.id),
      stringify(i.fullName),
      stringify(i.nisnOrParticipantNum),
      stringify(i.email),
      stringify(i.whatsapp),
      stringify(i.programClass),
      stringify(i.graduationYear),
      stringify(i.diplomaStatus),
      stringify(i.pickUpDate),
      stringify(i.pickedUpBy),
      stringify(i.pickUpPersonName),
      stringify(i.pickUpPersonId),
      stringify(i.notes),
      stringify(i.submittedAt)
    ]);
    const headers = [[
      'ID', 'Nama Lengkap', 'NISN / No Peserta', 'Email', 'WhatsApp', 'Program Lulus', 
      'Tahun Lulus', 'Status Pengambilan', 'Tanggal Ambil', 'Diambil Oleh', 
      'Nama Pengambil', 'KTP Pengambil', 'Catatan', 'Tanggal Submit'
    ]];
    await updateSheetRange(driveConfig.sheets['KONFIRMASI_IJAZAH'], 'Sheet1!A1', [...headers, ...rows], accessToken);
  }

  // 6. Sync posts
  if (driveConfig.sheets['RIWAYAT_MATERI_AI']) {
    const rows = localData.posts.map(p => [
      stringify(p.id),
      stringify(p.courseId),
      stringify(p.courseName),
      stringify(p.title),
      stringify(p.postedAt),
      stringify(p.type)
    ]);
    const headers = [[
      'ID', 'Classroom ID', 'Nama Course', 'Judul Materi', 'Tanggal Posting', 'Tipe Post'
    ]];
    await updateSheetRange(driveConfig.sheets['RIWAYAT_MATERI_AI'], 'Sheet1!A1', [...headers, ...rows], accessToken);
  }

  // 7. Sync logs
  if (driveConfig.sheets['LOG_AKTIVITAS']) {
    const rows = localData.logs.map(l => [
      stringify(l.id),
      stringify(l.timestamp),
      stringify(l.adminEmail),
      stringify(l.actionType),
      stringify(l.description)
    ]);
    const headers = [[
      'ID', 'Timestamp', 'Email', 'Tipe Aksi', 'Deskripsi'
    ]];
    await updateSheetRange(driveConfig.sheets['LOG_AKTIVITAS'], 'Sheet1!A1', [...headers, ...rows], accessToken);
  }
}

/**
 * Reads existing sheet data to import it back into memory (Pull Sync)
 */
export async function pullDatabaseFromDrive(driveConfig: DriveConfig, accessToken: string) {
  const result: any = {};

  try {
    if (driveConfig.sheets['DATABASE_SISWA']) {
      const rows = await readSheetRange(driveConfig.sheets['DATABASE_SISWA'], 'DATA_INDUK!A2:AA', accessToken);
      result.students = rows.map((r: any) => ({
        id: r[0],
        fullName: r[1],
        birthPlace: r[2] || '',
        birthDate: r[3] || '',
        nik: r[4] || '',
        ktpDocUrl: r[5] || '',
        documentUrl: r[5] || '', // Backward compatibility
        noKk: r[6] || '',
        kkDocUrl: r[7] || '',
        address: r[8] || '',
        village: r[9] || '',
        subdistrict: r[10] || '',
        regency: r[11] || '',
        fatherName: r[12] || '',
        motherName: r[13] || '',
        packetStudy: r[14] || '',
        studentClass: r[15] || '',
        programDuration: r[16] || '',
        ijazahDocUrl: r[17] || '',
        whatsapp: r[18] || '',
        email: r[19] || '',
        referenceCode: r[20] || '',
        infoSource: r[21] || '',
        folderId: r[22] || '',
        folderUrl: r[23] || '',
        status: r[24] || 'Menunggu Verifikasi',
        registeredAt: r[25] || new Date().toISOString(),
        nisn: r[26] || '',
        chosenProgram: `${r[14] || ''} ${r[15] || ''}`, // Combined fallback
        birthPlaceDate: `${r[2] || ''}, ${r[3] || ''}` // Combined fallback for older views
      }));
    }
  } catch (err) {
    console.warn('Gagal menarik status database_siswa:', err);
  }

  try {
    if (driveConfig.sheets['DATA_AKUN_SISWA']) {
      const rows = await readSheetRange(driveConfig.sheets['DATA_AKUN_SISWA'], 'Sheet1!A2:F', accessToken);
      result.accounts = rows.map((r: any) => ({
        email: r[0],
        role: r[1] || 'siswa',
        fullName: r[2],
        statusAktivasi: r[3] || 'Aktif',
        passwordHash: r[4],
        registeredAt: r[5] || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Gagal menarik status akun siswa:', err);
  }

  try {
    if (driveConfig.sheets['MAPPING_CLASSROOM']) {
      const rows = await readSheetRange(driveConfig.sheets['MAPPING_CLASSROOM'], 'Sheet1!A2:C', accessToken);
      result.mappings = rows.map((r: any) => ({
        programName: r[0],
        classroomId: r[1],
        classroomName: r[2]
      }));
    }
  } catch (err) {
    console.warn('Gagal menarik mappings classroom:', err);
  }

  try {
    if (driveConfig.sheets['KONFIRMASI_IJAZAH']) {
      const rows = await readSheetRange(driveConfig.sheets['KONFIRMASI_IJAZAH'], 'Sheet1!A2:N', accessToken);
      result.ijazahs = rows.map((r: any) => ({
        id: r[0],
        fullName: r[1],
        nisnOrParticipantNum: r[2],
        email: r[3],
        whatsapp: r[4],
        programClass: r[5],
        graduationYear: r[6],
        diplomaStatus: r[7] || 'Belum diproses',
        pickUpDate: r[8],
        pickedUpBy: r[9] || 'Siswa',
        pickUpPersonName: r[10],
        pickUpPersonId: r[11],
        notes: r[12] || '',
        submittedAt: r[13] || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Gagal menarik konfirmasi ijazah:', err);
  }

  try {
    if (driveConfig.sheets['RIWAYAT_MATERI_AI']) {
      const rows = await readSheetRange(driveConfig.sheets['RIWAYAT_MATERI_AI'], 'Sheet1!A2:F', accessToken);
      result.posts = rows.map((r: any) => ({
        id: r[0],
        courseId: r[1],
        courseName: r[2],
        title: r[3],
        postedAt: r[4],
        type: r[5] || 'MATERIAL'
      }));
    }
  } catch (err) {
    console.warn('Gagal menarik riwayat materi AI:', err);
  }

  try {
    if (driveConfig.sheets['LOG_AKTIVITAS']) {
      const rows = await readSheetRange(driveConfig.sheets['LOG_AKTIVITAS'], 'Sheet1!A2:E', accessToken);
      result.logs = rows.map((r: any) => ({
        id: r[0],
        timestamp: r[1],
        adminEmail: r[2],
        actionType: r[3],
        description: r[4]
      }));
    }
  } catch (err) {
    console.warn('Gagal menarik log aktivitas:', err);
  }

  return result;
}

/**
 * Exports data and saves a JSON and CSV file inside the "09_BACKUP" folder.
 */
export async function createDriveBackup(
  driveConfig: DriveConfig,
  backupJSONData: any,
  accessToken: string
): Promise<{ jsonUrl: string; csvUrl: string }> {
  const backupFolderId = driveConfig.subfolders['09_BACKUP'];
  if (!backupFolderId) throw new Error('Folder 09_BACKUP belum terkonfigurasi!');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // 1. JSON Backup
  const jsonBlob = new Blob([JSON.stringify(backupJSONData, null, 2)], { type: 'application/json' });
  const jsonUpload = await uploadDocumentToDrive(
    backupFolderId,
    `BACKUP_DATA_${timestamp}.json`,
    jsonBlob,
    accessToken
  );

  // 2. CSV Summary Backup
  let csvContent = 'Tipe Data,Kunci Utama,Atribut Utama,Waktu Pembuatan\n';
  if (backupJSONData.students) {
    backupJSONData.students.forEach((s: any) => {
      csvContent += `SISWA,${s.nisn},"${s.fullName}",${s.registeredAt}\n`;
    });
  }
  if (backupJSONData.ijazahs) {
    backupJSONData.ijazahs.forEach((ij: any) => {
      csvContent += `IJAZAH,${ij.nisnOrParticipantNum},"${ij.fullName}",${ij.submittedAt}\n`;
    });
  }
  if (backupJSONData.logs) {
    backupJSONData.logs.slice(0, 50).forEach((l: any) => {
      csvContent += `LOG,${l.id},"[${l.actionType}] ${l.description.replace(/"/g, '""')}",${l.timestamp}\n`;
    });
  }

  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
  const csvUpload = await uploadDocumentToDrive(
    backupFolderId,
    `RINGKASAN_BACKUP_${timestamp}.csv`,
    csvBlob,
    accessToken
  );

  return {
    jsonUrl: jsonUpload.viewLink,
    csvUrl: csvUpload.viewLink
  };
}

/**
 * Creates a folder with specific return fields (ID and webViewLink).
 */
export async function createFolderWithLink(name: string, parentId: string | null, accessToken: string): Promise<{ id: string; webViewLink: string }> {
  const body: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    body.parents = [parentId];
  }
  const data = await googleFetch(`${DRIVE_BASE_URL}/files?fields=id,name,webViewLink`, accessToken, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return {
    id: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/open?id=${data.id}`
  };
}

/**
 * Gets a folder's web view link.
 */
export async function getFolderLink(folderId: string, accessToken: string): Promise<string> {
  const data = await googleFetch(`${DRIVE_BASE_URL}/files/${folderId}?fields=webViewLink`, accessToken);
  return data.webViewLink || `https://drive.google.com/open?id=${folderId}`;
}

/**
 * Creates the complete nested student folder structure:
 * APP MANAJEMEN SISWA / TAHUN AJARAN [YEAR] / [PAKET] / [KELAS] / [NIK_NAMA] / [5 Subfolders]
 */
export async function createStudentFolderStructure(
  student: {
    fullName: string;
    nik: string;
    academicYear: string;
    packetStudy: string;
    studentClass?: string;
  },
  rootFolderId: string,
  accessToken: string
): Promise<{ folderId: string; folderUrl: string; subfolderIds: Record<string, string> }> {
  // 1. TAHUN AJARAN [YEAR] folder (format year '2026/2027' as '2026-2027')
  const formattedYear = student.academicYear.replace(/\//g, '-');
  const yearFolderName = formattedYear; // Matches the required "2026-2027" format precisely
  
  let yearFolderId = await findFolder(yearFolderName, rootFolderId, accessToken);
  if (!yearFolderId) {
    yearFolderId = await createFolder(yearFolderName, rootFolderId, accessToken);
  }

  // 2. PACKET folder (e.g. PAKET C)
  const packetName = student.packetStudy.toUpperCase();
  let packetFolderId = await findFolder(packetName, yearFolderId, accessToken);
  if (!packetFolderId) {
    packetFolderId = await createFolder(packetName, yearFolderId, accessToken);
  }

  // 3. CLASS folder (e.g. KELAS 12)
  const classFolderName = (student.studentClass || 'KELAS 12').toUpperCase();
  let classFolderId = await findFolder(classFolderName, packetFolderId, accessToken);
  if (!classFolderId) {
    classFolderId = await createFolder(classFolderName, packetFolderId, accessToken);
  }

  // 4. STUDENT PERSONAL folder (e.g. 3276XXXXXXXX_AHMAD FAUZI)
  const studentFolderTitle = `${student.nik}_${student.fullName.toUpperCase().trim()}`;
  let studentFolderId = await findFolder(studentFolderTitle, classFolderId, accessToken);
  let folderUrl = '';

  if (!studentFolderId) {
    const res = await createFolderWithLink(studentFolderTitle, classFolderId, accessToken);
    studentFolderId = res.id;
    folderUrl = res.webViewLink;
  } else {
    folderUrl = await getFolderLink(studentFolderId, accessToken);
  }

  // 5. 5 REQUIRED SUBFOLDERS under student personal folder
  const requiredSubfolders = [
    '01_KTP',
    '02_KK',
    '03_IJAZAH',
    '04_PEMBAYARAN',
    '05_DOKUMEN_LAINNYA'
  ];

  const subfolderIds: Record<string, string> = {};
  for (const subName of requiredSubfolders) {
    let subId = await findFolder(subName, studentFolderId, accessToken);
    if (!subId) {
      subId = await createFolder(subName, studentFolderId, accessToken);
    }
    subfolderIds[subName] = subId;
  }

  return {
    folderId: studentFolderId,
    folderUrl,
    subfolderIds
  };
}
