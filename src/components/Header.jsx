import refqatLogo from '../assets/refqat-logo.jpeg'

export default function Header({
  currentUser,
  authChecked,
  onLogin,
  onLogout,
  onLogoClick
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <button
          className="brand-logo"
          aria-label="فتح صفحة رفقة البقرة"
          onClick={onLogoClick}
        >
          <img
            src={refqatLogo}
            alt="رفقة البقرة"
          />
          <span className="logo-glass" />
        </button>

        <div className="brand-copy">
          <h1>رفقة البقرة</h1>
          <span>
            نقرأها كل يوم.. لنحيا بالقرآن
          </span>
        </div>
      </div>

      {!authChecked ? (
        <span className="saved-label">...</span>
      ) : !currentUser ? (
        <button
          className="login-btn"
          onClick={() => onLogin('login')}
        >
          تسجيل الدخول
        </button>
      ) : (
        <div className="logged-user">
          <div className="user-chip">
            <span className="user-avatar">
              {(
                currentUser?.display_name ||
                currentUser?.username ||
                'ر'
              ).charAt(0)}
            </span>

            <span className="user-name">
              {currentUser?.display_name ||
                currentUser?.username}
            </span>
          </div>

          <button
            className="logout-btn"
            onClick={onLogout}
          >
            خروج
          </button>
        </div>
      )}
    </header>
  )
}
