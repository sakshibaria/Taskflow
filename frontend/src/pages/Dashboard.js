import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { tasksAPI } from '../utils/api';
import { format, isPast, parseISO } from 'date-fns';
import NewTaskModal from '../components/tasks/NewTaskModal';
import styles from './Dashboard.module.css';

const PRIORITY_COLORS = { urgent: '#fee2e2', high: '#fef3c7', medium: '#dbeafe', low: '#f0fdf4' };
const PRIORITY_TEXT = { urgent: '#991b1b', high: '#92400e', medium: '#1e40af', low: '#166534' };
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

export default function Dashboard() {
  const [showNewTask, setShowNewTask] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => tasksAPI.getDashboard().then(r => r.data),
  });

  if (isLoading) return <div className={styles.loading}>Loading dashboard...</div>;

  const stats = data?.stats || {};
  const recentTasks = data?.recentTasks || [];
  const overdueTasks = data?.overdueTasks || [];

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSub}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowNewTask(true)}>+ New Task</button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Projects</div>
          <div className={styles.statValue}>{stats.total_projects || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>My Tasks</div>
          <div className={styles.statValue}>{stats.my_tasks || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Completed</div>
          <div className={styles.statValue} style={{ color: '#16a34a' }}>{stats.completed_tasks || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Overdue</div>
          <div className={styles.statValue} style={{ color: '#e11d48' }}>{stats.overdue_tasks || 0}</div>
        </div>
      </div>

      {overdueTasks.length > 0 && (
        <div className={styles.alert}>
          ⚠️ <strong>{overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'}</strong>
          {' · '}{overdueTasks.map(t => t.title).slice(0, 2).join(', ')}
          {overdueTasks.length > 2 && ` and ${overdueTasks.length - 2} more`}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Recent Tasks</span>
          <Link to="/my-tasks" className={styles.sectionLink}>View all →</Link>
        </div>
        <div className={styles.taskList}>
          <div className={`${styles.taskRow} ${styles.taskRowHeader}`}>
            <div>Task</div>
            <div>Project</div>
            <div>Priority</div>
            <div>Status</div>
            <div>Due</div>
          </div>
          {recentTasks.length === 0 && (
            <div className={styles.empty}>No tasks yet. Create one to get started!</div>
          )}
          {recentTasks.map(task => {
            const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
            return (
              <div key={task.id} className={styles.taskRow}>
                <div className={styles.taskTitle}>{task.title}</div>
                <div>
                  <span className={styles.tag} style={{ background: task.project_color + '22', color: task.project_color }}>
                    {task.project_name}
                  </span>
                </div>
                <div>
                  <span className={styles.priorityBadge}
                    style={{ background: PRIORITY_COLORS[task.priority], color: PRIORITY_TEXT[task.priority] }}>
                    {task.priority}
                  </span>
                </div>
                <div>
                  <span className={`${styles.statusPill} ${styles['s_' + task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>
                <div className={isOverdue ? styles.overdue : styles.dueDate}>
                  {task.due_date ? format(parseISO(task.due_date), 'MMM d') : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} />}
    </div>
  );
}
