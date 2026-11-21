import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { classService, ClassDto, ClassStudentDto } from '../services/classService';
import { NormalizedApiError } from '../services/api';

/**
 * Hook to manage fetching and refreshing classes for the authenticated user.
 * Refetches automatically on screen focus (useFocusEffect) and supports pull-to-refresh.
 * Strict REST only — NO polling timers.
 */
export function useClasses() {
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useRef(true);

  const fetchClasses = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setError(null);
    }

    try {
      const res = await classService.getClasses();
      if (isMounted.current) {
        setClasses(res.classes);
        setError(null);
      }
    } catch (err: any) {
      if (isMounted.current) {
        const apiError = err as NormalizedApiError;
        setError(apiError.message || 'Failed to load classes.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      fetchClasses();
      return () => {
        isMounted.current = false;
      };
    }, [fetchClasses])
  );

  const refresh = useCallback(() => {
    fetchClasses(true);
  }, [fetchClasses]);

  return {
    classes,
    loading,
    error,
    refreshing,
    refresh,
    reload: fetchClasses,
  };
}

/**
 * Hook to manage fetching single class details with focus-refetch.
 */
export function useClassDetails(classId: string | undefined) {
  const [classDetails, setClassDetails] = useState<ClassDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useRef(true);

  const fetchClassDetails = useCallback(async (isRefresh = false) => {
    if (!classId) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setError(null);
    }

    try {
      const data = await classService.getClassDetails(classId);
      if (isMounted.current) {
        setClassDetails(data);
        setError(null);
      }
    } catch (err: any) {
      if (isMounted.current) {
        const apiError = err as NormalizedApiError;
        setError(apiError.message || 'Failed to load class details.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [classId]);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      fetchClassDetails();
      return () => {
        isMounted.current = false;
      };
    }, [fetchClassDetails])
  );

  const refresh = useCallback(() => {
    fetchClassDetails(true);
  }, [fetchClassDetails]);

  return {
    classDetails,
    loading,
    error,
    refreshing,
    refresh,
    reload: fetchClassDetails,
  };
}

/**
 * Hook to manage fetching student roster for a class with search and remove actions.
 */
export function useClassStudents(classId: string | undefined, search?: string) {
  const [students, setStudents] = useState<ClassStudentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useRef(true);

  const fetchStudents = useCallback(async (isRefresh = false) => {
    if (!classId) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setError(null);
    }

    try {
      const res = await classService.getClassStudents(classId, { search: search?.trim() });
      if (isMounted.current) {
        setStudents(res.students);
        setError(null);
      }
    } catch (err: any) {
      if (isMounted.current) {
        const apiError = err as NormalizedApiError;
        setError(apiError.message || 'Failed to load students.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [classId, search]);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      fetchStudents();
      return () => {
        isMounted.current = false;
      };
    }, [fetchStudents])
  );

  // Refetch when search query changes
  useEffect(() => {
    fetchStudents();
  }, [search, fetchStudents]);

  const refresh = useCallback(() => {
    fetchStudents(true);
  }, [fetchStudents]);

  const removeStudent = async (studentId: string) => {
    if (!classId) return;
    await classService.removeStudent(classId, studentId);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  return {
    students,
    loading,
    error,
    refreshing,
    refresh,
    reload: fetchStudents,
    removeStudent,
  };
}
