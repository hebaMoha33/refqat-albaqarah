import {
  useEffect,
  useState
} from 'react'

import PushNotificationSettings
  from '../components/PushNotificationSettings'

import './ReminderSettingsPage.css'


const STORAGE_KEY =
  'refqat-reminder-settings-v1'


const DEFAULT_SETTINGS = {
  /*
    تشغيل التذكيرات كلها
  */
  enabled: true,


  /*
    أذكار الصباح:
    بعد وقت الفجر بـ 20 دقيقة
  */
  morningEnabled: true,
  morningOffsetMinutes: 20,


  /*
    أذكار المساء:
    بعد وقت العصر بـ 20 دقيقة
  */
  eveningEnabled: true,
  eveningOffsetMinutes: 20,


  /*
    أوقات احتياطية فقط
    في حال لم يسمح المستخدم بالموقع
  */
  morningTime: '06:30',
  eveningTime: '15:30',


  /*
    سورة البقرة
  */
  baqarahEnabled: true,
  baqarahTime: '20:00',


  /*
    تذكير الاستمرار
  */
  streakEnabled: true,
  streakTime: '21:30',


  /*
    إعدادات الشريط العائم
  */
  draggable: true,

  showCloseButton: true,

  defaultPosition:
    'top-right',

  height: 34,

  opacity: 96
}


/* =====================================
   LOAD SETTINGS
===================================== */

function loadSettings() {
  try {
    const saved =
      JSON.parse(
        localStorage.getItem(
          STORAGE_KEY
        )
      )


    return {
      ...DEFAULT_SETTINGS,
      ...(saved || {})
    }

  } catch {
    return {
      ...DEFAULT_SETTINGS
    }
  }
}


/* =====================================
   TOGGLE
===================================== */

function Toggle({
  checked,
  onChange
}) {
  return (
    <button
      type="button"

      className={
        checked
          ? 'reminder-toggle active'
          : 'reminder-toggle'
      }

      aria-pressed={
        checked
      }

      onClick={() =>
        onChange(
          !checked
        )
      }
    >
      <span />
    </button>
  )
}


/* =====================================
   SETTING ROW
===================================== */

function SettingRow({
  title,
  description,
  enabled,
  onToggle,
  children
}) {
  return (
    <div className="reminder-setting-row">

      <div className="reminder-setting-copy">

        <strong>
          {title}
        </strong>


        {description && (
          <span>
            {description}
          </span>
        )}

      </div>


      <div className="reminder-setting-control">

        {children}


        {typeof enabled ===
          'boolean' && (

          <Toggle
            checked={
              enabled
            }

            onChange={
              onToggle
            }
          />

        )}

      </div>

    </div>
  )
}


/* =====================================
   OFFSET OPTIONS
===================================== */

const OFFSET_OPTIONS = [
  {
    value: 0,
    label: 'مباشرة'
  },

  {
    value: 10,
    label: 'بعد 10 دقائق'
  },

  {
    value: 15,
    label: 'بعد 15 دقيقة'
  },

  {
    value: 20,
    label: 'بعد 20 دقيقة'
  },

  {
    value: 30,
    label: 'بعد 30 دقيقة'
  },

  {
    value: 45,
    label: 'بعد 45 دقيقة'
  },

  {
    value: 60,
    label: 'بعد ساعة'
  }
]


/* =====================================
   PAGE
===================================== */

