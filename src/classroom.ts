export interface ClassroomProfile {
  id: string;
  name: {
    displayName: string;
    givenName: string;
    familyName: string;
    fullName: string;
  };
  emailAddress?: string;
  photoUrl?: string;
}

export interface Teacher {
  courseId: string;
  userId: string;
  profile: ClassroomProfile;
}

export interface Student {
  courseId: string;
  userId: string;
  profile: ClassroomProfile;
}

export interface Course {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  ownerId: string;
  creationTime: string;
  alternateLink: string;
  courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
}

export interface CourseMaterial {
  driveFile?: {
    driveFile: {
      id: string;
      title: string;
      alternateLink: string;
      thumbnailUrl?: string;
    };
  };
  youtubeVideo?: {
    id: string;
    title: string;
    alternateLink: string;
    thumbnailUrl?: string;
  };
  link?: {
    url: string;
    title: string;
    alternateLink: string;
    thumbnailUrl?: string;
  };
  form?: {
    formUrl: string;
    title: string;
    responseUrl?: string;
    thumbnailUrl?: string;
  };
}

export interface CourseWork {
  courseId: string;
  id: string;
  title: string;
  description?: string;
  materials?: CourseMaterial[];
  state: 'PUBLISHED' | 'DRAFT' | 'DELETED';
  alternateLink: string;
  creationTime: string;
  workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  dueTime?: {
    hours?: number;
    minutes?: number;
    seconds?: number;
  };
}

export interface CourseWorkMaterial {
  courseId: string;
  id: string;
  title: string;
  description?: string;
  materials?: CourseMaterial[];
  state: 'PUBLISHED' | 'DRAFT' | 'DELETED';
  alternateLink: string;
  creationTime: string;
}

export const SANDBOX_COURSES: Course[] = [
  {
    id: 'sb_1',
    name: 'Agribisnis Tanaman Pangan - XI',
    ownerId: 'teacher_1',
    creationTime: '2026-06-10T08:00:00Z',
    alternateLink: 'https://classroom.google.com',
    courseState: 'ACTIVE'
  },
  {
    id: 'sb_2',
    name: 'Kewirausahaan Kreatif PKBM - XII',
    ownerId: 'teacher_1',
    creationTime: '2026-06-11T10:00:00Z',
    alternateLink: 'https://classroom.google.com',
    courseState: 'ACTIVE'
  }
];

const CLASSROOM_BASE_URL = 'https://classroom.googleapis.com/v1';

async function fetchWithAuth(url: string, accessToken: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
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
    throw new Error(`Classroom API error (${response.status}): ${errorDetails}`);
  }

  return response.json();
}

/**
 * List all courses (classes) the user is enrolled in or teaching.
 */
export async function listCourses(accessToken: string): Promise<Course[]> {
  const data = await fetchWithAuth(`${CLASSROOM_BASE_URL}/courses?courseStates=ACTIVE`, accessToken);
  return data.courses || [];
}

/**
 * List teachers for a specific class.
 */
export async function listTeachers(courseId: string, accessToken: string): Promise<Teacher[]> {
  const data = await fetchWithAuth(`${CLASSROOM_BASE_URL}/courses/${courseId}/teachers`, accessToken);
  return data.teachers || [];
}

/**
 * List students for a specific class.
 */
export async function listStudents(courseId: string, accessToken: string): Promise<Student[]> {
  const data = await fetchWithAuth(`${CLASSROOM_BASE_URL}/courses/${courseId}/students`, accessToken);
  return data.students || [];
}

/**
 * List assignments and questions (coursework) for a class.
 */
export async function listCourseWork(courseId: string, accessToken: string): Promise<CourseWork[]> {
  const data = await fetchWithAuth(`${CLASSROOM_BASE_URL}/courses/${courseId}/courseWork`, accessToken);
  return data.courseWork || [];
}

/**
 * List coursework materials (resources, guides, extra links) for a class.
 */
export async function listCourseWorkMaterials(courseId: string, accessToken: string): Promise<CourseWorkMaterial[]> {
  const data = await fetchWithAuth(`${CLASSROOM_BASE_URL}/courses/${courseId}/courseWorkMaterials`, accessToken);
  return data.courseWorkMaterials || [];
}

/**
 * Publish an Assignment (Coursework) pointing to a Google Form template
 */
export async function createCourseWork(
  courseId: string,
  title: string,
  description: string,
  formUrl: string,
  formTitle: string,
  accessToken: string
): Promise<CourseWork> {
  const url = `${CLASSROOM_BASE_URL}/courses/${courseId}/courseWork`;
  const body = {
    title,
    description,
    state: 'PUBLISHED',
    workType: 'ASSIGNMENT',
    materials: [
      {
        link: {
          url: formUrl,
          title: formTitle
        }
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch (_) {
      errorDetail = `HTTP error ${response.status}`;
    }
    throw new Error(errorDetail || `HTTP error ${response.status}`);
  }

  return response.json();
}

/**
 * Publish a Material (Coursework Material) pointing to a Google Form template
 */
export async function createCourseWorkMaterial(
  courseId: string,
  title: string,
  description: string,
  formUrl: string,
  formTitle: string,
  accessToken: string
): Promise<CourseWorkMaterial> {
  const url = `${CLASSROOM_BASE_URL}/courses/${courseId}/courseWorkMaterials`;
  const body = {
    title,
    description,
    state: 'PUBLISHED',
    materials: [
      {
        link: {
          url: formUrl,
          title: formTitle
        }
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch (_) {
      errorDetail = `HTTP error ${response.status}`;
    }
    throw new Error(errorDetail || `HTTP error ${response.status}`);
  }

  return response.json();
}
