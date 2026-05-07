import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import styles from './Modal.module.css';

export default function NewTaskModal({ projectId, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    assignee_id: '', due_date: '', selectedProject: projectId || '',
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list().then(r => r.data.projects),
    enabled: !projectId,
  });

  const { data: membersData } = useQuery({
    queryKey: ['projectMembers', form.selectedProject],
    queryFn: () => projectsAPI.getById(form.selectedProject).then(r => r.data.members),
    enabled: !!form.selectedProject,
  });

  const projects = projectsData || [];
  const members = membersData || [];
  const targetProject = form.selectedProject;

  const createTask = useMutation({
    mutationFn: (data) => projectsAPI.createTask(targetProject, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projectTasks', targetProject] });
      qc.invalidateQueries({ queryKey: ['myTasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task created!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create task'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!targetProject) return toast.error('Please select a project');
    createTask.mutate({
      title: form.title,
      description: form.description,
      priority: form.priority,
      assignee_id: form.assignee_id || undefined,
      due_date: form.due_date || undefined,
    });
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Task</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Title *</label>
            <input className={styles.input} placeholder="What needs to be done?"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} rows={3} placeholder="Add more details..."
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          {!projectId && (
            <div className={styles.field}>
              <label className={styles.label}>Project *</label>
              <select className={styles.select}
                value={form.selectedProject} onChange={e => setForm({ ...form, selectedProject: e.target.value, assignee_id: '' })}>
                <option value="">Select a project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Priority</label>
              <select className={styles.select} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Due Date</label>
              <input type="date" className={styles.input}
                value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Assign To</label>
            <select className={styles.select} value={form.assignee_id}
              onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={createTask.isPending}>
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
