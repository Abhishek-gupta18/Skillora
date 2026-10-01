import { useEffect, useMemo, useRef, useState } from 'react';
import { skillsApi, getMasterSkills } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors, StarRating, Modal, Badge } from '../ui';

const LEVEL_LABELS = { 1: 'Novice', 2: 'Basic', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' };

export default function SkillsSection({ profile, refresh }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const claims = profile.skillClaims || [];

  const [masterSkills, setMasterSkills] = useState(null); // null = not loaded
  const [skillsError, setSkillsError] = useState('');

  // GET /api/v1/skills — master skill list.
  // NOTE: this endpoint does not exist on the backend yet (see README).
  useEffect(() => {
    let alive = true;
    getMasterSkills()
      .then((res) => alive && setMasterSkills(Array.isArray(res.data) ? res.data : []))
      .catch((err) => alive && setSkillsError(err.status === 404 || err.status === 0
        ? 'The master skill list endpoint (GET /api/v1/skills) is not available yet — skill claims cannot be added until the backend ships it.'
        : err.message));
    return () => {
      alive = false;
    };
  }, []);

  const claimedIds = useMemo(() => new Set(claims.map((c) => c.skillId)), [claims]);

  const [editing, setEditing] = useState(null); // 'new' | claim
  const [skillQuery, setSkillQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState(null); // {id, name, category}
  const [level, setLevel] = useState(3);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const searchRef = useRef(null);

  const openNew = () => {
    resetFieldErrors();
    setSelectedSkill(null);
    setSkillQuery('');
    setLevel(3);
    setEditing('new');
  };

  const openEdit = (claim) => {
    resetFieldErrors();
    setSelectedSkill(claim.skill); // nested include from GET /profile/me
    setSkillQuery(claim.skill?.name || '');
    setLevel(claim.selfRatedLevel);
    setEditing(claim);
  };

  const close = () => setEditing(null);

  const filteredSkills = useMemo(() => {
    if (!masterSkills) return [];
    const q = skillQuery.trim().toLowerCase();
    return masterSkills
      .filter((s) => !claimedIds.has(s.id))
      .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q))
      .slice(0, 50);
  }, [masterSkills, skillQuery, claimedIds]);

  const onSave = async (e) => {
    e.preventDefault();
    resetFieldErrors();
    if (!selectedSkill) {
      applyApiError({ errors: [{ field: 'skillId', message: 'Select a skill' }] });
      return;
    }
    setBusy(true);
    try {
      const body = { skillId: selectedSkill.id, selfRatedLevel: level };
      if (editing === 'new') await skillsApi.create(body);
      else await skillsApi.update(editing.id, body);
      toast.success(editing === 'new' ? 'Skill claimed' : 'Skill updated');
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
      await skillsApi.remove(deleting.id);
      toast.success('Skill removed');
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
          <h2>Skills</h2>
          <p>Claim the skills you own and self-rate your level (1–5). Verified Scores come only from future assessments — they are read-only.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Skill</button>
      </div>

      {skillsError && <div className="banner banner-warn">{skillsError}</div>}

      {claims.length === 0 && !skillsError ? (
        <div className="empty-state" style={{ padding: 32 }}>
          <div className="empty-title">No skills claimed yet</div>
          <div className="empty-note">Claimed skills drive your match scores for every job.</div>
        </div>
      ) : (
        claims.map((claim) => (
          <div key={claim.id} className="entry-card">
            <div className="entry-card-head">
              <div>
                <div className="entry-title">
                  {claim.skill?.name || 'Unknown skill'}{' '}
                  {claim.skill?.category && <Badge tone="gray">{claim.skill.category}</Badge>}
                </div>
                <div className="entry-sub">Self-rated: {LEVEL_LABELS[claim.selfRatedLevel] || claim.selfRatedLevel}</div>
                <div className="entry-meta">
                  <span>
                    Verified Score:{' '}
                    {claim.verifiedScore == null ? (
                      <span className="muted">Not yet assessed</span>
                    ) : (
                      <strong>{claim.verifiedScore}</strong>
                    )}
                  </span>
                </div>
              </div>
              <div className="entry-actions">
                <StarRating value={claim.selfRatedLevel} readOnly />
                <button className="icon-btn" onClick={() => openEdit(claim)} title="Edit">✏️</button>
                <button className="icon-btn danger" onClick={() => setDeleting(claim)} title="Delete">🗑️</button>
              </div>
            </div>
          </div>
        ))
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Claim a skill' : 'Edit skill'} onClose={close}>
          <form onSubmit={onSave} noValidate>
            <Field label="Skill" required error={fieldErrors.skillId}>
              {editing !== 'new' ? (
                <input type="text" value={selectedSkill?.name || ''} disabled />
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search skills…"
                    value={selectedSkill ? selectedSkill.name : skillQuery}
                    onChange={(e) => {
                      setSelectedSkill(null);
                      setSkillQuery(e.target.value);
                    }}
                  />
                  {!selectedSkill && skillQuery && filteredSkills.length > 0 && (
                    <div
                      className="card"
                      style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, maxHeight: 260, overflowY: 'auto', padding: 6, marginTop: 4 }}
                    >
                      {filteredSkills.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="profile-tab"
                          style={{ width: '100%' }}
                          onClick={() => {
                            setSelectedSkill(s);
                            setSkillQuery(s.name);
                          }}
                        >
                          <span>{s.name}</span>
                          <span className="muted text-sm">{s.category}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {skillQuery && !selectedSkill && masterSkills && filteredSkills.length === 0 && (
                    <div className="field-hint">No unclaimed skills match “{skillQuery}”.</div>
                  )}
                </div>
              )}
            </Field>

            <Field label="Self-Rated Level" required>
              <div className="flex" style={{ gap: 14 }}>
                <StarRating value={level} onChange={setLevel} />
                <span className="text-sm muted">{LEVEL_LABELS[level]}</span>
              </div>
            </Field>

            <Field label="Verified Score" hint="Read-only — set only by the assessment system.">
              <input
                type="text"
                value={editing !== 'new' && editing.verifiedScore != null ? editing.verifiedScore : 'Not yet assessed'}
                disabled
                style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
              />
            </Field>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={close}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Remove skill" onClose={() => setDeleting(null)} width={420}>
          <p style={{ marginTop: 0 }}>Remove “{deleting.skill?.name}” from your claimed skills?</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={onDelete} disabled={busy}>{busy ? 'Removing…' : 'Remove'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
