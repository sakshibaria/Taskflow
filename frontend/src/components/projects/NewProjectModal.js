import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import styles from '../tasks/Modal.module.css';

const COLORS = ['#5046e5', '#0d9488', '#d97706', '#e11d48', '#16a34a', '#0891b2', '#7c3aed', '#db2777'];

export default function NewProjectModal({ onClose }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', color: '#5046e5', due_date: '' });

  const createProject = useMutation({
    mutationFn: (data) => projectsAPI.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created!');
      navigate(`/projects/${res.data.project.id}`);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create project'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Project name is required');
    createProject.mutate(form);
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Project</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Project Name *</label>
            <input className={styles.input} placeholder="e.g. Website Redesign"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} rows={2} placeholder="What is this project about?"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 28, height: 28, borderRadius: 7, background: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid #0f1117' : '3px solid transparent',
                      transition: 'border 0.15s'
                    }} />
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Due Date</label>
              <input type="date" className={styles.input}
                value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={createProject.isPending}>
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
