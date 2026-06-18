export interface GoogleFormFile {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
}

export interface FormQuestion {
  title: string;
  type: 'TEXT' | 'MULTIPLE_CHOICE' | 'CHECKBOX';
  options?: string[];
  required?: boolean;
}

export interface FormDetails {
  formId: string;
  title: string;
  documentTitle?: string;
  responderUri: string;
  editUrl: string;
  items?: any[];
}

export interface FormResponseItem {
  responseId: string;
  submittedAt: string;
  answers: Record<string, {
    questionId: string;
    textAnswers: string[];
  }>;
  respondentEmail?: string;
}

// Sandbox fallback mock data
export const SANDBOX_FORMS: GoogleFormFile[] = [
  {
    id: 'f_sb_1',
    name: 'Evaluasi Pembelajaran: Budidaya Tanaman Pangan',
    webViewLink: 'https://docs.google.com/forms',
    createdTime: '2026-06-12T09:00:00Z'
  },
  {
    id: 'f_sb_2',
    name: 'Kuis Kewirausahaan: Penyusunan Kanvas Bisnis Sederhana',
    webViewLink: 'https://docs.google.com/forms',
    createdTime: '2026-06-15T11:30:00Z'
  }
];

export const SANDBOX_FORM_DETAILS: Record<string, FormDetails> = {
  'f_sb_1': {
    formId: 'f_sb_1',
    title: 'Evaluasi Pembelajaran: Budidaya Tanaman Pangan',
    responderUri: 'https://docs.google.com/forms/d/e/dummy-id/viewform',
    editUrl: 'https://docs.google.com/forms/d/dummy-id/edit',
    items: [
      {
        itemId: 'q1',
        title: 'Berapakah tingkat pH tanah yang ideal untuk menanam tanaman padi sawah?',
        questionItem: {
          question: {
            questionId: 'q1_id',
            required: true,
            choiceQuestion: {
              type: 'RADIO',
              options: [
                { value: 'Keasaman Tinggi (pH 3.5 - 4.5)' },
                { value: 'Netral hingga Agak Asam (pH 5.5 - 6.5)' },
                { value: 'Basa Kuat (pH 8.0 - 9.0)' }
              ]
            }
          }
        }
      },
      {
        itemId: 'q2',
        title: 'Sebutkan jenis pupuk alami yang paling aman digunakan untuk memelihara humus tanah sawah Anda.',
        questionItem: {
          question: {
            questionId: 'q2_id',
            required: true,
            textQuestion: {}
          }
        }
      }
    ]
  },
  'f_sb_2': {
    formId: 'f_sb_2',
    title: 'Kuis Kewirausahaan: Penyusunan Kanvas Bisnis Sederhana',
    responderUri: 'https://docs.google.com/forms/d/e/dummy-id2/viewform',
    editUrl: 'https://docs.google.com/forms/d/dummy-id2/edit',
    items: [
      {
        itemId: 'q2_1',
        title: 'Apa elemen pertama yang harus ditentukan saat menyusun Business Model Canvas?',
        questionItem: {
          question: {
            questionId: 'q2_1_id',
            required: true,
            choiceQuestion: {
              type: 'RADIO',
              options: [
                { value: 'Value Proposition (Proposisi Nilai)' },
                { value: 'Customer Segments (Segmen Pelanggan)' },
                { value: 'Cost Structure (Struktur Biaya)' },
                { value: 'Revenue Streams (Arus Pendapatan)' }
              ]
            }
          }
        }
      }
    ]
  }
};

export const SANDBOX_FORM_RESPONSES: Record<string, FormResponseItem[]> = {
  'f_sb_1': [
    {
      responseId: 'r_1',
      submittedAt: '2026-06-15T15:24:00Z',
      respondentEmail: 'budi.santoso@classroom.demo',
      answers: {
        'q1_id': { questionId: 'q1_id', textAnswers: ['Netral hingga Agak Asam (pH 5.5 - 6.5)'] },
        'q2_id': { questionId: 'q2_id', textAnswers: ['Pupuk kandang kambing yang sudah difermentasi dan jerami padi kering.'] }
      }
    },
    {
      responseId: 'r_2',
      submittedAt: '2026-06-16T08:12:00Z',
      respondentEmail: 'siti.aminah@classroom.demo',
      answers: {
        'q1_id': { questionId: 'q1_id', textAnswers: ['Netral hingga Agak Asam (pH 5.5 - 6.5)'] },
        'q2_id': { questionId: 'q2_id', textAnswers: ['Kompos organik cair buatan rumahan dari sisa sayur dapur.'] }
      }
    }
  ],
  'f_sb_2': [
    {
      responseId: 'r_3',
      submittedAt: '2026-06-16T10:45:00Z',
      respondentEmail: 'dewi.lestari@classroom.demo',
      answers: {
        'q2_1_id': { questionId: 'q2_1_id', textAnswers: ['Customer Segments (Segmen Pelanggan)'] }
      }
    }
  ]
};

const DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3';
const FORMS_BASE_URL = 'https://forms.googleapis.com/v1';

async function fetchWithAuth(url: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
  });

  if (!response.ok) {
    let errorDetails = '';
    try {
      const errJson = await response.json();
      errorDetails = JSON.stringify(errJson);
    } catch {
      errorDetails = response.statusText;
    }
    throw new Error(`Google API request failed (${response.status}): ${errorDetails}`);
  }

  return response.json();
}

/**
 * List all Google Forms owned/accessible by the user in Google Drive.
 */
export async function listGoogleForms(accessToken: string): Promise<GoogleFormFile[]> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.form' and trashed = false");
  const url = `${DRIVE_BASE_URL}/files?q=${query}&fields=files(id,name,webViewLink,createdTime)&orderBy=createdTime desc`;
  const result = await fetchWithAuth(url, accessToken);
  return result.files || [];
}

/**
 * Retrieve details of a specific Google Form.
 */
export async function getGoogleForm(formId: string, accessToken: string): Promise<FormDetails> {
  const url = `${FORMS_BASE_URL}/forms/${formId}`;
  const rawForm = await fetchWithAuth(url, accessToken);
  
  return {
    formId: rawForm.formId,
    title: rawForm.info?.title || rawForm.info?.documentTitle || 'Formulir Tanpa Judul',
    documentTitle: rawForm.info?.documentTitle,
    responderUri: rawForm.responderUri,
    editUrl: `https://docs.google.com/forms/d/${rawForm.formId}/edit`,
    items: rawForm.items || []
  };
}

/**
 * Retrieve student responses for a specific Google Form.
 */
export async function getGoogleFormResponses(formId: string, accessToken: string): Promise<FormResponseItem[]> {
  const url = `${FORMS_BASE_URL}/forms/${formId}/responses`;
  const result = await fetchWithAuth(url, accessToken);
  
  const rawResponses = result.responses || [];
  return rawResponses.map((res: any) => {
    const answersMap: Record<string, { questionId: string; textAnswers: string[] }> = {};
    if (res.answers) {
      Object.keys(res.answers).forEach((qKey) => {
        const item = res.answers[qKey];
        const textAnswers = item.textAnswers?.answers?.map((ans: any) => ans.value) || [];
        answersMap[qKey] = {
          questionId: item.questionId,
          textAnswers
        };
      });
    }
    return {
      responseId: res.responseId,
      submittedAt: res.createTime || res.lastSubmittedTime,
      respondentEmail: res.respondentEmail,
      answers: answersMap
    };
  });
}

/**
 * Creates an interactive new Google Form structure.
 */
export async function createGoogleForm(
  title: string,
  questions: FormQuestion[],
  accessToken: string
): Promise<FormDetails> {
  const creationUrl = `${FORMS_BASE_URL}/forms`;
  
  // 1. Create the blank form container
  const rawNewForm = await fetchWithAuth(creationUrl, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      info: {
        title: title,
        documentTitle: title
      }
    })
  });

  const formId = rawNewForm.formId;

  // 2. Prepare batchUpdate payload if there are preset questions
  if (questions.length > 0) {
    const updateUrl = `${FORMS_BASE_URL}/forms/${formId}:batchUpdate`;
    
    const requests = questions.map((ques, index) => {
      const isChoice = ques.type === 'MULTIPLE_CHOICE' || ques.type === 'CHECKBOX';
      
      const questionPayload: any = {
        required: ques.required !== false
      };

      if (isChoice) {
        questionPayload.choiceQuestion = {
          type: ques.type === 'CHECKBOX' ? 'CHECKBOX' : 'RADIO',
          options: (ques.options || []).map(opt => ({ value: opt }))
        };
      } else {
        questionPayload.textQuestion = {};
      }

      return {
        createItem: {
          item: {
            title: ques.title,
            questionItem: {
              question: questionPayload
            }
          },
          location: {
            index: index
          }
        }
      };
    });

    try {
      await fetchWithAuth(updateUrl, accessToken, {
        method: 'POST',
        body: JSON.stringify({ requests })
      });
    } catch (batchErr) {
      console.error('Error adding questions in batch to the created form:', batchErr);
    }
  }

  // Reload the form info to return full detail structures
  return getGoogleForm(formId, accessToken);
}
