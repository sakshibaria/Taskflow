import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { projectsAPI } from '../../utils/api';
import NewProjectModal from '../projects/NewProjectModal';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNewProject, setShowNewProject] = useState(false);

  const { data } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list().then(r => r.data.projects),
  });

  const projects = data || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>✓</div>
          <span className={styles.logoText}>TaskFlow</span>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navLabel}>Menu</div>
          <NavLink to="/" end className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <span className={styles.navIcon}>⊞</span> Dashboard
          </NavLink>
          <NavLink to="/my-tasks" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <span className={styles.navIcon}>✓</span> My Tasks
          </NavLink>
        </nav>

        <div className={styles.projectsSection}>
          <div className={styles.navLabel}>Projects</div>
          {projects.map(p => (
            <NavLink
              key={p.id}
              to={`/projects/${p.id}`}
              className={({ isActive }) => `${styles.projItem} ${isActive ? styles.projActive : ''}`}
            >
              <span className={styles.projDot} style={{ background: p.color }} />
              <span className={styles.projName}>{p.name}</span>
            </NavLink>
          ))}
          <button className={styles.newProjBtn} onClick={() => setShowNewProject(true)}>
            + New Project
          </button>
        </div>

        <div className={styles.userArea}>
          <div className={styles.avatar} style={{ background: user?.avatar_color || '#5046e5' }}>
            {initials}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name}</div>
            <div className={styles.userEmail}>{user?.email}</div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>

      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}
    </div>
  );
}
