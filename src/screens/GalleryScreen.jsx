import { useState, useRef } from 'react';
import { generateId } from '../utils/uuid.js';
import { getPhotos, savePhoto, deletePhoto, compressImage } from '../utils/photoStorage.js';
import { BREAD_PHOTOS } from '../data/mockCommunity.js';

function PhotoModal({ photo, onClose, onDelete }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="photo-modal" onClick={e => e.stopPropagation()}>
        <img src={photo.src} alt={photo.caption} className="photo-modal-img" />
        <div className="photo-modal-body">
          {photo.caption && <p className="photo-modal-caption">{photo.caption}</p>}
          <div className="photo-modal-meta">
            {photo.recipeName && <span className="gallery-chip">{photo.recipeName}</span>}
            <span className="gallery-chip">{new Date(photo.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="photo-modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-danger" onClick={() => { onDelete(photo.id); onClose(); }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function GalleryScreen() {
  const [photos,    setPhotos]    = useState(() => getPhotos());
  const [selected,  setSelected]  = useState(null);
  const [uploading, setUploading] = useState(false);
  const [caption,   setCaption]   = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [pending,   setPending]   = useState(null); // { src } awaiting caption
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const src = await compressImage(file);
      setPending({ src });
    } catch {
      alert('Could not process image. Try a different file.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const confirmUpload = () => {
    const photo = {
      id: generateId(),
      src: pending.src,
      caption: caption.trim(),
      recipeName: recipeName.trim(),
      createdAt: new Date().toISOString(),
    };
    savePhoto(photo);
    setPhotos(getPhotos());
    setPending(null);
    setCaption('');
    setRecipeName('');
  };

  const handleDelete = (id) => {
    deletePhoto(id);
    setPhotos(getPhotos());
  };

  const communityPhotos = BREAD_PHOTOS.map((src, i) => ({
    id: `community-${i}`,
    src,
    caption: 'Community inspiration',
    recipeName: '',
    createdAt: new Date(Date.now() - i * 86400_000 * 3).toISOString(),
    community: true,
  }));

  const allPhotos = [...photos, ...communityPhotos];

  return (
    <div className="screen gallery-screen">
      <div className="screen-header">
        <span className="screen-title">Gallery</span>
        <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Processing…' : '+ Add Photo'}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {pending && (
        <div className="modal-overlay" onClick={() => setPending(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Photo</h3>
            <img src={pending.src} alt="Preview" style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 280, objectFit: 'cover' }} />
            <div className="form-group">
              <label className="form-label">Recipe name (optional)</label>
              <input className="form-input" placeholder="e.g. Country Sourdough" value={recipeName}
                onChange={e => setRecipeName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Caption (optional)</label>
              <input className="form-input" placeholder="Tell the story…" value={caption}
                onChange={e => setCaption(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmUpload}>Save Photo</button>
            </div>
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div className="gallery-section-label">Your Bakes</div>
      )}

      <div className="gallery-grid">
        {allPhotos.map((photo, i) => (
          <button
            key={photo.id}
            className={`gallery-thumb${photo.community ? ' gallery-thumb--community' : ''}`}
            style={{ '--i': i }}
            onClick={() => setSelected(photo)}
          >
            <img src={photo.src} alt={photo.caption} loading="lazy" />
            {photo.recipeName && <div className="gallery-thumb-label">{photo.recipeName}</div>}
          </button>
        ))}
      </div>

      {selected && (
        <PhotoModal
          photo={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
