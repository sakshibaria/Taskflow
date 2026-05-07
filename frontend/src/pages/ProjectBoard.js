import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsAPI, tasksAPI } from '../utils/api';
import { format, isPast, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import NewTaskModal from '../components/tasks/NewTaskModal';
import MembersModal from '../components/projects/MembersModal';
import styles from './ProjectBoard.module.css';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: '#718096' },
  { key: 'in_progress', label: 'In Progress', color: '#1d4ed8' },
  { key: 'review', label: 'Review', color: '#b45309' },
  { key: 'done', label: 'Done', color: '#16a34a' },
];

const PRIORITY_COLORS = { urgent: ['#fee2e2','#991b1b'], high: ['#fef3c7','#92400e'], medium: ['#dbeafe','#1e40af'], low: ['#f0fdf4','#166534'] };

export default function ProjectBoard() {
  const { projectId } = useParams();
  const [showNewTask, setShowNewTask] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [view, setView] = useState('board');
  const qc = useQueryClient();

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsAPI.getById(projectId).then(r => r.data),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => projectsAPI.getTasks(projectId).then(r => r.data.tasks),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => tasksAPI.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projectTasks', projectId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Status updated');
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id) => tasksAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projectTasks', projectId] });
      toast.success('Task deleted');
    },
  });

  const project = projectData?.project;
  const members = projectData?.members || [];
  const tasks = tasksData || [];
  const isAdmin = project?.my_role === 'admin';

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  const totalDone = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  if (!project) return <div className={styles.loading}>Loading project...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <div className={styles.projectColor} style={{ background: project.color }} />
          <div>
            <h1 className={styles.pageTitle}>{project.name}</h1>
            {project.description && <p className={styles.pageSub}>{project.description}</p>}
          </div>
        </div>
        <div className={styles.topbarRight}>
          <div className={styles.memberAvatars}>
            {members.slice(0, 4).map(m => (
              <div key={m.id} className={styles.memberAvatar} style={{ background: m.avatar_color }}
                title={`${m.name} (${m.role})`}>
                {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            ))}
            {members.length > 4 && <div className={styles.memberAvatar} style={{ background: '#9ca3af' }}>+{members.length - 4}</div>}
          </div>
          {isAdmin && (
            <button className={styles.btnGhost} onClick={() => setShowMembers(true)}>Manage Team</button>
          )}
          <div className={styles.viewTabs}>
            <button className={`${styles.viewTab} ${view === 'board' ? styles.viewTabActive : ''}`} onClick={() => setView('board')}>Board</button>
            <button className={`${styles.viewTab} ${view === 'list' ? styles.viewTabActive : ''}`} onClick={() => setView('list')}>List</button>
          </div>
          <button className={styles.btnPrimary} onClick={() => setShowNewTask(true)}>+ Add Task</button>
        </div>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%`, background: project.color }} />
      </div>
      <div className={styles.progressLabel}>{progress}% complete · {tasks.length} tasks</div>

      {view === 'board' ? (
        <div className={styles.board}>
          {COLUMNS.map(col => (
            <div key={col.key} className={styles.column}>
              <div className={styles.columnHeader}>
                <span className={styles.columnTitle} style={{ color: col.color }}>{col.label}</span>
                <span className={styles.columnCount}>{tasksByStatus[col.key].length}</span>
              </div>
              {tasksByStatus[col.key].map(task => {
                const [bg, fg] = PRIORITY_COLORS[task.priority] || ['#f1f3f7', '#4a5568'];
                const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
                return (
                  <div key={task.id} className={styles.taskCard}>
                    <div className={styles.taskCardTitle}>{task.title}</div>
                    <div className={styles.taskCardMeta}>
                      <span className={styles.priorityBadge} style={{ background: bg, color: fg }}>{task.priority}</span>
                      {task.assignee_name && (
                        <div className={styles.assigneeAvatar} style={{ background: task.assignee_color }} title={task.assignee_name}>
                          {task.assignee_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {task.due_date && (
                        <span className={isOverdue ? styles.overdue : styles.dueDate}>
                          {format(parseISO(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <select className={styles.moveSelect} value={task.status}
                      onChange={e => updateStatus.mutate({ id: task.id, status: e.target.value })}>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                );
              })}
              {tasksByStatus[col.key].length === 0 && (
                <div className={styles.emptyCol}>No tasks</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.listView}>
          <div className={`${styles.listRow} ${styles.listHeader}`}>
            <div>Task</div><div>Assignee</div><div>Priority</div><div>Status</div><div>Due</div><div></div>
          </div>
          {tasks.map(task => {
            const [bg, fg] = PRIORITY_COLORS[task.priority] || ['#f1f3f7', '#4a5568'];
            const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
            return (
              <div key={task.id} className={styles.listRow}>
                <div className={styles.listTitle}>{task.title}</div>
                <div>
                  {task.assignee_name ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className={styles.assigneeAvatar} style={{ background: task.assignee_color }}>
                        {task.assignee_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, color: '#4a5568' }}>{task.assignee_name.split(' ')[0]}</span>
                    </div>
                  ) : <span style={{ color: '#9ca3af', fontSize: 12 }}>Unassigned</span>}
                </div>
                <div><span className={styles.priorityBadge} style={{ background: bg, color: fg }}>{task.priority}</span></div>
                <div>
                  <select className={styles.moveSelect} value={task.status}
                    onChange={e => updateStatus.mutate({ id: task.id, status: e.target.value })}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className={isOverdue ? styles.overdue : styles.dueDate}>
                  {task.due_date ? format(parseISO(task.due_date), 'MMM d') : '—'}
                </div>
                <div>
                  {isAdmin && (
                    <button className={styles.deleteBtn} onClick={() => {
                      if (window.confirm('Delete this task?')) deleteTask.mutate(task.id);
                    }}>✕</button>
                  )}
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && <div className={styles.emptyList}>No tasks yet. Add one!</div>}
        </div>
      )}

      {showNewTask && <NewTaskModal projectId={projectId} onClose={() => setShowNewTask(false)} />}
      {showMembers && <MembersModal projectId={projectId} members={members} isAdmin={isAdmin} onClose={() => setShowMembers(false)} />}
    </div>
  );
}
