import { useEffect, useState } from 'react'

import {
  disablePushNotifications,
  enablePushNotifications,
  getPushStatus,
  isIosDevice,
  isStandaloneApp,
  sendTestPush
} from '../utils/pushNotifications'

import './PushNotificationSettings.css'


export default function PushNotificationSettings() {
  const [loading, setLoading] =
    useState(true)

  const [actionLoading, setActionLoading] =
    useState(false)

  const [status, setStatus] =
    useState({
      supported: true,
      permission: 'default',
      subscribed: false
    })

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')


  /* =====================================
     INITIAL STATUS
  ===================================== */

  useEffect(() => {
    let cancelled = false

    getPushStatus()
      .then(nextStatus => {
        if (!cancelled) {
          setStatus(nextStatus)
        }
      })
      .catch(err => {
        console.error(
          'Push status error:',
          err
        )
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])


  /* =====================================
     REFRESH AFTER USER ACTION
  ===================================== */

  async function refreshStatus() {
    try {
      const nextStatus =
        await getPushStatus()

      setStatus(nextStatus)
    } catch (err) {
      console.error(
        'Push status error:',
        err
      )
    }
  }


  /* =====================================
     ENABLE
  ===================================== */

  async function handleEnable() {
    setActionLoading(true)
    setMessage('')
    setError('')

    try {
      await enablePushNotifications()

      setMessage(
        'تم تفعيل إشعارات الجهاز بنجاح 🤍'
      )

      await refreshStatus()
    } catch (err) {
      setError(
        err?.message ||
        'تعذر تفعيل الإشعارات.'
      )
    } finally {
      setActionLoading(false)
    }
  }


  /* =====================================
     DISABLE
  ===================================== */

  async function handleDisable() {
    setActionLoading(true)
    setMessage('')
    setError('')

    try {
      await disablePushNotifications()

      setMessage(
        'تم إيقاف إشعارات الجهاز.'
      )

      await refreshStatus()
    } catch (err) {
      setError(
        err?.message ||
        'تعذر إيقاف الإشعارات.'
      )
    } finally {
      setActionLoading(false)
    }
  }


  /* =====================================
     TEST
  ===================================== */

  async function handleTest() {
    setActionLoading(true)
    setMessage('')
    setError('')

    try {
      const result =
        await sendTestPush()

      setMessage(
        `تم إرسال الإشعار التجريبي إلى ${result.sent || 1} جهاز 🤍`
      )
    } catch (err) {
      setError(
        err?.message ||
        'تعذر إرسال الإشعار التجريبي.'
      )
    } finally {
      setActionLoading(false)
    }
  }


  /* =====================================
     LOADING
  ===================================== */

  if (loading) {
    return (
      <div className="push-settings">
        <p className="push-loading">
          جاري التحقق من الإشعارات...
        </p>
      </div>
    )
  }


  /* =====================================
     NOT SUPPORTED
  ===================================== */

  if (!status.supported) {
    return (
      <div className="push-settings">
        <div className="push-info push-info--warning">
          هذا الجهاز أو المتصفح لا يدعم
          إشعارات Push.
        </div>
      </div>
    )
  }


  const iosNeedsInstall =
    isIosDevice() &&
    !isStandaloneApp()


  /* =====================================
     UI
  ===================================== */

  return (
    <div className="push-settings">

      <div className="push-status-row">
        <div>
          <strong>
            حالة الإشعارات
          </strong>

          <span
            className={
              status.subscribed
                ? 'push-status push-status--active'
                : 'push-status'
            }
          >
            {status.subscribed
              ? 'مفعلة'
              : 'غير مفعلة'}
          </span>
        </div>

        <span
          className={
            status.subscribed
              ? 'push-dot push-dot--active'
              : 'push-dot'
          }
        />
      </div>


      {iosNeedsInstall && (
        <div className="push-info push-info--ios">
          <strong>
            على iPhone
          </strong>

          <p>
            افتحي رفقة البقرة في Safari،
            ثم اضغطي مشاركة،
            ثم "إضافة إلى الشاشة الرئيسية".

            بعد ذلك افتحي التطبيق من الأيقونة
            الموجودة على الشاشة الرئيسية
            وفعّلي الإشعارات.
          </p>
        </div>
      )}


      {status.permission === 'denied' && (
        <div className="push-info push-info--warning">
          تم رفض الإشعارات من إعدادات الجهاز.
          ستحتاجين إلى السماح بها من إعدادات
          المتصفح أو التطبيق.
        </div>
      )}


      {message && (
        <div className="push-message">
          {message}
        </div>
      )}


      {error && (
        <div className="push-error">
          {error}
        </div>
      )}


      <div className="push-actions">

        {!status.subscribed && (
          <button
            type="button"
            className="push-button push-button--primary"
            onClick={handleEnable}
            disabled={
              actionLoading ||
              iosNeedsInstall
            }
          >
            {actionLoading
              ? 'جاري التفعيل...'
              : 'تفعيل إشعارات الجهاز'}
          </button>
        )}


        {status.subscribed && (
          <>
            <button
              type="button"
              className="push-button push-button--primary"
              onClick={handleTest}
              disabled={actionLoading}
            >
              {actionLoading
                ? 'جاري الإرسال...'
                : 'إرسال إشعار تجريبي'}
            </button>

            <button
              type="button"
              className="push-button push-button--secondary"
              onClick={handleDisable}
              disabled={actionLoading}
            >
              إيقاف إشعارات الجهاز
            </button>
          </>
        )}

      </div>

    </div>
  )
}