import { useState } from 'react';
import { socialLinksApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Field, useApiFieldErrors } from '../ui';

const PLATFORMS = [
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'GITHUB', label: 'GitHub' },
  { value: 'PORTFOLIO', label: 'Portfolio' },
  { value: 'OTHER', label: 'Other' },
];

export default function SocialLinksSection({ profile, refresh }) {
  const toast = useToast();
  const { fieldErrors, applyApiError, resetFieldErrors } = useApiFieldErrors();
  const links = profile.socialLinks || [];

  // Local draft per platform slot
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(PLATFORMS.map((p) => [p.value, links.find((l) => l.platform === p.value)?.url || '']))
  );
  const [busyPlatform, setBusyPlatform] = useState(null);

  const setDraft = (platform, v) => setDrafts((d) => ({ ...d, [platform]: v }));

  const saveSlot = async (platform) => {
    resetFieldErrors();
    const url = drafts[platform].trim();
    const existing = links.find((l) => l.platform === platform);
    if (url && !/^https?:\/\/.+/i.test(url)) {
      applyApiError({ errors: [{ field: 'url', message: 'Must be a valid URL (https://…)' }] });
      return;
    }
    setBusyPlatform(platform);
    try {
      if (existing && !url) {
        await socialLinksApi.remove(existing.id);
        toast.success('Link removed');
      } else if (existing && url !== existing.url) {
        await socialLinksApi.update(existing.id, { url });
        toast.success('Link updated');
      } else if (!existing && url) {
        await socialLinksApi.create({ platform, url });
        toast.success('Link added');
      } else {
        toast.info('Nothing to update');
        return;
      }
      await refresh();
    } catch (err) {
      applyApiError(err);
      toast.error(err.message);
    } finally {
      setBusyPlatform(null);
    }
  };

  return (
    <div>
      <div className="section-card-head">
        <div>
          <h2>Social Links</h2>
          <p>One link per platform, up to four slots.</p>
        </div>
      </div>

      {PLATFORMS.map((p) => {
        const existing = links.find((l) => l.platform === p.value);
        return (
          <div key={p.value} className="entry-card">
            <div className="entry-card-head">
              <div style={{ flex: 1 }}>
                <div className="entry-title">{p.label}</div>
                <div className="mt-8">
                  <Field error={fieldErrors.url} hint={existing ? undefined : 'Leave empty and save nothing, or paste a URL to add'}>
                    <input
                      type="url"
                      placeholder="https://…"
                      value={drafts[p.value]}
                      onChange={(e) => setDraft(p.value, e.target.value)}
                      style={{ maxWidth: 480 }}
                    />
                  </Field>
                  {existing && (
                    <div className="entry-meta">
                      <a href={existing.url} target="_blank" rel="noreferrer">{existing.url}</a>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={busyPlatform === p.value}
                  onClick={() => saveSlot(p.value)}
                >
                  {busyPlatform === p.value ? 'Saving…' : existing ? 'Update' : 'Add link'}
                </button>
                {existing && (
                  <button
                    className="btn btn-sm"
                    disabled={busyPlatform === p.value}
                    onClick={() => {
                      setDraft(p.value, '');
                      saveSlot(p.value);
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
