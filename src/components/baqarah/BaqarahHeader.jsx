import refqatLogo
  from '../../assets/refqat-logo.jpeg'

import {
  useAuth
} from '../../context/AuthContext'


export default function BaqarahHeader({
  onBack
}) {
  const {
    currentUser,
    authChecked,
    openAuth
  } = useAuth()


  return (
    <header className="baqarah-topbar">

      <button
        type="button"
        className="baqarah-back-button"
        onClick={onBack}
      >
        <span>
          ←
        </span>

        <span>
          العودة للأذكار
        </span>
      </button>


      <div className="baqarah-brand">
        <div className="baqarah-brand-copy">
          <span>
            رفقاء البقرة
          </span>

          <strong>
            سورة البقرة
          </strong>
        </div>


        <div className="baqarah-brand-logo">
          <img
            src={refqatLogo}
            alt="رفقة البقرة"
          />
        </div>
      </div>


      <div className="baqarah-user-area">
        {!authChecked ? (
          <span className="baqarah-user-loading">
            ...
          </span>
        ) : currentUser ? (
          <span className="baqarah-user-chip">
            {
              currentUser
                ?.display_name ||
              currentUser
                ?.username
            }
          </span>
        ) : (
          <button
            type="button"
            className="baqarah-login-button"
            onClick={() =>
              openAuth('login')
            }
          >
            تسجيل الدخول
          </button>
        )}
      </div>

    </header>
  )
}
