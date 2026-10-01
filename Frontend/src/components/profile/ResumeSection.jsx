import { useRef, useState } from 'react';
import { uploadResume, downloadResumeFile, deleteResumeApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, downloadBlob, formatDate } from '../ui';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default function ResumeSection({ profile, refresh }) {
  const toast = useToast();
  const resume = profile.resume; // Resume record or null
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);

  const validateFile = (file) => {
    if (!file) return null;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are allowed.';
    }
    if (file.size > MAX_BYTES) {
      return 'File is larger than 5MB.';
    }
    return null;
  };

  const doUpload = async (file) => {
    const problem = validateFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('resume', file); // field name MUST be "resume"
      const res = await uploadResume(fd);
      toast.success(res.message || 'Resume uploaded');
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    doUpload(e.dataTransfer.files?.[0]);
  };

  const onDownload = async () => {
    setBusy(true);
    try {
      const { blob } = await downloadResumeFile();
      downloadBlob(blob, 'resume.pdf');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await deleteResumeApi();
      toast.success('Resume deleted');
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
          <h2>Resume</h2>
          <p>PDF only, max 5MB. One resume is kept — uploading a new one replaces it.</p>
        </div>
      </div>

      {resume ? (
        <div className="entry-card">
          <div className="entry-card-head">
            <div>
              <div className="entry-title">Resume uploaded ✓</div>
              <div className="entry-meta">
                <span>Uploaded: {formatDate(resume.uploadedAt)}</span>
              </div>
            </div>
            <div className="flex">
              <button className="btn btn-sm" onClick={onDownload} disabled={busy}>Download</button>
              <button className="btn btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>Replace</button>
              <button className="btn btn-sm btn-danger" onClick={onDelete} disabled={busy}>Delete</button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`dropzone${drag ? ' drag' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <div style={{ fontSize: 30, marginBottom: 8 }}>📄</div>
          <strong>Drag &amp; drop your resume here</strong>
          <div className="text-sm mt-8">or click to browse — PDF only, max 5MB</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) doUpload(file);
          e.target.value = '';
        }}
      />

      {resume && busy && <p className="muted text-sm mt-8">Working…</p>}
    </div>
  );
}
