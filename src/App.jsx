import { useEffect, useMemo, useState } from 'react'
import './App.css'

import { supabase } from './lib/supabase'

import {
  morningAdhkar,
  eveningAdhkar
} from './data/adhkar'

import refqatLogo from './assets/refqat-logo.jpeg'


function getToday() {
  const date = new Date()

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}


function App() {

  const [period, setPeriod] = useState('morning')
  const [expandedId, setExpandedId] = useState(null)

  const [session, setSession] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')


  const today = getToday()


  const adhkar =
    period === 'morning'
      ? morningAdhkar
      : eveningAdhkar


  const storageKey =
    `refqat-albaqarah-${today}`


  const [progress, setProgress] = useState(() => {

    try {

      return JSON.parse(
        localStorage.getItem(storageKey)
      ) || {}

    } catch {

      return {}

    }

  })


  /* ==================================
     حفظ تقدم الزائر في الجهاز
  ================================== */

  useEffect(() => {

    localStorage.setItem(
      storageKey,
      JSON.stringify(progress)
    )

  }, [progress, storageKey])


  /* ==================================
     معرفة هل المستخدم مسجل دخول
  ================================== */

  useEffect(() => {

    supabase.auth
      .getSession()
      .then(({ data }) => {

        setSession(data.session)

      })


    const {
      data: { subscription }
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {

          setSession(newSession)

        }
      )


    return () => {
      subscription.unsubscribe()
    }

  }, [])


  /* ==================================
     معرفة العدد المتبقي للذكر
  ================================== */

  function getRemaining(item) {

    const key =
      `${period}-${item.id}`

    return (
      progress[key] ??
      item.count
    )

  }


  /* ==================================
     الضغط على عداد الذكر
  ================================== */

  function countDhikr(event, item) {

    event.stopPropagation()

    const key =
      `${period}-${item.id}`

    const current =
      getRemaining(item)


    if (current <= 0) {
      return
    }


    setProgress(previous => ({

      ...previous,

      [key]:
        current - 1

    }))

  }


  /* ==================================
     إعادة العداد
  ================================== */

  function resetDhikr(event, item) {

    event.stopPropagation()

    const key =
      `${period}-${item.id}`


    setProgress(previous => ({

      ...previous,

      [key]:
        item.count

    }))

  }


  /* ==================================
     حساب الأذكار المكتملة
  ================================== */

  const completed =
    useMemo(() => {

      return adhkar.filter(item => {

        const key =
          `${period}-${item.id}`

        return (
          progress[key] ??
          item.count
        ) === 0

      }).length

    }, [
      adhkar,
      period,
      progress
    ])


  const percentage =
    adhkar.length
      ? Math.round(
          (
            completed /
            adhkar.length
          ) * 100
        )
      : 0


  /* ==================================
     تغيير صباح / مساء
  ================================== */

  function changePeriod(newPeriod) {

    setPeriod(newPeriod)

    setExpandedId(null)

  }


  /* ==================================
     تسجيل الدخول
  ================================== */

  async function handleLogin(event) {

    event.preventDefault()

    setAuthMessage(
      'جاري تسجيل الدخول...'
    )


    const { error } =
      await supabase.auth
        .signInWithPassword({

          email,
          password

        })


    if (error) {

      setAuthMessage(
        'تعذر تسجيل الدخول. تأكدي من البريد الإلكتروني وكلمة المرور.'
      )

      return

    }


    setAuthMessage('')

    setShowLogin(false)

  }


  /* ==================================
     تسجيل الخروج
  ================================== */

  async function logout() {

    await supabase.auth.signOut()

  }


  return (

    <main
      className={`app ${period}`}
    >

      {/* ==================================
          الخلفية المتحركة
      ================================== */}

      <div
        className="background-motion"
        aria-hidden="true"
      >

        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="ambient ambient-three" />
        <div className="ambient ambient-four" />

      </div>


      {/* النقشة الإسلامية المتحركة */}

      <div
        className="islamic-pattern"
        aria-hidden="true"
      />


      {/* ==================================
          HEADER
      ================================== */}

      <header className="topbar">


        <div className="brand">

          {/* الصورة الوحيدة في الصفحة */}

          <button
            className="brand-logo"
            aria-label="رفقة البقرة"
          >

            <img
              src={refqatLogo}
              alt="شعار رفقة البقرة"
            />

            <span
              className="logo-glass"
            />

          </button>


          <div className="brand-copy">

            <h1>
              رفقة البقرة
            </h1>

            <span>
              نقرأها كل يوم.. لنحيا بالقرآن
            </span>

          </div>

        </div>


        {!session ? (

          <button
            className="login-btn"
            onClick={() =>
              setShowLogin(true)
            }
          >

            <span className="login-icon">
              ♡
            </span>

            <span>
              تسجيل الدخول
            </span>

          </button>

        ) : (

          <div className="user-actions">

            <span className="saved-label">
              تم حفظ تقدمك ✓
            </span>

            <button
              className="logout-btn"
              onClick={logout}
            >
              خروج
            </button>

          </div>

        )}

      </header>


      {/* ==================================
          HERO
      ================================== */}

      <section className="hero">


        <div
          className="hero-glow hero-glow-one"
          aria-hidden="true"
        />

        <div
          className="hero-glow hero-glow-two"
          aria-hidden="true"
        />


        <div className="hero-content">

          <span className="hero-label">
            ✦ وردك اليومي
          </span>


          <h2>

            يومٌ يبدأ

            <br />

            <em>
              بذكر الله
            </em>

          </h2>


          <p>

            اجعل لك في كل صباح ومساء
            لحظة هادئة، ذكرٌ يطمئن القلب
            ورفقةٌ تعينك على الاستمرار.

          </p>


          <div className="hero-mini-stats">

            <div>

              <strong>
                {percentage}%
              </strong>

              <span>
                إنجاز الورد
              </span>

            </div>


            <span className="mini-separator" />


            <div>

              <strong>
                {completed}
              </strong>

              <span>
                ذكر مكتمل
              </span>

            </div>

          </div>

        </div>


        {/* ==================================
            زخرفة إسلامية صغيرة
            لا توجد صورة ثانية
        ================================== */}

        <div
          className="hero-side-ornament"
          aria-hidden="true"
        >

          <div className="ornament-ring ring-one" />

          <div className="ornament-ring ring-two" />

          <div className="ornament-ring ring-three" />


          <span className="ornament-dot dot-one" />

          <span className="ornament-dot dot-two" />


          <span className="ornament-star">
            ✦
          </span>


          <span className="ornament-center">
            ۞
          </span>

        </div>

      </section>


      {/* ==================================
          MAIN CONTENT
      ================================== */}

      <section className="main-content">


        {/* ==================================
            أذكار صباح / مساء
        ================================== */}

        <div className="period-switch">


          <button
            className={
              period === 'morning'
                ? 'period active'
                : 'period'
            }
            onClick={() =>
              changePeriod('morning')
            }
          >

            <span className="period-icon">
              ☀
            </span>


            <span>

              <small>
                ابدأ يومك
              </small>

              أذكار الصباح

            </span>

          </button>


          <button
            className={
              period === 'evening'
                ? 'period active'
                : 'period'
            }
            onClick={() =>
              changePeriod('evening')
            }
          >

            <span className="period-icon">
              ☾
            </span>


            <span>

              <small>
                اختم يومك
              </small>

              أذكار المساء

            </span>

          </button>

        </div>


        {/* ==================================
            PROGRESS
        ================================== */}

        <section className="today-progress">

          <div>

            <span>

              إنجاز ورد

              {' '}

              {period === 'morning'
                ? 'الصباح'
                : 'المساء'}

            </span>


            <strong>

              {completed}

              {' من '}

              {adhkar.length}

            </strong>

          </div>


          <span className="progress-number">

            {percentage}%

          </span>


          <div className="progress-line">

            <div
              className="progress-fill"
              style={{
                width:
                  `${percentage}%`
              }}
            />

          </div>

        </section>


        {/* ==================================
            TITLE
        ================================== */}

        <div className="section-title">

          <div>

            <span>

              {period === 'morning'
                ? 'صباحٌ مطمئن'
                : 'مساءٌ مطمئن'}

            </span>


            <h3>

              {period === 'morning'
                ? 'أذكار الصباح'
                : 'أذكار المساء'}

            </h3>

          </div>


          <p>
            اضغطي على البطاقة
            لعرض فضل الذكر وتعليقه
          </p>

        </div>


        {/* ==================================
            ADHKAR CARDS
        ================================== */}

        <section className="adhkar-grid">

          {adhkar.map(item => {


            const remaining =
              getRemaining(item)


            const done =
              remaining === 0


            const completedAmount =
              (
                (
                  item.count -
                  remaining
                )
                /
                item.count
              )
              * 360


            const expanded =
              expandedId ===
              item.id


            return (

              <article
                key={item.id}
                className={
                  `dhikr-card ${
                    done
                      ? 'done'
                      : ''
                  }`
                }
                onClick={() => {

                  setExpandedId(

                    expanded
                      ? null
                      : item.id

                  )

                }}
              >


                <div className="dhikr-card-top">


                  <div>

                    <span className="repeat">

                      {item.count === 1
                        ? 'مرة واحدة'

                        : item.count === 3
                          ? '3 مرات'

                          : `${item.count} مرة`}

                    </span>


                    <h4>
                      {item.title}
                    </h4>


                    {item.subtitle && (

                      <span className="subtitle">

                        {item.subtitle}

                      </span>

                    )}

                  </div>


                  {done && (

                    <span className="done-pill">

                      ✓ تم

                    </span>

                  )}

                </div>


                {/* نص الذكر */}

                <div className="dhikr-text">

                  {item.text}

                </div>


                {/* ==================================
                    COUNTER
                ================================== */}

                <div className="counter-section">


                  <button
                    className={
                      `counter ${
                        done
                          ? 'counter-done'
                          : ''
                      }`
                    }
                    style={{
                      '--angle':
                        `${completedAmount}deg`
                    }}
                    onClick={
                      event =>
                        countDhikr(
                          event,
                          item
                        )
                    }
                  >

                    <span>

                      {done
                        ? '✓'
                        : remaining}

                    </span>

                  </button>


                  <small>

                    {done
                      ? 'تقبّل الله منك'
                      : 'اضغطي للعد'}

                  </small>


                  {remaining !==
                    item.count && (

                    <button
                      className="reset"
                      onClick={
                        event =>
                          resetDhikr(
                            event,
                            item
                          )
                      }
                    >

                      إعادة العداد

                    </button>

                  )}

                </div>


                {/* ==================================
                    فضل الذكر
                ================================== */}

                <div
                  className={
                    `dhikr-note ${
                      expanded
                        ? 'open'
                        : ''
                    }`
                  }
                >

                  <div className="note-title">

                    <span>
                      ✦
                    </span>

                    فضل الذكر وتعليقه

                  </div>


                  <p>

                    {item.note}

                  </p>

                </div>


                <div className="open-note">

                  <span>

                    {expanded
                      ? 'إخفاء التعليق'
                      : 'عرض الفضل والتعليق'}

                  </span>


                  <span
                    className={
                      expanded
                        ? 'arrow open'
                        : 'arrow'
                    }
                  >

                    ⌄

                  </span>

                </div>

              </article>

            )

          })}

        </section>

      </section>


      {/* ==================================
          LOGIN MODAL
      ================================== */}

      {showLogin && (

        <div
          className="modal-overlay"
          onClick={() =>
            setShowLogin(false)
          }
        >

          <section
            className="login-modal"
            onClick={
              event =>
                event.stopPropagation()
            }
          >


            <button
              className="close"
              onClick={() =>
                setShowLogin(false)
              }
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

              أهلًا بعودتك

            </h2>


            <p>

              يمكنك استخدام الأذكار
              بدون تسجيل الدخول.

              <br />

              سجلي الدخول فقط لحفظ تقدمك
              والمشاركة في الرفقة.

            </p>


            <form
              onSubmit={handleLogin}
            >


              <label>

                البريد الإلكتروني

              </label>


              <input
                type="email"
                value={email}
                onChange={
                  event =>
                    setEmail(
                      event.target.value
                    )
                }
                placeholder="name@email.com"
                required
              />


              <label>

                كلمة المرور

              </label>


              <input
                type="password"
                value={password}
                onChange={
                  event =>
                    setPassword(
                      event.target.value
                    )
                }
                placeholder="••••••••"
                required
              />


              <button
                className="modal-login"
              >

                تسجيل الدخول

              </button>

            </form>


            {authMessage && (

              <div className="auth-message">

                {authMessage}

              </div>

            )}


            <button
              type="button"
              className="continue-guest"
              onClick={() =>
                setShowLogin(false)
              }
            >

              متابعة بدون حساب

            </button>

          </section>

        </div>

      )}

    </main>

  )

}


export default App