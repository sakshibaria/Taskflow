import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import styles from '../tasks/Modal.module.css';
import mStyles from './MembersModal.module.css';

export default function MembersModal({ projectId, members, isAdmin, onClose }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['project', projectId] });

  const addMember = useMutation({
    mutationFn: () => projectsAPI.addMember(projectId, { email, role }),
    onSuccess: () => { invalidate(); setEmail(''); toast.success('Member invited!'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to invite'),
  });

  const removeMember = useMutation({
    mutationFn: (userId) => projectsAPI.removeMember(projectId, userId),
    onSuccess: () => { invalidate(); toast.success('Member removed'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove'),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, newRole }) => projectsAPI.updateMemberRole(projectId, userId, newRole),
    onSuccess: () => { invalidate(); toast.success('Role updated'); },
  });

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Team Members</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.form}>
          <div className={mStyles.memberList}>
            {members.map(m => (
              <div key={m.id} className={mStyles.memberRow}>
                <div className={mStyles.memberAvatar} style={{ background: m.avatar_color }}>
                  {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className={mStyles.memberInfo}>
                  <div className={mStyles.memberName}>{m.name}</div>
                  <div className={mStyles.memberEmail}>{m.email}</div>
                </div>
                <div className={mStyles.memberActions}>
                  {isAdmin ? (
                    <select className={mStyles.roleSelect} value={m.role}
                      onChange={e => changeRole.mutate({ userId: m.id, newRole: e.target.value })}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`${mStyles.roleBadge} ${m.role === 'admin' ? mStyles.roleAdmin : mStyles.roleMember}`}>
                      {m.role}
                    </span>
                  )}
                  {isAdmin && (
                    <button className={mStyles.removeBtn}
                      onClick={() => { if (window.confirm(`Remove ${m.name}?`)) removeMember.mutate(m.id); }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className={mStyles.inviteSection}>
              <div className={styles.label}>Invite by Email</div>
              <div className={mStyles.inviteRow}>
                <input className={styles.input} type="email" placeholder="teammate@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
                <select className={styles.select} value={role} onChange={e => setRole(e.target.value)}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button className={styles.btnPrimary} onClick={() => addMember.mutate()}
                  disabled={!email || addMember.isPending}>
                  {addMember.isPending ? '...' : 'Invite'}
                </button>
              </div>
            </div>
          )}

          <div className={styles.modalFooter} style={{ borderTop: 'none', paddingTop: 0 }}>
            <div />
            <button className={styles.btnGhost} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
