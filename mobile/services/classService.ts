import { api } from './api';

export interface ApiTeacher {
  id: string;
  name: string;
}

export interface ApiActiveSession {
  id: string;
  startedAt: string;
  expiresAt: string;
  sessionCode?: string; // Provided to teacher only
}

export interface ClassDto {
  id: string;
  name: string;
  subjectCode: string;
  description?: string;
  joinCode?: string; // Provided to teacher only
  teacher?: ApiTeacher; // Provided to student only
  studentCount?: number;
  activeSession?: ApiActiveSession | null;
  createdAt?: string;
}

export interface ClassStudentDto {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  enrollmentNo?: string;
  joinedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export const classService = {
  /**
   * Teacher creates a new class via POST /api/classes.
   */
  async createClass(payload: {
    name: string;
    subjectCode: string;
    description?: string;
  }): Promise<ClassDto> {
    const res = (await api.post('/classes', payload)) as unknown as ApiResponse<{ class: ClassDto }>;
    return res.data.class;
  },

  /**
   * Fetches classes for the authenticated role via GET /api/classes.
   */
  async getClasses(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ classes: ClassDto[]; meta?: PaginationMeta }> {
    const res = (await api.get('/classes', { params })) as unknown as ApiResponse<{ classes: ClassDto[] }>;
    return {
      classes: res.data.classes,
      meta: res.meta,
    };
  },

  /**
   * Fetches a single class by id via GET /api/classes/:id.
   */
  async getClassDetails(id: string): Promise<ClassDto> {
    const res = (await api.get(`/classes/${id}`)) as unknown as ApiResponse<{ class: ClassDto }>;
    return res.data.class;
  },

  /**
   * Teacher updates class name, subjectCode, or description via PUT /api/classes/:id.
   */
  async updateClass(
    id: string,
    payload: { name?: string; subjectCode?: string; description?: string }
  ): Promise<ClassDto> {
    const res = (await api.put(`/classes/${id}`, payload)) as unknown as ApiResponse<{ class: ClassDto }>;
    return res.data.class;
  },

  /**
   * Teacher soft-deletes a class via DELETE /api/classes/:id.
   */
  async deleteClass(id: string): Promise<void> {
    await api.delete(`/classes/${id}`);
  },

  /**
   * Student joins a class with 6-character join code via POST /api/classes/join.
   */
  async joinClass(joinCode: string): Promise<{ class: ClassDto; joinedAt: string }> {
    const res = (await api.post('/classes/join', {
      joinCode: joinCode.trim().toUpperCase(),
    })) as unknown as ApiResponse<{ class: ClassDto; joinedAt: string }>;
    return res.data;
  },

  /**
   * Teacher fetches enrolled students via GET /api/classes/:id/students.
   */
  async getClassStudents(
    id: string,
    params?: { page?: number; limit?: number; search?: string }
  ): Promise<{ students: ClassStudentDto[]; meta?: PaginationMeta }> {
    const res = (await api.get(`/classes/${id}/students`, {
      params,
    })) as unknown as ApiResponse<{ students: ClassStudentDto[] }>;
    return {
      students: res.data.students,
      meta: res.meta,
    };
  },

  /**
   * Teacher removes a student from a class via DELETE /api/classes/:id/students/:studentId.
   */
  async removeStudent(classId: string, studentId: string): Promise<void> {
    await api.delete(`/classes/${classId}/students/${studentId}`);
  },
};
