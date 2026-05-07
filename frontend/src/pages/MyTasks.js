import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI } from '../utils/api';
import { format, isPast, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import NewTaskModal from '../components/tasks/NewTaskModal';
import styles from './MyTasks.module.css';

const STATUS_OPTIONS = ['', 'todo', 'in_progress', 'review', 'done'];
const STATUS_LABELS = { '': 'All', todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const PRIORITY_COLORS = { urgent: ['#fee2e2','#991b1b'], high: ['#fef3c7','#92400e'], medium: ['#dbeafe','#1e40af'], low: ['#f0fdf4','#166534'] };

export default function MyTasks() {
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['myTasks', statusFilter],
    queryFn: () => tasksAPI.getMyTasks(statusFilter ? { status: statusFilter } : {}).then(r => r.data.tasks),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => tasksAPI.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myTasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Status updated');
    },
  });

  const tasks = data || [];

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.pageTitle}>My Tasks</h1>
        <div className={styles.filters}>
          {STATUS_OPTIONS.map(s => (
            <button key={s} className={`${styles.filterBtn} ${statusFilter === s ? styles.filterActive : ''}`}
              onClick={() => setStatusFilter(s)}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowNewTask(true)}>+ New Task</button>
      </div>

      {isLoading && <div className={styles.loading}>Loading tasks...</div>}

      <div className={styles.taskList}>
        {!isLoading && tasks.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>✓</div>
            <p>No tasks here. You're all caught up!</p>
          </div>
        )}
        {tasks.map(task => {
          const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
          const [bg, fg] = PRIORITY_COLORS[task.priority] || ['#f1f3f7','#4a5568'];
          return (
            <div key={task.id} className={styles.taskCard}>
              <div className={styles.taskLeft}>
                <select
                  className={styles.statusSelect}
                  value={task.status}
                  onChange={e => updateStatus.mutate({ id: task.id, status: e.target.value })}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
                <div>
                  <div className={`${styles.taskTitle} ${task.status === 'done' ? styles.done : ''}`}>
                    {task.title}
                  </div>
                  <div className={styles.taskMeta}>
                    <span className={styles.projTag} style={{ background: task.project_color + '22', color: task.project_color }}>
                      {task.project_name}
                    </span>
                    {task.due_date && (
                      <span className={isOverdue ? styles.overdue : styles.dueDate}>
                        {isOverdue ? '⚠ ' : ''}
                        {format(parseISO(task.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className={styles.priorityBadge} style={{ background: bg, color: fg }}>
                {task.priority}
              </span>
            </div>
          );
        })}
      </div>

      {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} />}
    </div>
  );
}
