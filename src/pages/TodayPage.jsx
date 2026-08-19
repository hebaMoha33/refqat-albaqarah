import MorningAdhkar
  from '../components/MorningAdhkar'

import EveningAdhkar
  from '../components/EveningAdhkar'

import {
  morningAdhkarList,
  eveningAdhkarList
} from '../data/adhkarLists'

import { useAuth }
  from '../context/AuthContext'

import { useProgress }
  from '../context/ProgressContext'


export default function TodayPage() {
  const {
    currentUser,
    openAuth
  } = useAuth()


  const {
    period,
    expandedId,

    morningPercentage,
    eveningPercentage,

    changePeriod,
    toggleExpanded,
    getRemaining,
    countDhikr,
    resetDhikr
  } = useProgress()


  const items =
    period === 'morning'
      ? morningAdhkarList
      : eveningAdhkarList


  const periodPercentage =
    period === 'morning'
      ? morningPercentage
      : eveningPercentage


  return (
    <section className="main-content">
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
          <span className="period-icon sun-icon">
            ☀
          </span>

          <span>
            
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
          <span className="period-icon moon-icon">
            ☾
          </span>

          <span>
            
            أذكار المساء
          </span>
        </button>
      </div>


      {!currentUser && (
        <section className="save-streak-card">
          <div className="save-streak-icon">
            🌿
          </div>

          <div className="save-streak-copy">
            <span>رفقة البقرة</span>

            <h3>
              احفظ استمرارك
            </h3>

            <p>
              أنشئي حسابًا باسم مستخدم وكلمة مرور ليتم حفظ تقدمك يومًا بعد يوم.
            </p>
          </div>

          <div className="save-streak-actions">
            <button
              className="save-primary"
              onClick={() =>
                openAuth('signup')
              }
            >
              احفظ استمراري
            </button>

            <button
              className="save-secondary"
              onClick={() =>
                openAuth('login')
              }
            >
              لدي حساب
            </button>
          </div>
        </section>
      )}


      {period === 'morning' ? (
        <MorningAdhkar
          items={items}
          progress={
            periodPercentage
          }
          expandedId={
            expandedId
          }
          getRemaining={
            item =>
              getRemaining(
                item,
                'morning'
              )
          }
          onToggle={
            toggleExpanded
          }
          onCount={
            item =>
              countDhikr(
                item,
                'morning'
              )
          }
          onReset={
            item =>
              resetDhikr(
                item,
                'morning'
              )
          }
        />
      ) : (
        <EveningAdhkar
          items={items}
          progress={
            periodPercentage
          }
          expandedId={
            expandedId
          }
          getRemaining={
            item =>
              getRemaining(
                item,
                'evening'
              )
          }
          onToggle={
            toggleExpanded
          }
          onCount={
            item =>
              countDhikr(
                item,
                'evening'
              )
          }
          onReset={
            item =>
              resetDhikr(
                item,
                'evening'
              )
          }
        />
      )}
    </section>
  )
}