export default function ReminderSettingsPage({
  onBack
}) {
  const [
    settings,
    setSettings
  ] =
    useState(
      loadSettings
    )


  const [
    savedMessage,
    setSavedMessage
  ] =
    useState('')


  /* =====================================
     SAVE AUTOMATICALLY
  ===================================== */

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,

      JSON.stringify(
        settings
      )
    )


    /*
      نرسل حدثًا لبقية التطبيق
      حتى تتغير الإعدادات فورًا.
    */
    window.dispatchEvent(
      new CustomEvent(
        'refqat-reminder-settings-change',

        {
          detail:
            settings
        }
      )
    )


    let clearMessageTimer

    const showMessageTimer =
      window.setTimeout(() => {
        setSavedMessage(
          'تم الحفظ'
        )

        clearMessageTimer =
          window.setTimeout(
            () => {
              setSavedMessage('')
            },
            1000
          )
      }, 0)


    return () => {
      window.clearTimeout(
        showMessageTimer
      )

      window.clearTimeout(
        clearMessageTimer
      )
    }

  }, [
    settings
  ])


  /* =====================================
     UPDATE ONE SETTING
  ===================================== */

  function updateSetting(
    key,
    value
  ) {
    setSettings(
      previous => ({
        ...previous,

        [key]:
          value
      })
    )
  }


  /* =====================================
     RESET
  ===================================== */

  function resetSettings() {
    const defaults = {
      ...DEFAULT_SETTINGS
    }


    /*
      نحذف مكان الشريط القديم
      حتى يعود للمكان الافتراضي.
    */
    localStorage.removeItem(
      'refqat-floating-reminder-position'
    )


    localStorage.removeItem(
      'refqat-floating-reminder-position-morning'
    )


    localStorage.removeItem(
      'refqat-floating-reminder-position-evening'
    )


    setSettings(
      defaults
    )
  }


  return (
    <section className="reminder-settings-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="reminder-settings-heading">

        <button
          type="button"

          className="reminder-back-btn"

          onClick={
            onBack
          }
        >
          ←
        </button>


        <div>

          <span>
            رفقة هادئة لا تزعجك
          </span>


          <h2>
            التذكيرات
          </h2>


          <p>
            مواعيد الأذكار تتغير تلقائيًا
            حسب أوقات الصلاة في موقعك.
          </p>

        </div>


        <div className="reminder-saved-state">
          {savedMessage}
        </div>

      </div>


      {/* =====================================
          MASTER SWITCH
      ===================================== */}

      <section
        className="
          reminder-settings-card
          reminder-master-card
        "
      >

        <SettingRow
          title="تشغيل التذكيرات"

          description="
            إيقاف هذا الخيار
            يوقف جميع تذكيرات رفقة البقرة.
          "

          enabled={
            settings.enabled
          }

          onToggle={
            value =>
              updateSetting(
                'enabled',
                value
              )
          }
        />

      </section>


      {/* =====================================
          DEVICE PUSH NOTIFICATIONS
      ===================================== */}

      <section className="reminder-settings-card">

        <div className="settings-section-title">

          <span>
            iPhone و Android
          </span>


          <h3>
            إشعارات الجهاز
          </h3>

        </div>


        <p
          style={{
            margin:
              '0 0 12px',

            color:
              'var(--soft)',

            fontSize:
              '11px',

            lineHeight:
              1.8
          }}
        >
          فعّلي إشعارات الجهاز
          حتى تصلك تذكيرات رفقة البقرة
          حتى عندما لا يكون التطبيق
          مفتوحًا أمامك.
        </p>


        <PushNotificationSettings />

      </section>


      {/* =====================================
          PRAYER-BASED ADHKAR
      ===================================== */}

      <section className="reminder-settings-card">

        <div className="settings-section-title">

          <span>
            أوقات الصلاة
          </span>


          <h3>
            أذكار الصباح والمساء
          </h3>

        </div>


        <p
          style={{
            margin:
              '0 0 10px',

            color:
              'var(--soft)',

            fontSize:
              '11px',

            lineHeight:
              1.8
          }}
        >
          يحسب التطبيق وقت الفجر
          والعصر يوميًا حسب موقع الجهاز،
          ثم يظهر التذكير بعد المدة
          التي تختارينها.
        </p>


        {/* =================================
            MORNING
        ================================= */}

        <SettingRow
          title="أذكار الصباح"

          description="
            تلقائي حسب وقت الفجر.
            يبقى التذكير حتى إكمال الأذكار
            أو إغلاقه يدويًا.
          "

          enabled={
            settings.morningEnabled
          }

          onToggle={
            value =>
              updateSetting(
                'morningEnabled',
                value
              )
          }
        >

          <select
            value={
              settings
                .morningOffsetMinutes
            }

            disabled={
              !settings
                .morningEnabled
            }

            onChange={
              event =>
                updateSetting(
                  'morningOffsetMinutes',

                  Number(
                    event.target.value
                  )
                )
            }
          >

            {OFFSET_OPTIONS.map(
              option => (

                <option
                  key={
                    option.value
                  }

                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>

              )
            )}

          </select>

        </SettingRow>


        {/* =================================
            EVENING
        ================================= */}

        <SettingRow
          title="أذكار المساء"

          description="
            تلقائي حسب وقت العصر.
            افتراضيًا يظهر بعد العصر
            بـ 20 دقيقة.
          "

          enabled={
            settings.eveningEnabled
          }

          onToggle={
            value =>
              updateSetting(
                'eveningEnabled',
                value
              )
          }
        >

          <select
            value={
              settings
                .eveningOffsetMinutes
            }

            disabled={
              !settings
                .eveningEnabled
            }

            onChange={
              event =>
                updateSetting(
                  'eveningOffsetMinutes',

                  Number(
                    event.target.value
                  )
                )
            }
          >

            {OFFSET_OPTIONS.map(
              option => (

                <option
                  key={
                    option.value
                  }

                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>

              )
            )}

          </select>

        </SettingRow>


        {/* =================================
            LOCATION NOTE
        ================================= */}

        <div
          style={{
            marginTop:
              '12px',

            padding:
              '12px 14px',

            borderRadius:
              '14px',

            background:
              'rgba(255,255,255,.28)',

            color:
              'var(--soft)',

            fontSize:
              '10.5px',

            lineHeight:
              1.8
          }}
        >
          📍 عند السماح للموقع،
          تتغير أوقات الفجر والعصر
          تلقائيًا إذا تغير مكانك.

          إذا لم تسمحي بالموقع،
          يستخدم التطبيق وقتًا احتياطيًا.
        </div>

      </section>


      {/* =====================================
          BAQARAH + STREAK
      ===================================== */}

      <section className="reminder-settings-card">

        <div className="settings-section-title">

          <span>
            تذكيرات إضافية
          </span>


          <h3>
            سورة البقرة والاستمرار
          </h3>

        </div>


        {/* BAQARAH */}

        <SettingRow
          title="سورة البقرة"

          description="
            تذكير يومي لمتابعة القراءة
            من الموضع الذي توقفتِ عنده.
          "

          enabled={
            settings.baqarahEnabled
          }

          onToggle={
            value =>
              updateSetting(
                'baqarahEnabled',
                value
              )
          }
        >

          <input
            type="time"

            value={
              settings.baqarahTime
            }

            disabled={
              !settings
                .baqarahEnabled
            }

            onChange={
              event =>
                updateSetting(
                  'baqarahTime',
                  event.target.value
                )
            }
          />

        </SettingRow>


        {/* STREAK */}

        <SettingRow
          title="الحفاظ على الاستمرار"

          description="
            تذكير أخير إذا بقي
            ورد اليوم غير مكتمل.
          "

          enabled={
            settings.streakEnabled
          }

          onToggle={
            value =>
              updateSetting(
                'streakEnabled',
                value
              )
          }
        >

          <input
            type="time"

            value={
              settings.streakTime
            }

            disabled={
              !settings
                .streakEnabled
            }

            onChange={
              event =>
                updateSetting(
                  'streakTime',
                  event.target.value
                )
            }
          />

        </SettingRow>

      </section>


      {/* =====================================
          FLOATING BAR
      ===================================== */}

      <section className="reminder-settings-card">

        <div className="settings-section-title">

          <span>
            الشريط العائم
          </span>


          <h3>
            الشكل والسلوك
          </h3>

        </div>


        <SettingRow
          title="السماح بتحريك الشريط"

          description="
            يمكنك سحب التذكير
            ووضعه في المكان الذي يناسبك.
          "

          enabled={
            settings.draggable
          }

          onToggle={
            value =>
              updateSetting(
                'draggable',
                value
              )
          }
        />


        <SettingRow
          title="إظهار زر الإغلاق ×"

          description="
            عند إغلاق التذكير
            لا يعود مرة أخرى في نفس اليوم.
          "

          enabled={
            settings
              .showCloseButton
          }

          onToggle={
            value =>
              updateSetting(
                'showCloseButton',
                value
              )
          }
        />


        {/* POSITION */}

        <SettingRow
          title="المكان الافتراضي"

          description="
            المكان الذي يبدأ منه الشريط،
            ويمكن نقله بعد ذلك بالسحب.
          "
        >

          <select
            value={
              settings
                .defaultPosition
            }

            onChange={
              event =>
                updateSetting(
                  'defaultPosition',
                  event.target.value
                )
            }
          >

            <option value="top-right">
              أعلى اليمين
            </option>

            <option value="top-left">
              أعلى اليسار
            </option>

            <option value="bottom-right">
              أسفل اليمين
            </option>

            <option value="bottom-left">
              أسفل اليسار
            </option>

          </select>

        </SettingRow>


        {/* HEIGHT */}

        <div className="reminder-slider-row">

          <div className="reminder-setting-copy">

            <strong>
              ارتفاع الشريط
            </strong>


            <span>
              {settings.height}px
            </span>

          </div>


          <input
            type="range"

            min="28"

            max="50"

            step="1"

            value={
              settings.height
            }

            onChange={
              event =>
                updateSetting(
                  'height',

                  Number(
                    event.target.value
                  )
                )
            }
          />

        </div>


        {/* OPACITY */}

        <div className="reminder-slider-row">

          <div className="reminder-setting-copy">

            <strong>
              الشفافية
            </strong>


            <span>
              {settings.opacity}%
            </span>

          </div>


          <input
            type="range"

            min="65"

            max="100"

            step="1"

            value={
              settings.opacity
            }

            onChange={
              event =>
                updateSetting(
                  'opacity',

                  Number(
                    event.target.value
                  )
                )
            }
          />

        </div>

      </section>


      {/* =====================================
          THEME
      ===================================== */}

      <section
        className="
          reminder-settings-card
          theme-coming-card
        "
      >

        <div className="settings-section-title">

          <span>
            المظهر
          </span>


          <h3>
            تصميم الثيم
          </h3>

        </div>


        <p>
          هنا سنضيف لاحقًا التحكم
          في ألوان ثيم الصباح والمساء
          وسورة البقرة والشريط العائم
          من مكان واحد.
        </p>

      </section>


      {/* =====================================
          FOOTER
      ===================================== */}

      <div className="reminder-settings-footer">

        <button
          type="button"

          className="reset-reminder-settings"

          onClick={
            resetSettings
          }
        >
          استعادة الإعدادات الافتراضية
        </button>


        <button
          type="button"

          className="settings-done-btn"

          onClick={
            onBack
          }
        >
          تم
        </button>

      </div>

    </section>
  )
}