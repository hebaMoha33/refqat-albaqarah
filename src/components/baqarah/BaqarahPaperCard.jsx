import {
  useState
} from 'react'

import {
  useAuth
} from '../../context/AuthContext'

import {
  useBaqarah
} from '../../context/BaqarahContext'

import BaqarahStars
  from './BaqarahStars'


export default function BaqarahPaperCard() {
  const [
    open,
    setOpen
  ] =
    useState(false)


  const {
    currentUser,
    openAuth
  } =
    useAuth()


  const {
    progress,
    percentage,

    saving,
    error,
    message,

    selectPaperStar,
    clearMessage
  } =
    useBaqarah()


  function openPaperOptions() {
    clearMessage()


    if (!currentUser) {
      openAuth('login')
      return
    }


    setOpen(
      value =>
        !value
    )
  }


  async function choose(
    selectedPercentage
  ) {
    const result =
      await selectPaperStar(
        selectedPercentage
      )


    if (
      result?.needsAuth
    ) {
      openAuth('login')
    }
  }


  return (
    <section className="baqarah-paper-card">

      <div className="baqarah-paper-icon">
        📖
      </div>


      <div className="baqarah-paper-copy">
        <span>
          تفضّل المصحف الورقي؟
        </span>

        <h2>
          سجّل إلى أين وصلت
        </h2>

        <p>
          افتح النجوم واختر أقرب مرحلة وصلت إليها في قراءة اليوم.
          لن ينخفض إنجازك إذا اخترت نسبة أقل من تقدمك الحالي.
        </p>
      </div>


      <button
        type="button"
        className="baqarah-paper-open"
        onClick={
          openPaperOptions
        }
      >
        {open
          ? 'إخفاء النجوم'
          : 'قرأت من المصحف الورقي'}
      </button>


      {open && (
        <div className="baqarah-paper-options">

          <div className="baqarah-paper-options-heading">
            <div>
              <span>
                اختر آخر مرحلة وصلت إليها
              </span>

              <strong>
                إنجازك الحالي {percentage}%
              </strong>
            </div>


            <small>
              المحفوظ من المصحف:
              {' '}
              {Number(
                progress
                  ?.paper_percentage ||
                0
              )}%
            </small>
          </div>


          <BaqarahStars
            interactive
            starLevel={
              Number(
                progress
                  ?.star_level ||
                0
              )
            }
            selected={
              Number(
                progress
                  ?.paper_percentage ||
                0
              )
            }
            disabled={
              saving
            }
            onSelect={
              choose
            }
          />


          {saving && (
            <div className="baqarah-save-message">
              جاري حفظ تقدمك...
            </div>
          )}


          {!saving &&
           message && (
            <div className="baqarah-save-message success">
              {message}
            </div>
          )}


          {!saving &&
           error && (
            <div className="baqarah-save-message error">
              {error}
            </div>
          )}

        </div>
      )}

    </section>
  )
}
