import refqatLogo from '../assets/refqat-logo.jpeg'

export default function AuthModal({
  open,
  mode,
  username,
  password,
  confirmPassword,
  message,
  loading,
  onModeChange,
  onUsernameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onClose
}) {
  if (!open) {
    return null
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <section
        className="login-modal"
        onClick={event =>
          event.stopPropagation()
        }
      >
        <button
          className="close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="login-logo">
          <img
            src={refqatLogo}
            alt="رفقة البقرة"
          />
        </div>

        <span className="modal-label">
          رفقة البقرة
        </span>

        <h2>
          {mode === 'login'
            ? 'أهلًا بعودتك'
            : 'احفظ استمرارك'}
        </h2>

        <div className="auth-tabs">
          <button
            type="button"
            className={
              mode === 'login'
                ? 'active'
                : ''
            }
            onClick={() => onModeChange('login')}
          >
            تسجيل الدخول
          </button>

          <button
            type="button"
            className={
              mode === 'signup'
                ? 'active'
                : ''
            }
            onClick={() => onModeChange('signup')}
          >
            إنشاء حساب
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <label>اسم المستخدم</label>
          <input
            type="text"
            value={username}
            onChange={event =>
              onUsernameChange(event.target.value)
            }
            autoComplete="username"
            required
          />

          <label>كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={event =>
              onPasswordChange(event.target.value)
            }
            autoComplete={
              mode === 'login'
                ? 'current-password'
                : 'new-password'
            }
            required
          />

          {mode === 'signup' && (
            <>
              <label>تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={event =>
                  onConfirmPasswordChange(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                required
              />
            </>
          )}

          <button
            className="modal-login"
            disabled={loading}
          >
            {loading
              ? 'لحظة...'
              : mode === 'login'
                ? 'تسجيل الدخول'
                : 'احفظ استمراري'}
          </button>
        </form>

        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}

        <span className="password-hint">
          سيتم حفظ تسجيل الدخول على هذا الجهاز.
        </span>

        <button
          type="button"
          className="continue-guest"
          onClick={onClose}
        >
          متابعة بدون حساب
        </button>
      </section>
    </div>
  )
}
