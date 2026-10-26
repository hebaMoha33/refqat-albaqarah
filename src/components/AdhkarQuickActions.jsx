import {
  useEffect,
  useRef,
  useState
} from 'react'

import './AdhkarQuickActions.css'


const POSITION_STORAGE_KEY =
  'refqat-adhkar-quick-position-v3'


function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  )
}


function getInitialPosition() {
  const width =
    window.innerWidth <= 600
      ? 145
      : 165


  return {
    x:
      Math.max(
        window.innerWidth -
          width -
          12,
        8
      ),

    y:
      Math.max(
        window.innerHeight -
          72,
        8
      )
  }
}


export default function AdhkarQuickActions({
  period = 'morning',

  items = [],

  getRemaining,

  onResetAll
}) {
  const shellRef =
    useRef(null)


  const dragRef =
    useRef({
      dragging: false,

      offsetX: 0,
      offsetY: 0
    })


  const toastTimerRef =
    useRef(null)


  const [
    position,
    setPosition
  ] =
    useState(() => {
      try {
        const saved =
          JSON.parse(
            localStorage.getItem(
              POSITION_STORAGE_KEY
            )
          )


        if (
          Number.isFinite(
            saved?.x
          ) &&
          Number.isFinite(
            saved?.y
          )
        ) {
          return saved
        }

      } catch {
        /* ignore */
      }


      return getInitialPosition()
    })


  const [
    nearBottom,
    setNearBottom
  ] =
    useState(false)


  const [
    showResetConfirm,
    setShowResetConfirm
  ] =
    useState(false)


  const [
    toast,
    setToast
  ] =
    useState('')


  /* =====================================
     SAVE
  ===================================== */

  useEffect(() => {
    try {
      localStorage.setItem(
        POSITION_STORAGE_KEY,

        JSON.stringify(
          position
        )
      )
    } catch {
      /* ignore */
    }
  }, [
    position
  ])


  /* =====================================
     SCROLL
  ===================================== */

  useEffect(() => {
    function handleScroll() {
      const bottom =
        window.scrollY +
        window.innerHeight

      const pageHeight =
        document.documentElement
          .scrollHeight


      setNearBottom(
        bottom >=
          pageHeight - 300
      )
    }


    handleScroll()


    window.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true
      }
    )


    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll
      )
    }
  }, [])


  /* =====================================
     TOAST
  ===================================== */

  useEffect(() => {
    return () => {
      if (
        toastTimerRef.current
      ) {
        window.clearTimeout(
          toastTimerRef.current
        )
      }
    }
  }, [])


  function showToast(
    message
  ) {
    setToast(
      message
    )


    if (
      toastTimerRef.current
    ) {
      window.clearTimeout(
        toastTimerRef.current
      )
    }


    toastTimerRef.current =
      window.setTimeout(
        () => {
          setToast('')
        },
        1600
      )
  }


  /* =====================================
     DRAG
  ===================================== */

  function startDrag(
    event
  ) {
    const shell =
      shellRef.current


    if (!shell) {
      return
    }


    const rect =
      shell
        .getBoundingClientRect()


    dragRef.current = {
      dragging: true,

      offsetX:
        event.clientX -
        rect.left,

      offsetY:
        event.clientY -
        rect.top
    }


    event.currentTarget
      .setPointerCapture?.(
        event.pointerId
      )
  }


  useEffect(() => {
    function handleMove(
      event
    ) {
      if (
        !dragRef.current
          .dragging ||
        !shellRef.current
      ) {
        return
      }


      const width =
        shellRef.current
          .offsetWidth


      const height =
        shellRef.current
          .offsetHeight


      const maxX =
        Math.max(
          window.innerWidth -
            width -
            8,
          8
        )


      const maxY =
        Math.max(
          window.innerHeight -
            height -
            8,
          8
        )


      setPosition({
        x:
          clamp(
            event.clientX -
              dragRef.current
                .offsetX,

            8,
            maxX
          ),

        y:
          clamp(
            event.clientY -
              dragRef.current
                .offsetY,

            8,
            maxY
          )
      })
    }


    function handleUp() {
      dragRef.current.dragging =
        false
    }


    window.addEventListener(
      'pointermove',
      handleMove
    )

    window.addEventListener(
      'pointerup',
      handleUp
    )


    return () => {
      window.removeEventListener(
        'pointermove',
        handleMove
      )

      window.removeEventListener(
        'pointerup',
        handleUp
      )
    }
  }, [])


  /* =====================================
     RESET
  ===================================== */

  function confirmReset() {
    onResetAll?.()

    setShowResetConfirm(
      false
    )


    showToast(
      period === 'morning'
        ? 'تمت إعادة ورد الصباح'
        : 'تمت إعادة ورد المساء'
    )
  }


  /* =====================================
     UNFINISHED
  ===================================== */

  function goToUnfinished() {
    setShowResetConfirm(
      false
    )


    const indexes =
      items.reduce(
        (
          result,
          item,
          index
        ) => {
          const remaining =
            Number(
              getRemaining?.(
                item
              )
            )


          if (
            Number.isFinite(
              remaining
            ) &&
            remaining > 0
          ) {
            result.push(
              index
            )
          }


          return result
        },
        []
      )


    if (
      indexes.length === 0
    ) {
      showToast(
        'أكملتِ وردك 🤍'
      )

      return
    }


    const cards =
      Array.from(
        document.querySelectorAll(
          `[data-dhikr-period="${period}"][data-dhikr-index]`
        )
      )


    let currentIndex =
      -1


    for (const card of cards) {
      if (
        card
          .getBoundingClientRect()
          .bottom >
        130
      ) {
        currentIndex =
          Number(
            card.dataset
              .dhikrIndex
          )

        break
      }
    }


    const targetIndex =
      indexes.find(
        index =>
          index >
          currentIndex
      ) ??
      indexes[0]


    const target =
      document.querySelector(
        `[data-dhikr-period="${period}"][data-dhikr-index="${targetIndex}"]`
      )


    target?.scrollIntoView({
      behavior:
        'smooth',

      block:
        'center'
    })
  }


  /* =====================================
     TOP / BOTTOM
  ===================================== */

  function topOrBottom() {
    setShowResetConfirm(
      false
    )


    const target =
      document.getElementById(
        nearBottom
          ? 'adhkar-list-start'
          : 'adhkar-list-end'
      )


    target?.scrollIntoView({
      behavior:
        'smooth',

      block:
        nearBottom
          ? 'start'
          : 'end'
    })
  }


  const popupAbove =
    position.y >
    window.innerHeight *
      0.45


  return (
    <div
      ref={
        shellRef
      }

      className={`
        adhkar-quick-shell
        adhkar-quick-shell--${period}
      `}

      style={{
        left:
          `${position.x}px`,

        top:
          `${position.y}px`
      }}
    >

      <div
        className={`
          adhkar-quick-popups
          ${
            popupAbove
              ? 'adhkar-quick-popups--above'
              : 'adhkar-quick-popups--below'
          }
        `}
      >

        {showResetConfirm && (
          <div
            className="adhkar-reset-confirm"
          >
            <strong>
              إعادة ورد {
                period === 'morning'
                  ? 'الصباح'
                  : 'المساء'
              }؟
            </strong>

            <span>
              سيتم تصفير هذا الورد فقط
            </span>

            <div>
              <button
                type="button"

                onClick={
                  confirmReset
                }
              >
                إعادة
              </button>

              <button
                type="button"

                onClick={() =>
                  setShowResetConfirm(
                    false
                  )
                }
              >
                إلغاء
              </button>
            </div>
          </div>
        )}


        {toast && (
          <div
            className="adhkar-quick-toast"
          >
            {toast}
          </div>
        )}

      </div>


      <div
        className="adhkar-quick-actions"
      >

        <button
          type="button"

          onClick={() =>
            setShowResetConfirm(
              true
            )
          }
        >
          ↻
        </button>


        <button
          type="button"

          className="adhkar-quick-main"

          onClick={
            goToUnfinished
          }
        >
          ◉
        </button>


        <button
          type="button"

          onClick={
            topOrBottom
          }
        >
          {nearBottom
            ? '↑'
            : '↓'}
        </button>


        <button
          type="button"

          className="adhkar-quick-drag"

          onPointerDown={
            startDrag
          }
        >
          ✦
        </button>

      </div>

    </div>
  )
}