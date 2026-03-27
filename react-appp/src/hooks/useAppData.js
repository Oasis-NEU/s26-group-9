import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const activityColors = ['#DCC9AE', '#BFA88D', '#8A7664', '#746455'];

function isMissingTableError(error) {
    return error?.code === '42P01';
}

async function queryWithFallback(primaryQuery, fallbackQuery) {
    const primaryResult = await primaryQuery();
    if (!primaryResult?.error || !isMissingTableError(primaryResult.error) || !fallbackQuery) {
        return primaryResult;
    }

    return fallbackQuery();
}

export default function useAppData() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [subtasks, setSubtasks] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [friendships, setFriendships] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError('');

        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError) {
            setUser(null);
            setProfile(null);
            setTasks([]);
            setSubtasks([]);
            setSessions([]);
            setFriendships([]);
            setError(authError.message);
            setIsLoading(false);
            return;
        }

        const currentUser = authData?.user || null;
        setUser(currentUser);

        if (!currentUser) {
            setProfile(null);
            setTasks([]);
            setSubtasks([]);
            setSessions([]);
            setFriendships([]);
            setIsLoading(false);
            return;
        }

        const userId = currentUser.id;

        const [profileResult, tasksResult, subtasksResult, sessionsResult, friendshipsResult] = await Promise.all([
            queryWithFallback(
                () => supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
                () => supabase.from('users').select('*').eq('id', userId).maybeSingle()
            ),
            supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('subtasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            queryWithFallback(
                () => supabase.from('sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                () => supabase.from('study_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
            ),
            supabase.from('friendships').select('*').or(`user_id.eq.${userId},friend_id.eq.${userId}`),
        ]);

        const blockingErrors = [tasksResult.error, friendshipsResult.error].filter(Boolean);
        if (blockingErrors.length > 0) {
            setError(blockingErrors[0].message);
        }

        if (profileResult.error && !isMissingTableError(profileResult.error)) {
            setError(profileResult.error.message);
        }

        if (sessionsResult.error && !isMissingTableError(sessionsResult.error)) {
            setError(sessionsResult.error.message);
        }

        if (subtasksResult.error && !isMissingTableError(subtasksResult.error)) {
            setError(subtasksResult.error.message);
        }

        setProfile(profileResult?.data || null);
        setTasks(Array.isArray(tasksResult?.data) ? tasksResult.data : []);
        setSubtasks(Array.isArray(subtasksResult?.data) ? subtasksResult.data : []);
        setSessions(Array.isArray(sessionsResult?.data) ? sessionsResult.data : []);
        setFriendships(Array.isArray(friendshipsResult?.data) ? friendshipsResult.data : []);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const activity = useMemo(() => {
        if (!Array.isArray(tasks) || tasks.length === 0) {
            return [];
        }

        const minutesByTaskId = new Map();

        sessions.forEach((session) => {
            const taskId = session?.task_id || session?.task;
            if (!taskId) {
                return;
            }

            const minutes = Number.parseInt(
                session?.duration_mins ?? session?.duration_minutes ?? session?.minutes,
                10
            );
            const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
            const existing = minutesByTaskId.get(taskId) || 0;
            minutesByTaskId.set(taskId, existing + safeMinutes);
        });

        return tasks.map((task, index) => {
            const minutesFromSessions = minutesByTaskId.get(task.id) || 0;
            const fallbackMinutes = Number.parseInt(task?.time_spent_mins, 10);
            const totalMinutes =
                minutesFromSessions > 0
                    ? minutesFromSessions
                    : Number.isFinite(fallbackMinutes) && fallbackMinutes > 0
                        ? fallbackMinutes
                        : 0;

            const hours = (totalMinutes / 60).toFixed(1);

            return {
                label: task?.title || task?.name || `Task ${index + 1}`,
                value: totalMinutes,
                color: activityColors[index % activityColors.length],
                displayValue: `${hours}h`,
            };
        });
    }, [tasks, sessions]);

    const addTask = useCallback(
        async (taskName) => {
            if (!user || !taskName?.trim()) {
                return { error: 'Unable to add task without a signed-in user.' };
            }

            const cleanName = taskName.trim();

            const { error: insertError } = await supabase.from('tasks').insert({
                user_id: user.id,
                title: cleanName,
                status: 'in_progress',
                time_spent_mins: 0,
            });

            if (insertError) {
                return { error: insertError.message };
            }

            await loadData();
            return { error: null };
        },
        [loadData, user]
    );

    return {
        user,
        profile,
        tasks,
        subtasks,
        sessions,
        friendships,
        activity,
        isLoading,
        error,
        refresh: loadData,
        addTask,
    };
}
