export interface MockStudentClass {
  id: string;
  name: string;
  subjectCode: string;
  teacherName: string;
  studentCount: number;
  percentage: number;
  totalSessions: number;
  presentCount: number;
  belowThreshold: boolean;
  activeSession: boolean;
  description?: string;
}

export interface MockStudentAttendanceRecord {
  id: string;
  sessionId: string;
  title: string;
  date: string;
  status: 'present' | 'absent';
  method?: 'code' | 'manual' | null;
  markedAt?: string | null;
}

export const INITIAL_STUDENT_CLASSES: MockStudentClass[] = [
  {
    id: 'cls_1',
    name: 'Data Structures — A',
    subjectCode: 'CS301',
    teacherName: 'Prof. Mehta',
    studentCount: 42,
    percentage: 85.7,
    totalSessions: 14,
    presentCount: 12,
    belowThreshold: false,
    activeSession: true,
    description: 'Core computer science course covering arrays, linked lists, trees, graphs, and algorithmic complexity.',
  },
  {
    id: 'cls_2',
    name: 'DBMS — B',
    subjectCode: 'CS305',
    teacherName: 'Dr. Verma',
    studentCount: 38,
    percentage: 64.3,
    totalSessions: 14,
    presentCount: 9,
    belowThreshold: true,
    activeSession: false,
    description: 'Relational database systems, SQL, relational algebra, schema normalization, and transaction processing.',
  },
  {
    id: 'cls_3',
    name: 'Operating Systems — C',
    subjectCode: 'CS304',
    teacherName: 'Prof. Sharma',
    studentCount: 40,
    percentage: 92.9,
    totalSessions: 14,
    presentCount: 13,
    belowThreshold: false,
    activeSession: false,
    description: 'Processes, concurrency, synchronization, CPU scheduling, memory management, and file systems.',
  },
];

export const INITIAL_STUDENT_RECORDS: MockStudentAttendanceRecord[] = [
  {
    id: 'rec_14',
    sessionId: 'sess_1',
    title: 'Lecture 14 — Binary Search Trees',
    date: 'Today, 10:00 AM',
    status: 'absent',
    method: null,
    markedAt: null,
  },
  {
    id: 'rec_13',
    sessionId: 'sess_h2',
    title: 'Lecture 13 — AVL Trees & Rotations',
    date: '21 Nov 2026, 10:02 AM',
    status: 'present',
    method: 'code',
    markedAt: '10:02 AM',
  },
  {
    id: 'rec_12',
    sessionId: 'sess_h3',
    title: 'Lecture 12 — Tree Traversals (BFS & DFS)',
    date: '19 Nov 2026, 10:04 AM',
    status: 'present',
    method: 'code',
    markedAt: '10:04 AM',
  },
  {
    id: 'rec_11',
    sessionId: 'sess_h4',
    title: 'Lecture 11 — Stacks & Queues Lab',
    date: '17 Nov 2026, 10:01 AM',
    status: 'present',
    method: 'code',
    markedAt: '10:01 AM',
  },
  {
    id: 'rec_10',
    sessionId: 'sess_h5',
    title: 'Lecture 10 — Linked Lists Mid-Review',
    date: '14 Nov 2026',
    status: 'absent',
    method: null,
    markedAt: null,
  },
  {
    id: 'rec_9',
    sessionId: 'sess_h6',
    title: 'Lecture 9 — Doubly Linked Lists',
    date: '12 Nov 2026, 10:03 AM',
    status: 'present',
    method: 'code',
    markedAt: '10:03 AM',
  },
  {
    id: 'rec_8',
    sessionId: 'sess_h7',
    title: 'Lecture 8 — Singly Linked Lists',
    date: '10 Nov 2026, 10:05 AM',
    status: 'present',
    method: 'code',
    markedAt: '10:05 AM',
  },
  {
    id: 'rec_7',
    sessionId: 'sess_h8',
    title: 'Lecture 7 — Dynamic Arrays & Vectors',
    date: '7 Nov 2026, 10:08 AM',
    status: 'present',
    method: 'manual',
    markedAt: '10:08 AM',
  },
  {
    id: 'rec_6',
    sessionId: 'sess_h9',
    title: 'Lecture 6 — Arrays & Strings',
    date: '5 Nov 2026, 10:01 AM',
    status: 'present',
    method: 'code',
    markedAt: '10:01 AM',
  },
  {
    id: 'rec_5',
    sessionId: 'sess_h10',
    title: 'Lecture 5 — Complexity & Big O Analysis',
    date: '3 Nov 2026, 10:02 AM',
    status: 'present',
    method: 'code',
    markedAt: '10:02 AM',
  },
];
