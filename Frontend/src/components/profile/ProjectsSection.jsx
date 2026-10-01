import { useState } from 'react';
import { projectsApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors, TagInput, Modal } from '../ui';

const EMPTY = { title: '', description: '', techStack: [], link: '' };

export default function ProjectsSection({ profile, refresh }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const projects = profile.projects || [];

  const [editing, setEditing] = useState(null); // 'new' | project
  const [form, setForm] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const openNew = () => {
    resetFieldErrors();
    setFormErrors({});
    setForm({ ...EMPTY, techStack: [] });
    setEditing('new');
  };

  const openEdit = (p) => {
    resetFieldErrors();
    setFormErrors({});
    setForm({
      title: p.title || '',
      description: p.description || '',
      techStack: Array.isArray(p.techStack) ? p.techStack : [],
      link: p.link || '',
    });
    setEditing(p);
  };

  const close = () => setEditing(null);

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Required';
    if (!form.description.trim()) errs.description = 'Required';
    if (form.link && !/^https?:\/\/.+/i.test(form.link.trim())) errs.link = 'Must be a valid URL (https://…)';
    return errs;
  };

  const onSave = async (e) => {
    e.preventDefault();
    const errs = validate();
    setFormErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    resetFieldErrors();
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        techStack: form.techStack,
        link: form.link.trim() || null,
      };
      if (editing === 'new') await projectsApi.create(body);
      else await projectsApi.update(editing.id, body);
      toast.success(editing === 'new' ? 'Project added' : 'Project updated');
      close();
      await refresh();
    } catch (err) {
      applyApiError(err);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await projectsApi.remove(deleting.id);
      toast.success('Project deleted');
      setDeleting(null);
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="section-card-head">
        <div>
          <h2>Projects</h2>
          <p>Show off what you've built — with the tech stack behind each project.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state" style={{ padding: 32 }}>
          <div className="empty-title">No projects yet</div>
          <div className="empty-note">Add personal, academic, or professional projects.</div>
        </div>
      ) : (
        projects.map((p) => (
          <div key={p.id} className="entry-card">
            <div className="entry-card-head">
              <div>
                <div className="entry-title">{p.title}</div>
                {p.description && <div className="entry-sub">{p.description}</div>}
                <div className="job-meta">
                  {(p.techStack || []).map((t) => (
                    <span key={t} className="skill-chip">{t}</span>
                  ))}
                </div>
                {p.link && (
                  <div className="entry-meta">
                    <a href={p.link} target="_blank" rel="noreferrer">{p.link}</a>
                  </div>
                )}
              </div>
              <div className="entry-actions">
                <button className="icon-btn" onClick={() => openEdit(p)} title="Edit">✏️</button>
                <button className="icon-btn danger" onClick={() => setDeleting(p)} title="Delete">🗑️</button>
              </div>
            </div>
          </div>
        ))
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add Project' : 'Edit Project'} onClose={close} width={620}>
          <form onSubmit={onSave} noValidate>
            <Field label="Title" required error={formErrors.title || fieldErrors.title}>
              <input type="text" maxLength={200} value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </Field>
            <Field label="Description" required error={formErrors.description || fieldErrors.description}
              hint={`${form.description.length}/2000 characters`}>
              <textarea maxLength={2000} rows={4} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
            <Field label="Tech Stack (up to 20 tags)" error={fieldErrors.techStack}>
              <TagInput
                tags={form.techStack}
                onChange={(tags) => setForm((f) => ({ ...f, techStack: tags }))}
                placeholder="Type a technology and press Enter"
                max={20}
                maxLen={50}
              />
            </Field>
            <Field label="Link (optional)" error={formErrors.link || fieldErrors.link}>
              <input type="url" value={form.link} placeholder="https://…"
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={close}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete project" onClose={() => setDeleting(null)} width={420}>
          <p style={{ marginTop: 0 }}>Delete “{deleting.title}”? This cannot be undone.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={onDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
