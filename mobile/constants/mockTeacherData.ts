export interface MockClass {
  id: string;
  name: string;
  subjectCode: string;
  description: string;
  joinCode: string;
  studentCount: number;
  activeSession: MockSession | null;
}

export interface MockSession {
  id: string;
  classId: string;
  className: string;
  subjectCode: string;
  code: string;
  title: string;
  durationMinutes: number;
  startedAt: string;
  expiresAt: string;
  status: 'active' | 'ended';
  presentCount: number;
  totalStudents: number;
}

export interface MockStudent {
  id: string;
  name: string;
  rollNumber: string;
  enrollmentNo: string;
  totalSessions: number;
  presentCount: number;
  percentage: number;
  belowThreshold: boolean;
}

export interface MockRosterEntry {
  studentId: string;
  name: string;
  rollNumber: string;
  status: 'present' | 'absent';
  method?: 'code' | 'manual' | null;
  markedAt?: string | null;
}

export interface MockHistorySession {
  id: string;
  title: string;
  date: string;
  presentCount: number;
  totalCount: number;
  status: 'active' | 'ended';
}

export const INITIAL_MOCK_CLASSES: MockClass[] = [
  {
    id: 'cls_1',
    name: 'Data Structures — A',
    subjectCode: 'CS301',
    description: 'Core CS course on arrays, linked lists, trees, graphs, and algorithmic complexity.',
    joinCode: 'K7MX4P',
    studentCount: 42,
    activeSession: {
      id: 'sess_1',
      classId: 'cls_1',
      className: 'Data Structures — A',
      subjectCode: 'CS301',
      code: '482913',
      title: 'Lecture 14 — Binary Search Trees',
      durationMinutes: 10,
      startedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
      status: 'active',
      presentCount: 31,
      totalStudents: 42,
    },
  },
  {
    id: 'cls_2',
    name: 'DBMS — B',
    subjectCode: 'CS305',
    description: 'Relational algebra, SQL, normalization, transactions, and indexing.',
    joinCode: 'M9PW2R',
    studentCount: 38,
    activeSession: null,
  },
  {
    id: 'cls_3',
    name: 'Operating Systems — C',
    subjectCode: 'CS304',
    description: 'Processes, threads, CPU scheduling, synchronization, and virtual memory.',
    joinCode: 'X4TZ7Q',
    studentCount: 40,
    activeSession: null,
  },
];

export const INITIAL_MOCK_STUDENTS: MockStudent[] = [
  {
    id: 'std_1',
    name: 'Riya Patel',
    rollNumber: '21CE045',
    enrollmentNo: '210010107045',
    totalSessions: 14,
    presentCount: 12,
    percentage: 85.7,
    belowThreshold: false,
  },
  {
    id: 'std_2',
    name: 'Amit Shah',
    rollNumber: '21CE012',
    enrollmentNo: '210010107012',
    totalSessions: 14,
    presentCount: 9,
    percentage: 64.3,
    belowThreshold: true,
  },
  {
    id: 'std_3',
    name: 'Pooja Sharma',
    rollNumber: '21CE089',
    enrollmentNo: '210010107089',
    totalSessions: 14,
    presentCount: 13,
    percentage: 92.9,
    belowThreshold: false,
  },
  {
    id: 'std_4',
    name: 'Karan Mehta',
    rollNumber: '21CE033',
    enrollmentNo: '210010107033',
    totalSessions: 14,
    presentCount: 10,
    percentage: 71.4,
    belowThreshold: true,
  },
  {
    id: 'std_5',
    name: 'Devanshi Desai',
    rollNumber: '21CE021',
    enrollmentNo: '210010107021',
    totalSessions: 14,
    presentCount: 14,
    percentage: 100.0,
    belowThreshold: false,
  },
  {
    id: 'std_6',
    name: 'Nikhil Joshi',
    rollNumber: '21CE054',
    enrollmentNo: '210010107054',
    totalSessions: 14,
    presentCount: 11,
    percentage: 78.6,
    belowThreshold: false,
  },
];

export const INITIAL_MOCK_ROSTER: MockRosterEntry[] = [
  {
    studentId: 'std_1',
    name: 'Riya Patel',
    rollNumber: '21CE045',
    status: 'present',
    method: 'code',
    markedAt: '10:02 AM',
  },
  {
    studentId: 'std_2',
    name: 'Amit Shah',
    rollNumber: '21CE012',
    status: 'absent',
    method: null,
    markedAt: null,
  },
  {
    studentId: 'std_3',
    name: 'Pooja Sharma',
    rollNumber: '21CE089',
    status: 'present',
    method: 'code',
    markedAt: '10:04 AM',
  },
  {
    studentId: 'std_4',
    name: 'Karan Mehta',
    rollNumber: '21CE033',
    status: 'absent',
    method: null,
    markedAt: null,
  },
  {
    studentId: 'std_5',
    name: 'Devanshi Desai',
    rollNumber: '21CE021',
    status: 'present',
    method: 'code',
    markedAt: '10:01 AM',
  },
  {
    studentId: 'std_6',
    name: 'Nikhil Joshi',
    rollNumber: '21CE054',
    status: 'present',
    method: 'manual',
    markedAt: '10:06 AM',
  },
];

export const INITIAL_MOCK_HISTORY: MockHistorySession[] = [
  {
    id: 'sess_1',
    title: 'Lecture 14 — Binary Search Trees',
    date: 'Today, 10:00 AM',
    presentCount: 31,
    totalCount: 42,
    status: 'active',
  },
  {
    id: 'sess_h2',
    title: 'Lecture 13 — AVL Trees & Rotations',
    date: '21 Nov 2026',
    presentCount: 38,
    totalCount: 42,
    status: 'ended',
  },
  {
    id: 'sess_h3',
    title: 'Lecture 12 — Tree Traversals (BFS & DFS)',
    date: '19 Nov 2026',
    presentCount: 36,
    totalCount: 42,
    status: 'ended',
  },
  {
    id: 'sess_h4',
    title: 'Lecture 11 — Stacks & Queues Lab',
    date: '17 Nov 2026',
    presentCount: 40,
    totalCount: 42,
    status: 'ended',
  },
  {
    id: 'sess_h5',
    title: 'Lecture 10 — Linked Lists Mid-Review',
    date: '14 Nov 2026',
    presentCount: 35,
    totalCount: 42,
    status: 'ended',
  },
];
