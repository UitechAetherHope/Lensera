import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { mergeStoredUser } from './api/auth';

import { patchUserProfile } from './api/profile';

import MineCoverCropModal from './MineCoverCropModal';

import { coverObjectPosition, parseProfileCoverFocus } from './utils/coverFocus';



function apiErrMessage(err) {

  return err?.response?.data?.message || err?.message || '保存失败';

}



const MINE_DEFAULT_COVER_URL =

  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1800&q=80';



/**

 * @param {{

 *   open: boolean,

 *   onClose: () => void,

 *   onSaved: () => void,

 *   onLogout?: () => void,

 *   profile: object | null,

 * }} props

 */

export default function MineEditProfileModal({ open, onClose, onSaved, onLogout, profile }) {

  const [userName, setUserName] = useState('');
  const [bio, setBio] = useState('');

  const [avatarFile, setAvatarFile] = useState(null);

  const [coverFile, setCoverFile] = useState(null);

  const [avatarPreview, setAvatarPreview] = useState('');

  const [coverPreview, setCoverPreview] = useState('');

  const [coverFocus, setCoverFocus] = useState({ x: 50, y: 50 });

  const [cropOpen, setCropOpen] = useState(false);

  const [cropSrc, setCropSrc] = useState('');

  const [cropFile, setCropFile] = useState(null);

  const [busy, setBusy] = useState(false);

  const [err, setErr] = useState('');



  const cropBlobRef = useRef(null);



  const initialName = profile?.userName ?? '';
  const initialBio = profile?.bio ?? '';

  const initialAvatarUrl = profile?.avatarUrl ?? null;

  const initialCoverUrl = profile?.coverImageUrl || profile?.coverUrl || MINE_DEFAULT_COVER_URL;

  const initialFocus = useMemo(() => parseProfileCoverFocus(profile), [profile]);



  const displayAvatar = avatarPreview || initialAvatarUrl;

  const displayCover = coverPreview || initialCoverUrl;



  const revokeCropBlob = useCallback(() => {

    if (cropBlobRef.current) {

      URL.revokeObjectURL(cropBlobRef.current);

      cropBlobRef.current = null;

    }

  }, []);



  useEffect(() => {

    if (!open) return;

    setUserName(profile?.userName ?? '');
    setBio(profile?.bio ?? '');

    setAvatarFile(null);

    setCoverFile(null);

    setAvatarPreview('');

    setCoverPreview('');

    setCoverFocus(parseProfileCoverFocus(profile));

    setCropOpen(false);

    setCropSrc('');

    setCropFile(null);

    revokeCropBlob();

    setErr('');

    setBusy(false);

  }, [open, profile, revokeCropBlob]);



  useEffect(() => () => revokeCropBlob(), [revokeCropBlob]);



  const handleClose = useCallback(() => {

    if (busy) return;

    onClose();

  }, [busy, onClose]);



  const openCropModal = useCallback(

    (file, previewUrl) => {

      revokeCropBlob();

      if (previewUrl.startsWith('blob:')) {

        cropBlobRef.current = previewUrl;

      }

      setCropFile(file);

      setCropSrc(previewUrl);

      setCropOpen(true);

    },

    [revokeCropBlob],

  );



  const onAvatarPick = useCallback((e) => {

    const f = e.target.files?.[0];

    e.target.value = '';

    if (!f) return;

    setAvatarFile(f);

    setAvatarPreview((prev) => {

      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);

      return URL.createObjectURL(f);

    });

  }, []);



  const onCoverPick = useCallback(

    (e) => {

      const f = e.target.files?.[0];

      e.target.value = '';

      if (!f) return;

      const url = URL.createObjectURL(f);

      openCropModal(f, url);

    },

    [openCropModal],

  );



  const openAdjustCover = useCallback(() => {

    if (!displayCover) return;

    openCropModal(null, displayCover);

  }, [displayCover, openCropModal]);



  const onCropConfirm = useCallback(

    ({ file, focusX, focusY }) => {

      setCoverFocus({ x: focusX, y: focusY });

      if (file) {

        setCoverFile(file);

        setCoverPreview((prev) => {

          if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);

          return URL.createObjectURL(file);

        });

      }

      setCropOpen(false);

      setCropSrc('');

      setCropFile(null);

      revokeCropBlob();

    },

    [revokeCropBlob],

  );



  const onCropClose = useCallback(() => {

    setCropOpen(false);

    setCropSrc('');

    setCropFile(null);

    revokeCropBlob();

  }, [revokeCropBlob]);



  const focusChanged =

    Math.abs(coverFocus.x - initialFocus.x) > 0.05 || Math.abs(coverFocus.y - initialFocus.y) > 0.05;



  const hasChanges = useMemo(() => {

    const nameChanged = userName.trim() !== initialName.trim();
    const bioChanged = bio.trim() !== initialBio.trim();

    return nameChanged || bioChanged || avatarFile != null || coverFile != null || focusChanged;

  }, [userName, initialName, bio, initialBio, avatarFile, coverFile, focusChanged]);



  const submit = useCallback(async () => {

    setErr('');

    const name = userName.trim();

    if (!name) {

      setErr('请填写昵称');

      return;

    }

    if (!hasChanges) {

      setErr('请至少修改一项');

      return;

    }

    setBusy(true);

    try {

      const me = await patchUserProfile({
        userName: name,
        bio: bio.trim(),
        avatar: avatarFile,
        cover: coverFile,
        coverFocusX: coverFocus.x,
        coverFocusY: coverFocus.y,
      });

      mergeStoredUser({
        userName: me?.userName ?? name,
        publicId: me?.publicId ?? profile?.publicId,
        email: me?.email,
        avatarUrl: me?.avatarUrl,
        coverUrl: me?.coverUrl,
        coverFocusX: me?.coverFocusX,
        coverFocusY: me?.coverFocusY,
        bio: me?.bio ?? bio.trim(),
      });

      onSaved();

      onClose();

    } catch (e) {

      setErr(apiErrMessage(e));

    } finally {

      setBusy(false);

    }

  }, [userName, bio, avatarFile, coverFile, coverFocus, hasChanges, onClose, onSaved, profile?.publicId]);



  if (!open) return null;



  return (

    <>

      <MineCoverCropModal

        open={cropOpen}

        imageSrc={cropSrc}

        imageFile={cropFile}

        initialFocus={coverFocus}

        onConfirm={onCropConfirm}

        onClose={onCropClose}

      />



      <div
        className="mine-upload-overlay"
        role="presentation"
        onClick={handleClose}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >

        <div

          className="mine-upload-dialog mine-edit-dialog"

          role="dialog"

          aria-labelledby="mine-edit-title"

          onClick={(e) => e.stopPropagation()}

        >

          <div className="mine-upload-dialog-head">

            <h2 id="mine-edit-title" className="mine-upload-dialog-title">
              设置
            </h2>

            <button type="button" className="mine-upload-close" onClick={handleClose} disabled={busy} aria-label="关闭">

              ×

            </button>

          </div>

          {err && (

            <div className="mine-upload-error" role="alert">
              {err}
            </div>

          )}

          <label className="mine-upload-label">

            昵称

            <input

              className="mine-upload-input"

              value={userName}

              onChange={(e) => setUserName(e.target.value)}

              maxLength={64}

              placeholder="显示名称"

              disabled={busy}

            />

          </label>

          <label className="mine-upload-label">
            个人签名
            <textarea
              className="mine-upload-textarea mine-edit-bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="例如：把暗光里的层次和街头情绪留下来"
              disabled={busy}
            />
          </label>

          <div className="mine-edit-row">

            <div className="mine-edit-preview-col">

              <span className="mine-edit-field-label">头像</span>

              <div className="mine-edit-avatar-preview">

                {displayAvatar ? (

                  <img src={displayAvatar} alt="" className="mine-edit-avatar-img" />

                ) : (

                  <div className="mine-edit-avatar-placeholder" aria-hidden="true" />

                )}

              </div>

              <label className="mine-upload-label mine-edit-file-btn">

                选择图片

                <input

                  type="file"

                  accept="image/jpeg,image/png,image/webp,image/gif"

                  className="mine-upload-file"

                  disabled={busy}

                  onChange={onAvatarPick}

                />

              </label>

            </div>

            <div className="mine-edit-preview-col mine-edit-preview-col--wide">

              <span className="mine-edit-field-label">主页背景</span>

              <div className="mine-edit-cover-preview">
                {displayCover ? (
                  <img
                    src={displayCover}
                    alt=""
                    className="mine-edit-cover-img"
                    style={{ objectPosition: coverObjectPosition(coverFocus.x, coverFocus.y) }}
                  />
                ) : null}
              </div>

              <div className="mine-edit-cover-actions">

                <label className="mine-upload-label mine-edit-file-btn">

                  上传背景图

                  <input

                    type="file"

                    accept="image/jpeg,image/png,image/webp,image/gif"

                    className="mine-upload-file"

                    disabled={busy}

                    onChange={onCoverPick}

                  />

                </label>

                {displayCover && (

                  <button

                    type="button"

                    className="mine-edit-adjust-cover-btn"

                    disabled={busy}

                    onClick={openAdjustCover}

                  >

                    调整显示区域

                  </button>

                )}
              </div>
            </div>

          </div>



          <p className="mine-edit-hint">

            上传背景后会进入裁切弹窗，可拖动选择「拉满」时露出的画面；也可对已有背景点「调整显示区域」。

          </p>



          {onLogout ? (
            <div className="mine-edit-logout-wrap">
              <button
                type="button"
                className="mine-upload-btn mine-upload-btn--logout"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('确定退出当前账号？')) onLogout();
                }}
              >
                退出账号
              </button>
            </div>
          ) : null}

          <div className="mine-upload-actions">
            <button type="button" className="mine-upload-btn mine-upload-btn--ghost" onClick={handleClose} disabled={busy}>
              取消
            </button>
            <button type="button" className="mine-upload-btn mine-upload-btn--primary" onClick={submit} disabled={busy}>
              {busy ? '保存中…' : '保存'}
            </button>
          </div>

        </div>

      </div>

    </>

  );

}


